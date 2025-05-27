import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";

interface UploadButtonProps {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const UploadButton: React.FC<UploadButtonProps> = ({
  title,
  icon,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>{icon}</View>
        <Text style={styles.title}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#D9D9D9",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    marginBottom: 24, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  iconContainer: {
    marginRight: 16,
    width: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
});

export default UploadButton;
