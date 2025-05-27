import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface CrossSectionHeaderProps {
  title?: string;
}

const CrossSectionHeader: React.FC<CrossSectionHeaderProps> = ({
  title = "Cross Section View",
}) => {
  const router = useRouter();

  const handleHome = () => {
    router.push("/");
  };

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity style={styles.homeButton} onPress={handleHome}>
        <MaterialIcons name="home" size={24} color="black" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    flex: 1,
  },
  homeButton: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default CrossSectionHeader;
