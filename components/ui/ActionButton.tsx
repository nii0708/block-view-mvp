import React from "react";
import { StyleSheet, TouchableOpacity, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

interface ActionButtonProps {
  type: "add" | "delete";
  onPress: () => void;
}

const ActionButton = ({ type, onPress }: ActionButtonProps) => {
  if (type === "add") {
    return (
      <View style={styles.addButtonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={onPress}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.deleteSelectedContainer}>
      <TouchableOpacity style={styles.deleteSelectedButton} onPress={onPress}>
        <Feather name="trash-2" size={22} color="white" />
        <Text style={styles.deleteSelectedText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  addButtonContainer: {
    position: "absolute",
    bottom: 40,
    right: 30,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  addButtonText: {
    fontSize: 30,
    color: "#333",
    fontFamily: "Montserrat_600SemiBold",
  },
  deleteSelectedContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  deleteSelectedButton: {
    backgroundColor: "#ff6b6b",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
  },
  deleteSelectedText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    marginLeft: 8,
  },
});

export default ActionButton;
