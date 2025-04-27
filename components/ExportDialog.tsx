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
  onExport: (dataType: string) => void;
  isProcessing: boolean;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  visible,
  onCancel,
  onExport,
  isProcessing,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleExport = () => {
    if (selectedOption) {
      onExport(selectedOption);
    }
  };

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
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.description}>Select data to export:</Text>

          <ScrollView style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.option,
                selectedOption === "blockModel" && styles.selectedOption,
              ]}
              onPress={() => handleSelect("blockModel")}
              disabled={isProcessing}
            >
              <MaterialIcons
                name={
                  selectedOption === "blockModel"
                    ? "radio-button-checked"
                    : "radio-button-unchecked"
                }
                size={24}
                color="#333"
              />
              <Text style={styles.optionText}>Block Model Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                selectedOption === "elevation" && styles.selectedOption,
              ]}
              onPress={() => handleSelect("elevation")}
              disabled={isProcessing}
            >
              <MaterialIcons
                name={
                  selectedOption === "elevation"
                    ? "radio-button-checked"
                    : "radio-button-unchecked"
                }
                size={24}
                color="#333"
              />
              <Text style={styles.optionText}>Elevation Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                selectedOption === "pit" && styles.selectedOption,
              ]}
              onPress={() => handleSelect("pit")}
              disabled={isProcessing}
            >
              <MaterialIcons
                name={
                  selectedOption === "pit"
                    ? "radio-button-checked"
                    : "radio-button-unchecked"
                }
                size={24}
                color="#333"
              />
              <Text style={styles.optionText}>Pit Boundary Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                selectedOption === "all" && styles.selectedOption,
              ]}
              onPress={() => handleSelect("all")}
              disabled={isProcessing}
            >
              <MaterialIcons
                name={
                  selectedOption === "all"
                    ? "radio-button-checked"
                    : "radio-button-unchecked"
                }
                size={24}
                color="#333"
              />
              <Text style={styles.optionText}>All Data</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.buttonContainer}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#000" />
                <Text style={styles.processingText}>Exporting...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  !selectedOption && styles.disabledButton,
                ]}
                onPress={handleExport}
                disabled={!selectedOption}
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    position: "relative",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: 0,
  },
  description: {
    fontSize: 16,
    marginBottom: 15,
    color: "#333",
  },
  optionsContainer: {
    maxHeight: 200,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedOption: {
    backgroundColor: "rgba(207, 230, 37, 0.1)",
  },
  optionText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  buttonContainer: {
    marginTop: 20,
  },
  exportButton: {
    backgroundColor: "#CFE625",
    height: 45,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  processingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 45,
  },
  processingText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
});

export default ExportDialog;
