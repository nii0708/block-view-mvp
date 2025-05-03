import React, { useState, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Button,
  ScrollView,
  Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";

import * as turf from "@turf/turf";
import { convertCoordinates } from "../utils/projectionUtils";
import { Feature, LineString } from "geojson";
import { generateD3Html } from "@/utils/generateCrossSectionHtml";

// Get window width for fixed calculations
const windowWidth = Dimensions.get("window").width;

interface CrossSectionWebViewProps {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  blockModelData: any[];
  elevationData: any[];
  pitData: any[];
  lineLength: number;
  sourceProjection: string;
  onDataProcessed?: (data: {
    displayedBlocks: number;
    displayedElevationPoints: number;
    displayedPitPoints: number;
  }) => void;
}

const CrossSectionWebView: React.FC<CrossSectionWebViewProps> = ({
  startLat,
  startLng,
  endLat,
  endLng,
  blockModelData,
  elevationData,
  pitData,
  lineLength,
  sourceProjection,
  onDataProcessed,
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

  // Enable Y-axis scrolling in the WebView with injected JavaScript
  const ENABLE_SCROLL_SCRIPT = `
    document.addEventListener('DOMContentLoaded', function() {
      // Enable vertical scrolling for the entire document
      document.body.style.overflow = 'auto';
      document.body.style.overflowY = 'scroll';
      document.body.style.overflowX = 'hidden';
      document.body.style.height = 'auto';
      
      // Enable vertical scrolling for the chart container
      const chartContainer = document.getElementById('chart-container');
      if (chartContainer) {
        chartContainer.style.overflow = 'auto';
        chartContainer.style.overflowY = 'scroll';
        chartContainer.style.overflowX = 'hidden';
        chartContainer.style.height = 'auto';
        chartContainer.style.minHeight = '80vh';
      }
      
      // Enable vertical scrolling for the chart itself
      const chart = document.getElementById('chart');
      if (chart) {
        chart.style.overflow = 'auto';
        chart.style.overflowY = 'scroll';
        chart.style.overflowX = 'hidden';
        chart.style.height = 'auto';
        chart.style.minHeight = '80vh';
      }
      
      // Set SVG to be scrollable and have larger height
      setTimeout(() => {
        const svgElement = document.querySelector('svg');
        if (svgElement) {
          svgElement.style.height = '120vh'; // Make SVG taller for scrolling
          svgElement.style.overflow = 'visible'; // Show content outside SVG bounds
        }
      }, 1000); // Wait for SVG to be created
    });
    true;
  `;

  function createLineGeoJSON(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Feature<LineString> {
    return turf.lineString([
      [startLng, startLat],
      [endLng, endLat],
    ]);
  }

  // Process data before sending to WebView
  const { processedBlockData, processedElevationData, processedPitData } =
    useMemo(() => {
      try {
        // Format block model data for WebView consumption
        const blocks = blockModelData.map((block) => ({
          distance: 0, // Will be calculated in WebView
          width: parseFloat(block.dim_x || block.width || 12.5),
          height: parseFloat(block.dim_z || block.height || 1),
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

        //PLAY START-------------------------------------
        // Extract line coordinates and find intersections
        const intersections: {
          point: number[];
          distance: number;
          elevation: number;
          type: string;
        }[] = [];
        try {
          const lineGeoJson = createLineGeoJSON(
            startLat,
            startLng,
            endLat,
            endLng
          );
          const lineCoords = lineGeoJson.geometry.coordinates;

          // Create our pit intersections array
          pitData.forEach((feature) => {
            if (
              feature.geometry &&
              feature.geometry.coordinates &&
              feature.geometry.coordinates.length > 0
            ) {
              // Buat ringLine dengan benar
              const ringCoordinates = feature.geometry.coordinates.map(
                (coord: number[]) => coord.slice(0, 2)
              );

              // Gunakan fungsi turf.lineString untuk membuat objek dengan tipe yang tepat
              const ringLine = turf.lineString(ringCoordinates);

              // Sekarang tipe-nya seharusnya cocok
              const intersectionPoints = turf.lineIntersect(
                ringLine,
                lineGeoJson
              );

              // Process intersections
              if (intersectionPoints.features.length > 0) {
                intersectionPoints.features.forEach((intersectionFeature) => {
                  const intersectionCoord = intersectionFeature.geometry;
                  const dist =
                    turf.distance(
                      intersectionCoord.coordinates,
                      lineCoords[0],
                      {
                        units: "kilometers",
                      }
                    ) * 1000;

                  const converted = convertCoordinates(
                    intersectionCoord.coordinates,
                    "EPSG:4326",
                    sourceProjection
                  );

                  intersections.push({
                    point: converted,
                    distance: dist,
                    elevation: feature.properties.level, // Use the pit boundary elevation
                    type: "pit_boundary",
                  });
                });
              }
            }
          });
        } catch (error) {
          console.error("Error finding pit intersections:", error);
        }
        //PLAY END-------------------------------------

        return {
          processedBlockData: blocks,
          processedElevationData: elevation,
          processedPitData: intersections,
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

            // Pass processed data counts back to parent component
            if (onDataProcessed && message.dataStats) {
              onDataProcessed({
                displayedBlocks: message.dataStats.displayedBlocks || 0,
                displayedElevationPoints:
                  message.dataStats.displayedElevationPoints || 0,
                displayedPitPoints: message.dataStats.displayedPitPoints || 0,
              });
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
        case "dataStats":
          // Handle data statistics separately
          if (onDataProcessed && message.stats) {
            onDataProcessed({
              displayedBlocks: message.stats.displayedBlocks || 0,
              displayedElevationPoints:
                message.stats.displayedElevationPoints || 0,
              displayedPitPoints: message.stats.displayedPitPoints || 0,
            });
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
    <View style={styles.container}>
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
  );
};

const styles = StyleSheet.create({
  // Styles remain the same
  container: {
    flex: 1,
    backgroundColor: "#fff",
    position: "relative",
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
});

export default CrossSectionWebView;
