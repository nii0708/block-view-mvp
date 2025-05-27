import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

interface MapControlsProps {
  intervalValue: number;
  coordinates: {
    lat: number;
    lng: number;
    x: number;
    y: number;
  };
  mapReady: boolean;
  isCreateLineMode: boolean;
  onSliderChange: (value: number) => void;
  onToggleRulerMode: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  intervalValue,
  coordinates,
  mapReady,
  isCreateLineMode,
  onSliderChange,
  onToggleRulerMode,
}) => {
  const handleSliderTouch = (event: any) => {
    // Convert touch position to slider value (0-30)
    const { locationX } = event.nativeEvent;
    const { width } = event.nativeEvent.target.getBoundingClientRect();
    const value = Math.round((locationX / width) * 30);
    onSliderChange(value);
  };

  return (
    <View style={styles.controlsContainer}>
      {/* Interval Controls */}
      <View style={styles.intervalContainer}>
        <Text style={styles.intervalLabel}>Interval</Text>
        <View style={styles.sliderContainer}>
          <View
            style={styles.sliderTrack}
            onTouchStart={handleSliderTouch}
            onTouchMove={handleSliderTouch}
          >
            <View
              style={[
                styles.sliderFill,
                { width: `${(intervalValue / 30) * 100}%` },
              ]}
            />
          </View>
          <View
            style={[
              styles.sliderThumb,
              { left: `${(intervalValue / 30) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.intervalValue}>
          0-{Math.round(intervalValue)} lvl
        </Text>
        <Text style={styles.intervalLabel}>Elevation interval</Text>
      </View>

      {/* Coordinates and Tools */}
      <View style={styles.coordinatesContainer}>
        <TouchableOpacity
          style={[
            styles.rulerButton,
            isCreateLineMode && { backgroundColor: "#d0d0d0" },
          ]}
          onPress={onToggleRulerMode}
        >
          <MaterialCommunityIcons name="ruler" size={24} color="black" />
        </TouchableOpacity>

        <View style={styles.coordinatesDisplay}>
          <Text style={styles.coordinatesText}>
            {mapReady
              ? `x:${Math.round(coordinates?.lng || 0)}, y:${Math.round(
                  coordinates?.lat || 0
                )}`
              : "Loading..."}
          </Text>
        </View>

        <TouchableOpacity style={styles.droneButton}>
          <Feather name="camera" size={24} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  intervalContainer: {
    marginTop: 20,
  },
  intervalLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  sliderContainer: {
    height: 30,
    justifyContent: "center",
    position: "relative",
  },
  sliderTrack: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
  },
  sliderFill: {
    height: 4,
    backgroundColor: "#0066CC",
    borderRadius: 2,
  },
  sliderThumb: {
    position: "absolute",
    width: 20,
    height: 20,
    backgroundColor: "#0066CC",
    borderRadius: 10,
    top: 5,
    marginLeft: -10,
  },
  intervalValue: {
    fontSize: 14,
    color: "#333",
    alignSelf: "flex-end",
    marginTop: 5,
  },
  coordinatesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
    paddingVertical: 10,
  },
  rulerButton: {
    width: 40,
    height: 40,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  droneButton: {
    width: 40,
    height: 40,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  coordinatesDisplay: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 10,
    alignItems: "center",
    alignSelf: "center",
  },
  coordinatesText: {
    fontSize: 14,
    color: "#333",
    fontFamily: "Montserrat_400Regular",
  },
});

export default MapControls;
