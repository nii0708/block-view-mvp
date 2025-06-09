import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  Keyboard,
} from "react-native";
import {
  MaterialIcons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import InfoTooltip from "../components/InfoTooltip";
import UploadButton from "../components/UploadButton";
import FileNameDialog from "../components/FileNameDialog";
import * as FileService from "../services/FileService";

export default function UploadScreen() {
  const router = useRouter();

  // State untuk menyimpan file yang sudah diupload
  const [blockModelFile, setBlockModelFile] =
    useState<FileService.FileInfo | null>(null);
  const [lidarFile, setLidarFile] = useState<FileService.FileInfo | null>(null);
  const [orthophotoFile, setOrthophotoFile] =
    useState<FileService.FileInfo | null>(null);
  const [elevationFile, setElevationFile] =
    useState<FileService.FileInfo | null>(null);

  // State untuk dialog nama file dan loading
  const [dialogVisible, setDialogVisible] = useState(false);
  const [isProcessingInDialog, setIsProcessingInDialog] = useState(false);

  // Combined tooltip message untuk semua file types
  const tooltipMessage =
    "File format specifications:\n" +
    "• Block Model: CSV format (Surpac or Vulcan compatible)\n" +
    "• Elevation Data: STR or DXF format with surface topography\n" +
    "• Pit Boundary: STR or DXF format defining excavation limits\n" +
    "• Geospatial Map: PDF format for visual reference and spatial context\n\n" +
    "You can create a file with either a Geospatial Map alone or a combination of Block Model + Elevation Data.";

  const handleBlockModelUpload = async () => {
    try {
      const file = await FileService.pickCSV();
      if (file) {
        // Validasi file sebelum diterima
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        if (fileExtension !== "csv") {
          Alert.alert("Invalid File", "Please select a valid CSV file");
          return;
        }

        setBlockModelFile(file);
      }
    } catch (error) {
      console.error("Error picking block model file:", error);
      Alert.alert(
        "Error",
        "Failed to select block model file. Please try again."
      );
    }
  };

  const handleLidarUpload = async () => {
    try {
      const file = await FileService.pickLiDAR();
      if (file) {
        // Validasi file sebelum diterima
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        if (fileExtension !== "str" && fileExtension !== "dxf") {
          Alert.alert("Invalid File", "Please select a valid STR or DXF file");
          return;
        }

        setLidarFile(file);
      }
    } catch (error) {
      console.error("Error picking elevation file:", error);
      Alert.alert(
        "Error",
        "Failed to select elevation file. Please try again."
      );
    }
  };

  const handleElevationUpload = async () => {
    try {
      const file = await FileService.pickLiDAR();
      if (file) {
        // Validasi file sebelum diterima
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        if (fileExtension !== "str" && fileExtension !== "dxf") {
          Alert.alert(
            "Invalid File",
            "Please select a valid STR or DXF file for pit boundary"
          );
          return;
        }

        setElevationFile(file);
      }
    } catch (error) {
      console.error("Error picking pit boundary file:", error);
      Alert.alert(
        "Error",
        "Failed to select pit boundary file. Please try again."
      );
    }
  };

  const handleGeospatialMapUpload = async () => {
    try {
      const pdfData = await FileService.pickPDF();
      if (pdfData) {
        // Validasi file sebelum diterima
        const fileExtension = pdfData.fileName.split(".").pop()?.toLowerCase();
        if (fileExtension !== "pdf") {
          Alert.alert("Invalid File", "Please select a valid PDF file");
          return;
        }

        // Convert PDFData back to FileInfo format for consistent handling
        const fileInfo: FileService.FileInfo = {
          name: pdfData.fileName,
          uri: pdfData.fileUri,
          type: "application/pdf",
          mimeType: "application/pdf",
        };

        setOrthophotoFile(fileInfo);
      }
    } catch (error) {
      console.error("Error picking PDF file:", error);
      Alert.alert("Error", "Failed to select PDF file. Please try again.");
    }
  };

  const handleCreateFile = () => {
    const hasPDF = !!orthophotoFile;
    const hasBlockModel = !!blockModelFile;
    const hasElevation = !!lidarFile;

    // Check for invalid combinations
    if (hasBlockModel && !hasElevation) {
      Alert.alert(
        "Elevation Data Required",
        "When uploading a Block Model, you must also upload Topography Data. Please upload both files to proceed."
      );
      return;
    }

    if (hasElevation && !hasBlockModel) {
      Alert.alert(
        "Block Model Required",
        "When uploading Elevation Data, you must also upload Block Model. Please upload both files to proceed."
      );
      return;
    }

    // Check if minimum requirements are met
    const hasValidCombination =
      (hasPDF && !hasBlockModel && !hasElevation) ||
      (hasBlockModel && hasElevation);

    if (!hasValidCombination) {
      Alert.alert(
        "Upload Required",
        "Please upload either a Geospatial Map PDF alone or both Block Model and Elevation Data together."
      );
      return;
    }

    // Tampilkan dialog untuk masukkan nama file
    setDialogVisible(true);
  };

  const handleDialogCancel = () => {
    // Hanya boleh cancel jika tidak sedang processing
    if (!isProcessingInDialog) {
      setDialogVisible(false);
    }
  };

  const handleDialogSubmit = async (fileName: string) => {
    // Hilangkan keyboard terlebih dahulu
    Keyboard.dismiss();

    // Aktifkan state processing di dalam dialog
    setIsProcessingInDialog(true);

    try {
      // Validate Block Model file if present
      if (blockModelFile) {
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
      }

      // Validate Elevation file if present
      if (lidarFile) {
        try {
          await FileService.parseLiDARFile(lidarFile.uri);
        } catch (error) {
          console.error("Error parsing elevation file:", error);
          Alert.alert(
            "Error",
            "The elevation file format is invalid. Please check the file and try again."
          );
          setIsProcessingInDialog(false);
          return;
        }
      }

      // Kumpulkan informasi file yang akan disimpan
      const fileData: FileService.MiningDataFile = {
        name: fileName,
        date: new Date().toISOString(),
        files: {
          blockModel: blockModelFile,
          elevation: lidarFile,
          pit: elevationFile,
          orthophoto: orthophotoFile,
          pdfCoordinates: null, // Simpan null, akan diproses di topDownView
        },
      };

      // Ambil daftar file yang sudah ada
      const existingFiles = await FileService.getFileInfo();

      // Periksa apakah nama sudah ada
      if (existingFiles.some((file) => file.name === fileName)) {
        Alert.alert(
          "Name Exists",
          "A file with this name already exists. Please choose a different name."
        );
        setIsProcessingInDialog(false);
        return;
      }

      // Tambahkan file baru
      const updatedFiles = [...existingFiles, fileData];

      // Simpan ke penyimpanan lokal
      const success = await FileService.saveFileInfo(updatedFiles);

      if (success) {
        // Reset state
        setBlockModelFile(null);
        setLidarFile(null);
        setElevationFile(null);
        setOrthophotoFile(null);

        // Nonaktifkan state processing dialog dan tutup dialog
        setIsProcessingInDialog(false);
        setDialogVisible(false);

        // Kembali ke halaman utama
        router.push("/");
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

  // Determine if Create File button should be enabled
  // Complex logic to handle file dependencies
  const hasOnlyPDF = !!orthophotoFile && !blockModelFile && !lidarFile;
  const hasBothBlockAndElevation = !!blockModelFile && !!lidarFile;
  const hasEitherBlockOrElevation = !!blockModelFile || !!lidarFile;

  // Button is enabled only if:
  // 1. ONLY PDF exists (without Block Model or Elevation)
  // 2. BOTH Block Model AND Elevation exist (with or without other files)
  // If either Block Model OR Elevation exists, both must exist
  const isCreateFileEnabled =
    hasOnlyPDF || (hasEitherBlockOrElevation && hasBothBlockAndElevation);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Content */}
      <View style={styles.content}>
        {/* Section header with tooltip */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mining Data Files</Text>
          <InfoTooltip message={tooltipMessage} />
        </View>

        {/* Upload buttons */}
        <UploadButton
          title="Upload Block Model"
          icon={<MaterialIcons name="description" size={24} color="#555" />}
          onPress={handleBlockModelUpload}
        />
        {blockModelFile && (
          <View style={styles.fileIndicator}>
            <Text style={styles.fileName}>{blockModelFile.name}</Text>
          </View>
        )}

        <UploadButton
          title="Upload Topography Data"
          icon={<Feather name="layers" size={24} color="#555" />}
          onPress={handleLidarUpload}
        />
        {lidarFile && (
          <View style={styles.fileIndicator}>
            <Text style={styles.fileName}>{lidarFile.name}</Text>
          </View>
        )}

        <UploadButton
          title="Upload Pit Boundary"
          icon={<MaterialIcons name="terrain" size={24} color="#555" />}
          onPress={handleElevationUpload}
        />
        {elevationFile && (
          <View style={styles.fileIndicator}>
            <Text style={styles.fileName}>{elevationFile.name}</Text>
          </View>
        )}

        <UploadButton
          title="Upload Geospatial Map"
          icon={
            <MaterialCommunityIcons name="map-outline" size={24} color="#555" />
          }
          onPress={handleGeospatialMapUpload}
        />
        {orthophotoFile && (
          <View style={styles.fileIndicator}>
            <Text style={styles.fileName}>{orthophotoFile.name}</Text>
          </View>
        )}

        {/* Create File button */}
        <TouchableOpacity
          style={[
            styles.createButton,
            !isCreateFileEnabled && styles.disabledButton,
          ]}
          onPress={handleCreateFile}
          disabled={!isCreateFileEnabled}
        >
          <Text style={styles.createButtonText}>Create File</Text>
        </TouchableOpacity>
      </View>

      {/* File Name Dialog */}
      <FileNameDialog
        visible={dialogVisible}
        onCancel={handleDialogCancel}
        onSubmit={handleDialogSubmit}
        isProcessing={isProcessingInDialog}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    position: "relative",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  fileIndicator: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 6,
    marginBottom: 16,
    marginTop: -12,
    marginHorizontal: 5,
  },
  fileName: {
    fontSize: 14,
    color: "#555",
  },
  createButton: {
    backgroundColor: "#CFE625",
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    marginHorizontal: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: "#D3D3D3",
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
});
