import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

interface LoadingScreenProps {
  message?: string;
  progress?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading data...",
  progress,
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#CFE625" />
      <View style={styles.messageContainer}>
        <Text style={styles.message}>{message}</Text>
      </View>

      {progress !== undefined && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  messageContainer: {
    flexDirection: "row",
    marginTop: 16,
  },
  message: {
    fontSize: 16,
    color: "#333",
  },
  progressContainer: {
    width: "80%",
    marginTop: 24,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#CFE625",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    textAlign: "right",
  },
});

export default LoadingScreen;
