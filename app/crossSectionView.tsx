import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
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

  // State for loading and export dialog
  const [loading, setLoading] = useState(true);
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // State for data
  const [blockModelData, setBlockModelData] = useState<any[]>([]);
  const [elevationData, setElevationData] = useState<any[]>([]);
  const [pitData, setPitData] = useState<any[]>([]);

  // NEW: State for processed data counts (what's actually displayed)
  const [displayedDataCounts, setDisplayedDataCounts] = useState({
    displayedBlocks: 0,
    displayedElevationPoints: 0,
    displayedPitPoints: 0,
  });

  // Get data from context
  const { fullBlockModelData, processedElevation, processedPitData } =
    useMiningData();

  // Load data on component mount
  useEffect(() => {
    loadCrossSectionData();
  }, []);

  // Load and filter data for cross-section
  const loadCrossSectionData = useCallback(async () => {
    try {
      setLoading(true);

      // First, check if we have block model data
      if (fullBlockModelData && fullBlockModelData.length > 0) {
        // console.log(
        //   `Preparing ${fullBlockModelData.length} blocks for cross-section`
        // );

        // Direct mapping without filtering (WebView will handle filtering)
        const extractedBlocks = fullBlockModelData.map((block) => ({
          centroid_x: parseFloat(block.centroid_x || block.x || 0),
          centroid_y: parseFloat(block.centroid_y || block.y || 0),
          centroid_z: parseFloat(block.centroid_z || block.z || 0),
          dim_x: parseFloat(block.dim_x || block.width || 10),
          dim_y: parseFloat(block.dim_y || block.length || 10),
          dim_z: parseFloat(block.dim_z || block.height || 10),
          rock: block.rock || "unknown",
          color: block.color || getRockColor(block.rock || "unknown"),
          concentrate: parseFloat(block.ni_ok || block.ni_ok || 0)
        }));

        // console.log("concentrate", extractedBlocks[0])

        setBlockModelData(extractedBlocks);
        // console.log(`Passing ${extractedBlocks.length} blocks to WebView`);
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

      setLoading(false);
    } catch (error) {
      console.error("Error loading cross section data:", error);
      Alert.alert("Error", "Failed to load cross section data");
      setLoading(false);
    }
  }, [fullBlockModelData, processedElevation, processedPitData]);

  // Helper function to get color for rock type
  const getRockColor = (rockType: string): string => {
    const rockColors: { [key: string]: string } = {
      ore: "#b40c0d", // Red
      waste: "#606060", // Gray
      overburden: "#a37c75", // Brown
      lim: "#045993", // Blue
      sap: "#75499c", // Purple
      unknown: "#CCCCCC", // Light gray
    };

    return rockColors[rockType.toLowerCase()] || "#CCCCCC";
  };

  // NEW: Handler for processed data from WebView
  const handleDataProcessed = useCallback(
    (data: {
      displayedBlocks: number;
      displayedElevationPoints: number;
      displayedPitPoints: number;
    }) => {
      // console.log("Received processed data counts:", data);
      setDisplayedDataCounts(data);
    },
    []
  );

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

  // Handle export data
  const handleExport = useCallback(
    async (dataType: string) => {
      try {
        setIsExporting(true);

        // Prepare the data to export based on the selection
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
          case "all":
            dataToExport = {
              metadata: {
                startPoint: { lat: startLat, lng: startLng },
                endPoint: { lat: endLat, lng: endLng },
                length: length,
                projection: projection,
                exportDate: new Date().toISOString(),
              },
              blockModelData: blockModelData,
              elevationData: elevationData,
              pitData: pitData,
            };
            fileName = `cross_section_all_${new Date().getTime()}.json`;
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
      pitData,
      startLat,
      startLng,
      endLat,
      endLng,
      length,
      projection,
    ]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header - Updated to match coordinateSelection.tsx */}
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
            {/* Cross Section Info - UPDATED to show displayed data counts */}
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
              {/* Cross Section WebView - Now takes all available space */}
              <View style={styles.graphContainer}>
                <CrossSectionWebView
                  startLat={startLat}
                  startLng={startLng}
                  endLat={endLat}
                  endLng={endLng}
                  blockModelData={blockModelData}
                  elevationData={elevationData}
                  pitData={pitData}
                  lineLength={length}
                  sourceProjection={projection}
                  onDataProcessed={handleDataProcessed} // NEW: Added callback for processed data
                />
              </View>

              {/* Export Button - Now floats at the bottom */}
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
        onExport={handleExport}
        isProcessing={isExporting}
      />
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
    position: "relative", // For absolute positioning of the export button
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
});
