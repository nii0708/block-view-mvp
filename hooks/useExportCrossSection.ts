import { useState, useCallback } from "react";
import { Alert, Share, Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

interface UseExportCrossSectionProps {
  blockModelData: any[];
  elevationData: any[];
  pitData: any[];
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  length: number;
  projection: string;
}

export const useExportCrossSection = ({
  blockModelData,
  elevationData,
  pitData,
  startLat,
  startLng,
  endLat,
  endLng,
  length,
  projection,
}: UseExportCrossSectionProps) => {
  // State for export dialog
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  return {
    exportDialogVisible,
    isExporting,
    handleExportPress,
    handleExportCancel,
    handleExport,
  };
};
