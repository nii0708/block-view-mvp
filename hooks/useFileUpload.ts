import { useState } from "react";
import { Alert } from "react-native";
import * as FileService from "../services/FileService";

type FileType = "csv" | "str" | "svg";

interface UseFileUploadOptions {
  fileType: FileType;
  validationMessage?: string;
}

export default function useFileUpload({
  fileType,
  validationMessage,
}: UseFileUploadOptions) {
  const [file, setFile] = useState<FileService.FileInfo | null>(null);

  const pickFile = async () => {
    try {
      let selectedFile: FileService.FileInfo | null = null;

      // Pick file based on type
      switch (fileType) {
        case "csv":
          selectedFile = await FileService.pickCSV();
          break;
        case "str":
          selectedFile = await FileService.pickLiDAR();
          break;
        case "svg":
          selectedFile = await FileService.pickSVG();
          break;
      }

      if (selectedFile) {
        console.log(`Selected ${fileType} file:`, selectedFile);

        // Validate file extension
        const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();

        if (fileExtension !== fileType) {
          Alert.alert(
            "Invalid File",
            validationMessage ||
              `Please select a valid ${fileType.toUpperCase()} file`
          );
          return;
        }

        setFile(selectedFile);
      }
    } catch (error) {
      console.error(`Error picking ${fileType} file:`, error);
      Alert.alert(
        "Error",
        `Failed to select ${fileType} file. Please try again.`
      );
    }
  };

  return {
    file,
    setFile,
    pickFile,
  };
}
