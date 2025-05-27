import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface ExportDialogProps {
  visible: boolean;
  onCancel: () => void;
  onExport: (dataTypes: string[]) => void;
  isProcessing: boolean;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  visible,
  onCancel,
  onExport,
  isProcessing,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const handleToggleOption = (option: string) => {
    if (selectedOptions.includes(option)) {
      setSelectedOptions(selectedOptions.filter((item) => item !== option));
    } else {
      setSelectedOptions([...selectedOptions, option]);
    }
  };

  const handleExport = () => {
    if (selectedOptions.length > 0) {
      onExport(selectedOptions);
    }
  };

  // Reset selections when dialog closes
  React.useEffect(() => {
    if (!visible) {
      setSelectedOptions([]);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={!isProcessing ? onCancel : undefined}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>Export Data</Text>
            {!isProcessing && (
              <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={styles.optionsContainer}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={[
                styles.option,
                selectedOptions.includes("blockModel") && styles.selectedOption,
              ]}
              onPress={() => handleToggleOption("blockModel")}
              disabled={isProcessing}
            >
              <MaterialIcons
                name={
                  selectedOptions.includes("blockModel")
                    ? "check-box"
                    : "check-box-outline-blank"
                }
                size={24}
                color="#198754"
              />
              <Text style={styles.optionText}>Block Model Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                selectedOptions.includes("elevation") && styles.selectedOption,
              ]}
              onPress={() => handleToggleOption("elevation")}
              disabled={isProcessing}
            >
              <MaterialIcons
                name={
                  selectedOptions.includes("elevation")
                    ? "check-box"
                    : "check-box-outline-blank"
                }
                size={24}
                color="#198754"
              />
              <Text style={styles.optionText}>Elevation Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                selectedOptions.includes("pit") && styles.selectedOption,
              ]}
              onPress={() => handleToggleOption("pit")}
              disabled={isProcessing}
            >
              <MaterialIcons
                name={
                  selectedOptions.includes("pit")
                    ? "check-box"
                    : "check-box-outline-blank"
                }
                size={24}
                color="#198754"
              />
              <Text style={styles.optionText}>Pit Boundary Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                selectedOptions.includes("screenshot") && styles.selectedOption,
              ]}
              onPress={() => handleToggleOption("screenshot")}
              disabled={isProcessing}
            >
              <MaterialIcons
                name={
                  selectedOptions.includes("screenshot")
                    ? "check-box"
                    : "check-box-outline-blank"
                }
                size={24}
                color="#198754"
              />
              <Text style={styles.optionText}>Save Screenshot to Gallery</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.buttonContainer}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#198754" />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  selectedOptions.length === 0 && styles.disabledButton,
                ]}
                onPress={handleExport}
                disabled={selectedOptions.length === 0}
              >
                <Text style={styles.exportButtonText}>Export</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalView: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  title: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#212529",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: 4,
  },
  description: {
    fontSize: 16,
    marginBottom: 16,
    color: "#495057",
    fontFamily: "Montserrat_400Regular",
    lineHeight: 22,
  },
  optionsContainer: {
    maxHeight: 260,
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedOption: {
    backgroundColor: "rgba(25, 135, 84, 0.08)",
    borderColor: "rgba(25, 135, 84, 0.2)",
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#495057",
    fontFamily: "Montserrat_400Regular",
    flexShrink: 1,
  },
  buttonContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  exportButton: {
    backgroundColor: "#CFE625",
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  exportButtonText: {
    fontSize: 17,
    fontFamily: "Montserrat_600SemiBold",
    color: "#000",
  },
  processingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
  },
  processingText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#495057",
    fontFamily: "Montserrat_400Regular",
  },
});

export default ExportDialog;
