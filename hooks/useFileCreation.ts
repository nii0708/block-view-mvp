import { useState } from "react";
import { Alert } from "react-native";
import * as FileService from "../services/FileService";

export default function useFileCreation(onSuccess: () => void) {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [isProcessingInDialog, setIsProcessingInDialog] = useState(false);

  const validateAndCreateFile = async (
    fileName: string,
    blockModelFile: FileService.FileInfo | null,
    lidarFile: FileService.FileInfo | null,
    elevationFile: FileService.FileInfo | null,
    orthophotoFile: FileService.FileInfo | null
  ) => {
    setIsProcessingInDialog(true);

    try {
      // Validate required files
      if (!blockModelFile || !lidarFile) {
        Alert.alert("Error", "Block model and LiDAR files are required.");
        setIsProcessingInDialog(false);
        return;
      }

      // Parse/verify the CSV file
      try {
        await FileService.parseCSVFile(blockModelFile.uri);
      } catch (error) {
        console.error("Error parsing block model file:", error);
        Alert.alert(
          "Error",
          "The block model file format is invalid. Please check the file and try again."
        );
        setIsProcessingInDialog(false);
        return;
      }

      // Parse/verify the LiDAR file
      try {
        await FileService.parseLiDARFile(lidarFile.uri);
      } catch (error) {
        console.error("Error parsing LiDAR file:", error);
        Alert.alert(
          "Error",
          "The LiDAR file format is invalid. Please check the file and try again."
        );
        setIsProcessingInDialog(false);
        return;
      }

      // Collect file information
      const fileData: FileService.MiningDataFile = {
        name: fileName,
        date: new Date().toISOString(),
        files: {
          blockModel: blockModelFile,
          elevation: lidarFile,
          pit: elevationFile,
          orthophoto: orthophotoFile,
        },
      };

      // Check for duplicate file names
      const existingFiles = await FileService.getFileInfo();
      if (existingFiles.some((file) => file.name === fileName)) {
        Alert.alert(
          "Name Exists",
          "A file with this name already exists. Please choose a different name."
        );
        setIsProcessingInDialog(false);
        return;
      }

      // Save the new file
      const updatedFiles = [...existingFiles, fileData];
      const success = await FileService.saveFileInfo(updatedFiles);

      if (success) {
        setIsProcessingInDialog(false);
        setDialogVisible(false);
        onSuccess();
      } else {
        Alert.alert("Error", "Failed to save file information");
        setIsProcessingInDialog(false);
      }
    } catch (error) {
      console.error("Error creating file:", error);
      Alert.alert("Error", "An error occurred while creating the file");
      setIsProcessingInDialog(false);
    }
  };

  return {
    dialogVisible,
    setDialogVisible,
    isProcessingInDialog,
    validateAndCreateFile,
  };
}
