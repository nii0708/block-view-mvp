import { useState } from "react";
import { Alert } from "react-native";
import * as FileService from "../services/FileService";

export default function useFileOperations(onSuccess: () => void) {
  const [fileToEdit, setFileToEdit] =
    useState<FileService.MiningDataFile | null>(null);
  const [fileToDelete, setFileToDelete] =
    useState<FileService.MiningDataFile | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [editFileName, setEditFileName] = useState("");

  // Handle edit dialog open
  const handleEdit = (file: FileService.MiningDataFile) => {
    setFileToEdit(file);
    setEditFileName(file.name);
    setShowEditDialog(true);
  };

  // Handle delete dialog open
  const handleDelete = (file: FileService.MiningDataFile) => {
    setFileToDelete(file);
    setShowDeleteDialog(true);
  };

  // Submit edit changes
  const submitEdit = async () => {
    if (!fileToEdit || !editFileName.trim()) return;

    try {
      // Get all files
      const allFiles = await FileService.getFileInfo();

      // Check if name already exists
      const nameExists = allFiles.some(
        (file) => file.name === editFileName && file.name !== fileToEdit.name
      );

      if (nameExists) {
        Alert.alert("Error", "A file with this name already exists.");
        return;
      }

      // Update file name
      const updatedFiles = allFiles.map((file) => {
        if (file.name === fileToEdit.name) {
          return { ...file, name: editFileName };
        }
        return file;
      });

      // Save updated files
      await FileService.saveFileInfo(updatedFiles);

      // Close dialog and refresh
      setShowEditDialog(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating file:", error);
      Alert.alert("Error", "Failed to update file name.");
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      await FileService.deleteFileByName(fileToDelete.name);
      setShowDeleteDialog(false);
      onSuccess();
    } catch (error) {
      console.error("Error deleting file:", error);
      Alert.alert("Error", "Failed to delete file.");
    }
  };

  // Delete selected files
  const deleteSelectedFiles = async (selectedFiles: Set<string>) => {
    if (selectedFiles.size === 0) return;

    try {
      const allFiles = await FileService.getFileInfo();
      const updatedFiles = allFiles.filter(
        (file) => !selectedFiles.has(file.name)
      );
      await FileService.saveFileInfo(updatedFiles);

      setShowDeleteAllDialog(false);
      onSuccess();
    } catch (error) {
      console.error("Error deleting files:", error);
      Alert.alert("Error", "Failed to delete selected files.");
    }
  };

  return {
    fileToEdit,
    fileToDelete,
    showEditDialog,
    showDeleteDialog,
    showDeleteAllDialog,
    editFileName,
    setEditFileName,
    handleEdit,
    handleDelete,
    submitEdit,
    confirmDelete,
    deleteSelectedFiles,
    setShowEditDialog,
    setShowDeleteDialog,
    setShowDeleteAllDialog,
  };
}
