import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface CrossSectionInfoProps {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  length: number;
  blockModelData: any[];
  elevationData: any[];
  pitData: any[];
}

const CrossSectionInfo: React.FC<CrossSectionInfoProps> = ({
  startLat,
  startLng,
  endLat,
  endLng,
  length,
  blockModelData,
  elevationData,
  pitData,
}) => {
  return (
    <View style={styles.infoContainer}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Start:</Text>
        <Text style={styles.infoValue}>
          {startLat.toFixed(6)}, {startLng.toFixed(6)}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>End:</Text>
        <Text style={styles.infoValue}>
          {endLat.toFixed(6)}, {endLng.toFixed(6)}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Length:</Text>
        <Text style={styles.infoValue}>{length.toFixed(1)} meters</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Data:</Text>
        <Text style={styles.infoValue}>
          {blockModelData.length} blocks, {elevationData.length} elevation
          points,
          {pitData.length} pit points
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  infoContainer: {
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#212529",
    fontWeight: "400",
  },
});

export default CrossSectionInfo;
