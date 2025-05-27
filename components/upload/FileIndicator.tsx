import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { FileInfo } from "../../services/FileService";

interface FileIndicatorProps {
  file: FileInfo | null;
}

const FileIndicator = ({ file }: FileIndicatorProps) => {
  if (!file) return null;

  return (
    <View style={styles.fileIndicator}>
      <Text style={styles.fileName}>{file.name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default FileIndicator;
