import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface DeleteMultipleDialogProps {
  visible: boolean;
  count: number;
  onCancel: () => void;
  onDelete: () => void;
}

const DeleteMultipleDialog = ({
  visible,
  count,
  onCancel,
  onDelete,
}: DeleteMultipleDialogProps) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.dialogContainer}>
          <Text style={styles.dialogTitle}>Delete Files</Text>
          <Text style={styles.dialogMessage}>
            Delete all {count} selected files?
          </Text>
          <View style={styles.dialogButtons}>
            <TouchableOpacity
              style={styles.dialogCancelButton}
              onPress={onCancel}
            >
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dialogDeleteButton}
              onPress={onDelete}
            >
              <Text style={styles.dialogDeleteText}>Delete</Text>
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
  dialogMessage: {
    fontSize: 16,
    color: "#333",
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
  dialogDeleteButton: {
    backgroundColor: "#ff6b6b",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dialogDeleteText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "white",
  },
});

export default DeleteMultipleDialog;
