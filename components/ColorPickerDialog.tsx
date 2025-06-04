import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Slider from "@react-native-community/slider";
import { MaterialIcons } from "@expo/vector-icons";
import { useMiningData } from "../context/MiningDataContext";

// Get screen dimensions for responsive layout
const windowHeight = Dimensions.get("window").height;

interface ColorPickerDialogProps {
  visible: boolean;
  onClose: () => void;
  onColorChange: (
    colorMapping: { [key: string]: { color: string; opacity: number } },
    callback: () => void
  ) => void;
  rockTypes: { [key: string]: { color: string; opacity: number } };
  currentColors: { [key: string]: { color: string; opacity: number } };
  pickingAttributes?: { [key: string]: string[] };
}

const predefinedColors = [
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFA500",
  "#800080",
  "#FFC0CB",
  "#808080",
  "#8B4513",
  "#000000",
  "#75499c",
  "#b40c0d",
  "#045993",
  "#db6000",
  "#118011",
  "#6d392e",
];

const ColorPickerDialog: React.FC<ColorPickerDialogProps> = ({
  visible,
  onClose,
  onColorChange,
  rockTypes,
  currentColors,
  pickingAttributes,
}) => {
  // States
  const [colorMapping, setColorMapping] = useState<{
    [key: string]: { color: string; opacity: number };
  }>({});
  const [selectedAttributeType, setSelectedAttributeType] =
    useState<string>("");
  const [selectedAttribute, setSelectedAttribute] = useState<string>("");
  const [showAttributeTypeDropdown, setShowAttributeTypeDropdown] =
    useState(false);
  const [showAttributeDropdown, setShowAttributeDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs
  const prevAttributeTypeRef = useRef<string | null>(null);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasBeenInitializedRef = useRef<boolean>(false);

  const { setPickedAttribute } = useMiningData();

  // Memoized values
  const attributeTypeList = useMemo(() => {
    return pickingAttributes ? Object.keys(pickingAttributes) : [];
  }, [pickingAttributes]);

  const attributeList = useMemo(() => {
    if (!selectedAttributeType || !pickingAttributes) return [];
    return pickingAttributes[selectedAttributeType] || [];
  }, [selectedAttributeType, pickingAttributes]);

  const currentTypeAttributes = useMemo(() => {
    if (!pickingAttributes || !selectedAttributeType) return [];
    return pickingAttributes[selectedAttributeType] || [];
  }, [pickingAttributes, selectedAttributeType]);

  // Reset function
  const resetDialog = useCallback(() => {
    setShowAttributeTypeDropdown(false);
    setShowAttributeDropdown(false);
    setIsInitialized(false);
    hasBeenInitializedRef.current = false;
    prevAttributeTypeRef.current = null; // Reset this too
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
      initializationTimeoutRef.current = null;
    }
  }, []);

  // Initialize dialog when visible (ONLY when first opened)
  useEffect(() => {
    if (!visible) {
      resetDialog();
      return;
    }

    // Only initialize if this is the first time opening the dialog
    if (hasBeenInitializedRef.current) {
      return;
    }

    // Clear any existing timeout
    if (initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
    }

    // Initialize with a small delay to ensure smooth rendering
    initializationTimeoutRef.current = setTimeout(() => {
      // Initialize color mapping
      setColorMapping(currentColors);

      // Initialize attribute selection
      if (pickingAttributes && attributeTypeList.length > 0) {
        const firstAttributeType = attributeTypeList[0];
        setSelectedAttributeType(firstAttributeType);

        const firstTypeAttributes = pickingAttributes[firstAttributeType];
        if (firstTypeAttributes && firstTypeAttributes.length > 0) {
          setSelectedAttribute(firstTypeAttributes[0]);
        }
      }

      setIsInitialized(true);
      hasBeenInitializedRef.current = true;
    }, 100);

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
        initializationTimeoutRef.current = null;
      }
    };
  }, [visible]); // ONLY depend on visible now

  // Separate effect for color mapping updates (when currentColors change from outside)
  useEffect(() => {
    if (visible && isInitialized) {
      setColorMapping(currentColors);
    }
  }, [currentColors, visible, isInitialized]);

  // Handle attribute type changes (only update context, don't reset user selections)
  useEffect(() => {
    if (!pickingAttributes || !selectedAttributeType || !isInitialized) return;

    // Only update if the attribute type has actually changed
    if (prevAttributeTypeRef.current !== selectedAttributeType) {
      const selectedPickedAttribute = {
        [selectedAttributeType]: pickingAttributes[selectedAttributeType],
      };
      setPickedAttribute(selectedPickedAttribute);
      prevAttributeTypeRef.current = selectedAttributeType;
    }
  }, [selectedAttributeType, setPickedAttribute, isInitialized]); // Removed pickingAttributes dependency

  // Memoized color check function
  const isColorUsed = useCallback(
    (color: string, currentAttribute: string) => {
      return Object.entries(colorMapping).some(
        ([attribute, mapping]) =>
          attribute !== currentAttribute &&
          mapping.color === color &&
          currentTypeAttributes.includes(attribute)
      );
    },
    [colorMapping, currentTypeAttributes]
  );

  // Event handlers
  const handleColorSelect = useCallback(
    (color: string) => {
      if (!selectedAttribute || isLoading || !isInitialized) return;

      if (isColorUsed(color, selectedAttribute)) {
        return;
      }

      const currentOpacity = colorMapping[selectedAttribute]?.opacity || 0.7;
      const newMapping = {
        ...colorMapping,
        [selectedAttribute]: { color, opacity: currentOpacity },
      };
      setColorMapping(newMapping);
    },
    [selectedAttribute, isLoading, isInitialized, isColorUsed, colorMapping]
  );

  const handleOpacityChange = useCallback(
    (opacity: number) => {
      if (!selectedAttribute || isLoading || !isInitialized) return;

      const currentColor = colorMapping[selectedAttribute]?.color || "#808080";
      const newMapping = {
        ...colorMapping,
        [selectedAttribute]: { color: currentColor, opacity },
      };
      setColorMapping(newMapping);
    },
    [selectedAttribute, isLoading, isInitialized, colorMapping]
  );

  const handleApply = useCallback(() => {
    if (!isInitialized) return;

    setIsLoading(true);
    onColorChange(colorMapping, () => {
      setIsLoading(false);
      onClose();
    });
  }, [colorMapping, onColorChange, onClose, isInitialized]);

  const handleReset = useCallback(() => {
    if (!isLoading && isInitialized) {
      setColorMapping(currentColors);
    }
  }, [currentColors, isLoading, isInitialized]);

  const handleAttributeTypeSelect = useCallback(
    (attrType: string) => {
      if (!isInitialized || !pickingAttributes) return;

      setSelectedAttributeType(attrType);
      setShowAttributeTypeDropdown(false);

      // Reset selected attribute and set first attribute as default
      if (
        pickingAttributes[attrType] &&
        pickingAttributes[attrType].length > 0
      ) {
        setSelectedAttribute(pickingAttributes[attrType][0]);
      } else {
        setSelectedAttribute("");
      }
    },
    [pickingAttributes, isInitialized]
  );

  const handleAttributeSelect = useCallback(
    (attr: string) => {
      if (!isInitialized) return;
      setSelectedAttribute(attr);
      setShowAttributeDropdown(false);
    },
    [isInitialized]
  );

  const handleBackdropPress = useCallback(() => {
    if (isLoading || !isInitialized) return;

    if (showAttributeTypeDropdown) {
      setShowAttributeTypeDropdown(false);
      return;
    }
    if (showAttributeDropdown) {
      setShowAttributeDropdown(false);
      return;
    }
    onClose();
  }, [
    isLoading,
    isInitialized,
    showAttributeTypeDropdown,
    showAttributeDropdown,
    onClose,
  ]);

  // Don't render if not visible
  if (!visible) return null;

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.initializingContainer}>
            <ActivityIndicator size="large" color="#CFE625" />
            <Text style={styles.initializingText}>Preparing colors...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none" // Changed from "fade" to "none" to prevent animation conflicts
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Attribute Colours</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              disabled={isLoading}
            >
              <MaterialIcons
                name="close"
                size={24}
                color={isLoading ? "#ccc" : "#666"}
              />
            </TouchableOpacity>
          </View>

          {/* Scrollable content */}
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContentContainer}
          >
            {/* Attribute Type Selector */}
            <View style={styles.selectorSection}>
              <Text style={styles.sectionLabel}>
                Select block model attribute:
              </Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  isLoading && styles.disabledButton,
                ]}
                onPress={() => {
                  if (isLoading) return;
                  setShowAttributeDropdown(false);
                  setShowAttributeTypeDropdown(!showAttributeTypeDropdown);
                }}
                disabled={isLoading}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedAttributeType
                    ? selectedAttributeType.charAt(0).toUpperCase() +
                      selectedAttributeType.slice(1)
                    : "Select an attribute type"}
                </Text>
                <MaterialIcons
                  name={
                    showAttributeTypeDropdown
                      ? "arrow-drop-up"
                      : "arrow-drop-down"
                  }
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* Attribute Selector */}
            <View style={[styles.selectorSection, { marginTop: 15 }]}>
              <Text style={styles.sectionLabel}>Select type:</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  (isLoading ||
                    !selectedAttributeType ||
                    attributeList.length === 0) &&
                    styles.disabledButton,
                ]}
                onPress={() => {
                  if (
                    !selectedAttributeType ||
                    attributeList.length === 0 ||
                    isLoading
                  )
                    return;
                  setShowAttributeTypeDropdown(false);
                  setShowAttributeDropdown(!showAttributeDropdown);
                }}
                disabled={
                  !selectedAttributeType ||
                  attributeList.length === 0 ||
                  isLoading
                }
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedAttribute
                    ? selectedAttribute.charAt(0).toUpperCase() +
                      selectedAttribute.slice(1)
                    : "Select an attribute"}
                </Text>
                <MaterialIcons
                  name={
                    showAttributeDropdown ? "arrow-drop-up" : "arrow-drop-down"
                  }
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {/* Color Palette */}
            <View style={styles.colorSection}>
              <Text style={styles.sectionLabel}>Choose attribute color:</Text>
              <View style={styles.colorPalette}>
                {predefinedColors.map((color) => {
                  const isUsed = isColorUsed(color, selectedAttribute);
                  const isSelected =
                    colorMapping[selectedAttribute]?.color === color;

                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        isSelected && styles.selectedColor,
                        isUsed && styles.usedColor,
                      ]}
                      onPress={() => handleColorSelect(color)}
                      disabled={isUsed || !selectedAttribute || isLoading}
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
                    (colorMapping[selectedAttribute]?.opacity || 0.7) * 100
                  )}
                  %
                </Text>
                <Slider
                  style={styles.opacitySlider}
                  minimumValue={0.1}
                  maximumValue={1}
                  value={colorMapping[selectedAttribute]?.opacity || 0.7}
                  onValueChange={handleOpacityChange}
                  minimumTrackTintColor="#CFE625"
                  maximumTrackTintColor="#ddd"
                  thumbTintColor="#CFE625"
                  disabled={!selectedAttribute || isLoading}
                />
              </View>
            </View>

            {/* Current Mappings List */}
            <View style={styles.mappingSection}>
              <Text style={styles.sectionLabel}>
                Current attribute color mappings:
              </Text>
              <View style={styles.mappingListContainer}>
                {currentTypeAttributes.length > 0 ? (
                  <ScrollView
                    style={styles.mappingList}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {currentTypeAttributes.map((attr) => (
                      <View key={attr} style={styles.mappingItem}>
                        <View style={styles.mappingInfo}>
                          <Text
                            style={styles.mappingText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {attr.charAt(0).toUpperCase() + attr.slice(1)}
                          </Text>
                          <View
                            style={[
                              styles.mappingColor,
                              {
                                backgroundColor:
                                  colorMapping[attr]?.color || "#ccc",
                                opacity: colorMapping[attr]?.opacity || 0.7,
                              },
                            ]}
                          />
                          <Text style={styles.mappingOpacity}>
                            {Math.round(
                              (colorMapping[attr]?.opacity || 0.7) * 100
                            )}
                            %
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noDataText}>No attributes available</Text>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.resetButton,
                isLoading && styles.disabledButton,
              ]}
              onPress={handleReset}
              disabled={isLoading}
            >
              <Text
                style={[
                  styles.resetButtonText,
                  isLoading && styles.disabledText,
                ]}
              >
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.applyButton,
                isLoading && styles.disabledButton,
              ]}
              onPress={handleApply}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.applyButtonText}>Applying...</Text>
                </View>
              ) : (
                <Text style={styles.applyButtonText}>Apply</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Attribute Type Dropdown */}
        {showAttributeTypeDropdown &&
          attributeTypeList.length > 0 &&
          isInitialized && (
            <View style={styles.dropdownOverlay}>
              <TouchableWithoutFeedback
                onPress={() => setShowAttributeTypeDropdown(false)}
              >
                <View style={styles.dropdownBackdrop} />
              </TouchableWithoutFeedback>
              <View style={styles.dropdownModalContent}>
                <ScrollView nestedScrollEnabled={true}>
                  {attributeTypeList.map((attrType) => (
                    <TouchableOpacity
                      key={attrType}
                      style={[
                        styles.dropdownItem,
                        selectedAttributeType === attrType &&
                          styles.selectedDropdownItem,
                      ]}
                      onPress={() => handleAttributeTypeSelect(attrType)}
                    >
                      <Text style={styles.dropdownItemText}>
                        {attrType.charAt(0).toUpperCase() + attrType.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

        {/* Attribute Dropdown */}
        {showAttributeDropdown && attributeList.length > 0 && isInitialized && (
          <View style={styles.dropdownOverlay}>
            <TouchableWithoutFeedback
              onPress={() => setShowAttributeDropdown(false)}
            >
              <View style={styles.dropdownBackdrop} />
            </TouchableWithoutFeedback>
            <View style={styles.dropdownModalContent}>
              <ScrollView nestedScrollEnabled={true}>
                {attributeList.map((attr) => (
                  <TouchableOpacity
                    key={attr}
                    style={[
                      styles.dropdownItem,
                      selectedAttribute === attr && styles.selectedDropdownItem,
                    ]}
                    onPress={() => handleAttributeSelect(attr)}
                  >
                    <Text style={styles.dropdownItemText}>
                      {attr.charAt(0).toUpperCase() + attr.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Main Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBackground}>
              <ActivityIndicator size="large" color="#CFE625" />
              <Text style={styles.loadingText}>Processing changes...</Text>
            </View>
          </View>
        )}
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
  initializingContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  initializingText: {
    marginTop: 15,
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#333",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    borderRadius: 20,
  },
  loadingBackground: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    marginTop: 10,
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: "#999",
  },
  modalContent: {
    width: "90%",
    maxHeight: windowHeight * 0.8,
    backgroundColor: "white",
    borderRadius: 20,
    paddingTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    position: "relative",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    paddingHorizontal: 20,
    paddingRight: 45,
  },
  scrollContent: {
    maxHeight: windowHeight * 0.58,
    paddingHorizontal: 20,
  },
  scrollContentContainer: {
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#212529",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: 15,
    top: 0,
    padding: 4,
    height: 36,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#495057",
    marginBottom: 8,
  },
  selectorSection: {
    marginBottom: 15,
    position: "relative",
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
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  dropdownModalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    width: "90%",
    maxHeight: 200,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 12,
  },
  colorSection: {
    marginBottom: 20,
    zIndex: 2,
    alignItems: "center",
  },
  colorPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 5,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
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
    maxHeight: 200,
    zIndex: 1,
  },
  mappingListContainer: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e9ecef",
    backgroundColor: "#f8f9fa",
    height: 140,
  },
  mappingList: {
    padding: 12,
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
    flex: 1,
  },
  mappingColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginHorizontal: 8,
  },
  mappingOpacity: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#6c757d",
    width: 40,
    textAlign: "right",
  },
  noDataText: {
    padding: 15,
    textAlign: "center",
    color: "#6c757d",
    fontStyle: "italic",
  },
  opacitySection: {
    marginBottom: 20,
    zIndex: 1,
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    zIndex: 1,
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
    shadowOffset: { width: 0, height: 2 },
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
