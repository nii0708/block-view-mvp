import React from "react";
import { StyleSheet, View, TextInput } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface SearchBoxProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const SearchBox = ({
  value,
  onChangeText,
  placeholder = "Search",
}: SearchBoxProps) => {
  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
      />
      <MaterialIcons
        name="search"
        size={24}
        color="#666"
        style={styles.searchIcon}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    alignSelf: "center",
    width: "80%",
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#333",
    fontFamily: "Montserrat_400Regular",
  },
  searchIcon: {
    marginLeft: 10,
  },
});

export default SearchBox;
