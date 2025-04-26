import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Image,
  FlatList,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Animated,
  PanResponder,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as FileService from "../services/FileService";
import { useAuth } from "../services/AuthService"; // Import useAuth

// SwipeableItem component for list items
const SwipeableItem = ({
  item,
  onEdit,
  onDelete,
  isSelectionMode,
  isSelected,
  onSelect,
  onPress,
}: {
  item: FileService.MiningDataFile;
  onEdit: (item: FileService.MiningDataFile) => void;
  onDelete: (item: FileService.MiningDataFile) => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelect: (item: FileService.MiningDataFile) => void;
  onPress: (item: FileService.MiningDataFile) => void;
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [showActions, setShowActions] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes and when not in selection mode
        return (
          !isSelectionMode &&
          Math.abs(gestureState.dx) > 5 &&
          Math.abs(gestureState.dy) < 20
        );
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value || 0,
          y: 0,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        // If swiped right enough, show actions
        if (gestureState.dx > 50) {
          Animated.spring(pan, {
            toValue: { x: 100, y: 0 }, // Increased for wider buttons
            useNativeDriver: false,
          }).start();
          setShowActions(true);
        } else {
          // Reset position
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
          setShowActions(false);
        }
      },
    })
  ).current;

  const resetPosition = () => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
    setShowActions(false);
  };

  // Reset position when selection mode changes
  useEffect(() => {
    if (isSelectionMode) {
      resetPosition();
    }
  }, [isSelectionMode]);

  return (
    <View style={styles.swipeableContainer}>
      {/* Actions shown when swiped */}
      <View style={styles.actionsContainer}>
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              resetPosition();
              onEdit(item);
            }}
          >
            <Feather name="edit-2" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              resetPosition();
              onDelete(item);
            }}
          >
            <Feather name="trash-2" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* The actual item */}
      <Animated.View
        style={[
          styles.fileItemContainer,
          { transform: [{ translateX: pan.x }] },
        ]}
        {...(isSelectionMode ? {} : panResponder.panHandlers)}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.fileItem}
          onPress={() => (isSelectionMode ? onSelect(item) : onPress(item))}
          onLongPress={() => !isSelectionMode && onSelect(item)}
        >
          {isSelectionMode && (
            <View style={styles.radioContainer}>
              <View
                style={[
                  styles.radioOuter,
                  isSelected && styles.radioOuterSelected,
                ]}
              >
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </View>
          )}
          <Text style={styles.fileName}>{item.name}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { isLoggedIn } = useAuth(); // Use auth context
  const [files, setFiles] = useState<FileService.MiningDataFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  // States for CRUD operations
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [fileToEdit, setFileToEdit] =
    useState<FileService.MiningDataFile | null>(null);
  const [fileToDelete, setFileToDelete] =
    useState<FileService.MiningDataFile | null>(null);
  const [editFileName, setEditFileName] = useState("");

  // Add function to handle profile button click
  const handleProfileClick = () => {
    if (isLoggedIn) {
      router.push("/profile");
    } else {
      router.push("/login");
    }
  };

  // Load files when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadFiles();
      // Reset selection mode and selections when screen comes into focus
      setIsSelectionMode(false);
      setSelectedFiles(new Set());
    }, [])
  );

  const loadFiles = async () => {
    setLoading(true);
    try {
      const loadedFiles = await FileService.getFileInfo();
      setFiles(loadedFiles);
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = searchText
    ? files.filter((file) =>
        file.name.toLowerCase().includes(searchText.toLowerCase())
      )
    : files;

  // Handle file selection for multi-select
  const handleSelectFile = (file: FileService.MiningDataFile) => {
    setIsSelectionMode(true);
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(file.name)) {
        newSet.delete(file.name);
      } else {
        newSet.add(file.name);
      }
      return newSet;
    });
  };

  // Check if all files are selected
  const areAllFilesSelected = () => {
    return (
      filteredFiles.length > 0 && selectedFiles.size === filteredFiles.length
    );
  };

  // Toggle select all files
  const toggleSelectAll = () => {
    if (areAllFilesSelected()) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map((file) => file.name)));
    }
  };

  // Exit selection mode
  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedFiles(new Set());
  };

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
      loadFiles();
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
      loadFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      Alert.alert("Error", "Failed to delete file.");
    }
  };

  // Delete selected files
  const deleteSelectedFiles = async () => {
    if (selectedFiles.size === 0) return;

    try {
      const allFiles = await FileService.getFileInfo();
      const updatedFiles = allFiles.filter(
        (file) => !selectedFiles.has(file.name)
      );
      await FileService.saveFileInfo(updatedFiles);

      setShowDeleteAllDialog(false);
      exitSelectionMode();
      loadFiles();
    } catch (error) {
      console.error("Error deleting files:", error);
      Alert.alert("Error", "Failed to delete selected files.");
    }
  };

  // Navigate to coordinateSelection instead of directly to topDownView
  const handleFilePress = (file: FileService.MiningDataFile) => {
    console.log("Selected file:", file.name);
    router.push({
      pathname: "/coordinateSelection",
      params: { fileName: file.name },
    });
  };

  // Render file item
  const renderFileItem = ({ item }: { item: FileService.MiningDataFile }) => (
    <SwipeableItem
      item={item}
      onEdit={handleEdit}
      onDelete={handleDelete}
      isSelectionMode={isSelectionMode}
      isSelected={selectedFiles.has(item.name)}
      onSelect={handleSelectFile}
      onPress={handleFilePress}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        {isSelectionMode ? (
          <TouchableOpacity onPress={exitSelectionMode}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        {isSelectionMode ? (
          <View style={styles.headerTitle}>
            <Text style={styles.selectedCount}>
              {selectedFiles.size} Selected
            </Text>
          </View>
        ) : null}

        {isSelectionMode ? (
          <TouchableOpacity onPress={toggleSelectAll}>
            <Text style={styles.selectAllButton}>
              {areAllFilesSelected() ? "Deselect All" : "Select All"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={handleProfileClick}
          >
            <MaterialIcons name="person" size={24} color="black" />
          </TouchableOpacity>
        )}
      </View>

      {/* Logo and Tagline */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>
          Beyond the ground in{"\n"}the palm of your hand
        </Text>
      </View>

      {/* Content Container - Holds Search and Files */}
      <View style={styles.contentContainer}>
        {/* Search Box - Only shows when there are files and not in selection mode */}
        {files.length > 0 && !isSelectionMode && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              value={searchText}
              onChangeText={setSearchText}
            />
            <MaterialIcons
              name="search"
              size={24}
              color="#666"
              style={styles.searchIcon}
            />
          </View>
        )}

        {/* File List or Empty State */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
          </View>
        ) : files.length > 0 ? (
          <FlatList
            data={filteredFiles}
            renderItem={renderFileItem}
            keyExtractor={(item) => item.name}
            contentContainerStyle={styles.fileList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>The files is empty</Text>
            <Text style={styles.importText}>Please import one</Text>
          </View>
        )}
      </View>

      {/* Delete Selected Button (when in selection mode) */}
      {isSelectionMode && selectedFiles.size > 0 && (
        <View style={styles.deleteSelectedContainer}>
          <TouchableOpacity
            style={styles.deleteSelectedButton}
            onPress={() => setShowDeleteAllDialog(true)}
          >
            <Feather name="trash-2" size={22} color="white" />
            <Text style={styles.deleteSelectedText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Button (only when not in selection mode) */}
      {!isSelectionMode && (
        <View style={styles.addButtonContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/upload")}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Dialog */}
      <Modal
        visible={showEditDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>Edit File</Text>
            <TextInput
              style={styles.dialogInput}
              value={editFileName}
              onChangeText={setEditFileName}
              autoFocus
            />
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={styles.dialogCancelButton}
                onPress={() => setShowEditDialog(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogSubmitButton}
                onPress={submitEdit}
              >
                <Text style={styles.dialogSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Dialog */}
      <Modal
        visible={showDeleteDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>Delete File</Text>
            <Text style={styles.dialogMessage}>
              {fileToDelete
                ? `Delete ${fileToDelete.name}?`
                : "Delete this file?"}
            </Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={styles.dialogCancelButton}
                onPress={() => setShowDeleteDialog(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogDeleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.dialogDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete All Dialog */}
      <Modal
        visible={showDeleteAllDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteAllDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>Delete Files</Text>
            <Text style={styles.dialogMessage}>
              {`Delete all ${selectedFiles.size} selected files?`}
            </Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={styles.dialogCancelButton}
                onPress={() => setShowDeleteAllDialog(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogDeleteButton}
                onPress={deleteSelectedFiles}
              >
                <Text style={styles.dialogDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  selectedCount: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#333",
  },
  cancelButton: {
    fontFamily: "Montserrat_400Regular",
    fontSize: 16,
    color: "#333",
  },
  selectAllButton: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 16,
    color: "#0066CC",
  },
  profileButton: {
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  logo: {
    width: 300,
    height: 60,
  },
  tagline: {
    fontFamily: "Montserrat_600SemiBold",
    fontSize: 20,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
  },
  contentContainer: {
    flex: 1,
    marginHorizontal: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 15,
    padding: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    alignSelf: "center",
    width: "80%",
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#333",
    fontFamily: "Montserrat_400Regular",
  },
  searchIcon: {
    marginLeft: 10,
  },
  fileList: {
    paddingBottom: 10,
  },
  swipeableContainer: {
    position: "relative",
    marginBottom: 10,
  },
  actionsContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 2,
  },
  editButton: {
    width: 45,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#288338", // Green color specified
    borderRadius: 0, // No border radius for connected buttons
  },
  deleteButton: {
    width: 45,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#AD0F0F", // Red color specified
    borderRadius: 0, // No border radius for connected buttons
  },
  fileItemContainer: {
    width: "100%",
  },
  fileItem: {
    backgroundColor: "#FAFF9F",
    padding: 15,
    borderRadius: 8,
    elevation: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  fileItemFullWidth: {
    width: "100%",
  },
  radioContainer: {
    marginRight: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#0066CC",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0066CC",
  },
  fileName: {
    fontSize: 16,
    color: "#333",
    fontFamily: "Montserrat_600SemiBold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
  },
  importText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    fontFamily: "Montserrat_400Regular",
  },
  addButtonContainer: {
    position: "absolute",
    bottom: 40,
    right: 30,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  addButtonText: {
    fontSize: 30,
    color: "#333",
    fontFamily: "Montserrat_600SemiBold",
  },
  deleteSelectedContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  deleteSelectedButton: {
    backgroundColor: "#ff6b6b",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
  },
  deleteSelectedText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    marginLeft: 8,
  },
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
