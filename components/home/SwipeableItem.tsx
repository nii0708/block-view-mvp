import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  PanResponder,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as FileService from "../../services/FileService";

interface SwipeableItemProps {
  item: FileService.MiningDataFile;
  onEdit: (item: FileService.MiningDataFile) => void;
  onDelete: (item: FileService.MiningDataFile) => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelect: (item: FileService.MiningDataFile) => void;
  onPress: (item: FileService.MiningDataFile) => void;
}

const SwipeableItem = ({
  item,
  onEdit,
  onDelete,
  isSelectionMode,
  isSelected,
  onSelect,
  onPress,
}: SwipeableItemProps) => {
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
          activeOpacity={1.0}
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

const styles = StyleSheet.create({
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
    backgroundColor: "#288338", // Green color
    borderRadius: 0, // No border radius for connected buttons
  },
  deleteButton: {
    width: 45,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#AD0F0F", // Red color
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
});

export default SwipeableItem;
