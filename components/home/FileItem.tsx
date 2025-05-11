import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as FileService from "../../services/FileService";

interface FileItemProps {
  item: FileService.MiningDataFile;
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelect: (item: FileService.MiningDataFile) => void;
  onPress: (item: FileService.MiningDataFile) => void;
}

const FileItem = ({
  item,
  isSelectionMode,
  isSelected,
  onSelect,
  onPress,
}: FileItemProps) => {
  return (
    <TouchableOpacity
      activeOpacity={1.0}
      style={styles.fileItem}
      onPress={() => (isSelectionMode ? onSelect(item) : onPress(item))}
      onLongPress={() => !isSelectionMode && onSelect(item)}
    >
      {isSelectionMode && (
        <View style={styles.radioContainer}>
          <View
            style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}
          >
            {isSelected && <View style={styles.radioInner} />}
          </View>
        </View>
      )}
      <Text style={styles.fileName}>{item.name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fileItem: {
    backgroundColor: "#FAFF9F",
    padding: 15,
    borderRadius: 8,
    elevation: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  radioContainer: {
    marginRight: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#0066CC",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0066CC",
  },
  fileName: {
    fontSize: 16,
    color: "#333",
    fontFamily: "Montserrat_600SemiBold",
  },
});

export default FileItem;
