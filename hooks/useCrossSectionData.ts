import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useMiningData } from "../context/MiningDataContext";
import {
  filterBlocksForCrossSection,
  filterElevationForCrossSection,
  filterPitForCrossSection,
} from "../utils/crossSectionUtils";

interface UseCrossSectionDataProps {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  length: number;
  projection: string;
}

export const useCrossSectionData = ({
  startLat,
  startLng,
  endLat,
  endLng,
  length,
  projection,
}: UseCrossSectionDataProps) => {
  // State for loading
  const [loading, setLoading] = useState(true);

  // State for data
  const [blockModelData, setBlockModelData] = useState<any[]>([]);
  const [elevationData, setElevationData] = useState<any[]>([]);
  const [pitData, setPitData] = useState<any[]>([]);

  // Get data from context
  const { fullBlockModelData, processedElevation, processedPitData } =
    useMiningData();

  // Load and filter data for cross-section
  const loadCrossSectionData = useCallback(async () => {
    try {
      setLoading(true);

      // First, check if we have block model data
      if (fullBlockModelData && fullBlockModelData.length > 0) {
        console.log(
          `Preparing ${fullBlockModelData.length} blocks for cross-section`
        );

        // Direct mapping without filtering (WebView will handle filtering)
        const extractedBlocks = fullBlockModelData.map((block) => ({
          centroid_x: parseFloat(block.centroid_x || block.x || 0),
          centroid_y: parseFloat(block.centroid_y || block.y || 0),
          centroid_z: parseFloat(block.centroid_z || block.z || 0),
          dim_x: parseFloat(block.dim_x || block.xinc ||block.width || 10),
          dim_y: parseFloat(block.dim_y || block.yinc ||block.length || 10),
          dim_z: parseFloat(block.dim_z || block.zinc ||block.height || 10),
          rock: block.rock || "unknown",
          color: block.color || getRockColor(block.rock || "unknown"),
        }));

        // Sample data if too large
        if (extractedBlocks.length > 10000) {
          const samplingRate = Math.ceil(extractedBlocks.length / 10000);
          const sampledBlocks = extractedBlocks.filter(
            (_, i) => i % samplingRate === 0
          );
          console.log(
            `Sampled ${sampledBlocks.length} blocks from ${extractedBlocks.length}`
          );
          setBlockModelData(sampledBlocks);
        } else {
          setBlockModelData(extractedBlocks);
        }
        console.log(`Passing ${extractedBlocks.length} blocks to WebView`);
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

  // Load data on component mount
  useEffect(() => {
    loadCrossSectionData();
  }, [loadCrossSectionData]);

  return {
    loading,
    blockModelData,
    elevationData,
    pitData,
    setLoading,
  };
};
