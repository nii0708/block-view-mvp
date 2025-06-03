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
  error?: string;
  editable?: boolean; // <-- Tambahkan prop editable di sini
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
  error,
  editable = true, // <-- Tambahkan editable di sini dengan default true
}) => {
  return (
    <View style={[styles.inputContainer, style]}>
      {label ? (
        <Text style={[styles.inputLabel, labelStyle]}>{label}</Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          !editable && styles.disabledInput, // <-- Tambahkan style untuk disabled
          inputStyle,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable} // <-- Teruskan prop editable ke TextInput
        placeholderTextColor={!editable ? "#999" : "#ccc"} // <-- Ubah warna placeholder saat disabled
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  variant?: "primary" | "secondary";
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  isLoading = false,
  disabled = false,
  variant = "primary",
}) => {
  const buttonStyle =
    variant === "primary" ? styles.button : styles.buttonSecondary;
  const buttonTextStyle =
    variant === "primary" ? styles.buttonText : styles.buttonTextSecondary;

  return (
    <TouchableOpacity
      style={[
        buttonStyle,
        style,
        (disabled || isLoading) && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#000" />
          <Text style={[buttonTextStyle, textStyle, styles.loadingText]}>
            {title}...
          </Text>
        </View>
      ) : (
        <Text style={[buttonTextStyle, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

// ====== Loading Button Component ======
interface LoadingButtonProps extends ButtonProps {
  loadingColor?: string;
  loadingText?: string;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  isLoading = false,
  disabled = false,
  loadingColor = "#CFE625",
  loadingText,
  variant = "primary",
}) => {
  const buttonStyle =
    variant === "primary" ? styles.button : styles.buttonSecondary;
  const buttonTextStyle =
    variant === "primary" ? styles.buttonText : styles.buttonTextSecondary;

  return (
    <TouchableOpacity
      style={[
        buttonStyle,
        style,
        (disabled || isLoading) && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={loadingColor} />
          <Text style={[buttonTextStyle, textStyle, styles.loadingText]}>
            {loadingText || `${title}...`}
          </Text>
        </View>
      ) : (
        <Text style={[buttonTextStyle, textStyle]}>{title}</Text>
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
  disabledInput: {
    // <-- Style untuk input yang tidak editable
    backgroundColor: "#f0f0f0",
    color: "#999",
  },
  inputError: {
    borderColor: "#ff4444",
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 14,
    color: "#ff4444",
    marginTop: 4,
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
  buttonSecondary: {
    backgroundColor: "#f5f5f5",
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Montserrat_600SemiBold",
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    fontFamily: "Montserrat_600SemiBold",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginLeft: 8,
  },
});
