import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Button,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { generateD3Html } from "./CrossSectionWebViewContent";

// Get window width for fixed calculations
const windowWidth = Dimensions.get("window").width;

interface CrossSectionChartProps {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  blockModelData: any[];
  elevationData: any[];
  pitData: any[];
  lineLength: number;
  sourceProjection: string;
  onExportPress: () => void;
}

const CrossSectionChart: React.FC<CrossSectionChartProps> = ({
  startLat,
  startLng,
  endLat,
  endLng,
  blockModelData,
  elevationData,
  pitData,
  lineLength,
  sourceProjection,
  onExportPress,
}) => {
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(
    "Preparing cross section..."
  );
  const [error, setError] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(windowWidth * 2);

  const webViewRef = useRef<WebView>(null);
  const renderedRef = useRef<boolean>(false);
  const chartWidthSetRef = useRef<boolean>(false);

  // Process data before sending to WebView
  const { processedBlockData, processedElevationData, processedPitData } =
    useMemo(() => {
      try {
        // Format block model data for WebView consumption
        const blocks = blockModelData.map((block) => ({
          distance: 0, // Will be calculated in WebView
          width: parseFloat(block.dim_x || block.width || 10),
          height: parseFloat(block.dim_z || block.height || 10),
          elevation: parseFloat(block.centroid_z || block.z || 0),
          x: parseFloat(block.centroid_x || block.x || 0),
          y: parseFloat(block.centroid_y || block.y || 0),
          rock: block.rock || "unknown",
          color: block.color || getRockColor(block.rock || "unknown"),
        }));

        // Format elevation data for WebView consumption
        const elevation = elevationData.map((point) => ({
          x: parseFloat(point.x || point.original?.x || point.lon || 0),
          y: parseFloat(point.y || point.original?.y || point.lat || 0),
          elevation: parseFloat(point.elevation || point.z || 0),
        }));

        // Format pit data for WebView consumption
        const pit = pitData.map((point) => {
          // Handle different possible data structures
          if (point.geometry && point.properties) {
            // It's a GeoJSON feature
            return {
              x: point.geometry.coordinates[0][0],
              y: point.geometry.coordinates[0][1],
              elevation: point.properties.level || 0,
            };
          } else {
            // It's a direct point
            return {
              x: parseFloat(point.x || 0),
              y: parseFloat(point.y || 0),
              elevation: parseFloat(point.z || point.level || 0),
            };
          }
        });

        return {
          processedBlockData: blocks,
          processedElevationData: elevation,
          processedPitData: pit,
        };
      } catch (e) {
        console.error("Error preprocessing data:", e);
        if (e instanceof Error) {
          setError("Failed to preprocess data: " + e.message);
        } else {
          setError("Failed to preprocess data: Unknown error");
        }
        return {
          processedBlockData: [],
          processedElevationData: [],
          processedPitData: [],
        };
      }
    }, [blockModelData, elevationData, pitData]);

  // Generate D3 HTML content
  const d3Html = useMemo(() => {
    return generateD3Html(
      processedBlockData,
      processedElevationData,
      processedPitData,
      startLat,
      startLng,
      endLat,
      endLng,
      lineLength,
      sourceProjection
    );
  }, [
    processedBlockData,
    processedElevationData,
    processedPitData,
    startLat,
    startLng,
    endLat,
    endLng,
    lineLength,
    sourceProjection,
  ]);

  // Handle messages from WebView
  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case "renderComplete":
          if (!renderedRef.current) {
            renderedRef.current = true;
            setLoading(false);

            if (
              !chartWidthSetRef.current &&
              message.chartWidth &&
              message.chartWidth > windowWidth
            ) {
              chartWidthSetRef.current = true;
              setChartWidth(message.chartWidth);
            }
          }
          break;
        case "renderError":
          setError(message.error);
          setLoading(false);
          break;
        case "debug":
          console.log("WebView debug:", message.message);
          break;
        case "chartDimensions":
          if (
            !chartWidthSetRef.current &&
            message.width &&
            message.width > windowWidth
          ) {
            chartWidthSetRef.current = true;
            setChartWidth(message.width);
          }
          break;
        case "progressUpdate":
          if (message.message) {
            setLoadingMessage(message.message);
          }
          break;
      }
    } catch (e) {
      console.error("Error parsing WebView message:", e);
    }
  };

  // Function to get standard colors for rock types
  function getRockColor(rockType: string): string {
    const rockColors: { [key: string]: string } = {
      ore: "#b40c0d", // Red
      waste: "#606060", // Gray
      overburden: "#a37c75", // Brown
      lim: "#045993", // Blue
      sap: "#75499c", // Purple
      unknown: "#CCCCCC", // Light gray
    };

    return rockColors[rockType.toLowerCase()] || "#CCCCCC";
  }

  // Inject fallback rendering if main rendering fails
  const injectFallbackRender = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        (function() {
          document.getElementById('loading').style.display = 'flex';
          document.getElementById('message').textContent = 'Rendering simplified version...';
          document.getElementById('progress-fill').style.width = '50%';
          
          setTimeout(() => {
            try {
              // Force redraw with fallback data
              document.querySelector('#chart svg')?.remove();
              renderWithTestData(${lineLength});
            } catch (err) {
              document.getElementById('loading').style.display = 'none';
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'renderError',
                  error: 'Fallback render failed: ' + err.message
                }));
              }
            }
          }, 500);
          
          return true;
        })();
      `);
    }
  };

  return (
    <View style={styles.graphWithExportContainer}>
      {/* Cross Section WebView - Now takes all available space */}
      <View style={styles.graphContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
          </View>
        )}

        <ScrollView
          horizontal={true}
          style={styles.scrollContainer}
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.scrollContentContainer}
        >
          <WebView
            ref={webViewRef}
            source={{
              html: d3Html.replace(
                '<div id="loading" class="loading">',
                '<div id="loading" class="loading" style="display:none;">'
              ),
            }}
            style={[styles.webview, { width: chartWidth }]}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            onMessage={handleMessage}
            onError={(e) => {
              console.error("WebView error:", e.nativeEvent);
              setError(`WebView error: ${e.nativeEvent.description}`);
            }}
            onLoad={() => {
              // Force loading to false after 3 seconds in case WebView doesn't send message
              setTimeout(() => {
                setLoading(false);
              }, 3000);
            }}
            startInLoadingState={false}
            cacheEnabled={true}
          />
        </ScrollView>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              title="Try Simplified Render"
              onPress={injectFallbackRender}
            />
          </View>
        )}
      </View>

      {/* Export Button - Now floats at the bottom */}
      <View style={styles.exportButtonContainer}>
        <TouchableOpacity style={styles.exportButton} onPress={onExportPress}>
          <MaterialCommunityIcons name="export" size={20} color="#333" />
          <Text style={styles.exportButtonText}>Export Data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  graphWithExportContainer: {
    flex: 1,
    position: "relative", // For absolute positioning of the export button
  },
  graphContainer: {
    flex: 1,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    minWidth: windowWidth * 2,
  },
  webview: {
    height: "100%",
    minWidth: windowWidth * 2,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(240, 240, 240, 0.9)",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#0066CC",
  },
  errorContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    padding: 10,
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginBottom: 10,
  },
  exportButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  exportButton: {
    backgroundColor: "#D9D9D9",
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  exportButtonText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
    marginLeft: 16,
  },
});

export default CrossSectionChart;
