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

    // console.log("processedBlockModel", processedBlockModel);
    // console.log("jumlah processedElevation", processedBlockModel.length);
    // console.log("processedElevation", processedElevation);
    // console.log("processedPitData", processedPitData);

  useEffect(() => {
    loadCrossSectionData();
  }, []);

  // In your CrossSectionViewScreen.tsx file
// Replace the loadCrossSectionData function with this updated version:

const loadCrossSectionData = async () => {
  try {
    setLoading(true);
    console.log("Loading cross section data...");

    // First, check if processedBlockModel actually has features
    if (processedBlockModel?.features && processedBlockModel.features.length > 0) {
      console.log("Using processedBlockModel from context with", processedBlockModel.features.length, "features");
      
      // Transform the data to match what CrossSectionWebView expects
      const extractedBlocks = processedBlockModel.features.map(
        (f) => {
          // Make sure properties exist and extract the necessary fields
          const props = f.properties || {};
          return {
            centroid_x: props.centroid_x !== undefined ? Number(props.centroid_x) : 0,
            centroid_y: props.centroid_y !== undefined ? Number(props.centroid_y) : 0,
            centroid_z: props.centroid_z !== undefined ? Number(props.centroid_z) : 0,
            dim_x: props.dim_x !== undefined ? Number(props.dim_x) : 25,
            dim_y: props.dim_y !== undefined ? Number(props.dim_y) : 25,
            dim_z: props.dim_z !== undefined ? Number(props.dim_z) : 2,
            rock: props.rock || "unknown",
            color: props.color || "#CCCCCC",
          };
        }
      );
      
      console.log("Transformed block data:", extractedBlocks.length, "items");
      // Log first item to check structure
      if (extractedBlocks.length > 0) {
        console.log("Sample block:", JSON.stringify(extractedBlocks[0]));
      }
      
      setBlockModelData(extractedBlocks);
    } else {
      console.log("No processed block model data in context, trying to load from file...");
      
      // Load file data
      const files = await FileService.getFileInfo();
      console.log("files found:", files?.length || 0);

      const file = files.find((f) => f.name === fileName);
      
      if (!file) {
        console.warn("File not found:", fileName);
        setBlockModelData([]);
        setLoading(false);
        return;
      }

      console.log("Found file:", file.name);

      // Load block model data from file
      if (file.files && file.files.blockModel) {
        console.log("Loading block model from:", file.files.blockModel.uri);
        try {
          const blockModelData = await FileService.parseCSVFile(
            file.files.blockModel.uri
          );
          
          if (blockModelData && blockModelData.length > 3) {
            console.log("Loaded block model with", blockModelData.length, "rows");
            
            // Skip header rows and process data
            const processedData = blockModelData.slice(3).map(item => ({
              ...item,
              // Ensure numeric values
              centroid_x: Number(item.centroid_x || 0),
              centroid_y: Number(item.centroid_y || 0),
              centroid_z: Number(item.centroid_z || 0),
              dim_x: Number(item.dim_x || 10),
              dim_y: Number(item.dim_y || 10),
              dim_z: Number(item.dim_z || 10)
            }));
            
            console.log("Processed block model data:", processedData.length);
            setBlockModelData(processedData);
          } else {
            console.warn("Block model data is empty or too short");
            setBlockModelData([]);
          }
        } catch (error) {
          console.error("Error parsing block model file:", error);
          setBlockModelData([]);
        }
      } else {
        console.warn("No block model file found in the file object");
        setBlockModelData([]);
      }

      // Just pass through the elevation data
      if (processedElevation) {
        setElevationData(processedElevation);
      } else {
        setElevationData([]);
      }

      // For pit data, extract basic properties
      if (processedPitData?.features && processedPitData.features.length > 0) {
        const extractedPitData = processedPitData.features.map(
          (f) => ({
            level: f.properties?.level || 0,
            x: f.geometry?.coordinates?.[0]?.[0] || 0,
            y: f.geometry?.coordinates?.[0]?.[1] || 0,
            z: f.properties?.level || 0,
          })
        );
        console.log("Extracted pit data:", extractedPitData.length);
        setPitData(extractedPitData);
      } else {
        setPitData([]);
      }

      setLoading(false);
      return;
    }
    
    // If no context data, try to load from files
    console.log("No context data, loading from files...");
    
    // Load file data
    const files = await FileService.getFileInfo();
    console.log("files:", files);

    const file = files.find((f) => f.name === fileName);
    console.log("file:", file);

    if (!file) {
      Alert.alert("Error", "File data not found");
      setLoading(false);
      return;
    }

    // Load block model data
    if (file.files.blockModel) {
      console.log("Loading block model from file:", file.files.blockModel.uri);
      const blockModelData = await FileService.parseCSVFile(
        file.files.blockModel.uri
      );
      console.log("Block model data loaded:", blockModelData?.length || 0, "rows");
      
      // Make sure we have data and skip header rows
      if (blockModelData && blockModelData.length > 3) {
        const processedData = blockModelData.slice(3).map(item => ({
          ...item,
          // Ensure numeric values are numbers not strings
          centroid_x: Number(item.centroid_x || 0),
          centroid_y: Number(item.centroid_y || 0),
          centroid_z: Number(item.centroid_z || 0),
          dim_x: Number(item.dim_x || 10),
          dim_y: Number(item.dim_y || 10),
          dim_z: Number(item.dim_z || 10)
        }));
        
        console.log("Processed block model data:", processedData.length, "items");
        setBlockModelData(processedData);
      } else {
        console.warn("Block model data is empty or too short");
        setBlockModelData([]);
      }
    } else {
      console.warn("No block model file found");
      setBlockModelData([]);
    }

    // Load elevation data
    if (file.files.elevation) {
      const elevationData = await FileService.parseLiDARFile(
        file.files.elevation.uri
      );
      setElevationData(elevationData || []);
    } else {
      setElevationData([]);
    }

    // Load pit data
    if (file.files.pit) {
      const pitData = await FileService.parseLiDARFile(
        file.files.pit.uri
      );
      setPitData(pitData || []);
    } else {
      setPitData([]);
    }

    setLoading(false);
  } catch (error) {
    console.error("Error loading cross section data:", error);
    // Set empty arrays to prevent undefined values
    setBlockModelData([]);
    setElevationData([]);
    setPitData([]);
    setLoading(false);
    Alert.alert("Error", "Failed to load cross section data");
  }
};

// Add a debugging useEffect to check the data after it's set
useEffect(() => {
  console.log("blockModelData updated:", blockModelData?.length || 0, "items");
  if (blockModelData && blockModelData.length > 0) {
    console.log("Sample block model item:", JSON.stringify(blockModelData[0]).substring(0, 200));
  }
}, [blockModelData]);

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
                // sourceProjection={projection}
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
