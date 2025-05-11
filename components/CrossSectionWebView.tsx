import React, { useState, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Button,
  ScrollView,
  Dimensions,
  Platform,
  PermissionsAndroid,
  ToastAndroid,
  Alert,
} from "react-native";
import { WebView } from "react-native-webview";
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

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
  const [savingFile, setSavingFile] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const renderedRef = useRef<boolean>(false);
  const chartWidthSetRef = useRef<boolean>(false);

  // Request storage permissions (Android only)
  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: "Storage Permission Required",
            message: "App needs access to your storage to save files",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS doesn't need this permission
  };

  // Request media library permissions
  const requestMediaLibraryPermission = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  // Function to save base64 data to a file and share/save it
  const saveBase64ToFile = async (dataUrl: string, filename: string, mimeType: string, saveToGallery: boolean = false) => {
    try {
      setSavingFile(true);
  
      // Check permissions
      let hasPermission;
      if (saveToGallery) {
        hasPermission = await requestMediaLibraryPermission();
      } else {
        hasPermission = await requestStoragePermission();
      }
  
      if (!hasPermission) {
        showToast("Permission denied to save file");
        setSavingFile(false);
        return;
      }
  
      // Extract base64 data from data URL
      let base64Data = dataUrl;
      if (dataUrl.includes('base64,')) {
        base64Data = dataUrl.split('base64,')[1];
        if (!base64Data) {
          throw new Error("Invalid data URL format");
        }
      }
  
      // Create a temp file
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64
      });
  
      if (saveToGallery) {
        try {
          // Try the simple approach first - this is what's failing with the argument error
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          showToast("Saved to gallery");
        } catch (galleryError) {          
          // Try an alternative approach with explicit options object
          try {
            console.log("Trying alternative save method...");
            // Some versions of MediaLibrary expect options as a second parameter
            // @ts-ignore - Ignore TypeScript errors for this workaround
            await MediaLibrary.saveToLibraryAsync(fileUri);
            showToast("Image saved");
          } catch (altError) {
            console.error("Alternative save method also failed:", altError);
            showToast("Could not save to gallery: " + (altError instanceof Error ? altError.message : String(altError)));
          }
        }
      } else {
        // Share file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: mimeType,
            dialogTitle: `Share ${filename}`,
            UTI: mimeType === 'image/png' ? 'public.png' : 'public.svg+xml'
          });
        } else {
          showToast("Sharing not available on this device");
        }
      }
    } catch (error) {
      console.error("Error saving file:", error);
      showToast(`Error saving file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingFile(false);
    }
  };
  // Save SVG data directly
  const saveSvgData = async (svgData: string, filename: string) => {
    try {
      setSavingFile(true);

      // Check permissions
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        showToast("Permission denied to save file");
        setSavingFile(false);
        return;
      }

      // Create a temp file
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, svgData, {
        encoding: FileSystem.EncodingType.UTF8
      });

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/svg+xml',
          dialogTitle: `Share ${filename}`,
          UTI: 'public.svg+xml'
        });
      } else {
        showToast("Sharing not available on this device");
      }
    } catch (error) {
      console.error("Error saving SVG file:", error);
      showToast(`Error saving file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingFile(false);
    }
  };

  // Toast helper function
  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Info", message);
    }
  };

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
          concentrate: parseFloat(block.concentrate || -99)
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
        case "downloadFile":
          // Handle file download request from WebView
          if (message.dataUrl && message.filename) {
            saveBase64ToFile(
              message.dataUrl,
              message.filename,
              message.mimeType || 'application/octet-stream'
            );
          } else if (message.data && message.filename) {
            // For SVG data that is sent directly as text
            saveSvgData(message.data, message.filename);
          }
          break;
        case "saveToGallery":
          // Handle save to gallery request from WebView
          if (message.dataUrl && message.filename) {
            saveBase64ToFile(
              message.dataUrl,
              message.filename,
              'image/png',
              true // Flag to save to gallery instead of sharing
            );
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

      {savingFile && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Processing file...</Text>
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
            html: d3Html,
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