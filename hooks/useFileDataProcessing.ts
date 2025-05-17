import { useState, useEffect, useCallback } from "react";
import { Alert, InteractionManager } from "react-native";
import { useRouter } from "expo-router";
import * as FileService from "../services/FileService";
import { useMiningData } from "../context/MiningDataContext";
import { blockModelToGeoJSON } from "../utils/blockModelToGeoJSON";
import { processPitDataToGeoJSON } from "../utils/processPitData";
import {
  processElevationData,
  createBoundingBoxFromBlockModel,
} from "../utils/elevationUtils";

interface UseFileDataProcessingProps {
  fileName: string | string[] | undefined;
  projection: string | string[] | undefined;
}

interface FileDataState {
  loading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  mapReady: boolean;
  fileData: FileService.MiningDataFile | null;
  blockModelData: any[];
  lidarData: any[];
  elevationData: any[];
  geoJsonData: any;
  pitGeoJsonData: any;
  mapCenter: number[];
  mapZoom: number;
  elevationRange: { min: number; max: number };
}

export const useFileDataProcessing = ({
  fileName,
  projection,
}: UseFileDataProcessingProps) => {
  const router = useRouter();
  const sourceProjection =
    typeof projection === "string"
      ? projection
      : Array.isArray(projection)
      ? projection[0]
      : "EPSG:32652"; // Default if not provided

  const {
    setProcessedBlockModel,
    setProcessedElevation,
    setProcessedPitData,
    setFullBlockModelData,
    clearData,
  } = useMiningData();

  // State for file data
  const [state, setState] = useState<FileDataState>({
    loading: true,
    loadingProgress: 0,
    loadingMessage: "Loading data...",
    mapReady: false,
    fileData: null,
    blockModelData: [],
    lidarData: [],
    elevationData: [],
    geoJsonData: null,
    pitGeoJsonData: null,
    mapCenter: [0, 0],
    mapZoom: 12,
    elevationRange: { min: 0, max: 1000 },
  });

  // Helper function to update state properties
  const updateState = useCallback((newState: Partial<FileDataState>) => {
    console.log("Updating state:", JSON.stringify(newState));
    setState((prevState) => ({ ...prevState, ...newState }));
  }, []);

  // Process block model data to GeoJSON
  const processBlockModelData = useCallback(() => {
    try {
      console.log("Starting processBlockModelData");
      updateState({
        loadingMessage: "Converting block model data to GeoJSON...",
        loadingProgress: 0.4,
      });

      // Immediate check if we have data
      if (!state.blockModelData || state.blockModelData.length === 0) {
        console.log("No block model data to process");
        updateState({
          loadingProgress: 0.6,
          geoJsonData: null,
        });
        return;
      }

      InteractionManager.runAfterInteractions(() => {
        try {
          console.log(`Processing ${state.blockModelData.length} blocks`);

          // For top-down view, we only need surface blocks
          const resultForTopDown = blockModelToGeoJSON(
            state.blockModelData,
            sourceProjection,
            true // true for topElevationOnly
          );

          // For cross-section view, we need ALL blocks
          const resultForCrossSection = blockModelToGeoJSON(
            state.blockModelData,
            sourceProjection,
            false // false to get all blocks
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
            // Even on error, continue and update loading state
            updateState({
              loadingProgress: 0.6,
            });
            return;
          }

          // Store complete data (for cross-section) in context
          setProcessedBlockModel(resultForCrossSection.geoJsonData);

          // Use filtered data (top elevation only) for top-down view
          updateState({
            geoJsonData: resultForTopDown.geoJsonData,
            mapCenter: resultForTopDown.mapCenter,
            mapZoom: resultForTopDown.mapZoom,
            loadingProgress: 0.6,
          });

          console.log("Block model processing complete");
        } catch (error) {
          console.error("Error processing block model data:", error);
          Alert.alert("Error", "Failed to process block model data");
          // Even on error, continue and update loading state
          updateState({
            loadingProgress: 0.6,
          });
        }
      });
    } catch (error) {
      // Even on error, continue and update loading state
      updateState({
        loadingProgress: 0.6,
      });
    }
  }, [
    state.blockModelData,
    sourceProjection,
    setProcessedBlockModel,
    updateState,
  ]);

  // Process pit/lidar data to GeoJSON
  const processPitData = useCallback(() => {
    try {
      console.log("Starting processPitData");
      updateState({ loadingMessage: "Converting LiDAR data to GeoJSON..." });

      // Immediate check if we have data
      if (!state.lidarData || state.lidarData.length === 0) {
        console.log("No lidar data to process");
        return;
      }

      InteractionManager.runAfterInteractions(() => {
        try {
          console.log(`Processing ${state.lidarData.length} lidar points`);

          // Make sure all fields exist and their data types are correct
          const pitDataFormat = state.lidarData.map((point) => ({
            x: point.lon || point.x || 0,
            y: point.lat || point.y || 0,
            z: point.z || 0,
            interior: 1, // Default value
            none: 0,
            type: 0,
          }));

          // Limit processed data to prevent overload
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

          updateState({ pitGeoJsonData: result });
          console.log("Pit data processing complete");
        } catch (error) {
          console.error("Error processing LiDAR data:", error);
          Alert.alert("Warning", "Failed to process LiDAR data");
        }
      });
    } catch (error) {
      console.error("Error scheduling pit data processing:", error);
    }
  }, [state.lidarData, sourceProjection, setProcessedPitData, updateState]);

  // Load file data
  const loadFileData = useCallback(async () => {
    try {
      console.log("Starting loadFileData");
      updateState({
        loading: true,
        loadingMessage: "Loading file information...",
        loadingProgress: 0.1,
      });

      // Ensure we have a fileName
      if (!fileName) {
        console.log("No fileName provided");
        Alert.alert("Error", "No file name provided");
        router.replace("/");
        return;
      }

      // Log filename for debugging
      console.log(`Loading file: ${String(fileName)}`);

      // Load all files
      const files = await FileService.getFileInfo();
      console.log(`Loaded ${files.length} files`);

      // Find the file with the matching name
      const file = files.find((f) => f.name === String(fileName));

      if (!file) {
        console.log(`File "${fileName}" not found`);
        Alert.alert("Error", `File "${fileName}" not found`);
        router.replace("/");
        return;
      }

      updateState({
        fileData: file,
        loadingProgress: 0.2,
      });

      // Variables to store raw data before processing with explicit type annotations
      let rawBlockModelData: any[] = [];
      let rawElevationData: any[] = [];
      let rawPitData: any[] = [];

      // Load and parse block model data first
      if (file.files.blockModel) {
        updateState({ loadingMessage: "Loading block model data..." });
        try {
          console.log(`Loading block model from ${file.files.blockModel.uri}`);
          const data = await FileService.parseCSVFile(
            file.files.blockModel.uri
          );

          // Skip the header rows (first 3 rows are descriptions)
          rawBlockModelData = data.slice(3);
          console.log(`Loaded ${rawBlockModelData.length} block model rows`);

          updateState({
            blockModelData: rawBlockModelData,
            loadingProgress: 0.3,
          });
          setFullBlockModelData(rawBlockModelData);
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

      // Start processing block model data right away if we have data
      if (rawBlockModelData.length > 0) {
        processBlockModelData();
      } else {
        // Skip processing if no data
        updateState({ loadingProgress: 0.6 });
      }

      // Load and parse elevation data if available
      if (file.files.elevation) {
        updateState({ loadingMessage: "Loading elevation data..." });
        try {
          console.log(
            `Loading elevation data from ${file.files.elevation.uri}`
          );
          // Load raw elevation data with pre-sampling to limit initial data size
          const elevationStartTime = Date.now();
          rawElevationData = await FileService.parseLiDARFile(
            file.files.elevation.uri,
            {
              maxPoints: 30000, // Further reduced point limit
            }
          );
          console.log(`Loaded ${rawElevationData.length} elevation points`);

          // Process elevation data, filtering by block model bounding box
          const processedElevation = processElevationData(
            rawElevationData,
            sourceProjection,
            "lon",
            "lat",
            "z",
            blockModelBoundingBox
          );

          updateState({
            elevationData: processedElevation,
            loadingProgress: 0.8,
          });
          setProcessedElevation(processedElevation);
        } catch (error) {
          console.error("Error processing elevation data:", error);
          Alert.alert("Warning", "Failed to process elevation data");
          // Even on error, continue and update loading progress
          updateState({ loadingProgress: 0.8 });
        }
      } else {
        // Skip processing if no elevation data
        updateState({ loadingProgress: 0.8 });
      }

      // Load and parse LiDAR data for pit boundaries
      if (file.files.pit) {
        updateState({ loadingMessage: "Loading pit boundary data..." });
        try {
          console.log(`Loading pit data from ${file.files.pit.uri}`);
          rawPitData = await FileService.parseLiDARFile(file.files.pit.uri, {
            maxPoints: 10000, // Limit points for better performance
          });
          console.log(`Loaded ${rawPitData.length} pit data points`);

          updateState({
            lidarData: rawPitData,
            loadingProgress: 0.9,
          });

          // Only process pit data if we have some
          if (rawPitData.length > 0) {
            processPitData();
          }
        } catch (error) {
          console.error("Error processing pit data:", error);
          Alert.alert("Warning", "Failed to process pit data");
          // Even on error, continue and update loading progress
          updateState({ loadingProgress: 0.9 });
        }
      } else {
        // Skip processing if no pit data
        updateState({ loadingProgress: 0.9 });
      }

      updateState({ loadingProgress: 1.0 });

      // Wait a moment to show 100% progress, then set loading to false
      setTimeout(() => {
        console.log("Data loading complete");
        updateState({ loading: false });
      }, 500);
    } catch (error) {
      console.error("Error loading file data:", error);
      Alert.alert("Error", "Failed to load file data");
      updateState({ loading: false });
    }
  }, [
    fileName,
    router,
    sourceProjection,
    processBlockModelData,
    setFullBlockModelData,
    setProcessedElevation,
    updateState,
    processPitData,
  ]);

  // Update elevation range based on lidar data
  useEffect(() => {
    if (state.lidarData.length > 0) {
      console.log("Updating elevation range from lidar data");
      // Extract all elevation values
      const elevations = state.lidarData.map((point) =>
        parseFloat(String(point.z))
      );
      const validElevations = elevations.filter((e) => !isNaN(e));

      if (validElevations.length > 0) {
        const minElev = Math.min(...validElevations);
        const maxElev = Math.max(...validElevations);

        // Set to show ENTIRE range initially
        updateState({
          elevationRange: { min: minElev, max: maxElev },
        });
      }
    }
  }, [state.lidarData, updateState]);

  // Initial data loading with safety timeout
  useEffect(() => {
    console.log("Initial load effect triggered");

    // Load data
    loadFileData();

    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      console.log("Safety timeout triggered - forcing loading to complete");
      updateState({ loading: false });
    }, 15000); // 15 seconds safety timeout

    return () => {
      // Clean up timeout and context data when component unmounts
      clearTimeout(safetyTimeout);
      clearData();
    };
  }, [fileName, loadFileData, clearData, updateState]);

  // Function to handle interval slider changes
  const handleSliderChange = useCallback(
    (value: number) => {
      const intervalValue = Math.min(30, Math.max(0, value));

      if (state.lidarData.length > 0) {
        const elevations = state.lidarData.map((point) =>
          parseFloat(String(point.z))
        );
        const validElevations = elevations.filter((e) => !isNaN(e));

        if (validElevations.length > 0) {
          const minElev = Math.min(...validElevations);
          const maxElev = Math.max(...validElevations);
          const range = maxElev - minElev;

          // Calculate new max based on slider
          const intervalPercent = intervalValue / 30;
          const newMax = minElev + range * intervalPercent;

          updateState({
            elevationRange: { min: minElev, max: newMax },
          });
        }
      }
    },
    [state.lidarData, updateState]
  );

  // Handle map ready state
  const handleMapReady = useCallback(() => {
    console.log("Map is ready");
    updateState({ mapReady: true });
  }, [updateState]);

  return {
    ...state,
    handleSliderChange,
    handleMapReady,
    updateState,
  };
};
