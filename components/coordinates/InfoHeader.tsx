import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface InfoHeaderProps {
  message: string;
}

const InfoHeader = ({ message }: InfoHeaderProps) => {
  return (
    <View style={styles.descriptionContainer}>
      <MaterialIcons
        name="info-outline"
        size={24}
        color="#555"
        style={styles.infoIcon}
      />
      <Text style={styles.descriptionText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default InfoHeader;
