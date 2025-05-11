import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { WebView } from "react-native-webview";
import { generateLeafletMapContent } from "./LeafletMapContent";
import { GeoJsonFeature } from "../../utils/types";

interface LeafletMapProps {
  onMapPress?: (point: any) => void;
  onMapReady?: () => void;
  onCoordinateChange?: (coordinates: { lat: number; lng: number }) => void;
  onAddPointFromCrosshair?: (addPointFunc: () => void) => void;
  style?: any;
  geoJsonData?: any;
  pitGeoJsonData?: any;
  mapCenter?: number[];
  mapZoom?: number;
  selectedPoints?: any[];
  isCreateLineMode?: boolean;
  elevationRange?: { min: number; max: number };
  hideInternalCoordinates?: boolean;
  useCrosshairForDrawing?: boolean;
  lineColor?: string;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  onMapPress,
  onMapReady,
  onCoordinateChange,
  onAddPointFromCrosshair,
  style,
  geoJsonData,
  pitGeoJsonData,
  mapCenter = [-2.5, 120],
  mapZoom = 5,
  selectedPoints = [],
  isCreateLineMode = false,
  elevationRange = { min: 0, max: 1000 },
  hideInternalCoordinates = true,
  useCrosshairForDrawing = true,
  lineColor = "#CFE625",
}) => {
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  const [mapIsReady, setMapIsReady] = useState(false);
  const [currentCoordinates, setCurrentCoordinates] = useState({
    lat: 0,
    lng: 0,
  });

  // Keep track of processed points to avoid duplicate processing
  const processedPointsRef = useRef<string[]>([]);

  // Filter pit data based on elevation range
  const getFilteredPitData = useCallback(() => {
    if (!pitGeoJsonData || !pitGeoJsonData.features) {
      return pitGeoJsonData;
    }

    // Use a wide buffer to include more features
    const buffer = 50; // Add a 50m buffer on either side

    const filteredFeatures = pitGeoJsonData.features.filter(
      (feature: GeoJsonFeature) => {
        const featureLevel = feature.properties?.level || 0;
        return (
          featureLevel >= elevationRange.min - buffer &&
          featureLevel <= elevationRange.max + buffer
        );
      }
    );

    return {
      ...pitGeoJsonData,
      features: filteredFeatures,
    };
  }, [pitGeoJsonData, elevationRange]);

  // Update GeoJSON data only when changed
  useEffect(() => {
    if (mapIsReady && webViewRef.current) {
      // Don't limit the number of features unless VERY large
      let optimizedGeoJsonData = geoJsonData;

      if (optimizedGeoJsonData?.features?.length > 5000) {
        optimizedGeoJsonData = {
          ...optimizedGeoJsonData,
          features: optimizedGeoJsonData.features.slice(0, 5000),
        };
      }

      // Get filtered pit data based on elevation range
      const filteredPitData = getFilteredPitData();

      webViewRef.current.injectJavaScript(`
      (function() {
        try {
          if (typeof updateMapData === 'function') {
            updateMapData({
              geoJsonData: ${JSON.stringify(optimizedGeoJsonData)},
              pitGeoJsonData: ${JSON.stringify(filteredPitData)},
              mapCenter: ${JSON.stringify(mapCenter)},
              mapZoom: ${mapZoom},
              skipFitBounds: true // Prevent auto-zooming
            });
            return true;
          }
        } catch (error) {
          console.error("Error updating map data:", error);
        }
      })();
    `);
    }
  }, [
    geoJsonData,
    pitGeoJsonData,
    mapCenter,
    mapZoom,
    mapIsReady,
    elevationRange,
    getFilteredPitData,
  ]);

  // Update drawing mode and line points only when they change
  useEffect(() => {
    if (mapIsReady && webViewRef.current) {
      // Stringify the selected points to compare efficiently
      const pointsString = JSON.stringify(selectedPoints);

      webViewRef.current.injectJavaScript(`
        (function() {
          try {
            if (typeof updateMapState === 'function') {
              updateMapState({
                isDrawingMode: ${isCreateLineMode},
                linePoints: ${pointsString},
                noZoom: true // Flag to prevent automatic zooming
              });
              return true;
            }
          } catch (error) {
            console.error("Error updating map state:", error);
          }
        })();
      `);
    }
  }, [selectedPoints, isCreateLineMode, mapIsReady]);

  // Add point from crosshair
  const addPointFromCrosshair = useCallback(() => {
    if (mapIsReady && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        (function() {
          try {
            if (typeof addPointFromCrosshair === 'function') {
              addPointFromCrosshair();
              return true;
            }
          } catch (error) {
            console.error("Error adding point from crosshair:", error);
          }
        })();
      `);
    }
  }, [mapIsReady]);

  // Register the add point function with parent
  useEffect(() => {
    if (onAddPointFromCrosshair && mapIsReady) {
      onAddPointFromCrosshair(addPointFromCrosshair);
    }
  }, [onAddPointFromCrosshair, addPointFromCrosshair, mapIsReady]);

  // Generate HTML content
  const htmlContent = generateLeafletMapContent(
    lineColor,
    useCrosshairForDrawing
  );

  // Handle messages from WebView
  const handleMessage = useCallback(
    (event: any) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);

        if (message.type === "mapReady") {
          setLoading(false);
          setMapIsReady(true);
          if (onMapReady) {
            onMapReady();
          }
        } else if (message.type === "mapClick" && onMapPress) {
          onMapPress(message.data);
        } else if (message.type === "mapMove") {
          setCurrentCoordinates(message.data);

          if (onCoordinateChange) {
            onCoordinateChange(message.data);
          }
        } else if (message.type === "pointAdded" && onMapPress) {
          // Use key to prevent processing the same point multiple times
          const pointKey = message.data.pointKey || "";
          if (!processedPointsRef.current.includes(pointKey)) {
            processedPointsRef.current.push(pointKey);
            onMapPress(message.data);
          }
        } else if (message.type === "lineComplete" && onMapPress) {
          // Use key to prevent processing the same line multiple times
          const lineKey = message.data.lineKey || "";
          if (!processedPointsRef.current.includes(lineKey)) {
            processedPointsRef.current.push(lineKey);
            onMapPress(message.data);
          }
        }
      } catch (error) {
        console.error("Error parsing WebView message:", error);
      }
    },
    [onMapPress, onMapReady, onCoordinateChange]
  );

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        originWhitelist={["*"]}
        renderToHardwareTextureAndroid={true}
        androidLayerType="hardware"
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        onError={(syntheticEvent) => {
          console.error("WebView error:", syntheticEvent.nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          console.error("WebView HTTP error:", syntheticEvent.nativeEvent);
        }}
        onLoadStart={() => setLoading(true)}
        onLoad={() => {
          console.log("WebView loaded");
        }}
        onLoadEnd={() => {
          setTimeout(() => setLoading(false), 500);
        }}
      />

      {/* Coordinates display hidden by default */}
      <View
        style={[
          styles.coordinatesContainer,
          { display: hideInternalCoordinates ? "none" : "flex" },
        ]}
      >
        <Text style={styles.coordinatesText}>
          x:{Math.round(currentCoordinates.lng)}, y:
          {Math.round(currentCoordinates.lat)}
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    width: "100%",
    height: "100%",
  },
  webview: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(245, 245, 245, 0.7)",
  },
  coordinatesContainer: {
    position: "absolute",
    bottom: 10,
    left: "50%",
    transform: [{ translateX: -50 }],
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  coordinatesText: {
    fontSize: 12,
    color: "#333",
  },
});

export default LeafletMap;
