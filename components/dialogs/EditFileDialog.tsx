import React from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

interface EditFileDialogProps {
  visible: boolean;
  fileName: string;
  onChangeFileName: (text: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

const EditFileDialog = ({
  visible,
  fileName,
  onChangeFileName,
  onCancel,
  onSubmit,
}: EditFileDialogProps) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.dialogContainer}>
          <Text style={styles.dialogTitle}>Edit File</Text>
          <TextInput
            style={styles.dialogInput}
            value={fileName}
            onChangeText={onChangeFileName}
            autoFocus
          />
          <View style={styles.dialogButtons}>
            <TouchableOpacity
              style={styles.dialogCancelButton}
              onPress={onCancel}
            >
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dialogSubmitButton}
              onPress={onSubmit}
            >
              <Text style={styles.dialogSubmitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialogContainer: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  dialogTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    marginBottom: 16,
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
    fontFamily: "Montserrat_400Regular",
  },
  dialogButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  dialogCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 16,
  },
  dialogCancelText: {
    fontSize: 16,
    color: "#333",
    fontFamily: "Montserrat_400Regular",
  },
  dialogSubmitButton: {
    backgroundColor: "#CFE625",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dialogSubmitText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
  },
});

export default EditFileDialog;
