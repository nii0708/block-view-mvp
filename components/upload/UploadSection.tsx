import React from "react";
import { StyleSheet, View, Text } from "react-native";
import InfoTooltip from "../ui/InfoTooltip";
import UploadButton from "../ui/UploadButton";
import FileIndicator from "./FileIndicator";
import { FileInfo } from "../../services/FileService";

interface UploadSectionProps {
  title?: string;
  tooltipMessage?: string;
  children: React.ReactNode;
  style?: object;
}

const UploadSection = ({
  title,
  tooltipMessage,
  children,
  style,
}: UploadSectionProps) => {
  return (
    <View style={[styles.container, style]}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.headerText}>{title}</Text>
          {tooltipMessage && <InfoTooltip message={tooltipMessage} />}
        </View>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
});

export default UploadSection;
