import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ProjectionInfo } from "../../utils/projectionData";

interface ProjectionItemProps {
  projection: ProjectionInfo;
  isSelected: boolean;
  onSelect: (code: string) => void;
}

const ProjectionItem = ({
  projection,
  isSelected,
  onSelect,
}: ProjectionItemProps) => {
  return (
    <TouchableOpacity
      style={[styles.projectionItem, isSelected && styles.selectedProjection]}
      onPress={() => onSelect(projection.code)}
    >
      <View style={styles.projectionHeader}>
        <Text
          style={[
            styles.projectionName,
            isSelected && styles.selectedProjectionText,
          ]}
        >
          {projection.name}
        </Text>
        {isSelected && (
          <MaterialIcons name="check-circle" size={24} color="#0066CC" />
        )}
      </View>
      <Text style={styles.projectionDescription}>{projection.description}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
});

export default ProjectionItem;
