import React, { useState, useEffect } from "react";
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
import { processElevationData } from "../utils/elevationUtils";
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
    clearData,
  } = useMiningData();

  // State for create line mode
  const [isCreateLineMode, setIsCreateLineMode] = useState(false);

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
  }, [fileName]);

  useEffect(() => {
    if (elevationData && elevationData.length > 0) {
      // Store the processed elevation data
      setProcessedElevation(elevationData);
    }
  }, [elevationData]);

  useEffect(() => {
    return () => {
      // Clear context data when component unmounts
      clearData();
    };
  }, []);

  // Process block model data when available
  useEffect(() => {
    if (blockModelData.length > 0) {
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
        // console.log(`Setting full elevation range: ${minElev} to ${maxElev}`);
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

      // Process files sequentially to avoid overwhelming the device
      // Load and parse block model data
      if (file.files.blockModel) {
        setLoadingMessage("Loading block model data...");
        try {
          const data = await FileService.parseCSVFile(
            file.files.blockModel.uri
          );
          // console.log(
          //   "Block model data loaded, first few rows:",
          //   data.slice(0, 3)
          // );

          // Skip the header rows (first 3 rows are descriptions)
          const dataWithoutHeaders = data.slice(3);
          // console.log(
          //   "Sample block model data:",
          //   dataWithoutHeaders.slice(0, 3)
          // );

          setBlockModelData(dataWithoutHeaders);
          setLoadingProgress(0.4);
        } catch (error) {
          console.error("Error processing block model data:", error);
          Alert.alert("Error", "Failed to process block model data");
        }
      }

      // Load and parse LiDAR data
      if (file.files.elevation) {
        setLoadingMessage("Loading LiDAR data...");
        try {
          const data = await FileService.parseLiDARFile(
            file.files.elevation.uri
          );

          // Data ini mungkin merupakan data elevasi, jadi proses secara berbeda
          // Sample data karena jumlahnya sangat banyak
          let processedData = data;
          if (data.length > 5000) {
            const step = Math.max(1, Math.ceil(data.length / 5000));
            // console.log(
            //   `Data elevasi memiliki ${data.length} titik, sampling setiap ${step} titik`
            // );
            processedData = data.filter((_, index) => index % step === 0);
            // console.log(`Sampling ke ${processedData.length} titik`);
          }

          setLidarData(processedData);
          setLoadingProgress(0.6);
        } catch (error) {
          console.error("Error processing LiDAR data:", error);
          Alert.alert("Error", "Failed to process LiDAR data");
        }
      }

      // Load and parse elevation data if available
      if (file.files.elevation) {
        // This is the elevation data
        setLoadingMessage("Loading elevation data...");
        try {
          const data = await FileService.parseLiDARFile(
            file.files.elevation.uri
          );
          // Process as elevation data with the correct source projection
          const processedElevation = processElevationData(
            data,
            sourceProjection,
            "lon",
            "lat",
            "z"
          );
          setElevationData(processedElevation);
          setLoadingProgress(0.6);
        } catch (error) {
          console.error("Error processing elevation data:", error);
          Alert.alert("Warning", "Failed to process elevation data");
        }
      }

      // Load and parse pit data
      if (file.files.pit) {
        // This is the pit boundary data
        setLoadingMessage("Loading pit boundary data...");
        try {
          const data = await FileService.parseLiDARFile(file.files.pit.uri);
          setLidarData(data); // Despite the name, we're storing pit data here
          setLoadingProgress(0.8);
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

      InteractionManager.runAfterInteractions(() => {
        try {
          console.log(
            `Processing block model data with projection: ${sourceProjection}`
          );

          // Use selected projection and process top elevation only
          const result = blockModelToGeoJSON(
            blockModelData,
            sourceProjection,
            true
          );

          console.log("Jumlah data result " + result.geoJsonData.features.length);

          const resultForCrossSection = blockModelToGeoJSON(
            blockModelData,
            sourceProjection,
            false
          )

          console.log("Jumlah data result cross section " + resultForCrossSection.geoJsonData.features.length);

          if (result.error) {
            console.error("Error in blockModelToGeoJSON:", result.error);
            Alert.alert(
              "Error",
              "Failed to convert block model data to GeoJSON"
            );
            return;
          }

          // Limit features to prevent performance issues
          let optimizedData = resultForCrossSection.geoJsonData;
          // console.log("", optimizedData.features.length);
          // if (optimizedData?.features?.length > MAX_FEATURES) {
          //   console.log(
          //     `Limiting GeoJSON features from ${optimizedData.features.length} to ${MAX_FEATURES}`
          //   );
          //   optimizedData = {
          //     ...optimizedData,
          //     features: optimizedData.features.slice(0, MAX_FEATURES),
          //   };
          // }

          // console.log(
          //   `Block model converted to GeoJSON with ${
          //     optimizedData?.features?.length || 0
          //   } features`
          // );

          setProcessedBlockModel(resultForCrossSection.geoJsonData); // ini harus yang semuanya

          setGeoJsonData(result.geoJsonData); // ini harus yang di filter
          setMapCenter(result.mapCenter);
          setMapZoom(result.mapZoom);
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
          console.log(
            `Processing pit data with projection: ${sourceProjection}`
          );

          // Debug data mentah
          if (lidarData.length > 0) {
            console.log("Raw pit data sample:", lidarData[0]);
          }

          // Pastikan semua field ada dan tipe datanya benar
          const pitDataFormat = lidarData.map((point) => ({
            x: point.lon || point.x || 0,
            y: point.lat || point.y || 0,
            z: point.z || 0,
            interior: 1, // Default value
            none: 0,
            type: 0,
          }));

          console.log("Pit data format sample:", pitDataFormat[0]);

          // Batas jumlah data yang diproses untuk mencegah overload
          const pitDataSample =
            pitDataFormat.length > 10000
              ? pitDataFormat.filter(
                  (_, i) => i % Math.ceil(pitDataFormat.length / 10000) === 0
                )
              : pitDataFormat;

          console.log(
            `Processing ${pitDataSample.length} out of ${pitDataFormat.length} pit points`
          );

          const result = processPitDataToGeoJSON(
            pitDataSample,
            sourceProjection
          );

          if (!result) {
            console.error("Error in processPitDataToGeoJSON: No result");
            Alert.alert("Warning", "Failed to convert LiDAR data to GeoJSON");
            return;
          }

          console.log(
            `Processed pit GeoJSON has ${result.features.length} features`
          );

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

  // Handle map press
  const handleMapPress = (point: any) => {
    if (!isCreateLineMode) return;

    setCoordinates(point);

    // Check if this is a complete line message
    if (point.isLineComplete && point.points) {
      console.log("Line completed:", point.points);
      setSelectedPoints(point.points);

      // Calculate distance for the line
      const distance = calculateLineDistance(point.points);
      setLineLength(Math.round(distance));
      return;
    }

    // Legacy point-by-point handling
    // Add new point if less than 2 points
    if (selectedPoints.length < 2) {
      const newPoints = [...selectedPoints, [point.lat, point.lng]];
      setSelectedPoints(newPoints);

      // Calculate distance if 2 points
      if (newPoints.length === 2) {
        const distance = calculateLineDistance(newPoints);
        setLineLength(Math.round(distance));
      }
    }
  };

  // Handle undo button
  const handleUndo = () => {
    if (selectedPoints.length > 0) {
      setSelectedPoints(selectedPoints.slice(0, -1));
      if (selectedPoints.length <= 1) {
        setLineLength(0);
      }
    }
  };

  // Handle add point button
  const handleAddPoint = () => {
    if (selectedPoints.length === 2) {
      // Reset if already 2 points
      setSelectedPoints([]);
      setLineLength(0);
    }
  };

  // Navigate to cross section view
  const handleCreateCrossSection = () => {
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
        projection: sourceProjection, // Pass projection to cross section view
      },
    });
  };

  // Toggle ruler mode
  const toggleRulerMode = () => {
    setIsCreateLineMode(!isCreateLineMode);
    if (!isCreateLineMode) {
      setSelectedPoints([]);
      setLineLength(0);
    }
  };

  // Handle slider thumb pan
  const handleSliderChange = (value: number) => {
    setIntervalValue(Math.min(30, Math.max(0, value)));

    if (lidarData.length > 0) {
      const elevations = lidarData.map((point) => parseFloat(String(point.z)));
      const validElevations = elevations.filter((e) => !isNaN(e));

      if (validElevations.length > 0) {
        const minElev = Math.min(...validElevations);
        const maxElev = Math.max(...validElevations);
        const range = maxElev - minElev;

        // Calculate new max based on slider
        const intervalPercent = value / 30;
        const newMax = minElev + range * intervalPercent;

        console.log(`Updating elevation range: ${minElev} to ${newMax}`);
        setElevationRange({ min: minElev, max: newMax });
      }
    }
  };

  // Handle map ready
  const handleMapReady = () => {
    setMapReady(true);
    console.log("Map is ready!");
  };

  // Render header
  const renderHeader = () => {
    const title = isCreateLineMode ? "Create Line" : "Top Down View";

    return (
      <View style={styles.header}>
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
              ? `${coordinates.lng.toFixed(6)}, ${coordinates.lat.toFixed(6)}`
              : ""
          }
          editable={false}
        />
      </View>
    </View>
  );

  // Render create line buttons
  const renderCreateLineButtons = () => (
    <View style={styles.createLineButtons}>
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleUndo}>
          <Text style={styles.actionButtonText}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleAddPoint}>
          <Text style={styles.actionButtonText}>Add point</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.createSectionButton,
          selectedPoints.length !== 2 && { opacity: 0.5 },
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
            <View style={styles.mapContainer}>
              {/* This is where we render the LeafletMap component with GeoJSON data */}
              <LeafletMap
                onMapPress={handleMapPress}
                onMapReady={handleMapReady}
                style={styles.map}
                geoJsonData={geoJsonData}
                pitGeoJsonData={pitGeoJsonData}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                selectedPoints={selectedPoints}
                isCreateLineMode={isCreateLineMode}
                elevationRange={elevationRange}
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
                        ? `x:${Math.round(coordinates.lng)}, y:${Math.round(
                            coordinates.lat
                          )}`
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
  },
  homeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
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
  mapContainer: {
    width: windowWidth,
    height: windowWidth,
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
    paddingVertical: 10,
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
  actionButtonText: {
    color: "#333",
    fontWeight: "500",
  },
  createSectionButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 5,
  },
  createSectionButtonText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 16,
  },
  controlsContainer: {
    flex: 1,
    paddingHorizontal: 20,
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
    marginTop: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coordinatesText: {
    fontSize: 14,
    color: "#333",
  },
});
