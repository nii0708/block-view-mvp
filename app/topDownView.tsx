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
  BackHandler,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
  AntDesign,
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
import { processPDFForMapOverlay } from "../utils/pdfToImageOverlay";
import WebView from "react-native-webview";
import PDFToImageConverter from "@/components/PDFToImageConverter";

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
  const [hasPDFCoordinates, setHasPDFCoordinates] = useState(false);
  const [showPdfConverter, setShowPdfConverter] = useState(false);
  const [pdfUriForConversion, setPdfUriForConversion] = useState<string | null>(
    null
  );

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
  const [elevationRange, setElevationRange] = useState({ min: 0, max: 4000 });

  // State untuk PDF data
  const [pdfData, setPdfData] = useState<{
    fileUri: string;
    coordinates: FileService.PDFCoordinates;
  } | null>(null);
  const [showPDF, setShowPDF] = useState(true);
  const [pdfOverlayData, setPdfOverlayData] = useState<{
    imageBase64: string | null;
    bounds: [[number, number], [number, number]];
    center: [number, number];
    zoom: number;
  } | null>(null);

  const {
    setProcessedBlockModel,
    setProcessedElevation,
    setProcessedPitData,
    setFullBlockModelData,
    clearData,
  } = useMiningData();

  // Toggle functions
  const togglePDF = useCallback(() => {
    setShowPDF((prev) => !prev);
  }, []);

  // State for selected points
  const [selectedPoints, setSelectedPoints] = useState<any[]>([]);
  const [lineLength, setLineLength] = useState(0);
  const [elevation, setElevation] = useState(110);

  // State for coordinates
  const [coordinates, setCoordinates] = useState({
    lat: 0,
    lng: 0,
    x: 0,
    y: 0,
  });

  // State untuk toggle visibility layers
  const [showBlockModel, setShowBlockModel] = useState(true);
  const [showPit, setShowPit] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // State untuk rock type legend
  const [rockTypeLegend, setRockTypeLegend] = useState<{
    [key: string]: string;
  }>({
    ore: "#FF0000", // Red for ore
    waste: "#808080", // Gray for waste
    overburden: "#8B4513", // Brown for overburden
    unknown: "#3388ff", // Blue for unknown
  });

  useEffect(() => {
    // Membuat handler untuk tombol back
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Jika dalam mode Create Line, kembali ke Top Down View saja
        if (isCreateLineMode) {
          setIsCreateLineMode(false);
          setSelectedPoints([]);
          setLineLength(0);
          processedMessagesRef.current.clear();
          return true; // Menandakan kita sudah menangani event back
        }

        // Jika dalam mode normal Top Down View, biarkan default behavior (kembali ke halaman sebelumnya)
        return false; // Tidak menangani event, biarkan default behavior
      }
    );

    // Cleanup: remove event listener saat komponen unmount
    return () => backHandler.remove();
  }, [isCreateLineMode]);

  const webViewRef = useRef<any>(null);

  useEffect(() => {
    console.log("State changed - showPdfConverter:", showPdfConverter);
    console.log("State changed - pdfUriForConversion:", pdfUriForConversion);
    console.log("State changed - pdfOverlayData:", pdfOverlayData);
  }, [showPdfConverter, pdfUriForConversion, pdfOverlayData]);

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
      // Simpan data lengkap di context untuk cross-section view
      setFullBlockModelData(blockModelData);

      // Proses data block model untuk top-down view (hanya elevasi tertinggi)
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

      // Track if we have PDF data and its center
      let pdfCenter: [number, number] | null = null;
      let pdfZoom: number | null = null;

      // Process PDF if available - PRIORITY HANDLING
      if (file.files.orthophoto) {
        setLoadingMessage("Processing PDF...");
        setLoadingProgress(0.15);

        try {
          let coordinates = file.files.pdfCoordinates;

          // If no coordinates, extract them using native method
          if (!coordinates) {
            console.log("Extracting PDF coordinates natively...");

            // Use native extraction method
            const nativeResult = await FileService.extractPDFCoordinatesNative(
              file.files.orthophoto.uri
            );

            coordinates = nativeResult.coordinates;

            // Save extracted coordinates for future use
            if (coordinates) {
              file.files.pdfCoordinates = coordinates;
              // Update saved file with new coordinates
              const files = await FileService.getFileInfo();
              const updatedFiles = files.map((f) =>
                f.name === file.name ? file : f
              );
              await FileService.saveFileInfo(updatedFiles);
            }
          }

          // Create PDF overlay if we have coordinates
          if (coordinates) {
            setHasPDFCoordinates(true);
            setLoadingMessage("Creating PDF overlay...");
            setLoadingProgress(0.2);

            // Calculate center dari PDF coordinates
            pdfCenter = [
              (coordinates.topLeft.lat + coordinates.bottomLeft.lat) / 2,
              (coordinates.topLeft.lng + coordinates.topRight.lng) / 2,
            ];

            // Log for debugging
            console.log("PDF coordinates:", coordinates);
            console.log("PDF center calculated:", pdfCenter);

            // PERUBAHAN: Hapus setting map center ke PDF location
            // Kita akan membiarkan block model menentukan center

            // Use the processPDFForMapOverlay function with conversion flag
            const pdfResult = await processPDFForMapOverlay(
              file.files.orthophoto.uri,
              coordinates,
              true // Enable conversion
            );

            if (!pdfResult.error && pdfResult.bounds) {
              // Set PDF center and zoom from result
              pdfCenter = pdfResult.center;
              pdfZoom = pdfResult.zoom;

              if (pdfResult.needsConversion) {
                console.log("PDF needs conversion, setting up converter...");
                setPdfUriForConversion(file.files.orthophoto.uri);
                setShowPdfConverter(true);
                console.log("showPdfConverter set to true");

                // Set with null image but proper center
                setPdfOverlayData({
                  imageBase64: null,
                  bounds: pdfResult.bounds,
                  center: pdfResult.center,
                  zoom: pdfResult.zoom,
                });
              } else {
                // Already has image or doesn't need conversion
                setPdfOverlayData({
                  imageBase64: pdfResult.imageBase64,
                  bounds: pdfResult.bounds,
                  center: pdfResult.center,
                  zoom: pdfResult.zoom,
                });
              }
              console.log("PDF overlay data prepared");
            } else {
              console.error("Error processing PDF:", pdfResult.error);
              Alert.alert("Warning", "Failed to process PDF for display");
            }
          } else {
            console.log("No coordinates found in PDF");
            Alert.alert("Info", "No geospatial coordinates found in PDF");
          }
        } catch (error) {
          console.error("Error processing PDF:", error);
          Alert.alert("Warning", "Failed to process PDF. Error: " + error);
          // Continue without PDF, don't block the rest of the loading
        }
      }

      // Variables to store raw data before processing
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
      if (rawBlockModelData.length > 0) {
        processBlockModelData(); // Pass flag to indicate if PDF center exists
      }

      // Load and parse elevation data if available
      if (file.files.elevation) {
        setLoadingMessage("Loading elevation data...");
        try {
          rawElevationData = await FileService.parseLiDARFile(
            file.files.elevation.uri,
            {
              maxPoints: 30000, // Limit point count
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

      // Final map center and zoom setting
      // PDF center has priority, fallback to block model center
      // if (pdfCenter) {
      //   console.log("Setting map center to PDF center:", pdfCenter);
      //   setMapCenter(pdfCenter);
      //   setMapZoom(pdfZoom || 14);
      // }

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

  const handlePdfImageReady = useCallback(
    (imageBase64: string) => {
      console.log("PDF converted successfully");
      if (pdfOverlayData) {
        setPdfOverlayData((prev) =>
          prev
            ? {
                ...prev,
                imageBase64: imageBase64,
              }
            : null
        );
      }
      setShowPdfConverter(false);
    },
    [pdfOverlayData]
  );

  const handlePdfConversionError = useCallback((error: string) => {
    console.error("PDF conversion error:", error);
    setShowPdfConverter(false);
    Alert.alert(
      "Warning",
      "Failed to convert PDF to image. PDF will be shown as marker only."
    );
  }, []);

  // Process block model data to GeoJSON
  const processBlockModelData = () => {
    try {
      setLoadingMessage("Converting block model data to GeoJSON...");
      setLoadingProgress(0.4);

      InteractionManager.runAfterInteractions(() => {
        try {
          const startTime = Date.now();

          // Untuk tampilan top-down, kita hanya butuh surface blocks
          const resultForTopDown = blockModelToGeoJSON(
            blockModelData,
            sourceProjection,
            true // true untuk topElevationOnly
          );
          console.log(
            "resultForTopDown BLOCK: ",
            resultForTopDown.geoJsonData.features.length
          );
          // Penting: Untuk cross-section view, kita butuh SEMUA block
          const resultForCrossSection = blockModelToGeoJSON(
            blockModelData,
            sourceProjection,
            false // false untuk mendapatkan semua block
          );

          if (resultForCrossSection.error) {
            console.error(
              "Error in blockModelToGeoJSON:",
              resultForCrossSection.error
            );
            Alert.alert(
              "Error",
              "Failed to convert block model data to GeoJSON"
            );
            return;
          }

          // Simpan data yang lengkap (untuk cross-section) ke context
          setProcessedBlockModel(resultForCrossSection.geoJsonData);
          console.log(
            "resultForCrossSection.geoJsonData : ",
            resultForCrossSection.geoJsonData.features.length
          );
          // Gunakan data yang sudah difilter (top elevation only) untuk tampilan top-down
          setGeoJsonData(resultForTopDown.geoJsonData);
          console.log(
            "resultForTopDown.geoJsonData : ",
            resultForTopDown.geoJsonData.features.length
          );

          // PERUBAHAN: Selalu gunakan block model center, hapus kondisional
          console.log(
            "Setting map center to block model center:",
            resultForTopDown.mapCenter
          );
          setMapCenter(resultForTopDown.mapCenter);
          setMapZoom(resultForTopDown.mapZoom);

          // Update legenda berdasarkan data yang ada
          updateRockTypeLegend(resultForTopDown.geoJsonData);

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

  // Update rock type legend based on actual data
  const updateRockTypeLegend = (geoJsonData: any) => {
    if (!geoJsonData || !geoJsonData.features) return;

    const rockTypes = new Set<string>();
    const colors: { [key: string]: string } = {};

    geoJsonData.features.forEach((feature: any) => {
      if (feature.properties && feature.properties.rock) {
        rockTypes.add(feature.properties.rock);
        if (feature.properties.color) {
          colors[feature.properties.rock] = feature.properties.color;
        }
      }
    });

    // Update legend with actual rock types and colors
    const newLegend: { [key: string]: string } = {};
    rockTypes.forEach((rockType) => {
      newLegend[rockType] =
        colors[rockType] || rockTypeLegend[rockType] || "#3388ff";
    });

    setRockTypeLegend(newLegend);
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
          console.log("data top down: ", result.length);
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

  // Toggle dropdown visibility
  const toggleDropdown = useCallback(() => {
    setShowDropdown((prev) => !prev);
  }, []);

  // Handle layer toggle
  const toggleBlockModel = useCallback(() => {
    setShowBlockModel((prev) => !prev);
  }, []);

  const togglePit = useCallback(() => {
    setShowPit((prev) => !prev);
  }, []);

  // Handle map ready
  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

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

  // Render rock type legend
  const renderRockTypeLegend = () => (
    <View style={styles.legendContainer}>
      <Text style={styles.legendTitle}>Rock Types:</Text>
      <View style={styles.legendItems}>
        {Object.entries(rockTypeLegend).map(([rockType, color]) => (
          <View key={rockType} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: color }]} />
            <Text style={styles.legendText}>
              {rockType.charAt(0).toUpperCase() + rockType.slice(1)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

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

  // Render dropdown menu
  const renderDropdown = () => (
    <Modal
      transparent={true}
      visible={showDropdown}
      animationType="fade"
      onRequestClose={() => setShowDropdown(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
        <View style={styles.dropdownBackdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={toggleBlockModel}
              >
                <Text style={styles.dropdownText}>
                  {showBlockModel ? "✓" : " "} Block Model
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={togglePit}>
                <Text style={styles.dropdownText}>
                  {showPit ? "✓" : " "} Pit Boundary
                </Text>
              </TouchableOpacity>
              {pdfOverlayData && (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={togglePDF}
                >
                  <Text style={styles.dropdownText}>
                    {showPDF ? "✓" : " "} PDF Map
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
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
                geoJsonData={showBlockModel ? geoJsonData : null}
                pitGeoJsonData={showPit ? pitGeoJsonData : null}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                selectedPoints={selectedPoints}
                isCreateLineMode={isCreateLineMode}
                elevationRange={elevationRange}
                hideInternalCoordinates={true}
                useCrosshairForDrawing={true}
                lineColor="#CFE625"
                pdfOverlayData={showPDF ? pdfOverlayData : null}
              />

              {/* Crosshair indicator */}
              <View style={styles.crosshair}>
                <View style={styles.crosshairVerticalOuter} />
                <View style={styles.crosshairHorizontalOuter} />
                <View style={styles.crosshairVertical} />
                <View style={styles.crosshairHorizontal} />
              </View>
            </View>

            {/* Legend */}
            {!isCreateLineMode && renderRockTypeLegend()}

            {/* Bottom Controls */}
            {isCreateLineMode ? (
              renderCreateLineButtons()
            ) : (
              <View style={styles.controlsContainer}>
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

                  <TouchableOpacity
                    style={styles.layersButton}
                    onPress={toggleDropdown}
                  >
                    <AntDesign name="appstore-o" size={24} color="black" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      {showPdfConverter && pdfUriForConversion && (
        <PDFToImageConverter
          pdfUri={pdfUriForConversion}
          onImageReady={handlePdfImageReady}
          onError={handlePdfConversionError}
        />
      )}
      {/* Dropdown Menu */}
      {renderDropdown()}
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
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
  },
  homeButton: {
    padding: 8,
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
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    zIndex: 10,
  },
  crosshairVerticalOuter: {
    position: "absolute",
    top: 0,
    left: 10,
    width: 4,
    height: 24,
    backgroundColor: "black",
  },
  crosshairVertical: {
    position: "absolute",
    top: 0,
    left: 11,
    width: 2,
    height: 24,
    backgroundColor: "white",
    zIndex: 1,
  },
  crosshairHorizontalOuter: {
    position: "absolute",
    top: 10,
    left: 0,
    width: 24,
    height: 4,
    backgroundColor: "black",
  },
  crosshairHorizontal: {
    position: "absolute",
    top: 11,
    left: 0,
    width: 24,
    height: 2,
    backgroundColor: "white",
    zIndex: 1,
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
    backgroundColor: "#CFE625",
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 5,
    marginBottom: 10,
  },
  disabledSectionButton: {
    backgroundColor: "#f0f0f0",
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
  layersButton: {
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
  legendContainer: {
    backgroundColor: "#f9f9f9",
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
    color: "#333",
  },
  legendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
    marginBottom: 5,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 5,
  },
  legendText: {
    fontSize: 13,
    color: "#333",
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  dropdownContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: "absolute",
    bottom: 120,
    right: 20,
    width: "auto",
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    alignItems: "center",
    width: "auto",
  },
  dropdownText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 5,
  },
});
