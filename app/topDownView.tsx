import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  TextInput,
  Alert,
  InteractionManager,
} from "react-native";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as FileService from "../services/FileService";
import LoadingScreen from "../components/LoadingScreen";
import LeafletMap from "../components/LeafletMap";
import { blockModelToGeoJSON } from "../utils/blockModelToGeoJSON";
import { processPitDataToGeoJSON } from "../utils/processPitData";
import {
  addPointToLine,
  pointsToGeoJSONLine,
  calculateLineDistance,
} from "../utils/lineDrawerUtils";
import {
  processElevationData,
  createBoundingBoxFromBlockModel,
} from "../utils/elevationUtils";
import { useMiningData } from "../context/MiningDataContext";

// Get screen dimensions
const windowWidth = Dimensions.get("window").width;

// Maximum features to render to prevent performance issues
const MAX_FEATURES = 5000;

export default function TopDownViewScreen() {
  const router = useRouter();
  const { fileName, projection } = useLocalSearchParams();
  const sourceProjection = (projection as string) || "EPSG:32652"; // Default if not provided

  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading data...");

  // State for create line mode
  const [isCreateLineMode, setIsCreateLineMode] = useState(false);

  // Refs for tracking state changes
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const [addPointFunc, setAddPointFunc] = useState<(() => void) | null>(null);

  const handleCoordinateChange = useCallback(
    (coords: { lat: number; lng: number }) => {
      setCoordinates({
        lat: coords.lat || 0,
        lng: coords.lng || 0,
        x: coords.lng || 0,
        y: coords.lat || 0,
      });
    },
    []
  );

  const handleAddPointCallback = useCallback((addPointFunction: () => void) => {
    setAddPointFunc(() => addPointFunction);
  }, []);

  // State for file data
  const [fileData, setFileData] = useState<FileService.MiningDataFile | null>(
    null
  );
  const [blockModelData, setBlockModelData] = useState<any[]>([]);
  const [lidarData, setLidarData] = useState<any[]>([]);
  const [elevationData, setElevationData] = useState<any[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [pitGeoJsonData, setPitGeoJsonData] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<number[]>([0, 0]);
  const [mapZoom, setMapZoom] = useState(12);
  const [elevationRange, setElevationRange] = useState({ min: 0, max: 1000 });

  const {
    setProcessedBlockModel,
    setProcessedElevation,
    setProcessedPitData,
    setFullBlockModelData,
    clearData,
  } = useMiningData();

  // State for selected points
  const [selectedPoints, setSelectedPoints] = useState<any[]>([]);
  const [lineLength, setLineLength] = useState(0);
  const [elevation, setElevation] = useState(110);

  // State for interval slider
  const [intervalValue, setIntervalValue] = useState(0);

  // State for coordinates
  const [coordinates, setCoordinates] = useState({
    lat: 0,
    lng: 0,
    x: 0,
    y: 0,
  });

  // Load file data on mount
  useEffect(() => {
    loadFileData();

    // Clear state on mount
    setSelectedPoints([]);
    setLineLength(0);
    processedMessagesRef.current.clear();

    return () => {
      // Clear context data when component unmounts
      clearData();
    };
  }, [fileName]);

  useEffect(() => {
    if (elevationData && elevationData.length > 0) {
      // Store the processed elevation data
      setProcessedElevation(elevationData);
    }
  }, [elevationData]);

  useEffect(() => {
    if (blockModelData.length > 0) {
      // Store the full block model data in context for cross-section view
      setFullBlockModelData(blockModelData);

      // Process block model data for top-down view
      processBlockModelData();
    }
  }, [blockModelData]);

  // Process lidar data when available
  useEffect(() => {
    if (lidarData.length > 0) {
      processPitData();
    }
  }, [lidarData]);

  useEffect(() => {
    if (lidarData.length > 0) {
      // Extract all elevation values
      const elevations = lidarData.map((point) => parseFloat(String(point.z)));
      const validElevations = elevations.filter((e) => !isNaN(e));

      if (validElevations.length > 0) {
        const minElev = Math.min(...validElevations);
        const maxElev = Math.max(...validElevations);

        // Set to show ENTIRE range initially
        setElevationRange({ min: minElev, max: maxElev });

        // Start with full data visible
        setIntervalValue(30); // Set to maximum value
      }
    }
  }, [lidarData]);

  // Load file data
  const loadFileData = async () => {
    try {
      setLoading(true);
      setLoadingMessage("Loading file information...");
      setLoadingProgress(0.1);

      // Ensure we have a fileName
      if (!fileName) {
        Alert.alert("Error", "No file name provided");
        router.replace("/");
        return;
      }

      // Load all files
      const files = await FileService.getFileInfo();

      // Find the file with the matching name
      const file = files.find((f) => f.name === String(fileName));

      if (!file) {
        Alert.alert("Error", `File "${fileName}" not found`);
        router.replace("/");
        return;
      }

      setFileData(file);
      setLoadingProgress(0.2);

      // Variables to store raw data before processing with explicit type annotations
      let rawBlockModelData: any[] = [];
      let rawElevationData: any[] = [];
      let rawPitData: any[] = [];

      // Load and parse block model data first
      if (file.files.blockModel) {
        setLoadingMessage("Loading block model data...");
        try {
          const data = await FileService.parseCSVFile(
            file.files.blockModel.uri
          );

          // Skip the header rows (first 3 rows are descriptions)
          rawBlockModelData = data.slice(3);
          setBlockModelData(rawBlockModelData);
          setLoadingProgress(0.3);
        } catch (error) {
          console.error("Error processing block model data:", error);
          Alert.alert("Error", "Failed to process block model data");
        }
      }

      // Create a bounding box from block model data to filter elevation data
      const blockModelBoundingBox = createBoundingBoxFromBlockModel(
        rawBlockModelData,
        100
      );

      // Start processing block model data right away
      processBlockModelData();

      // Load and parse elevation data if available
      if (file.files.elevation) {
        setLoadingMessage("Loading elevation data...");
        try {
          // Load raw elevation data with pre-sampling to limit initial data size
          const elevationStartTime = Date.now();
          rawElevationData = await FileService.parseLiDARFile(
            file.files.elevation.uri,
            {
              maxPoints: 30000, // Further reduced point limit
            }
          );

          // Process elevation data, filtering by block model bounding box
          const processedElevation = processElevationData(
            rawElevationData,
            sourceProjection,
            "lon",
            "lat",
            "z",
            blockModelBoundingBox
          );

          setElevationData(processedElevation);
          setLoadingProgress(0.8);
        } catch (error) {
          console.error("Error processing elevation data:", error);
          Alert.alert("Warning", "Failed to process elevation data");
        }
      }

      // Load and parse LiDAR data for pit boundaries
      if (file.files.pit) {
        setLoadingMessage("Loading pit boundary data...");
        try {
          rawPitData = await FileService.parseLiDARFile(file.files.pit.uri, {
            maxPoints: 10000, // Limit points for better performance
          });
          setLidarData(rawPitData);
          setLoadingProgress(0.9);
        } catch (error) {
          console.error("Error processing pit data:", error);
          Alert.alert("Warning", "Failed to process pit data");
        }
      }

      setLoadingProgress(1.0);

      // Wait a moment to show 100% progress
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error("Error loading file data:", error);
      Alert.alert("Error", "Failed to load file data");
      setLoading(false);
    }
  };

  // Process block model data to GeoJSON
  const processBlockModelData = () => {
    try {
      setLoadingMessage("Converting block model data to GeoJSON...");
      setLoadingProgress(0.4);

      InteractionManager.runAfterInteractions(() => {
        try {
          const startTime = Date.now();

          // Use selected projection and process top elevation only
          const result = blockModelToGeoJSON(
            blockModelData,
            sourceProjection,
            true
          );

          if (result.error) {
            console.error("Error in blockModelToGeoJSON:", result.error);
            Alert.alert(
              "Error",
              "Failed to convert block model data to GeoJSON"
            );
            return;
          }

          setProcessedBlockModel(result.geoJsonData);
          setGeoJsonData(result.geoJsonData);
          setMapCenter(result.mapCenter);
          setMapZoom(result.mapZoom);

          setLoadingProgress(0.6);
        } catch (error) {
          console.error("Error processing block model data:", error);
          Alert.alert("Error", "Failed to process block model data");
        }
      });
    } catch (error) {
      console.error("Error scheduling block model processing:", error);
    }
  };

  // Process pit/lidar data to GeoJSON
  const processPitData = () => {
    try {
      setLoadingMessage("Converting LiDAR data to GeoJSON...");

      InteractionManager.runAfterInteractions(() => {
        try {
          // Pastikan semua field ada dan tipe datanya benar
          const pitDataFormat = lidarData.map((point) => ({
            x: point.lon || point.x || 0,
            y: point.lat || point.y || 0,
            z: point.z || 0,
            interior: 1, // Default value
            none: 0,
            type: 0,
          }));

          // Batas jumlah data yang diproses untuk mencegah overload
          const pitDataSample =
            pitDataFormat.length > 10000
              ? pitDataFormat.filter(
                  (_, i) => i % Math.ceil(pitDataFormat.length / 10000) === 0
                )
              : pitDataFormat;

          const result = processPitDataToGeoJSON(
            pitDataSample,
            sourceProjection
          );

          if (!result) {
            console.error("Error in processPitDataToGeoJSON: No result");
            Alert.alert("Warning", "Failed to convert LiDAR data to GeoJSON");
            return;
          }

          if (result) {
            setProcessedPitData(result);
          }

          setPitGeoJsonData(result);
        } catch (error) {
          console.error("Error processing LiDAR data:", error);
          Alert.alert("Warning", "Failed to process LiDAR data");
        }
      });
    } catch (error) {
      console.error("Error scheduling pit data processing:", error);
    }
  };

  // Handle map press with deduplication
  const handleMapPress = useCallback((point: any) => {
    // Update koordinat
    if (point.lat !== undefined && point.lng !== undefined) {
      setCoordinates({
        lat: point.lat || 0,
        lng: point.lng || 0,
        x: point.lng || 0,
        y: point.lat || 0,
      });
    }

    // Handle point added events with key-based deduplication
    if (point.isFirstPoint && point.point) {
      const pointKey = point.pointKey || JSON.stringify(point.point);

      // Check if we've already processed this point
      if (processedMessagesRef.current.has(pointKey)) {
        return;
      }

      // Mark as processed
      processedMessagesRef.current.add(pointKey);

      // Update state with the new point
      setSelectedPoints([point.point]);
    }

    // Handle completed line with key-based deduplication
    if (point.isLineComplete && point.points) {
      const lineKey = point.lineKey || JSON.stringify(point.points);

      // Check if we've already processed this line
      if (processedMessagesRef.current.has(lineKey)) {
        return;
      }

      // Mark as processed
      processedMessagesRef.current.add(lineKey);

      // Update state with the line points
      setSelectedPoints(point.points);
      const distance = calculateLineDistance(point.points);
      setLineLength(Math.round(distance));
    }
  }, []);

  // Handle undo button
  const handleUndo = useCallback(() => {
    if (selectedPoints.length > 0) {
      const newPoints = selectedPoints.slice(0, -1);
      setSelectedPoints(newPoints);

      if (selectedPoints.length <= 1) {
        setLineLength(0);
      }

      // Clear processed messages to allow re-adding points
      processedMessagesRef.current.clear();
    }
  }, [selectedPoints]);

  // Handle add point button
  const handleAddPoint = useCallback(() => {
    // If we already have 2 points, reset
    if (selectedPoints.length >= 2) {
      setSelectedPoints([]);
      setLineLength(0);
      processedMessagesRef.current.clear();
      return;
    }

    // Use the add point function from LeafletMap
    if (addPointFunc) {
      addPointFunc();
    } else {
      // Fallback if addPointFunc is not available
      const newPoint = [coordinates.lat || 0, coordinates.lng || 0];
      const newPoints = [...selectedPoints, newPoint];
      setSelectedPoints(newPoints);

      // Calculate line length if we now have 2 points
      if (newPoints.length === 2) {
        const distance = calculateLineDistance(newPoints);
        setLineLength(Math.round(distance));
      }
    }
  }, [addPointFunc, coordinates, selectedPoints]);

  // Navigate to cross section view
  const handleCreateCrossSection = useCallback(() => {
    if (selectedPoints.length !== 2) return;

    router.push({
      pathname: "/crossSectionView",
      params: {
        startLat: selectedPoints[0][0].toString(),
        startLng: selectedPoints[0][1].toString(),
        endLat: selectedPoints[1][0].toString(),
        endLng: selectedPoints[1][1].toString(),
        length: lineLength.toString(),
        elevation: elevation.toString(),
        fileName: String(fileName),
        projection: sourceProjection,
      },
    });
  }, [
    selectedPoints,
    lineLength,
    elevation,
    fileName,
    sourceProjection,
    router,
  ]);

  // Toggle ruler mode
  const toggleRulerMode = useCallback(() => {
    setIsCreateLineMode((prev) => !prev);
    setSelectedPoints([]);
    setLineLength(0);
    processedMessagesRef.current.clear();
  }, []);

  const handleSliderChange = useCallback(
    (value: number) => {
      setIntervalValue(Math.min(30, Math.max(0, value)));

      if (lidarData.length > 0) {
        const elevations = lidarData.map((point) =>
          parseFloat(String(point.z))
        );
        const validElevations = elevations.filter((e) => !isNaN(e));

        if (validElevations.length > 0) {
          const minElev = Math.min(...validElevations);
          const maxElev = Math.max(...validElevations);
          const range = maxElev - minElev;

          // Calculate new max based on slider
          const intervalPercent = value / 30;
          const newMax = minElev + range * intervalPercent;

          setElevationRange({ min: minElev, max: newMax });
        }
      }
    },
    [lidarData]
  );

  // Handle map ready
  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  // Render header
  const renderHeader = () => {
    const title = isCreateLineMode ? "Create Line" : "Top Down View";

    const handleBackPress = () => {
      if (isCreateLineMode) {
        // Kembali ke Top Down View
        setIsCreateLineMode(false);
        setSelectedPoints([]);
        setLineLength(0);
        processedMessagesRef.current.clear();
      } else {
        // Kembali ke halaman sebelumnya
        router.back();
      }
    };

    return (
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <MaterialIcons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push("/")}
        >
          <MaterialIcons name="home" size={24} color="black" />
        </TouchableOpacity>
      </View>
    );
  };

  // Render create line inputs
  const renderCreateLineInputs = () => (
    <View style={styles.createLineInputs}>
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Length:</Text>
          <TextInput
            style={styles.input}
            value={`${lineLength} m`}
            editable={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Elevation:</Text>
          <TextInput
            style={styles.input}
            value={`${elevation} m`}
            editable={false}
          />
        </View>
      </View>

      <View style={styles.coordinateInput}>
        <Text style={styles.inputLabel}>Point: long, lat</Text>
        <TextInput
          style={styles.input}
          value={
            selectedPoints.length > 0
              ? `${(coordinates.lng || 0).toFixed(6)}, ${(
                  coordinates.lat || 0
                ).toFixed(6)}`
              : ""
          }
          editable={false}
        />
      </View>

      <Text style={styles.debugInfo}>
        Selected points: {selectedPoints.length}
      </Text>
    </View>
  );

  // Render create line buttons
  const renderCreateLineButtons = () => (
    <View style={styles.createLineButtons}>
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleUndo}>
          <Text style={styles.actionButtonText}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            selectedPoints.length >= 2 && styles.disabledActionButton,
          ]}
          onPress={handleAddPoint}
          disabled={selectedPoints.length >= 2}
        >
          <Text style={styles.actionButtonText}>Add point</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.createSectionButton,
          selectedPoints.length !== 2 && styles.disabledSectionButton,
        ]}
        onPress={handleCreateCrossSection}
        disabled={selectedPoints.length !== 2}
      >
        <Text style={styles.createSectionButtonText}>Create Cross Section</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      {renderHeader()}

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <LoadingScreen message={loadingMessage} progress={loadingProgress} />
        ) : (
          <>
            {/* Create line inputs */}
            {isCreateLineMode && renderCreateLineInputs()}

            {/* Map Container */}
            <View
              style={[
                styles.mapContainer,
                { height: isCreateLineMode ? windowWidth : windowWidth * 1.3 },
              ]}
            >
              {/* LeafletMap component */}
              <LeafletMap
                onMapPress={handleMapPress}
                onMapReady={handleMapReady}
                onCoordinateChange={handleCoordinateChange}
                onAddPointFromCrosshair={handleAddPointCallback}
                style={styles.map}
                geoJsonData={geoJsonData}
                pitGeoJsonData={pitGeoJsonData}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                selectedPoints={selectedPoints}
                isCreateLineMode={isCreateLineMode}
                elevationRange={elevationRange}
                hideInternalCoordinates={true}
                useCrosshairForDrawing={true}
                lineColor="#CFE625"
              />

              {/* Crosshair indicator */}
              <View style={styles.crosshair}>
                <View style={styles.crosshairVertical} />
                <View style={styles.crosshairHorizontal} />
              </View>
            </View>

            {/* Bottom Controls */}
            {isCreateLineMode ? (
              renderCreateLineButtons()
            ) : (
              <View style={styles.controlsContainer}>
                {/* Interval Controls */}
                <View style={styles.intervalContainer}>
                  <Text style={styles.intervalLabel}>Interval</Text>
                  <View style={styles.sliderContainer}>
                    <View style={styles.sliderTrack}>
                      <View
                        style={[
                          styles.sliderFill,
                          { width: `${(intervalValue / 30) * 100}%` },
                        ]}
                      />
                    </View>
                    <View
                      style={[
                        styles.sliderThumb,
                        { left: `${(intervalValue / 30) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.intervalValue}>
                    0-{Math.round(intervalValue)} lvl
                  </Text>
                  <Text style={styles.intervalLabel}>Interval elevasi</Text>
                </View>

                {/* Coordinates and Tools */}
                <View style={styles.coordinatesContainer}>
                  <TouchableOpacity
                    style={[
                      styles.rulerButton,
                      isCreateLineMode && { backgroundColor: "#d0d0d0" },
                    ]}
                    onPress={toggleRulerMode}
                  >
                    <MaterialCommunityIcons
                      name="ruler"
                      size={24}
                      color="black"
                    />
                  </TouchableOpacity>

                  <View style={styles.coordinatesDisplay}>
                    <Text style={styles.coordinatesText}>
                      {mapReady
                        ? `x:${Math.round(
                            coordinates?.lng || 0
                          )}, y:${Math.round(coordinates?.lat || 0)}`
                        : "Loading..."}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.droneButton}>
                    <Feather name="camera" size={24} color="black" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  homeButton: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  createLineInputs: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  inputContainer: {
    width: "48%",
  },
  coordinateInput: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: "#f9f9f9",
  },
  debugInfo: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  mapContainer: {
    width: windowWidth,
    position: "relative",
    backgroundColor: "#f5f5f5",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  crosshair: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    zIndex: 10,
  },
  crosshairVertical: {
    position: "absolute",
    top: 0,
    left: 10,
    width: 1,
    height: 20,
    backgroundColor: "black",
  },
  crosshairHorizontal: {
    position: "absolute",
    top: 10,
    left: 0,
    width: 20,
    height: 1,
    backgroundColor: "black",
  },
  createLineButtons: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: "auto",
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    flex: 0.48,
    alignItems: "center",
  },
  disabledActionButton: {
    backgroundColor: "#e0e0e0",
    opacity: 0.7,
  },
  actionButtonText: {
    color: "#333",
    fontWeight: "500",
  },
  createSectionButton: {
    backgroundColor: "#CFE625", // Warna kuning
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 5,
    marginBottom: 10,
  },
  disabledSectionButton: {
    backgroundColor: "#f0f0f0", // Warna abu-abu
  },
  createSectionButtonText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 16,
  },
  controlsContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  intervalContainer: {
    marginTop: 20,
  },
  intervalLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  sliderContainer: {
    height: 30,
    justifyContent: "center",
    position: "relative",
  },
  sliderTrack: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
  },
  sliderFill: {
    height: 4,
    backgroundColor: "#0066CC",
    borderRadius: 2,
  },
  sliderThumb: {
    position: "absolute",
    width: 20,
    height: 20,
    backgroundColor: "#0066CC",
    borderRadius: 10,
    top: 5,
    marginLeft: -10,
  },
  intervalValue: {
    fontSize: 14,
    color: "#333",
    alignSelf: "flex-end",
    marginTop: 5,
  },
  coordinatesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
    paddingVertical: 10,
  },
  rulerButton: {
    width: 40,
    height: 40,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  droneButton: {
    width: 40,
    height: 40,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  coordinatesDisplay: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 10,
    alignItems: "center",
    alignSelf: "center",
  },
  coordinatesText: {
    fontSize: 14,
    color: "#333",
    fontFamily: "Montserrat_400Regular",
  },
});
