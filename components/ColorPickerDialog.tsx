import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import Slider from "@react-native-community/slider";
import { MaterialIcons } from "@expo/vector-icons";

interface ColorPickerDialogProps {
  visible: boolean;
  onClose: () => void;
  onColorChange: (colorMapping: {
    [key: string]: { color: string; opacity: number };
  }) => void;
  rockTypes: { [key: string]: { color: string; opacity: number } };
  currentColors: { [key: string]: { color: string; opacity: number } };
}

const predefinedColors = [
  "#FF0000", // Red
  "#00FF00", // Green
  "#0000FF", // Blue
  "#FFFF00", // Yellow
  "#FF00FF", // Magenta
  "#00FFFF", // Cyan
  "#FFA500", // Orange
  "#800080", // Purple
  "#FFC0CB", // Pink
  "#808080", // Gray
  "#8B4513", // Brown
  "#000000", // Black
  "#75499c", // Purple variant
  "#b40c0d", // Red variant
  "#045993", // Blue variant
  "#db6000", // Orange variant
  "#118011", // Green variant
  "#6d392e", // Brown variant
];

const ColorPickerDialog: React.FC<ColorPickerDialogProps> = ({
  visible,
  onClose,
  onColorChange,
  rockTypes,
  currentColors,
}) => {
  const [colorMapping, setColorMapping] = useState<{
    [key: string]: { color: string; opacity: number };
  }>({});
  const [selectedRockType, setSelectedRockType] = useState<string>("");
  const [showRockTypeDropdown, setShowRockTypeDropdown] = useState(false);

  useEffect(() => {
    setColorMapping(currentColors);
    // Set first rock type as default selected
    const rockTypeKeys = Object.keys(rockTypes);
    if (rockTypeKeys.length > 0 && !selectedRockType) {
      setSelectedRockType(rockTypeKeys[0]);
    }
  }, [currentColors, rockTypes]);

  // Function to check if a color is already used by another rock type
  const isColorUsed = (color: string, currentRockType: string) => {
    return Object.entries(colorMapping).some(
      ([rockType, mapping]) =>
        rockType !== currentRockType && mapping.color === color
    );
  };

  const handleColorSelect = (color: string) => {
    if (!selectedRockType) return;

    // Check if color is already used by another rock type
    if (isColorUsed(color, selectedRockType)) {
      // Optionally, you can show an alert or toast message here
      return;
    }

    const currentOpacity = colorMapping[selectedRockType]?.opacity || 0.7;
    const newMapping = {
      ...colorMapping,
      [selectedRockType]: { color, opacity: currentOpacity },
    };
    setColorMapping(newMapping);
  };

  const handleOpacityChange = (opacity: number) => {
    if (!selectedRockType) return;

    const currentColor = colorMapping[selectedRockType]?.color || "#808080";
    const newMapping = {
      ...colorMapping,
      [selectedRockType]: { color: currentColor, opacity },
    };
    setColorMapping(newMapping);
  };

  const handleApply = () => {
    onColorChange(colorMapping);
    onClose();
  };

  const handleReset = () => {
    setColorMapping(currentColors);
  };

  const rockTypeList = Object.keys(rockTypes);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContent}>
          <View style={styles.modalInner}>
            <View style={styles.header}>
              <Text style={styles.title}>Block Colours</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Rock Type Selector */}
            <View style={styles.selectorSection}>
              <Text style={styles.sectionLabel}>Select Rock Type:</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowRockTypeDropdown(!showRockTypeDropdown)}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedRockType.charAt(0).toUpperCase() +
                    selectedRockType.slice(1)}
                </Text>
                <MaterialIcons
                  name={
                    showRockTypeDropdown ? "arrow-drop-up" : "arrow-drop-down"
                  }
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>

              {showRockTypeDropdown && (
                <View style={styles.dropdownMenu}>
                  {rockTypeList.map((rockType) => (
                    <TouchableOpacity
                      key={rockType}
                      style={[
                        styles.dropdownItem,
                        selectedRockType === rockType &&
                          styles.selectedDropdownItem,
                      ]}
                      onPress={() => {
                        setSelectedRockType(rockType);
                        setShowRockTypeDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>
                        {rockType.charAt(0).toUpperCase() + rockType.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Color Palette */}
            <View style={styles.colorSection}>
              <Text style={styles.sectionLabel}>Choose Color:</Text>
              <View style={styles.colorPalette}>
                {predefinedColors.map((color) => {
                  const isUsed = isColorUsed(color, selectedRockType);
                  const isSelected =
                    colorMapping[selectedRockType]?.color === color;

                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        isSelected && styles.selectedColor,
                        isUsed && styles.usedColor,
                      ]}
                      onPress={() => !isUsed && handleColorSelect(color)}
                      disabled={isUsed}
                    >
                      {isSelected && (
                        <MaterialIcons name="check" size={16} color="#fff" />
                      )}
                      {isUsed && !isSelected && (
                        <MaterialIcons name="close" size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Opacity Control */}
            <View style={styles.opacitySection}>
              <Text style={styles.sectionLabel}>Opacity:</Text>
              <View style={styles.opacityControl}>
                <Text style={styles.opacityValue}>
                  {Math.round(
                    (colorMapping[selectedRockType]?.opacity || 0.7) * 100
                  )}
                  %
                </Text>
                <Slider
                  style={styles.opacitySlider}
                  minimumValue={0.1}
                  maximumValue={1}
                  value={colorMapping[selectedRockType]?.opacity || 0.7}
                  onValueChange={handleOpacityChange}
                  minimumTrackTintColor="#CFE625"
                  maximumTrackTintColor="#ddd"
                  thumbTintColor="#CFE625"
                />
              </View>
            </View>

            {/* Current Mappings List */}
            <View style={styles.mappingSection}>
              <Text style={styles.sectionLabel}>Current Color Mappings:</Text>
              <View style={styles.mappingListContainer}>
                <ScrollView
                  style={styles.mappingList}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {rockTypeList.map((rockType) => (
                    <View key={rockType} style={styles.mappingItem}>
                      <View style={styles.mappingInfo}>
                        <Text style={styles.mappingText}>
                          {rockType.charAt(0).toUpperCase() + rockType.slice(1)}
                        </Text>
                        <View
                          style={[
                            styles.mappingColor,
                            {
                              backgroundColor:
                                colorMapping[rockType]?.color || "#ccc",
                              opacity: colorMapping[rockType]?.opacity || 0.7,
                            },
                          ]}
                        />
                        <Text style={styles.mappingOpacity}>
                          {Math.round(
                            (colorMapping[rockType]?.opacity || 0.7) * 100
                          )}
                          %
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.resetButton]}
                onPress={handleReset}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.applyButton]}
                onPress={handleApply}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalContent: {
    width: "85%",
    maxHeight: "80%",
    zIndex: 1,
  },
  modalInner: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
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
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#495057",
    marginBottom: 8,
  },
  selectorSection: {
    marginBottom: 20,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dropdownButtonText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#212529",
  },
  dropdownMenu: {
    position: "absolute",
    top: 65,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedDropdownItem: {
    backgroundColor: "#f5f5f5",
  },
  dropdownItemText: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
    color: "#212529",
  },
  colorSection: {
    marginBottom: 20,
  },
  colorPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedColor: {
    borderColor: "#CFE625",
    borderWidth: 3,
  },
  usedColor: {
    opacity: 0.5,
    borderColor: "#ff4444",
    borderWidth: 2,
  },
  mappingSection: {
    marginBottom: 10,
    height: 150,
  },
  mappingListContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  mappingList: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  mappingItem: {
    marginBottom: 8,
  },
  mappingInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "white",
    borderRadius: 8,
  },
  mappingText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#212529",
  },
  mappingColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  mappingOpacity: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#6c757d",
    marginLeft: 8,
  },
  opacitySection: {
    marginBottom: 20,
  },
  opacityControl: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  opacityValue: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#212529",
    width: 50,
    textAlign: "center",
  },
  opacitySlider: {
    flex: 1,
    height: 40,
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  button: {
    flex: 0.48,
    height: 45,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButton: {
    backgroundColor: "#f0f0f0",
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#495057",
  },
  applyButton: {
    backgroundColor: "#CFE625",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#000",
  },
});

export default ColorPickerDialog;
