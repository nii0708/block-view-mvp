import React from "react";
import { StyleSheet, View, Text } from "react-native";

interface FileInfoBarProps {
  fileName: string | string[];
}

const FileInfoBar = ({ fileName }: FileInfoBarProps) => {
  const displayName = Array.isArray(fileName) ? fileName[0] : fileName;

  return (
    <View style={styles.fileInfoContainer}>
      <Text style={styles.fileInfoLabel}>Selected file:</Text>
      <Text style={styles.fileName}>{displayName}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default FileInfoBar;
