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
  BackHandler,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
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
import { calculateLineDistance } from "../utils/lineDrawerUtils";
import {
  processElevationData,
  createBoundingBoxFromBlockModel,
} from "../utils/elevationUtils";
import { getStringFieldsWithUniqueValues } from "@/utils/filterColumnString";
import { extractBlockModelAttributes } from "@/utils/attributeExtraction";
import { useMiningData } from "../context/MiningDataContext";
import { processPDFForMapOverlay } from "../utils/pdfToImageOverlay";
import { applyColorMapping } from "../utils/blockModelUtils";
import PDFToImageConverter from "@/components/PDFToImageConverter";
import ColorPickerDialog from "../components/ColorPickerDialog";
// Get screen dimensions
const windowWidth = Dimensions.get("window").width;

interface Coordinates {
  topLeft: { lat: number; lng: number };
  topRight: { lat: number; lng: number };
  bottomLeft: { lat: number; lng: number };
  bottomRight: { lat: number; lng: number };
}

interface MiningFile {
  name: string;
  files: {
    orthophoto?: { uri: string };
    blockModel?: { uri: string };
    elevation?: { uri: string };
    pit?: { uri: string };
    pdfCoordinates?: Coordinates;
  };
}

interface PDFResult {
  error?: string;
  bounds?: [[number, number], [number, number]];
  center: [number, number];
  zoom: number;
  needsConversion?: boolean;
  imageBase64?: string | null;
}

interface PDFLoadResult {
  pdfLoaded: boolean;
  pdfCenter?: [number, number] | null;
  pdfZoom?: number | null;
}

// Maximum features to render to prevent performance issues
const MAX_FEATURES = 5000;

export default function TopDownViewScreen() {
  const router = useRouter();
  const { fileName, projection } = useLocalSearchParams();
  const sourceProjection = (projection as string) || "EPSG:32652";

  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Loading data...");
  const [dataReady, setDataReady] = useState(false);

  // Map states
  const [mapReady, setMapReady] = useState(false);
  const [mapCenter, setMapCenter] = useState<number[]>([0, 0]);
  const [mapZoom, setMapZoom] = useState(12);

  // PDF states
  const [hasPDFCoordinates, setHasPDFCoordinates] = useState(false);
  const [showPdfConverter, setShowPdfConverter] = useState(false);
  const [pdfUriForConversion, setPdfUriForConversion] = useState<string | null>(
    null
  );
  const [pdfOverlayData, setPdfOverlayData] = useState<{
    imageBase64: string | null;
    bounds: [[number, number], [number, number]];
    center: [number, number];
    zoom: number;
  } | null>(null);

  // Data states
  const [fileData, setFileData] = useState<FileService.MiningDataFile | null>(
    null
  );
  const [blockModelData, setBlockModelData] = useState<any[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [pitGeoJsonData, setPitGeoJsonData] = useState<any>(null);
  const [elevationData, setElevationData] = useState<any[]>([]);
  const [elevationRange, setElevationRange] = useState({ min: 0, max: 4000 });
  const [pickingAttributes, setPickingAttributes] = useState<
    Record<string, string[]>
  >({});

  // Create line states
  const [isCreateLineMode, setIsCreateLineMode] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState<any[]>([]);
  const [lineLength, setLineLength] = useState(0);
  const [elevation, setElevation] = useState(110);
  const [coordinates, setCoordinates] = useState({
    lat: 0,
    lng: 0,
    x: 0,
    y: 0,
  });

  // Color state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColorMapping, setCustomColorMapping] = useState<{
    [key: string]: { color: string; opacity: number };
  }>({});

  // Toggle visibility states
  const [showBlockModel, setShowBlockModel] = useState(true);
  const [showPit, setShowPit] = useState(true);
  const [showPDF, setShowPDF] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // Rock type legend
  const [rockTypeLegend, setRockTypeLegend] = useState<{
    [key: string]: { color: string; opacity: number };
  }>({});

  // Refs
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const [addPointFunc, setAddPointFunc] = useState<(() => void) | null>(null);
  const mountedRef = useRef(true);
  const rawBlockModelDataRef = useRef<any[] | null>(null);
  const pdfLoadedRef = useRef<boolean>(false);

  // File data states
  const [hasBlockModelData, setHasBlockModelData] = useState(false);
  const [hasElevationData, setHasElevationData] = useState(false);

  // Context
  const {
    setProcessedBlockModel,
    setProcessedElevation,
    setProcessedPitData,
    setFullBlockModelData,
    setProcessedAttributeViewing,
    clearData,
    pickedAttribute,
  } = useMiningData();

  // Main effect for initial data loading - runs only when fileName changes
  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;

    const loadAllData = async () => {
      try {
        setLoading(true);
        setDataReady(false);
        setLoadingMessage("Loading file information...");
        setLoadingProgress(0.1);

        clearData();

        if (!fileName) {
          Alert.alert("Error", "No file name provided");
          router.replace("/");
          return;
        }

        // Step 1: Load file info
        const files = await FileService.getFileInfo();
        const file = files.find((f) => f.name === String(fileName));

        if (!file || !mounted) {
          if (mounted) {
            Alert.alert("Error", `File "${fileName}" not found`);
            router.replace("/");
          }
          return;
        }

        setFileData(file);
        setLoadingProgress(0.2);

        // Load each data type
        const { pdfLoaded } = await loadPDFData(file, mounted);
        pdfLoadedRef.current = pdfLoaded;

        if (mounted) {
          await loadBlockModelData(file, mounted);
          await loadElevationData(file, mounted);
          await loadPitData(file, mounted);
        }

        // Final setup
        if (mounted) {
          setLoadingProgress(1.0);
          setDataReady(true);
          setTimeout(() => {
            if (mounted) {
              setLoading(false);
            }
          }, 500);
        }
      } catch (error) {
        console.error("Error in loadAllData:", error);
        if (mounted) {
          Alert.alert("Error", "Failed to load data");
          setLoading(false);
        }
      }
    };

    loadAllData();

    return () => {
      mounted = false;
      mountedRef.current = false;
    };
  }, [fileName]); // Remove pickedAttribute dependency

  // PDF loading function with your existing types
  const loadPDFData = async (
    file: FileService.MiningDataFile,
    mounted: boolean
  ): Promise<{
    pdfLoaded: boolean;
    pdfCenter?: [number, number] | null;
    pdfZoom?: number | null;
  }> => {
    let pdfCenter: [number, number] | null = null;
    let pdfZoom: number | null = null;
    let pdfLoaded = false;

    if (!file.files.orthophoto || !mounted) return { pdfLoaded };

    setLoadingMessage("Processing PDF...");
    setLoadingProgress(0.25);

    try {
      let coordinates = file.files.pdfCoordinates;

      if (!coordinates) {
        const nativeResult = await FileService.extractPDFCoordinatesNative(
          file.files.orthophoto.uri
        );

        coordinates = nativeResult.coordinates;
        if (coordinates) {
          file.files.pdfCoordinates = coordinates;
          const files = await FileService.getFileInfo();
          const updatedFiles = files.map((f) =>
            f.name === file.name ? file : f
          );
          await FileService.saveFileInfo(updatedFiles);
        }
      }

      if (coordinates) {
        setHasPDFCoordinates(true);
        pdfCenter = [
          (coordinates.topLeft.lat + coordinates.bottomLeft.lat) / 2,
          (coordinates.topLeft.lng + coordinates.topRight.lng) / 2,
        ];
        setMapCenter(pdfCenter);
        setMapZoom(14);
        pdfLoaded = true;

        const pdfResult = await processPDFForMapOverlay(
          file.files.orthophoto.uri,
          coordinates,
          true
        );

        if (!pdfResult.error && pdfResult.bounds && mounted) {
          pdfCenter = pdfResult.center;
          pdfZoom = pdfResult.zoom;

          if (pdfResult.needsConversion) {
            setPdfUriForConversion(file.files.orthophoto.uri);
            setShowPdfConverter(true);
          }

          setPdfOverlayData({
            imageBase64: pdfResult.imageBase64 || null,
            bounds: pdfResult.bounds,
            center: pdfResult.center,
            zoom: pdfResult.zoom,
          });
        }
      }

      return { pdfLoaded, pdfCenter, pdfZoom };
    } catch (error) {
      console.error("Error processing PDF:", error);
      return { pdfLoaded };
    }
  };

  // Block model loading function
  const loadBlockModelData = async (
    file: FileService.MiningDataFile,
    mounted: boolean
  ): Promise<void> => {
    if (!file.files.blockModel || !mounted) return;

    setLoadingMessage("Loading block model data...");
    setLoadingProgress(0.4);

    try {
      const csvData = await FileService.parseCSVFile(file.files.blockModel.uri);
      const rawBlockModelData = csvData.slice(3);

      if (!mounted) return;

      // Store raw data in ref for later use with attribute changes
      rawBlockModelDataRef.current = rawBlockModelData;

      // Get attributes for selection UI
      const sampleBlock = rawBlockModelData[0];
      const processedAttributes = extractBlockModelAttributes(sampleBlock);
      setProcessedAttributeViewing(processedAttributes);

      const filteredAttributes =
        getStringFieldsWithUniqueValues(rawBlockModelData);
      setPickingAttributes(filteredAttributes);

      // Process block model with current attribute
      processBlockModelWithAttribute(rawBlockModelData, pickedAttribute);

      // Set loading progress
      setLoadingProgress(0.6);
    } catch (error) {
      console.error("Error processing block model:", error);
    }
  };

  // Elevation data loading function
  const loadElevationData = async (
    file: FileService.MiningDataFile,
    mounted: boolean
  ): Promise<void> => {
    if (!file.files.elevation || !mounted) return;

    setLoadingMessage("Loading elevation data...");
    setLoadingProgress(0.7);

    try {
      const rawElevationData = await FileService.parseLiDARFile(
        file.files.elevation.uri,
        { maxPoints: 30000 }
      );

      // Create bounding box from block model if available
      const blockModelBoundingBox =
        blockModelData.length > 0
          ? createBoundingBoxFromBlockModel(blockModelData, 100)
          : null;

      const processedElev = processElevationData(
        rawElevationData,
        sourceProjection,
        "lon",
        "lat",
        "z",
        blockModelBoundingBox
      );

      if (mounted) {
        setElevationData(processedElev);
        setProcessedElevation(processedElev);
        setHasElevationData(true); // Set this BEFORE centering logic

        // Calculate center from elevation data if no other data has set center
        if (processedElev.length > 0) {
          // Check current map center - if it's still at default, update it
          const currentCenter = mapCenter;
          const isDefaultCenter =
            (currentCenter[0] === 0 && currentCenter[1] === 0) ||
            (currentCenter[0] === -2.5 && currentCenter[1] === 120);

          // Only update center if:
          // 1. We're at default center, OR
          // 2. No PDF was loaded AND no block model exists
          if (
            isDefaultCenter ||
            (!pdfLoadedRef.current && blockModelData.length === 0)
          ) {
            const lats = processedElev.map((p) => p.lat);
            const lngs = processedElev.map((p) => p.lng);

            if (lats.length > 0 && lngs.length > 0) {
              const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
              const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

              console.log("Setting map center from elevation data:", [
                centerLat,
                centerLng,
              ]);
              setMapCenter([centerLat, centerLng]);
              setMapZoom(14);
            }
          }
        }
      }

      setLoadingProgress(0.8);
    } catch (error) {
      console.error("Error processing elevation data:", error);
    }
  };

  // Pit data loading function
  const loadPitData = async (
    file: FileService.MiningDataFile,
    mounted: boolean
  ): Promise<void> => {
    if (!file.files.pit || !mounted) return;

    setLoadingMessage("Loading pit boundary data...");
    setLoadingProgress(0.9);

    try {
      const rawPitData = await FileService.parseLiDARFile(file.files.pit.uri);
      if (!mounted) return;

      // Process pit data immediately
      const pitDataFormat = rawPitData.map((point) => ({
        x: point.lon || 0,
        y: point.lat || 0,
        z: point.z || 0,
        interior: 1,
        none: 0,
        type: 0,
      }));

      const pitDataSample =
        pitDataFormat.length > 10000
          ? pitDataFormat.filter(
              (_, i) => i % Math.ceil(pitDataFormat.length / 10000) === 0
            )
          : pitDataFormat;

      const result = processPitDataToGeoJSON(pitDataSample, sourceProjection);

      if (result && mounted) {
        setPitGeoJsonData(result);
        setProcessedPitData(result);

        // Extract elevation range
        const elevations = rawPitData.map((point) =>
          parseFloat(String(point.z))
        );
        const validElevations = elevations.filter((e) => !isNaN(e));

        if (validElevations.length > 0) {
          const minElev = Math.min(...validElevations);
          const maxElev = Math.max(...validElevations);
          setElevationRange({ min: minElev, max: maxElev });
        }

        // Calculate center from pit data if no other data has set the center
        if (rawPitData.length > 0) {
          // Extract coordinates from the GeoJSON result for more accurate centering
          let allCoordinates: number[][] = [];

          if (result.features && result.features.length > 0) {
            result.features.forEach((feature: any) => {
              if (feature.geometry && feature.geometry.coordinates) {
                if (feature.geometry.type === "LineString") {
                  allCoordinates = allCoordinates.concat(
                    feature.geometry.coordinates
                  );
                }
              }
            });
          }

          if (allCoordinates.length > 0) {
            const lngs = allCoordinates.map((coord) => coord[0]);
            const lats = allCoordinates.map((coord) => coord[1]);

            // Check current map center - if it's still at default, update it
            const currentCenter = mapCenter;
            const isDefaultCenter =
              (currentCenter[0] === 0 && currentCenter[1] === 0) ||
              (currentCenter[0] === -2.5 && currentCenter[1] === 120);

            // Only update center if we're at default position
            if (
              isDefaultCenter ||
              (!pdfLoadedRef.current &&
                blockModelData.length === 0 &&
                !hasElevationData)
            ) {
              const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
              const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

              console.log("Setting map center from pit data:", [
                centerLat,
                centerLng,
              ]);
              setMapCenter([centerLat, centerLng]);
              setMapZoom(14);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing pit data:", error);
    }
  };

  const processBlockModelWithAttribute = (
    rawData: any[] | null,
    attribute: Record<string, string[]> | null
  ): void => {
    if (!rawData) return;

    // Process block model for visualization
    const resultForTopDown = blockModelToGeoJSON(
      rawData,
      sourceProjection,
      true, // top elevation only for display
      attribute || undefined
    );

    const resultForCrossSection = blockModelToGeoJSON(
      rawData,
      sourceProjection,
      false, // all blocks for cross-section
      attribute || undefined
    );

    // Set visualization data
    setBlockModelData(rawData);
    setFullBlockModelData(rawData);
    setGeoJsonData(resultForTopDown.geoJsonData);
    setProcessedBlockModel(resultForCrossSection.geoJsonData);
    setHasBlockModelData(true);

    // Update map center only if no PDF was loaded
    if (!pdfLoadedRef.current && mountedRef.current) {
      setMapCenter(resultForTopDown.mapCenter);
      setMapZoom(resultForTopDown.mapZoom);
    }

    // Update rock type legend
    updateRockTypeLegend(resultForTopDown.geoJsonData);
  };

  // Separate effect for pickedAttribute changes
  useEffect(() => {
    if (rawBlockModelDataRef.current) {
      // Only run visualization processing when pickedAttribute changes
      processBlockModelWithAttribute(
        rawBlockModelDataRef.current,
        pickedAttribute
      );
    }
  }, [pickedAttribute]);

  // Back handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isCreateLineMode) {
          setIsCreateLineMode(false);
          setSelectedPoints([]);
          setLineLength(0);
          processedMessagesRef.current.clear();
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [isCreateLineMode]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      clearData();
    };
  }, []);

  // Helper functions
  const updateRockTypeLegend = (geoJsonData: any) => {
    if (!geoJsonData || !geoJsonData.features) return;

    // Get current attribute type and values
    const currentAttributeType = pickedAttribute
      ? Object.keys(pickedAttribute)[0]
      : null;
    const currentAttributeValues =
      currentAttributeType && pickedAttribute
        ? pickedAttribute[currentAttributeType]
        : [];

    const rockTypes = new Set<string>();
    const colorsAndOpacity: {
      [key: string]: { color: string; opacity: number };
    } = {};

    geoJsonData.features.forEach((feature: any) => {
      if (feature.properties && feature.properties.rock) {
        // Hanya tambahkan tipe rock yang ada dalam attribute values yang dipilih saat ini
        if (
          !currentAttributeValues.length ||
          currentAttributeValues.includes(feature.properties.rock)
        ) {
          rockTypes.add(feature.properties.rock);
          if (feature.properties.color) {
            colorsAndOpacity[feature.properties.rock] = {
              color: feature.properties.color,
              opacity: feature.properties.opacity || 0.7,
            };
          }
        }
      }
    });

    const newLegend: { [key: string]: { color: string; opacity: number } } = {};
    rockTypes.forEach((rockType) => {
      newLegend[rockType] = colorsAndOpacity[rockType] || {
        color: "#3388ff",
        opacity: 0.7,
      };
    });

    setRockTypeLegend(newLegend);
  };

  // Event handlers
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

  const handlePdfImageReady = useCallback(
    (imageBase64: string) => {
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

  const handleMapPress = useCallback((point: any) => {
    if (point.lat !== undefined && point.lng !== undefined) {
      setCoordinates({
        lat: point.lat || 0,
        lng: point.lng || 0,
        x: point.lng || 0,
        y: point.lat || 0,
      });
    }

    if (point.isFirstPoint && point.point) {
      const pointKey = point.pointKey || JSON.stringify(point.point);
      if (!processedMessagesRef.current.has(pointKey)) {
        processedMessagesRef.current.add(pointKey);
        setSelectedPoints([point.point]);
      }
    }

    if (point.isLineComplete && point.points) {
      const lineKey = point.lineKey || JSON.stringify(point.points);
      if (!processedMessagesRef.current.has(lineKey)) {
        processedMessagesRef.current.add(lineKey);
        setSelectedPoints(point.points);
        const distance = calculateLineDistance(point.points);
        setLineLength(Math.round(distance));
      }
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (selectedPoints.length > 0) {
      const newPoints = selectedPoints.slice(0, -1);
      setSelectedPoints(newPoints);
      if (selectedPoints.length <= 1) {
        setLineLength(0);
      }
      processedMessagesRef.current.clear();
    }
  }, [selectedPoints]);

  const handleAddPoint = useCallback(() => {
    if (selectedPoints.length >= 2) {
      setSelectedPoints([]);
      setLineLength(0);
      processedMessagesRef.current.clear();
      return;
    }

    if (addPointFunc) {
      addPointFunc();
    } else {
      const newPoint = [coordinates.lat || 0, coordinates.lng || 0];
      const newPoints = [...selectedPoints, newPoint];
      setSelectedPoints(newPoints);
      if (newPoints.length === 2) {
        const distance = calculateLineDistance(newPoints);
        setLineLength(Math.round(distance));
      }
    }
  }, [addPointFunc, coordinates, selectedPoints]);

  const handleCreateCrossSection = useCallback(() => {
    // Check if there are 2 points
    if (selectedPoints.length !== 2) {
      Alert.alert(
        "Error",
        "Please select exactly 2 points to create a cross section"
      );
      return;
    }

    // No data requirement check - proceed directly
    const colorMappingString = JSON.stringify(customColorMapping);

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
        colorMapping: colorMappingString,
      },
    });
  }, [
    selectedPoints,
    lineLength,
    elevation,
    fileName,
    sourceProjection,
    customColorMapping,
    router,
  ]);

  const toggleRulerMode = useCallback(() => {
    setIsCreateLineMode((prev) => !prev);
    setSelectedPoints([]);
    setLineLength(0);
    processedMessagesRef.current.clear();
  }, []);

  const handleColorChange = useCallback(
    (
      newColorMapping: {
        [key: string]: { color: string; opacity: number };
      },
      callback: () => void
    ) => {
      try {
        setCustomColorMapping(newColorMapping);

        // Apply new colors to existing GeoJSON data
        if (geoJsonData) {
          const updatedGeoJson = applyColorMapping(
            geoJsonData,
            newColorMapping
          );
          setGeoJsonData(updatedGeoJson);
        }

        // Update rock type legend
        if (pickedAttribute) {
          const currentAttributeType = Object.keys(pickedAttribute)[0];
          const currentAttributeValues = pickedAttribute[currentAttributeType];

          const filteredColorMapping: {
            [key: string]: { color: string; opacity: number };
          } = {};
          currentAttributeValues.forEach((value) => {
            if (newColorMapping[value]) {
              filteredColorMapping[value] = newColorMapping[value];
            }
          });

          setRockTypeLegend(filteredColorMapping);
        } else {
          setRockTypeLegend(newColorMapping);
        }

        // Panggil callback langsung tanpa setTimeout
        if (callback) {
          callback();
        }
      } catch (error) {
        console.error("Error applying color changes:", error);
        if (callback) callback();
      }
    },
    [geoJsonData, pickedAttribute]
  );

  const toggleColorPicker = useCallback(() => {
    if (!hasBlockModelData) {
      Alert.alert("No Data", "Block model data is required to change colors");
      return;
    }

    setShowDropdown(false);

    setShowColorPicker(true);
  }, [hasBlockModelData]);

  const toggleDropdown = useCallback(() => {
    // Only show dropdown if there's at least one option available
    const hasAnyOption = hasBlockModelData || pitGeoJsonData || pdfOverlayData;

    if (!hasAnyOption) {
      Alert.alert("No Data", "No layers available to toggle");
      return;
    }

    setShowDropdown((prev) => !prev);
  }, [hasBlockModelData, pitGeoJsonData, pdfOverlayData]);

  const toggleBlockModel = useCallback(() => {
    setShowBlockModel((prev) => !prev);
  }, []);

  const togglePit = useCallback(() => {
    setShowPit((prev) => !prev);
  }, []);

  const togglePDF = useCallback(() => {
    setShowPDF((prev) => !prev);
  }, []);

  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  // Render functions
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

  const renderRockTypeLegend = () => {
    // Always render the legend container, even without data
    let attributeName = "";

    // If pickedAttribute exists and has data, use the first attribute type as the main attribute name
    if (pickedAttribute && Object.keys(pickedAttribute).length > 0) {
      attributeName = Object.keys(pickedAttribute)[0];
      // Capitalize first letter
      attributeName =
        attributeName.charAt(0).toUpperCase() + attributeName.slice(1);
    }

    // Check if we have data
    const hasData = hasBlockModelData && Object.keys(rockTypeLegend).length > 0;
    const hasManyItems = hasData && Object.keys(rockTypeLegend).length > 4;

    return (
      <View style={styles.legendContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.legendTitle}>Block Model Attributes: </Text>
          <Text style={styles.attributeName}>{attributeName}</Text>
        </View>

        {hasData ? (
          <>
            <ScrollView
              horizontal={hasManyItems}
              showsHorizontalScrollIndicator={hasManyItems}
              contentContainerStyle={styles.legendItemsContainer}
            >
              {Object.entries(rockTypeLegend).map(([rockType, config]) => (
                <View key={rockType} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendColor,
                      {
                        backgroundColor: config.color,
                        opacity: config.opacity,
                      },
                    ]}
                  />
                  <Text style={styles.legendText}>
                    {rockType.charAt(0).toUpperCase() + rockType.slice(1)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {hasManyItems && (
              <View style={styles.scrollIndicator}>
                <Text style={styles.scrollIndicatorText}>
                  → scroll for more
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.noDataText}>Block model tidak ada</Text>
        )}
      </View>
    );
  };

  const renderCreateLineInputs = () => (
    <View style={styles.createLineInputs}>
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Length:</Text>
          <TextInput
            style={[
              styles.input,
              selectedPoints.length > 0
                ? { color: "#000000", fontWeight: "600" }
                : {},
            ]}
            value={`${lineLength} m`}
            editable={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Elevation:</Text>
          <TextInput
            style={[
              styles.input,
              selectedPoints.length > 0
                ? { color: "#000000", fontWeight: "600" }
                : {},
            ]}
            value={`${elevation} m`}
            editable={false}
          />
        </View>
      </View>

      <View style={styles.coordinateInput}>
        <Text style={styles.inputLabel}>Point: long, lat</Text>
        <TextInput
          style={[
            styles.input,
            selectedPoints.length > 0
              ? { color: "#000000", fontWeight: "600" }
              : {},
          ]}
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

  const renderCreateLineButtons = () => {
    const canCreateSection = selectedPoints.length === 2;

    return (
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
            !canCreateSection && styles.disabledSectionButton,
          ]}
          onPress={handleCreateCrossSection}
          disabled={!canCreateSection}
        >
          <Text
            style={[
              styles.createSectionButtonText,
              !canCreateSection && styles.disabledButtonText,
            ]}
          >
            Create Cross Section
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

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
              {/* Only show Block Model option if data exists */}
              {hasBlockModelData && (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    showBlockModel && styles.selectedDropdownItem,
                  ]}
                  onPress={toggleBlockModel}
                >
                  <MaterialIcons
                    name={
                      showBlockModel ? "check-box" : "check-box-outline-blank"
                    }
                    size={24}
                    color="#198754"
                  />
                  <Text style={styles.dropdownText}>Block Model</Text>
                </TouchableOpacity>
              )}

              {/* Only show Pit Boundary option if data exists */}
              {pitGeoJsonData && (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    showPit && styles.selectedDropdownItem,
                  ]}
                  onPress={togglePit}
                >
                  <MaterialIcons
                    name={showPit ? "check-box" : "check-box-outline-blank"}
                    size={24}
                    color="#198754"
                  />
                  <Text style={styles.dropdownText}>Pit Boundary</Text>
                </TouchableOpacity>
              )}

              {/* Only show PDF Map option if data exists */}
              {pdfOverlayData && (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    showPDF && styles.selectedDropdownItem,
                  ]}
                  onPress={togglePDF}
                >
                  <MaterialIcons
                    name={showPDF ? "check-box" : "check-box-outline-blank"}
                    size={24}
                    color="#198754"
                  />
                  <Text style={styles.dropdownText}>PDF Map</Text>
                </TouchableOpacity>
              )}

              {/* Only show Block Colours option if block model data exists */}
              {hasBlockModelData && (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    // Jangan langsung tutup dropdown di sini
                    toggleColorPicker(); // Function sudah handle tutup dropdown
                  }}
                >
                  <MaterialIcons name="palette" size={24} color="#198754" />
                  <Text style={styles.dropdownText}>Attribute Colours</Text>
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

      {renderHeader()}

      <View style={styles.content}>
        {loading ? (
          <LoadingScreen message={loadingMessage} progress={loadingProgress} />
        ) : (
          <View style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {isCreateLineMode && renderCreateLineInputs()}

            <View
              style={[
                styles.mapContainer,
                {
                  height: isCreateLineMode
                    ? Dimensions.get("window").height * 0.48
                    : Dimensions.get("window").height * 0.67,
                },
              ]}
            >
              <LeafletMap
                onMapPress={handleMapPress}
                onMapReady={handleMapReady}
                onCoordinateChange={handleCoordinateChange}
                onAddPointFromCrosshair={handleAddPointCallback}
                style={styles.map}
                geoJsonData={showBlockModel && dataReady ? geoJsonData : null}
                pitGeoJsonData={showPit && dataReady ? pitGeoJsonData : null}
                mapCenter={mapCenter}
                mapZoom={mapZoom}
                selectedPoints={selectedPoints}
                isCreateLineMode={isCreateLineMode}
                elevationRange={elevationRange}
                hideInternalCoordinates={true}
                useCrosshairForDrawing={true}
                lineColor="#CFE625"
                pdfOverlayData={showPDF ? pdfOverlayData : null}
                enableGeolocation={true}
              />

              <View style={styles.crosshair}>
                <View style={styles.crosshairVerticalOuter} />
                <View style={styles.crosshairHorizontalOuter} />
                <View style={styles.crosshairVertical} />
                <View style={styles.crosshairHorizontal} />
              </View>
            </View>

            {!isCreateLineMode && renderRockTypeLegend()}

            {isCreateLineMode ? (
              renderCreateLineButtons()
            ) : (
              <View style={styles.controlsContainer}>
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
                        ? `x: ${(coordinates?.lng || 0).toFixed(5)}, y: ${(
                            coordinates?.lat || 0
                          ).toFixed(5)}`
                        : "..."}
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
          </View>
        )}
      </View>

      {showPdfConverter && pdfUriForConversion && (
        <PDFToImageConverter
          pdfUri={pdfUriForConversion}
          onImageReady={handlePdfImageReady}
          onError={handlePdfConversionError}
        />
      )}

      {showColorPicker && (
        <ColorPickerDialog
          visible={showColorPicker}
          onClose={() => setShowColorPicker(false)}
          onColorChange={handleColorChange}
          rockTypes={rockTypeLegend}
          currentColors={
            Object.keys(customColorMapping).length > 0
              ? customColorMapping
              : rockTypeLegend
          }
          pickingAttributes={pickingAttributes}
        />
      )}

      {renderDropdown()}
    </SafeAreaView>
  );
}

// Styles with responsive fixes
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
  attributeGroupTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
    color: "#333",
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
    color: "#000000",
    fontWeight: "500",
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
    paddingVertical: 8,
    paddingBottom: 16,
    marginTop: "auto",
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
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
    paddingHorizontal: 15,
    marginTop: "auto",
    marginBottom: 10,
    flex: 1,
    justifyContent: "flex-end",
  },
  coordinatesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 0,
    paddingVertical: 10,
    paddingHorizontal: 0, // Remove horizontal padding
  },
  rulerButton: {
    width: 40,
    height: 40,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 0, // Ensure no extra margin
  },
  layersButton: {
    width: 40,
    height: 40,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 0, // Ensure no extra margin
  },
  coordinatesDisplay: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 15, // Reduced from 20
    paddingVertical: 10,
    borderRadius: 25,
    marginHorizontal: 10,
    alignItems: "center",
    alignSelf: "center",
    flex: 1, // Make it flexible
    maxWidth: 300, // Set max width instead of min
  },
  coordinatesText: {
    fontSize: 14, // Slightly smaller font
    color: "#333",
    fontFamily: "Montserrat_500Medium",
    letterSpacing: 0.3, // Reduced letter spacing
    textAlign: "center", // Center text
  },
  legendContainer: {
    backgroundColor: "#f9f9f9",
    marginHorizontal: 20,
    marginVertical: 5,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  legendTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
  },
  attributeName: {
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    color: "#333",
  },
  // New container for ScrollView
  legendItemsContainer: {
    flexDirection: "row",
    flexWrap: "nowrap", // Important: don't wrap when in scrollview
    paddingRight: 10, // Add some padding for scrolling
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
    marginBottom: 8,
    minWidth: 60,
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 3,
    marginRight: 6,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.1)",
  },
  legendText: {
    fontSize: 13,
    color: "#333",
    fontFamily: "Montserrat_400Regular",
  },
  // New style for scroll indicator
  scrollIndicator: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  scrollIndicatorText: {
    fontSize: 11,
    color: "#888",
    fontStyle: "italic",
    fontFamily: "Montserrat_400Regular",
  },
  attributeGroup: {
    marginBottom: 12,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  dropdownContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    position: "absolute",
    bottom: 120,
    right: 20,
    padding: 16,
    minWidth: 180,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedDropdownItem: {
    backgroundColor: "rgba(25, 135, 84, 0.08)",
    borderColor: "rgba(25, 135, 84, 0.2)",
  },
  noDataText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: 16,
    color: "#495057",
    marginLeft: 12,
    fontFamily: "Montserrat_400Regular",
  },
  colorPickerItem: {
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    marginTop: 8,
    paddingTop: 12,
  },
  warningText: {
    fontSize: 12,
    color: "#FF6B6B",
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
  disabledButtonText: {
    color: "#999",
  },
  preparingContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  preparingText: {
    marginTop: 15,
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#333",
  },
});
