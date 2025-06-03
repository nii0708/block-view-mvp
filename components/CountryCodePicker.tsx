import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "../config/supabase";

export interface CountryCode {
  id: number;
  country_name: string;
  country_code: string;
  iso_code: string;
  flag_emoji: string;
  phone_format: string;
  min_length: number;
  max_length: number;
}

interface CountryCodePickerProps {
  selectedCode?: string;
  onSelect: (countryCode: CountryCode) => void;
  style?: any;
  disabled?: boolean;
}

export const CountryCodePicker: React.FC<CountryCodePickerProps> = ({
  selectedCode = "+62",
  onSelect,
  style,
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<CountryCode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(
    null
  );

  // Load country codes from database
  useEffect(() => {
    loadCountryCodes();
  }, []);

  // Update selected country when selectedCode changes
  useEffect(() => {
    if (countryCodes.length > 0) {
      const country = countryCodes.find((c) => c.country_code === selectedCode);
      setSelectedCountry(country || countryCodes[0]); // Default to Indonesia
    }
  }, [selectedCode, countryCodes]);

  // Filter countries based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCodes(countryCodes);
    } else {
      const filtered = countryCodes.filter(
        (country) =>
          country.country_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          country.country_code.includes(searchQuery) ||
          country.iso_code.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCodes(filtered);
    }
  }, [searchQuery, countryCodes]);

  const loadCountryCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("country_codes")
        .select("*")
        .eq("is_active", true)
        .order("country_name");

      if (error) {
        console.error("Error loading country codes:", error);
        // Fallback to default codes if database fails
        setCountryCodes(getDefaultCountryCodes());
      } else {
        setCountryCodes(data || []);
      }
    } catch (error) {
      console.error("Error loading country codes:", error);
      setCountryCodes(getDefaultCountryCodes());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCountryCodes = (): CountryCode[] => [
    {
      id: 1,
      country_name: "Indonesia",
      country_code: "+62",
      iso_code: "ID",
      flag_emoji: "🇮🇩",
      phone_format: "XXX XXXX XXXX",
      min_length: 8,
      max_length: 13,
    },
    {
      id: 2,
      country_name: "United States",
      country_code: "+1",
      iso_code: "US",
      flag_emoji: "🇺🇸",
      phone_format: "XXX XXX XXXX",
      min_length: 10,
      max_length: 10,
    },
    {
      id: 3,
      country_name: "Singapore",
      country_code: "+65",
      iso_code: "SG",
      flag_emoji: "🇸🇬",
      phone_format: "XXXX XXXX",
      min_length: 8,
      max_length: 8,
    },
  ];

  const handleSelectCountry = (country: CountryCode) => {
    setSelectedCountry(country);
    onSelect(country);
    setIsVisible(false);
    setSearchQuery("");
  };

  const renderCountryItem = ({ item }: { item: CountryCode }) => (
    <TouchableOpacity
      style={[
        styles.countryItem,
        item.country_code === selectedCode && styles.selectedCountryItem,
      ]}
      onPress={() => handleSelectCountry(item)}
    >
      <Text style={styles.flagEmoji}>{item.flag_emoji}</Text>
      <View style={styles.countryInfo}>
        <Text style={styles.countryName}>{item.country_name}</Text>
        <Text style={styles.countryCode}>{item.country_code}</Text>
      </View>
      {item.country_code === selectedCode && (
        <MaterialIcons name="check" size={20} color="#CFE625" />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, style, disabled && styles.disabledPicker]}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
      >
        <Text style={styles.flagEmoji}>
          {selectedCountry?.flag_emoji || "🇮🇩"}
        </Text>
        <Text style={styles.pickerText}>
          {selectedCountry?.country_code || "+62"}
        </Text>
        <MaterialIcons
          name="arrow-drop-down"
          size={20}
          color={disabled ? "#ccc" : "#555"}
        />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" />

          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsVisible(false)}
            >
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Pilih Kode Negara</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari negara atau kode..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <MaterialIcons name="clear" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          {/* Country List */}
          <FlatList
            data={filteredCodes}
            renderItem={renderCountryItem}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            style={styles.countryList}
            keyboardShouldPersistTaps="handled"
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 8,
    minWidth: 100,
  },
  disabledPicker: {
    opacity: 0.6,
  },
  flagEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  pickerText: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#333",
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
  },
  placeholder: {
    width: 32, // Same as close button
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    marginLeft: 8,
    color: "#333",
  },
  countryList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  selectedCountryItem: {
    backgroundColor: "#f8fffe",
  },
  countryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  countryName: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#333",
    marginBottom: 2,
  },
  countryCode: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
  },
});

export default CountryCodePicker;
