import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
} from "react-native";

// Get screen dimensions
const windowWidth = Dimensions.get("window").width;

interface LineDrawingControlsProps {
  lineLength: number;
  elevation: number;
  coordinates: {
    lat: number;
    lng: number;
    x: number;
    y: number;
  };
  selectedPoints: any[];
  onUndo: () => void;
  onAddPoint: () => void;
  onCreateCrossSection: () => void;
}

const LineDrawingControls: React.FC<LineDrawingControlsProps> = ({
  lineLength,
  elevation,
  coordinates,
  selectedPoints,
  onUndo,
  onAddPoint,
  onCreateCrossSection,
}) => {
  return (
    <>
      {/* Line drawing inputs */}
      <View style={styles.createLineInputs}>
        <View style={styles.inputRow}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Length:</Text>
            <TextInput
              style={styles.input}
              value={`${lineLength} m`}
              editable={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Elevation:</Text>
            <TextInput
              style={styles.input}
              value={`${elevation} m`}
              editable={false}
            />
          </View>
        </View>

        <View style={styles.coordinateInput}>
          <Text style={styles.inputLabel}>Point: long, lat</Text>
          <TextInput
            style={styles.input}
            value={
              selectedPoints.length > 0
                ? `${(coordinates.lng || 0).toFixed(6)}, ${(
                    coordinates.lat || 0
                  ).toFixed(6)}`
                : ""
            }
            editable={false}
          />
        </View>

        <Text style={styles.debugInfo}>
          Selected points: {selectedPoints.length}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.createLineButtons}>
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={onUndo}>
            <Text style={styles.actionButtonText}>Undo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              selectedPoints.length >= 2 && styles.disabledActionButton,
            ]}
            onPress={onAddPoint}
            disabled={selectedPoints.length >= 2}
          >
            <Text style={styles.actionButtonText}>Add point</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.createSectionButton,
            selectedPoints.length !== 2 && styles.disabledSectionButton,
          ]}
          onPress={onCreateCrossSection}
          disabled={selectedPoints.length !== 2}
        >
          <Text style={styles.createSectionButtonText}>
            Create Cross Section
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  createLineInputs: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  inputContainer: {
    width: "48%",
  },
  coordinateInput: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: "#f9f9f9",
  },
  debugInfo: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  createLineButtons: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: "auto",
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    flex: 0.48,
    alignItems: "center",
  },
  disabledActionButton: {
    backgroundColor: "#e0e0e0",
    opacity: 0.7,
  },
  actionButtonText: {
    color: "#333",
    fontWeight: "500",
  },
  createSectionButton: {
    backgroundColor: "#CFE625", // Yellow color
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 5,
    marginBottom: 10,
  },
  disabledSectionButton: {
    backgroundColor: "#f0f0f0", // Gray color
  },
  createSectionButtonText: {
    color: "#333",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default LineDrawingControls;
