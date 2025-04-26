import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  KeyboardTypeOptions,
} from "react-native";

// ====== Input Component ======
interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  style,
  labelStyle,
  inputStyle,
  keyboardType = "default",
  autoCapitalize = "none",
}) => {
  return (
    <View style={[styles.inputContainer, style]}>
      {label ? (
        <Text style={[styles.inputLabel, labelStyle]}>{label}</Text>
      ) : null}
      <TextInput
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
};

// ====== Button Component ======
interface ButtonProps {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  isLoading?: boolean;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  isLoading = false,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, style, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color="#000" />
      ) : (
        <Text style={[styles.buttonText, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

// ====== Styles ======
const styles = StyleSheet.create({
  // Input styles
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: "#000",
    marginBottom: 8,
    fontFamily: "Montserrat_400Regular",
  },
  input: {
    height: 48,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#000",
    backgroundColor: "#fff",
    fontFamily: "Montserrat_400Regular",
  },

  // Button styles
  button: {
    backgroundColor: "#CFE625",
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Montserrat_600SemiBold",
  },
});
