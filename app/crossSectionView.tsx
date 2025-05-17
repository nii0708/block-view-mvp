import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Share,
  Platform,
  Modal,
  FlatList,
  ScrollView,
} from "react-native";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import LoadingScreen from "../components/LoadingScreen";
import { useMiningData } from "../context/MiningDataContext";
import CrossSectionWebView from "../components/CrossSectionWebView";
import ExportDialog from "../components/ExportDialog";

export default function CrossSectionViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse parameters from TopDownView
  const startLat = parseFloat((params.startLat as string) || "0");
  const startLng = parseFloat((params.startLng as string) || "0");
  const endLat = parseFloat((params.endLat as string) || "0");
  const endLng = parseFloat((params.endLng as string) || "0");
  const length = parseFloat((params.length as string) || "0");
  const projection = params.projection as string;

  const colorMappingParam = params.colorMapping as string;
  const customColorMapping = useMemo(() => {
    if (colorMappingParam) {
      try {
        return JSON.parse(colorMappingParam);
      } catch (e) {
        console.error("Error parsing color mapping:", e);
        return {};
      }
    }
    return {};
  }, [colorMappingParam]);

  // State for loading and export dialog
  const [loading, setLoading] = useState(true);
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // State for data
  const [blockModelData, setBlockModelData] = useState<any[]>([]);
  const [elevationData, setElevationData] = useState<any[]>([]);
  const [pitData, setPitData] = useState<any[]>([]);
  const [processedAttribute, setProcessedAttributeViewing] = useState<any[]>(
    []
  );
  const [selectedAttribute, setSelectedAttribute] = useState("ni_ok"); // Default to ni_ok
  const [attributeModalVisible, setAttributeModalVisible] = useState(false);

  // NEW: State for processed data counts (what's actually displayed)
  const [displayedDataCounts, setDisplayedDataCounts] = useState({
    displayedBlocks: 0,
    displayedElevationPoints: 0,
    displayedPitPoints: 0,
  });

  // Get data from context
  const {
    fullBlockModelData,
    processedElevation,
    processedPitData,
    processedAttributeViewing,
  } = useMiningData();

  // Load data on component mount
  useEffect(() => {
    loadCrossSectionData();
  }, [selectedAttribute]);

  // Load and filter data for cross-section
  const loadCrossSectionData = useCallback(async () => {
    try {
      setLoading(true);

      console.log("attribute viewing", processedAttributeViewing);

      // First, check if we have block model data
      if (fullBlockModelData && fullBlockModelData.length > 0) {
        // Direct mapping without filtering (WebView will handle filtering)
        const extractedBlocks = fullBlockModelData.map((block) => ({
          centroid_x: parseFloat(block.centroid_x || block.x || block.X || 0),
          centroid_y: parseFloat(block.centroid_y || block.y || block.Y || 0),
          centroid_z: parseFloat(block.centroid_z || block.z || block.Z || 0),
          dim_x: parseFloat(block.dim_x || block.xinc || block.width || 12.5),
          dim_y: parseFloat(block.dim_y || block.yinc || block.length || 12.5),
          dim_z: parseFloat(block.dim_z || block.zinc || block.height || 1),
          rock: block.rock || "unknown",
          color: block.color || getRockColor(block.rock || "unknown"), // Use updated getRockColor
          concentrate:
            parseFloat(block[selectedAttribute]) === -99
              ? parseFloat(block[selectedAttribute])
              : parseFloat(block[selectedAttribute] || 0).toFixed(2),
        }));

        console.log("extractedBlocks", extractedBlocks[0]);

        setBlockModelData(extractedBlocks);
      }

      // Process elevation data if available
      if (processedElevation && processedElevation.length > 0) {
        // Direct mapping without filtering (WebView will handle filtering)
        setElevationData(processedElevation);
      }

      // Process pit data if available
      if (processedPitData?.features) {
        // Direct mapping without filtering (WebView will handle filtering)
        setPitData(processedPitData.features);
      }

      if (processedAttributeViewing) {
        // Direct mapping without filtering (WebView will handle filtering)
        setProcessedAttributeViewing(processedAttributeViewing);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error loading cross section data:", error);
      Alert.alert("Error", "Failed to load cross section data");
      setLoading(false);
    }
  }, [
    fullBlockModelData,
    processedElevation,
    processedPitData,
    processedAttributeViewing,
    customColorMapping,
    selectedAttribute,
  ]);

  // Helper function to get color for rock type
  const getRockColor = (rockType: string): string => {
    const rockTypeKey = rockType.toLowerCase();

    // Check if custom color mapping exists for this rock type
    if (customColorMapping[rockTypeKey]) {
      return (
        customColorMapping[rockTypeKey].color || customColorMapping[rockTypeKey]
      );
    }

    // Fallback to default colors
    const rockColors: { [key: string]: string } = {
      ore: "#b40c0d", // Red
      waste: "#606060", // Gray
      overburden: "#a37c75", // Brown
      lim: "#045993", // Blue
      sap: "#75499c", // Purple
      unknown: "#CCCCCC", // Light gray
    };

    return rockColors[rockTypeKey] || "#CCCCCC";
  };

  // NEW: Handler for processed data from WebView
  const handleDataProcessed = useCallback(
    (data: {
      displayedBlocks: number;
      displayedElevationPoints: number;
      displayedPitPoints: number;
    }) => {
      setDisplayedDataCounts(data);
    },
    []
  );

  // Function to open attribute selection modal
  const openAttributeModal = useCallback(() => {
    setAttributeModalVisible(true);
  }, []);

  // Function to handle attribute selection
  const handleAttributeSelect = useCallback((attribute: any) => {
    setSelectedAttribute(attribute);
    setAttributeModalVisible(false);
  }, []);

  // Handle home button
  const handleHome = useCallback(() => {
    router.push("/");
  }, [router]);

  // Handle export button press
  const handleExportPress = useCallback(() => {
    setExportDialogVisible(true);
  }, []);

  // Handle export dialog cancel
  const handleExportCancel = useCallback(() => {
    setExportDialogVisible(false);
  }, []);

  // Helper function to export a specific data type
  const exportDataType = async (dataType: string) => {
    let dataToExport: any;
    let fileName: string;

    switch (dataType) {
      case "blockModel":
        dataToExport = blockModelData;
        fileName = `cross_section_blocks_${new Date().getTime()}.json`;
        break;
      case "elevation":
        dataToExport = elevationData;
        fileName = `cross_section_elevation_${new Date().getTime()}.json`;
        break;
      case "pit":
        dataToExport = pitData;
        fileName = `cross_section_pit_${new Date().getTime()}.json`;
        break;
      default:
        throw new Error("Invalid data type selected");
    }

    // Convert data to JSON string
    const jsonString = JSON.stringify(dataToExport, null, 2);

    // Create a file in the temporary directory
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, jsonString);

    // Share the file
    if (Platform.OS === "ios") {
      await Share.share({
        url: fileUri,
        title: "Export Cross Section Data",
      });
    } else {
      // For Android
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Export Cross Section Data",
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    }
  };

  // Reference for WebView to handle screenshot
  const webViewRef = React.useRef<any>(null);

  // Function to trigger screenshot from WebView
  const triggerScreenshot = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.triggerScreenshot();
    }
  }, []);

  // Add zoom handler functions
  const handleZoomIn = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.triggerZoom("in");
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.triggerZoom("out");
    }
  }, []);

  const handleZoomReset = useCallback(() => {
    if (webViewRef.current) {
      webViewRef.current.triggerZoom("reset");
    }
  }, []);

  // Update handleExport to actually trigger screenshot
  const handleExportUpdated = useCallback(
    async (dataTypes: string[]) => {
      try {
        setIsExporting(true);

        // Process each selected export type
        for (const dataType of dataTypes) {
          if (dataType === "screenshot") {
            // Trigger screenshot from WebView
            triggerScreenshot();
          } else {
            // Handle data exports
            await exportDataType(dataType);
          }
        }

        setIsExporting(false);
        setExportDialogVisible(false);
      } catch (error) {
        console.error("Error exporting data:", error);
        Alert.alert(
          "Export Error",
          "Failed to export the data. Please try again."
        );
        setIsExporting(false);
      }
    },
    [
      blockModelData,
      elevationData,
      processedAttribute,
      pitData,
      startLat,
      startLng,
      endLat,
      endLng,
      length,
      projection,
      triggerScreenshot,
    ]
  );

  // Add attribute selection modal component
  const renderAttributeModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={attributeModalVisible}
        onRequestClose={() => setAttributeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Select Concentration Attribute
            </Text>
            <Text style={styles.modalSubtitle}>
              Current:{" "}
              <Text style={styles.selectedAttribute}>{selectedAttribute}</Text>
            </Text>

            <ScrollView style={styles.attributeList}>
              {processedAttributeViewing &&
                processedAttributeViewing.map((attribute: any, index: any) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.attributeItem,
                      selectedAttribute === attribute &&
                        styles.selectedAttributeItem,
                    ]}
                    onPress={() => handleAttributeSelect(attribute)}
                  >
                    <Text style={styles.attributeText}>{attribute}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setAttributeModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cross Section View</Text>
        <TouchableOpacity style={styles.homeButton} onPress={handleHome}>
          <MaterialIcons name="home" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <LoadingScreen message="Generating cross section..." progress={0.5} />
        ) : (
          <>
            {/* Cross Section Info */}
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Start:</Text>
                <Text style={styles.infoValue}>
                  {startLat.toFixed(6)}, {startLng.toFixed(6)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>End:</Text>
                <Text style={styles.infoValue}>
                  {endLat.toFixed(6)}, {endLng.toFixed(6)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Length:</Text>
                <Text style={styles.infoValue}>{length.toFixed(1)} meters</Text>
              </View>
              {/* New row to show and select attribute */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Concentration:</Text>
                <TouchableOpacity onPress={openAttributeModal}>
                  <Text style={styles.attributeSelectButton}>
                    {selectedAttribute}{" "}
                    <MaterialIcons
                      name="arrow-drop-down"
                      size={16}
                      color="#007AFF"
                    />
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Displayed Data:</Text>
                <Text style={styles.infoValue}>
                  {displayedDataCounts.displayedBlocks} blocks,{" "}
                  {displayedDataCounts.displayedElevationPoints} terrain points,{" "}
                  {displayedDataCounts.displayedPitPoints} pit points
                </Text>
              </View>
            </View>

            {/* Graph container with absolute positioned export button */}
            <View style={styles.graphWithExportContainer}>
              {/* Cross Section WebView */}
              <View style={styles.graphContainer}>
                <CrossSectionWebView
                  ref={webViewRef}
                  startLat={startLat}
                  startLng={startLng}
                  endLat={endLat}
                  endLng={endLng}
                  blockModelData={blockModelData}
                  elevationData={elevationData}
                  pitData={pitData}
                  attributeViewing={processedAttribute}
                  lineLength={length}
                  sourceProjection={projection}
                  onDataProcessed={handleDataProcessed}
                  customColorMapping={customColorMapping}
                />
              </View>

              {/* Zoom Controls - Now at React Native layer */}
              <View style={styles.zoomControlsContainer}>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={handleZoomIn}
                >
                  <Text style={styles.zoomButtonText}>+</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={handleZoomOut}
                >
                  <Text style={styles.zoomButtonText}>−</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={handleZoomReset}
                >
                  <Text style={[styles.zoomButtonText, { fontSize: 18 }]}>
                    ⟲
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Export Button */}
              <View style={styles.exportButtonContainer}>
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={handleExportPress}
                >
                  <MaterialCommunityIcons
                    name="export"
                    size={20}
                    color="#333"
                  />
                  <Text style={styles.exportButtonText}>Export Data</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Export Dialog */}
      <ExportDialog
        visible={exportDialogVisible}
        onCancel={handleExportCancel}
        onExport={handleExportUpdated}
        isProcessing={isExporting}
      />
      {renderAttributeModal()}
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
    flex: 1,
  },
  homeButton: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#212529",
    fontWeight: "400",
  },
  graphWithExportContainer: {
    flex: 1,
    position: "relative",
  },
  graphContainer: {
    flex: 1,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  exportButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  exportButton: {
    backgroundColor: "#D9D9D9",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  exportButtonText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
    marginLeft: 16,
  },
  zoomControlsContainer: {
    position: "absolute",
    top: 20,
    right: 16,
    zIndex: 1000,
    backgroundColor: "transparent",
  },
  zoomButton: {
    width: 40,
    height: 40,
    backgroundColor: "white",
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  zoomButtonText: {
    fontSize: 20,
    fontWeight: "normal",
    color: "#333",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    maxHeight: "70%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  selectedAttribute: {
    fontWeight: "bold",
    color: "#007AFF",
  },
  attributeList: {
    maxHeight: 400,
  },
  attributeItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedAttributeItem: {
    backgroundColor: "#f0f8ff",
  },
  attributeText: {
    fontSize: 16,
    color: "#333",
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 5,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  attributeSelectButton: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    flexDirection: "row",
    alignItems: "center",
  },
});
