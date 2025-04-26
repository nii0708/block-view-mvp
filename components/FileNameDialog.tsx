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
  isProcessing?: boolean; // Tambahkan prop ini
}

const FileNameDialog: React.FC<FileNameDialogProps> = ({
  visible,
  onCancel,
  onSubmit,
  isProcessing = false, // Default ke false
}) => {
  const [fileName, setFileName] = useState("");

  const handleSubmit = () => {
    if (fileName.trim()) {
      onSubmit(fileName);
      // Tidak perlu reset nama file di sini karena akan dilakukan setelah proses selesai
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
            style={[styles.input, isProcessing && styles.disabledInput]}
            placeholder="Value"
            value={fileName}
            onChangeText={setFileName}
            autoFocus
            editable={!isProcessing} // Disable saat processing
          />

          {isProcessing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color="#CFE625" />
              <Text style={styles.processingText}>Processing data...</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isProcessing} // Disable saat processing
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  isProcessing && styles.disabledText,
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!fileName.trim() || isProcessing) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!fileName.trim() || isProcessing} // Disable jika tidak ada nama file atau sedang processing
            >
              <Text style={styles.submitButtonText}>
                {isProcessing ? "Submitting..." : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  disabledInput: {
    backgroundColor: "#f9f9f9",
    color: "#999",
  },
  processingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  processingText: {
    color: "#555",
    marginLeft: 10,
    fontSize: 14,
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
  disabledText: {
    color: "#999",
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
});

export default FileNameDialog;
