import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";

interface FileNameDialogProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (fileName: string) => void;
  isProcessing?: boolean;
}

const FileNameDialog: React.FC<FileNameDialogProps> = ({
  visible,
  onCancel,
  onSubmit,
  isProcessing = false,
}) => {
  const [fileName, setFileName] = useState("");

  const handleSubmit = () => {
    if (fileName.trim()) {
      onSubmit(fileName);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialogContainer}>
          <Text style={styles.title}>File name</Text>

          <TextInput
            style={styles.input}
            placeholder="Value"
            value={fileName}
            onChangeText={setFileName}
            autoFocus
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isProcessing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                !fileName.trim() && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!fileName.trim() || isProcessing}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading Overlay - Hanya muncul saat isProcessing true */}
        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative", // Untuk penempatan loadingOverlay
  },
  dialogContainer: {
    width: Dimensions.get("window").width * 0.85,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancelButton: {
    padding: 8,
    marginRight: 16,
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#CFE625",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  // Loading overlay yang menutupi seluruh layar ketika proses upload
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2, // Pastikan overlay ini di atas dialog
  },
});

export default FileNameDialog;
