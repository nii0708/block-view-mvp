import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TextInputProps,
} from "react-native";
import CountryCodePicker, { CountryCode } from "./CountryCodePicker";

interface PhoneInputProps {
  label?: string;
  value?: string; // Full number with country code
  onChangeText: (
    phoneNumber: string,
    countryCode: string,
    numberOnly: string
  ) => void;
  countryCode?: string;
  numberOnly?: string;
  style?: any;
  disabled?: boolean;
  error?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label = "Phone number",
  value = "",
  onChangeText,
  countryCode = "+62",
  numberOnly = "",
  style,
  disabled = false,
  error,
  ...textInputProps
}) => {
  const [selectedCountryCode, setSelectedCountryCode] = useState(countryCode);
  const [phoneNumber, setPhoneNumber] = useState(numberOnly);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(
    null
  );

  // Update local state when props change
  useEffect(() => {
    if (countryCode !== selectedCountryCode) {
      setSelectedCountryCode(countryCode);
    }
  }, [countryCode]);

  useEffect(() => {
    if (numberOnly !== phoneNumber) {
      setPhoneNumber(numberOnly);
    }
  }, [numberOnly]);

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountryCode(country.country_code);
    setSelectedCountry(country);

    // Call parent callback with new country code
    const fullNumber = country.country_code + phoneNumber;
    onChangeText(fullNumber, country.country_code, phoneNumber);
  };

  const handlePhoneNumberChange = (text: string) => {
    // Remove any non-digit characters except for common formatting
    const cleanNumber = text.replace(/[^\d\s\-\(\)]/g, "");

    // Remove leading zeros
    const trimmedNumber = cleanNumber.replace(/^0+/, "");

    setPhoneNumber(trimmedNumber);

    // Create full number
    const fullNumber = selectedCountryCode + trimmedNumber;
    onChangeText(fullNumber, selectedCountryCode, trimmedNumber);
  };

  const formatDisplayNumber = (number: string) => {
    if (!number) return "";

    // Basic formatting for Indonesian numbers
    if (selectedCountryCode === "+62") {
      // Format: XXX XXXX XXXX
      const cleaned = number.replace(/\D/g, "");
      const match = cleaned.match(/^(\d{0,3})(\d{0,4})(\d{0,4})$/);
      if (match) {
        const formatted = [match[1], match[2], match[3]]
          .filter(Boolean)
          .join(" ");
        return formatted;
      }
    }

    return number;
  };

  const getPlaceholder = () => {
    if (selectedCountry?.phone_format) {
      return selectedCountry.phone_format.replace(/X/g, "0");
    }
    return selectedCountryCode === "+62"
      ? "812 3456 7890"
      : "Enter phone number";
  };

  const validatePhoneLength = () => {
    if (!phoneNumber || !selectedCountry) return true;

    const cleanNumber = phoneNumber.replace(/\D/g, "");
    const length = cleanNumber.length;

    return (
      length >= selectedCountry.min_length &&
      length <= selectedCountry.max_length
    );
  };

  const isValid = validatePhoneLength();

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.inputContainer}>
        <CountryCodePicker
          selectedCode={selectedCountryCode}
          onSelect={handleCountrySelect}
          disabled={disabled}
          style={styles.countryPicker}
        />

        <View
          style={[
            styles.phoneInputContainer,
            !isValid && error && styles.errorBorder,
          ]}
        >
          <TextInput
            style={styles.phoneInput}
            value={formatDisplayNumber(phoneNumber)}
            onChangeText={handlePhoneNumberChange}
            placeholder={getPlaceholder()}
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            editable={!disabled}
            {...textInputProps}
          />
        </View>
      </View>

      {error && !isValid && <Text style={styles.errorText}>{error}</Text>}

      {phoneNumber && selectedCountry && !isValid && (
        <Text style={styles.errorText}>
          {`Phone number should be ${selectedCountry.min_length}-${selectedCountry.max_length} digits`}
        </Text>
      )}

      {phoneNumber && (
        <Text style={styles.fullNumberText}>
          Full number: {selectedCountryCode} {phoneNumber}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: "#000",
    marginBottom: 8,
    fontFamily: "Montserrat_400Regular",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  countryPicker: {
    marginRight: 12,
  },
  phoneInputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  errorBorder: {
    borderColor: "#ff4444",
  },
  phoneInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#333",
    height: 48,
  },
  errorText: {
    fontSize: 12,
    color: "#ff4444",
    marginTop: 4,
    fontFamily: "Montserrat_400Regular",
  },
  fullNumberText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontFamily: "Montserrat_400Regular",
  },
});

export default PhoneInput;
