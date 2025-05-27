import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface HomeHeaderProps {
  isSelectionMode: boolean;
  selectedCount: number;
  isAllSelected: boolean;
  onExitSelectionMode: () => void;
  onToggleSelectAll: () => void;
  onProfilePress: () => void;
}

const HomeHeader = ({
  isSelectionMode,
  selectedCount,
  isAllSelected,
  onExitSelectionMode,
  onToggleSelectAll,
  onProfilePress,
}: HomeHeaderProps) => {
  return (
    <View style={styles.header}>
      {isSelectionMode ? (
        <TouchableOpacity onPress={onExitSelectionMode}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerSpacer} />
      )}

      {isSelectionMode ? (
        <View style={styles.headerTitle}>
          <Text style={styles.selectedCount}>{selectedCount} Selected</Text>
        </View>
      ) : null}

      {isSelectionMode ? (
        <TouchableOpacity onPress={onToggleSelectAll}>
          <Text style={styles.selectAllButton}>
            {isAllSelected ? "Deselect All" : "Select All"}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
          <MaterialIcons name="person" size={24} color="black" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  selectedCount: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#333",
  },
  cancelButton: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    color: "#333",
  },
  selectAllButton: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#0066CC",
  },
  profileButton: {
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default HomeHeader;
