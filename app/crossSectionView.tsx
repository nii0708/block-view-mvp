import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as FileService from "../services/FileService";
import LoadingScreen from "../components/LoadingScreen";
import CrossSectionWebView from "../components/CrossSectionWebView";
import { useMiningData } from "../context/MiningDataContext";

interface GeoJSONFeature {
  type: string;
  properties: {
    [key: string]: any;
    level?: number;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}

export default function CrossSectionViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dataLoadedRef = useRef(false);

  // Parse parameters from TopDownView
  const startLat = parseFloat((params.startLat as string) || "0");
  const startLng = parseFloat((params.startLng as string) || "0");
  const endLat = parseFloat((params.endLat as string) || "0");
  const endLng = parseFloat((params.endLng as string) || "0");
  const length = parseFloat((params.length as string) || "0");
  const fileName = params.fileName as string;
  const projection = params.projection as string;

  // State for data
  const [loading, setLoading] = useState(true);
  const [blockModelData, setBlockModelData] = useState<any[]>([]);
  const [elevationData, setElevationData] = useState<any[]>([]);
  const [pitData, setPitData] = useState<any[]>([]);

  const {
    processedBlockModel,
    processedElevation,
    processedPitData,
    fullBlockModelData,
  } = useMiningData();

  // Load data only once when component mounts
  useEffect(() => {
    if (!dataLoadedRef.current) {
      dataLoadedRef.current = true;
      loadCrossSectionData();
    }
  }, []);

  const loadCrossSectionData = useCallback(async () => {
    try {
      setLoading(true);

      // First check if we have the full block model data in context
      if (fullBlockModelData && fullBlockModelData.length > 0) {
        console.log(
          "Using full block model data from context:",
          fullBlockModelData.length,
          "blocks"
        );

        // Extract the block data needed for visualization
        const extractedBlocks = fullBlockModelData.map((block) => ({
          centroid_x: parseFloat(block.centroid_x || block.x || 0),
          centroid_y: parseFloat(block.centroid_y || block.y || 0),
          centroid_z: parseFloat(block.centroid_z || block.z || 0),
          dim_x: parseFloat(block.dim_x || block.width || 10),
          dim_y: parseFloat(block.dim_y || block.length || 10),
          dim_z: parseFloat(block.dim_z || block.height || 10),
          rock: block.rock || "unknown",
          color: block.color || getColorForRock(block.rock || "unknown"),
        }));

        setBlockModelData(extractedBlocks);
      }
      // If no full data, check if we have processed data
      else if (processedBlockModel || processedElevation || processedPitData) {
        console.log("Using previously processed data from context");

        // Try to extract block data from processed features
        if (processedBlockModel?.features) {
          const extractedBlocks = processedBlockModel.features.map(
            (f: GeoJSONFeature) => {
              // Extract just the properties needed for visualization
              const props = f.properties || {};
              return {
                centroid_x: props.centroid_x || 0,
                centroid_y: props.centroid_y || 0,
                centroid_z: props.centroid_z || 0,
                dim_x: props.dim_x || 10,
                dim_y: props.dim_y || 10,
                dim_z: props.dim_z || 10,
                rock: props.rock || "unknown",
                color: props.color || "#CCCCCC",
              };
            }
          );
          setBlockModelData(extractedBlocks);
        }

        // Just pass through the elevation data
        if (processedElevation) {
          setElevationData(processedElevation);
        }

        // For pit data, extract basic properties
        if (processedPitData?.features) {
          const extractedPitData = processedPitData.features.map(
            (f: GeoJSONFeature) => ({
              level: f.properties?.level || 0,
              // Use first coordinate point
              x: f.geometry?.coordinates?.[0]?.[0] || 0,
              y: f.geometry?.coordinates?.[0]?.[1] || 0,
              z: f.properties?.level || 0,
            })
          );
          setPitData(extractedPitData);
        }
      } else {
        // No data in context, need to load from files
        console.log("No data in context, loading from files");

        // Load file data
        const files = await FileService.getFileInfo();
        const file = files.find((f) => f.name === fileName);

        if (!file) {
          Alert.alert("Error", "File data not found");
          return;
        }

        // Load block model data
        if (file.files.blockModel) {
          const blockModelData = await FileService.parseCSVFile(
            file.files.blockModel.uri
          );
          // Skip header rows
          const parsedBlocks = blockModelData.slice(3).map((block: any) => ({
            centroid_x: parseFloat(block.centroid_x || block.x || 0),
            centroid_y: parseFloat(block.centroid_y || block.y || 0),
            centroid_z: parseFloat(block.centroid_z || block.z || 0),
            dim_x: parseFloat(block.dim_x || block.width || 10),
            dim_y: parseFloat(block.dim_y || block.length || 10),
            dim_z: parseFloat(block.dim_z || block.height || 10),
            rock: block.rock || "unknown",
            color: getColorForRock(block.rock || "unknown"),
          }));
          setBlockModelData(parsedBlocks);
        }

        // Load elevation data
        if (file.files.elevation) {
          const elevationData = await FileService.parseLiDARFile(
            file.files.elevation.uri
          );
          setElevationData(elevationData);
        }

        // Load pit data
        if (file.files.pit) {
          const pitData = await FileService.parseLiDARFile(file.files.pit.uri);
          setPitData(pitData);
        }
      }
    } catch (error) {
      console.error("Error loading cross section data:", error);
      Alert.alert("Error", "Failed to load cross section data");
    } finally {
      setLoading(false);
    }
  }, [
    fileName,
    fullBlockModelData,
    processedBlockModel,
    processedElevation,
    processedPitData,
  ]);

  // Helper function to provide consistent colors for rock types
  const getColorForRock = (rockType: string): string => {
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

  // Handle back button
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Handle home button
  const handleHome = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cross Section View</Text>
        <TouchableOpacity style={styles.iconButton} onPress={handleHome}>
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
            </View>

            {/* Cross Section WebView */}
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
              />
            </View>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  iconButton: {
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
  graphContainer: {
    flex: 1,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
});
