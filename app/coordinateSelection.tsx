import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

// Daftar proyeksi yang tersedia
const PROJECTIONS = [
  // Base coordinate system
  {
    code: "EPSG:4326",
    name: "WGS84 (EPSG:4326)",
    description: "Standar GPS coordinates",
  },

  // Northern hemisphere UTM zones - Indonesia
  {
    code: "EPSG:32646",
    name: "UTM Zone 46N (EPSG:32646)",
    description: "West Indonesia (North)",
  },
  {
    code: "EPSG:32647",
    name: "UTM Zone 47N (EPSG:32647)",
    description: "West Indonesia (North)",
  },
  {
    code: "EPSG:32648",
    name: "UTM Zone 48N (EPSG:32648)",
    description: "Central Indonesia (North)",
  },
  {
    code: "EPSG:32649",
    name: "UTM Zone 49N (EPSG:32649)",
    description: "Central Indonesia (North)",
  },
  {
    code: "EPSG:32650",
    name: "UTM Zone 50N (EPSG:32650)",
    description: "East Indonesia (North)",
  },
  {
    code: "EPSG:32651",
    name: "UTM Zone 51N (EPSG:32651)",
    description: "East Indonesia (North)",
  },
  {
    code: "EPSG:32652",
    name: "UTM Zone 52N (EPSG:32652)",
    description: "Papua (North)",
  },

  // Southern hemisphere UTM zones - Indonesia
  {
    code: "EPSG:32746",
    name: "UTM Zone 46S (EPSG:32746)",
    description: "West Indonesia (South)",
  },
  {
    code: "EPSG:32747",
    name: "UTM Zone 47S (EPSG:32747)",
    description: "West Indonesia (South)",
  },
  {
    code: "EPSG:32748",
    name: "UTM Zone 48S (EPSG:32748)",
    description: "Central Indonesia (South)",
  },
  {
    code: "EPSG:32749",
    name: "UTM Zone 49S (EPSG:32749)",
    description: "Central Indonesia (South)",
  },
  {
    code: "EPSG:32750",
    name: "UTM Zone 50S (EPSG:32750)",
    description: "East Indonesia (South)",
  },
  {
    code: "EPSG:32751",
    name: "UTM Zone 51S (EPSG:32751)",
    description: "East Indonesia (South)",
  },
  {
    code: "EPSG:32752",
    name: "UTM Zone 52S (EPSG:32752)",
    description: "Papua (South)",
  },
];

export default function CoordinateSelectionScreen() {
  const router = useRouter();
  const { fileName } = useLocalSearchParams();
  const [selectedProjection, setSelectedProjection] =
    useState<string>("EPSG:32652"); // Default to UTM Zone 52N

  // Handle projection selection
  const handleSelectProjection = (projectionCode: string) => {
    setSelectedProjection(projectionCode);
  };

  // Continue to top-down view with selected projection
  const handleContinue = () => {
    if (!selectedProjection) {
      Alert.alert("Error", "Please select a coordinate system");
      return;
    }

    // Navigate to topDownView with fileName and projection parameters
    router.push({
      pathname: "/topDownView",
      params: {
        fileName: fileName,
        projection: selectedProjection,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header - Redesigned to match other pages */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Coordinate System</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push("/")}
        >
          <MaterialIcons name="home" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Description */}
      <View style={styles.descriptionContainer}>
        <MaterialIcons
          name="info-outline"
          size={24}
          color="#555"
          style={styles.infoIcon}
        />
        <Text style={styles.descriptionText}>
          Please select the coordinate system used in your data files. This
          ensures the data is correctly displayed on the map.
        </Text>
      </View>

      {/* File info */}
      <View style={styles.fileInfoContainer}>
        <Text style={styles.fileInfoLabel}>Selected file:</Text>
        <Text style={styles.fileName}>{fileName}</Text>
      </View>

      {/* Projection List */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.projectionsContainer}>
          {PROJECTIONS.map((projection) => (
            <TouchableOpacity
              key={projection.code}
              style={[
                styles.projectionItem,
                selectedProjection === projection.code &&
                  styles.selectedProjection,
              ]}
              onPress={() => handleSelectProjection(projection.code)}
            >
              <View style={styles.projectionHeader}>
                <Text
                  style={[
                    styles.projectionName,
                    selectedProjection === projection.code &&
                      styles.selectedProjectionText,
                  ]}
                >
                  {projection.name}
                </Text>
                {selectedProjection === projection.code && (
                  <MaterialIcons
                    name="check-circle"
                    size={24}
                    color="#0066CC"
                  />
                )}
              </View>
              <Text style={styles.projectionDescription}>
                {projection.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
  },
  homeButton: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  descriptionContainer: {
    backgroundColor: "#f8f8f8",
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    lineHeight: 20,
  },
  fileInfoContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  fileInfoLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    marginBottom: 4,
  },
  fileName: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
  },
  scrollView: {
    flex: 1,
  },
  projectionsContainer: {
    padding: 16,
  },
  projectionItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedProjection: {
    backgroundColor: "#e6f2ff",
    borderColor: "#0066CC",
  },
  projectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  projectionName: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#333",
    flex: 1,
  },
  selectedProjectionText: {
    color: "#0066CC",
  },
  projectionDescription: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  continueButton: {
    backgroundColor: "#CFE625",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
  },
});
