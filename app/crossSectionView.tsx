import React, { useState, useEffect } from "react";
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

  const { processedBlockModel, processedElevation, processedPitData } =
    useMiningData();

  useEffect(() => {
    loadCrossSectionData();
  }, []);

  const loadCrossSectionData = async () => {
    try {
      setLoading(true);

      // If we already have processed data in the context, use it
      if (processedBlockModel || processedElevation || processedPitData) {
        console.log("Using previously processed data from context");
        console.log(
          "Block model data in context:",
          processedBlockModel?.features?.length || 0,
          "features"
        );
        console.log(
          "Elevation data in context:",
          processedElevation?.length || 0,
          "points"
        );
        console.log(
          "Pit data in context:",
          processedPitData?.features?.length || 0,
          "features"
        );

        // Directly use the data without transformation for now
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
          console.log("Extracted block data:", extractedBlocks.length);
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
          console.log("Extracted pit data:", extractedPitData.length);
          setPitData(extractedPitData);
        }

        setLoading(false);
        return;
      }
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
        setBlockModelData(blockModelData.slice(3));
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

      setLoading(false);
    } catch (error) {
      console.error("Error loading cross section data:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to load cross section data");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cross Section View</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push("/")}
        >
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
              <Text style={styles.infoTitle}>Cross Section Details</Text>
              <Text style={styles.infoText}>
                Start: {startLat.toFixed(6)}, {startLng.toFixed(6)}
              </Text>
              <Text style={styles.infoText}>
                End: {endLat.toFixed(6)}, {endLng.toFixed(6)}
              </Text>
              <Text style={styles.infoText}>Length: {length.toFixed(1)} m</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
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
    padding: 10,
    backgroundColor: "#f5f5f5",
    maxHeight: 100,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  infoText: {
    fontSize: 12,
    color: "#333",
    marginBottom: 2,
  },
  zoomControls: {
    position: "absolute",
    top: 110,
    right: 10,
    zIndex: 10,
  },
  zoomButton: {
    width: 40,
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  graphContainer: {
    flex: 1,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
});
