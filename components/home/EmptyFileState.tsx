import React from "react";
import { StyleSheet, View, Text } from "react-native";

const EmptyFileState = () => {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>The files is empty</Text>
      <Text style={styles.importText}>Please import one</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
  },
  importText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    fontFamily: "Montserrat_400Regular",
  },
});

export default EmptyFileState;
