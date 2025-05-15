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

  const tooltipMessage =
    "Please ensure your CSV file meets the mandatory requirements: it must contain at least four columns with valid numeric data and LIDAR data is in a valid .str format with polygon-based surface details and a recognized structure. Any deviation from these specifications could cause processing errors or rejection.";

  const handleBlockModelUpload = async () => {
    try {
      const file = await FileService.pickCSV();
      if (file) {
        // console.log("Selected CSV file:", file);

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
        // console.log("Selected Lidar file:", file);

        // Validasi file sebelum diterima
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        if (fileExtension !== "str") {
          Alert.alert("Invalid File", "Please select a valid STR file");
          return;
        }

        setLidarFile(file);
      }
    } catch (error) {
      console.error("Error picking lidar file:", error);
      Alert.alert("Error", "Failed to select lidar file. Please try again.");
    }
  };

  const handleElevationUpload = async () => {
    try {
      const file = await FileService.pickLiDAR();
      if (file) {
        // console.log("Selected Elevation file:", file);

        // Validasi file sebelum diterima
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        if (fileExtension !== "str") {
          Alert.alert(
            "Invalid File",
            "Please select a valid STR file for elevation data"
          );
          return;
        }

        setElevationFile(file);
      }
    } catch (error) {
      console.error("Error picking elevation file:", error);
      Alert.alert(
        "Error",
        "Failed to select elevation file. Please try again."
      );
    }
  };

  const handleGeospatialMapUpload = async () => {
    try {
      const pdfData = await FileService.pickPDF();
      if (pdfData) {
        // console.log("Selected PDF file:", pdfData.fileName);

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
    // Periksa apakah file mandatory sudah diupload
    if (!blockModelFile || !lidarFile) {
      Alert.alert(
        "Upload Required",
        "Please upload the mandatory files first."
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
      // Kita memastikan blockModelFile dan lidarFile tidak null
      if (!blockModelFile || !lidarFile) {
        Alert.alert("Error", "Block model and LiDAR files are required.");
        setIsProcessingInDialog(false);
        return;
      }

      // Attempt to parse/verify the CSV file
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

      // Attempt to parse/verify the LiDAR file
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

      // Kumpulkan informasi file yang akan disimpan
      // PDF coordinates akan diproses nanti di topDownView
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Content */}
      <View style={styles.content}>
        {/* Container Mandatory dengan header */}
        <View style={styles.mandatoryContainer}>
          <View style={styles.mandatoryHeader}>
            <Text style={styles.mandatoryText}>Mandatory</Text>
            <InfoTooltip message={tooltipMessage} />
          </View>
          {/* Tombol upload di dalam container mandatory */}
          <UploadButton
            title="Upload Block Model .csv"
            icon={<MaterialIcons name="description" size={24} color="#555" />}
            onPress={handleBlockModelUpload}
          />
          {blockModelFile && (
            <View style={styles.fileIndicator}>
              <Text style={styles.fileName}>{blockModelFile.name}</Text>
            </View>
          )}
          <UploadButton
            title="Upload Elevation Data .str"
            icon={<Feather name="layers" size={24} color="#555" />}
            onPress={handleLidarUpload}
          />
          {lidarFile && (
            <View style={styles.fileIndicator}>
              <Text style={styles.fileName}>{lidarFile.name}</Text>
            </View>
          )}
          <UploadButton
            title="Upload Pit Boundary .str"
            icon={<MaterialIcons name="terrain" size={24} color="#555" />}
            onPress={handleElevationUpload}
          />
          {elevationFile && (
            <View style={styles.fileIndicator}>
              <Text style={styles.fileName}>{elevationFile.name}</Text>
            </View>
          )}
        </View>

        {/* Tombol upload untuk PDF */}
        <UploadButton
          title="Upload Geospatial Map .pdf"
          icon={
            <MaterialCommunityIcons name="map-outline" size={24} color="#555" />
          }
          onPress={handleGeospatialMapUpload}
          style={{ marginTop: 20 }}
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
            (!blockModelFile || !lidarFile) && styles.disabledButton,
          ]}
          onPress={handleCreateFile}
          disabled={!blockModelFile || !lidarFile}
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
  mandatoryContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tooltipPosition: {
    position: "absolute",
    right: 5,
    top: 0,
  },
  mandatoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative",
  },
  mandatoryText: {
    fontSize: 16,
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
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
});
