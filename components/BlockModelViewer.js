// src/components/BlockModelViewer.js (optimized for React Native)
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { blockModelToGeoJSON } from "../utils/blockModelToGeoJSON";
import {
  addPointToLine,
  pointsToGeoJSONLine,
  calculateLineDistance,
} from "../utils/lineDrawerUtils";
import { processPitDataToGeoJSON } from "../utils/processPitData";

const { width, height } = Dimensions.get("window");

const BlockModelViewer = ({
  blockModelData,
  pitData,
  sourceProjection = "EPSG:4326",
  onLineCreated,
}) => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [pitGeoJsonData, setPitGeoJsonData] = useState(null);
  const [mapCenter, setMapCenter] = useState([0, 0]);
  const [mapZoom, setMapZoom] = useState(12);
  const [isExportEnabled, setIsExportEnabled] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [linePoints, setLinePoints] = useState([]);
  const [lineGeoJson, setLineGeoJson] = useState(null);
  const [infoMessage, setInfoMessage] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const webViewRef = useRef(null);
  const [showTopElevationOnly, setShowTopElevationOnly] = useState(true);

  // Process block model data
  useEffect(() => {
    if (blockModelData && blockModelData.length > 0) {
      try {
        // Sample data to validate format
        console.log(
          "Raw block model data (first 2 rows):",
          blockModelData.slice(0, 2).map((row) => JSON.stringify(row))
        );

        // Check for required fields
        const requiredColumns = [
          "centroid_x",
          "centroid_y",
          "dim_x",
          "dim_y",
          "rock",
        ];
        const availableColumns = Object.keys(blockModelData[0] || {});
        console.log("Available columns:", availableColumns);
        const missingColumns = requiredColumns.filter(
          (col) => !availableColumns.includes(col)
        );

        if (missingColumns.length > 0) {
          console.warn("Missing required columns:", missingColumns);
          // Map columns if names are different
          blockModelData = blockModelData.map((row) => ({
            ...row,
            centroid_x: row.centroid_x || row.x || row.X || row.easting,
            centroid_y: row.centroid_y || row.y || row.Y || row.northing,
            dim_x: row.dim_x || row.width || row.block_size || 10,
            dim_y: row.dim_y || row.length || row.block_size || 10,
            dim_z: row.dim_z || row.height || row.block_size || 10,
            rock: row.rock || rock_type || row.material || "Unknown",
          }));
        }

        console.log(
          "Processing block model data with projection:",
          sourceProjection
        );
        const {
          geoJsonData: processedData,
          mapCenter: initialMapCenter,
          isExportEnabled: canExport,
        } = blockModelToGeoJSON(blockModelData, sourceProjection);

        console.log(
          "Block model processed, features:",
          processedData?.features?.length
        );

        // Filter hanya elevasi teratas jika diaktifkan
        let filteredData = processedData;

        if (showTopElevationOnly && processedData && processedData.features) {
          // Kelompokkan blok berdasarkan posisi x, y
          const blocksByXY = {};
          processedData.features.forEach((feature) => {
            const { centroid_x, centroid_y, centroid_z } = feature.properties;
            const key = `${centroid_x.toFixed(2)}_${centroid_y.toFixed(2)}`;

            if (
              !blocksByXY[key] ||
              blocksByXY[key].properties.centroid_z < centroid_z
            ) {
              blocksByXY[key] = feature;
            }
          });

          // Ambil hanya blok teratas dari setiap posisi x,y
          filteredData = {
            ...processedData,
            features: Object.values(blocksByXY),
          };

          console.log(
            `Filtered to top elevation only: ${filteredData.features.length} blocks from ${processedData.features.length}`
          );
        }

        setGeoJsonData(filteredData);

        if (initialMapCenter && initialMapCenter.length === 2) {
          setMapCenter(initialMapCenter);
          console.log("Initial map center:", initialMapCenter);
        }

        setIsExportEnabled(canExport);
        setInfoMessage(
          `Processed ${
            processedData?.features?.length || 0
          } block model features`
        );
      } catch (error) {
        console.error("Error processing block model data:", error);
        setInfoMessage("Error processing block model data: " + error.message);
      }
    }
  }, [blockModelData, sourceProjection, showTopElevationOnly]);

  // Process pit data
  useEffect(() => {
    if (pitData && pitData.length > 0) {
      try {
        // Process the pit data to GeoJSON
        console.log("Processing pit data with projection:", sourceProjection);
        const processedPitData = processPitDataToGeoJSON(
          pitData,
          sourceProjection
        );
        console.log(
          "Pit data processed, features:",
          processedPitData?.features?.length
        );
        setPitGeoJsonData(processedPitData);

        // Update info message if we don't have a more important one
        if (!infoMessage.includes("Error")) {
          setInfoMessage(
            `Processed ${
              processedPitData?.features?.length || 0
            } pit boundary features`
          );
        }
      } catch (error) {
        console.error("Error processing pit data:", error);
        setInfoMessage("Error processing pit data: " + error.message);
      }
    }
  }, [pitData, sourceProjection]);

  // Generate HTML for WebView
  useEffect(() => {
    if (geoJsonData || pitGeoJsonData) {
      console.log("Generating map HTML...");
      generateMapHtml();
    }
  }, [geoJsonData, pitGeoJsonData]);

  // Update map when drawing mode or points change
  useEffect(() => {
    if (isMapReady && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "updateMapState",
          data: {
            isDrawingMode,
            linePoints,
            lineGeoJson,
          },
        })
      );
    }
  }, [isDrawingMode, linePoints, lineGeoJson, isMapReady]);

  // Generate the HTML content for WebView with Leaflet
  const generateMapHtml = () => {
    // Generate a sample of features for better performance in WebView
    const featureSample = geoJsonData;

    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body {
        height: 100%;
        margin: 0;
        padding: 0;
      }
      #map {
        height: 100%;
        width: 100%;
      }
      #debug {
        position: absolute;
        bottom: 10px;
        left: 10px;
        background: rgba(255,255,255,0.9);
        padding: 5px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 1000;
        max-width: 300px;
        max-height: 150px;
        overflow-y: auto;
        display: none; /* Ubah dari block ke none untuk menyembunyikan */
      }
      #loading {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255,255,255,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
      }
      .leaflet-popup-content {
        max-width: 200px;
        max-height: 200px;
        overflow: auto;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <!-- Debug panel disembunyikan -->
    <div id="debug" style="display: none;">Initializing map...</div>
    <div id="loading">Loading map...</div>
    
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://unpkg.com/proj4@2.9.0/dist/proj4.js"></script>
    <script>
      // Debug function yang tetap mencatat log tapi tidak menampilkan di UI
      function debug(msg, obj) {
        console.log(msg, obj);
        
        // Post debug to React Native
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'debug',
          data: { msg, obj: obj ? 'object' : undefined }
        }));
      }
          
          // Global variables
          let map;
          let geoJsonLayer;
          let pitLayer;
          let lineLayer;
          let markers = [];
          let isDrawingMode = false;
          let linePoints = [];
          
          // Initialize map
          function initMap() {
            try {
              // Remove loading indicator
              document.getElementById('loading').style.display = 'none';
              
              debug("Initializing Leaflet map...");
              
              // Create map
              map = L.map('map', {
                zoomControl: true,
                attributionControl: false
              }).setView([${mapCenter[0]}, ${mapCenter[1]}], ${mapZoom});
              
              // Add tile layer
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              }).addTo(map);
              
              debug("Map created at center: [${mapCenter[0]}, ${
      mapCenter[1]
    }]");
              
              // Set up click handler for drawing mode
              map.on('click', function(e) {
  console.log('Map clicked, drawing mode is:', isDrawingMode);
  if (isDrawingMode) {
    const { lat, lng } = e.latlng;
    console.log('Map clicked at coordinates:', lat, lng);
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'mapClick',
      data: [lat, lng]
    }));
  } else {
    console.log('Drawing mode is OFF, click ignored');
  }
});
              
              // Notify React Native that the map is ready
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapReady'
              }));
              
              // Load initial data
              ${
                featureSample
                  ? `
                // We have pre-loaded data, add it directly
                try {
                  debug("Loading pre-embedded GeoJSON data");
                  const geoJsonData = ${JSON.stringify(featureSample)};
                  
                  if (geoJsonData && geoJsonData.features) {
                    debug("Adding GeoJSON layer with " + geoJsonData.features.length + " features");
                    
                    geoJsonLayer = L.geoJSON(geoJsonData, {
                      style: function(feature) {
                        return {
                          fillColor: feature.properties.color || '#3388ff',
                          weight: 1,
                          opacity: 1,
                          color: 'black',
                          fillOpacity: 0.7
                        };
                      },
                      onEachFeature: function(feature, layer) {
                        if (feature.properties) {
                          const props = feature.properties;
                          const popupContent = \`
                            <div>
                              <strong>Rock Type:</strong> \${props.rock || 'Unknown'}<br>
                              <strong>Centroid:</strong> X=\${props.centroid_x.toFixed(2)}, 
                                            Y=\${props.centroid_y.toFixed(2)}, 
                                            Z=\${props.centroid_z.toFixed(2)}<br>
                              <strong>Dimensions:</strong> \${props.dim_x.toFixed(2)} × 
                                              \${props.dim_y.toFixed(2)} × 
                                              \${props.dim_z.toFixed(2)}
                            </div>
                          \`;
                          layer.bindPopup(popupContent);
                        }
                      },
                      coordsToLatLng: function(coords) {
                        return L.latLng(coords[1], coords[0]);
                      }
                    }).addTo(map);
                    
                    // Fit bounds
                    try {
                      const bounds = geoJsonLayer.getBounds();
                      if (bounds.isValid()) {
                        debug("Fitting map to bounds");
                        map.fitBounds(bounds, { padding: [50, 50] });
                      }
                    } catch (e) {
                      debug("Error fitting bounds: " + e.message);
                    }
                  }
                } catch (e) {
                  debug("Error adding pre-embedded GeoJSON: " + e.message);
                }
              `
                  : `
                // Request data from React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'requestData'
                }));
              `
              }
              
              ${
                pitGeoJsonData
                  ? `
                // Add pit boundary data
                try {
                  debug("Loading pre-embedded pit data");
                  const pitGeoJsonData = ${JSON.stringify(pitGeoJsonData)};
                  
                  if (pitGeoJsonData && pitGeoJsonData.features) {
                    debug("Adding pit boundary layer with " + pitGeoJsonData.features.length + " features");
                    
                    pitLayer = L.geoJSON(pitGeoJsonData, {
                      style: function() {
                        return {
                          color: '#ff8c00',
                          weight: 3,
                          opacity: 0.8,
                          dashArray: '5, 5'
                        };
                      },
                      onEachFeature: function(feature, layer) {
                        if (feature.properties) {
                          const props = feature.properties;
                          const popupContent = \`
                            <div>
                              <strong>Type:</strong> Pit Boundary<br>
                              <strong>Elevation:</strong> \${props.level ? props.level.toFixed(2) : 'N/A'}
                            </div>
                          \`;
                          layer.bindPopup(popupContent);
                        }
                      },
                      coordsToLatLng: function(coords) {
                        return L.latLng(coords[1], coords[0]);
                      }
                    }).addTo(map);
                  }
                } catch (e) {
                  debug("Error adding pre-embedded pit data: " + e.message);
                }
              `
                  : ""
              }
              
              debug("Map initialization complete");
            } catch (error) {
              debug('Error initializing map: ' + error.message);
            }
          }
          
          // Function to update the map with new data
          function updateMapData(data) {
            try {
              debug("updateMapData called", { 
                hasGeoJson: !!data.geoJsonData,
                featureCount: data.geoJsonData?.features?.length || 0,
                hasPitData: !!data.pitGeoJsonData,
                pitFeatureCount: data.pitGeoJsonData?.features?.length || 0 
              });
              
              // If we have GeoJSON data
              if (data.geoJsonData) {
                debug("Processing GeoJSON data with features: " + data.geoJsonData.features.length);
                
                // Log sample feature to debug
                if (data.geoJsonData.features.length > 0) {
                  const sampleFeature = data.geoJsonData.features[0];
                  debug("Sample feature:", {
                    type: sampleFeature.geometry.type,
                    coordsLength: sampleFeature.geometry.coordinates[0].length,
                    properties: Object.keys(sampleFeature.properties)
                  });
                }
                
                // Remove existing layer if it exists
                if (geoJsonLayer) {
                  debug("Removing existing geoJsonLayer");
                  map.removeLayer(geoJsonLayer);
                }
                
                // Add the GeoJSON layer
                try {
                  debug("Creating geoJsonLayer");
                  geoJsonLayer = L.geoJSON(data.geoJsonData, {
                    style: function(feature) {
                      return {
                        fillColor: feature.properties.color || '#3388ff',
                        weight: 1,
                        opacity: 1,
                        color: 'black',
                        fillOpacity: 0.7
                      };
                    },
                    onEachFeature: function(feature, layer) {
                      if (feature.properties) {
                        const props = feature.properties;
                        const popupContent = \`
                          <div>
                            <strong>Rock Type:</strong> \${props.rock || 'Unknown'}<br>
                            <strong>Centroid:</strong> X=\${props.centroid_x ? props.centroid_x.toFixed(2) : 'N/A'}, 
                                          Y=\${props.centroid_y ? props.centroid_y.toFixed(2) : 'N/A'}, 
                                          Z=\${props.centroid_z ? props.centroid_z.toFixed(2) : 'N/A'}<br>
                            <strong>Dimensions:</strong> \${props.dim_x ? props.dim_x.toFixed(2) : 'N/A'} × 
                                            \${props.dim_y ? props.dim_y.toFixed(2) : 'N/A'} × 
                                            \${props.dim_z ? props.dim_z.toFixed(2) : 'N/A'}
                          </div>
                        \`;
                        layer.bindPopup(popupContent);
                      }
                    },
                    coordsToLatLng: function(coords) {
                      return L.latLng(coords[1], coords[0]);
                    }
                  }).addTo(map);
                  
                  debug("GeoJSON layer added to map");
                  
                  // Fit the map to the layer bounds
                  try {
                    const bounds = geoJsonLayer.getBounds();
                    if (bounds.isValid()) {
                      debug("Fitting map to bounds");
                      map.fitBounds(bounds, { padding: [50, 50] });
                    } else {
                      debug("Invalid bounds from geoJsonLayer");
                    }
                  } catch (boundsError) {
                    debug("Error fitting bounds: " + boundsError.message);
                  }
                } catch (layerError) {
                  debug("Error creating geoJsonLayer: " + layerError.message);
                }
              }
              
              // If we have pit data
              if (data.pitGeoJsonData) {
                // Remove existing layer if it exists
                if (pitLayer) {
                  map.removeLayer(pitLayer);
                }
                
                // Add the pit layer
                pitLayer = L.geoJSON(data.pitGeoJsonData, {
                  style: function() {
                    return {
                      color: '#ff8c00', // Orange
                      weight: 3,
                      opacity: 0.8,
                      dashArray: '5, 5'
                    };
                  },
                  onEachFeature: function(feature, layer) {
                    if (feature.properties) {
                      const props = feature.properties;
                      const popupContent = \`
                        <div>
                          <strong>Type:</strong> Pit Boundary<br>
                          <strong>Elevation:</strong> \${props.level ? props.level.toFixed(2) : 'N/A'}
                        </div>
                      \`;
                      layer.bindPopup(popupContent);
                    }
                  },
                  coordsToLatLng: function(coords) {
                    return L.latLng(coords[1], coords[0]); 
                  }
                }).addTo(map);
                
                debug("Pit layer added");
              }
              
              // If we don't have GeoJSON data but do have a map center
              if (!data.geoJsonData && data.mapCenter && data.mapCenter.length === 2) {
                map.setView([data.mapCenter[0], data.mapCenter[1]], data.mapZoom || 12);
                debug("Map center set to: " + data.mapCenter);
              }
              
              debug('Map data update complete');
            } catch (error) {
              debug('Error updating map data: ' + error.message);
            }
          }
          
          function updateMapState(state) {
  try {
    // Set drawing mode
    isDrawingMode = state.isDrawingMode;
    console.log("Drawing mode updated to:", isDrawingMode);
    
    // Add visual indicator
    if (isDrawingMode) {
      map._container.style.cursor = 'crosshair';
      document.getElementById('map').classList.add('drawing-active');
    } else {
      map._container.style.cursor = '';
      document.getElementById('map').classList.remove('drawing-active');
    }
              
              // Clear existing markers and lines
              markers.forEach(marker => map.removeLayer(marker));
              markers = [];
              
              if (lineLayer) {
                map.removeLayer(lineLayer);
                lineLayer = null;
              }
              
              // If we have line points, add markers and a line
              if (state.linePoints && state.linePoints.length > 0) {
                linePoints = state.linePoints;
                
                // Add markers for each point
                state.linePoints.forEach(point => {
                  const marker = L.marker([point[0], point[1]]).addTo(map);
                  markers.push(marker);
                });
                
                // If we have 2 points, draw a line
                if (state.linePoints.length === 2) {
                  lineLayer = L.polyline(state.linePoints, {
                    color: 'blue',
                    weight: 3,
                    dashArray: '5, 10'
                  }).addTo(map);
                }
              }
              
              debug('Map state updated', { isDrawingMode });
            } catch (error) {
              debug('Error updating map state: ' + error.message);
            }
          }
          
          // Initialize the map when the page loads
          document.addEventListener('DOMContentLoaded', initMap);
          
          // Listen for messages from React Native
          window.addEventListener('message', function(event) {
            try {
              const message = JSON.parse(event.data);
              debug('Received message: ' + message.type);
              
              switch (message.type) {
                case 'updateData':
                  updateMapData(message.data);
                  break;
                  
                case 'updateMapState':
                  updateMapState(message.data);
                  break;
                  
                case 'toggleDrawingMode':
                  isDrawingMode = message.data;
                  break;
                  
                case 'clearLine':
                  // Clear markers
                  markers.forEach(marker => map.removeLayer(marker));
                  markers = [];
                  
                  // Clear polyline
                  if (lineLayer) {
                    map.removeLayer(lineLayer);
                    lineLayer = null;
                  }
                  break;
                  
                default:
                  debug('Unknown message type: ' + message.type);
              }
            } catch (error) {
              debug('Error processing message from React Native: ' + error.message);
            }
          });
        </script>
      </body>
    </html>
    `;

    console.log("WebView HTML generated, length:", html.length);
    setHtmlContent(html);
  };

  // Handle messages from WebView
  const handleWebViewMessage = (event) => {
    try {
      console.log(
        "WebView message received:",
        event.nativeEvent.data.substring(0, 100)
      );
      const message = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case "mapReady":
          console.log("Map is ready");
          setIsMapReady(true);
          break;

        case "requestData":
          if (webViewRef.current) {
            console.log("Sending data to WebView...");
            webViewRef.current.postMessage(
              JSON.stringify({
                type: "updateData",
                data: {
                  geoJsonData,
                  pitGeoJsonData,
                  mapCenter,
                  mapZoom,
                },
              })
            );
          }
          break;

        case "mapClick":
          if (isDrawingMode) {
            handleMapClick(message.data);
          }
          break;

        case "debug":
          console.log("WebView debug:", message.data);
          setDebugInfo((prev) => ({ ...prev, ...message.data }));
          break;
      }
    } catch (error) {
      console.error("Error parsing WebView message:", error);
    }
  };

  // Handle map clicks (received from WebView)
  const handleMapClick = (point) => {
    // Use the helper function to add the point to our line
    const updatedPoints = addPointToLine(linePoints, point);
    setLinePoints(updatedPoints);

    // If we have 2 points, create a GeoJSON line
    if (updatedPoints.length === 2) {
      const newLineGeoJson = pointsToGeoJSONLine(updatedPoints);
      setLineGeoJson(newLineGeoJson);

      // Notify parent component about the new line
      if (onLineCreated) {
        onLineCreated(newLineGeoJson);
      }

      // Calculate line distance
      const distance = calculateLineDistance(updatedPoints);
      setInfoMessage(`Line created: ${distance.toFixed(2)} meters long`);
    } else if (updatedPoints.length < 2) {
      setLineGeoJson(null);

      // Clear the line in parent component
      if (onLineCreated) {
        onLineCreated(null);
      }

      setInfoMessage("First point selected. Click to place second point.");
    }
  };

  const toggleDrawingMode = () => {
    const newDrawingMode = !isDrawingMode;
    setIsDrawingMode(newDrawingMode);

    // Log untuk debug
    console.log("Drawing mode toggled to:", newDrawingMode);

    // Kirim pesan ke WebView secara langsung
    if (webViewRef.current) {
      console.log("Sending drawing mode status to WebView");
      webViewRef.current.postMessage(
        JSON.stringify({
          type: "toggleDrawingMode",
          data: newDrawingMode,
        })
      );
    }

    if (!newDrawingMode) {
      clearLine();
    } else {
      setInfoMessage(
        "Drawing mode activated. Click on the map to select points."
      );
    }
  };

  const clearLine = () => {
    setLinePoints([]);
    setLineGeoJson(null);

    // Clear the line in parent component
    if (onLineCreated) {
      onLineCreated(null);
    }

    setInfoMessage("Line cleared");
  };

  // Generate cross-section from the current line
  const generateCrossSection = () => {
    if (linePoints.length < 2) {
      Alert.alert(
        "Error",
        "Please select two points to create a cross-section"
      );
      return;
    }

    if (!lineGeoJson) {
      Alert.alert("Error", "Unable to create GeoJSON line for cross-section");
      return;
    }

    // Notify parent component about the line for cross-section
    if (onLineCreated) {
      onLineCreated(lineGeoJson);
    }

    setInfoMessage("Cross-section created. Scroll down to view it.");
  };

  // Export GeoJSON to a file
  const exportGeoJSON = async () => {
    if (!geoJsonData) return;

    try {
      const dataStr = JSON.stringify(geoJsonData, null, 2);
      const fileUri = `${FileSystem.cacheDirectory}block_model.geojson`;
      await FileSystem.writeAsStringAsync(fileUri, dataStr);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error exporting GeoJSON:", error);
      Alert.alert("Error", "Failed to export Block Model GeoJSON");
    }
  };

  // Export Pit GeoJSON to a file
  const exportPitGeoJSON = async () => {
    if (!pitGeoJsonData) return;

    try {
      const dataStr = JSON.stringify(pitGeoJsonData, null, 2);
      const fileUri = `${FileSystem.cacheDirectory}pit_boundary.geojson`;
      await FileSystem.writeAsStringAsync(fileUri, dataStr);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error exporting pit GeoJSON:", error);
      Alert.alert("Error", "Failed to export Pit GeoJSON");
    }
  };

  // Export Line GeoJSON to a file
  const exportLineGeoJSON = async () => {
    if (!lineGeoJson) return;

    try {
      const dataStr = JSON.stringify(lineGeoJson, null, 2);
      const fileUri = `${FileSystem.cacheDirectory}cross_section_line.geojson`;
      await FileSystem.writeAsStringAsync(fileUri, dataStr);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error exporting line GeoJSON:", error);
      Alert.alert("Error", "Failed to export Line GeoJSON");
    }
  };

  if (!blockModelData || blockModelData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>
          Please upload a block model CSV file.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Controls */}
      <View style={styles.controlsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={toggleDrawingMode}
            style={[
              styles.button,
              isDrawingMode ? styles.activeButton : styles.inactiveButton,
            ]}
          >
            <Text
              style={
                isDrawingMode ? styles.activeButtonText : styles.buttonText
              }
            >
              {isDrawingMode ? "Drawing Mode (ON)" : "Drawing Mode (OFF)"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={clearLine}
            disabled={linePoints.length === 0}
            style={[
              styles.button,
              styles.yellowButton,
              linePoints.length === 0 ? styles.disabledButton : null,
            ]}
          >
            <Text style={styles.buttonText}>Clear Line</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={generateCrossSection}
            disabled={linePoints.length < 2}
            style={[
              styles.button,
              styles.purpleButton,
              linePoints.length < 2 ? styles.disabledButton : null,
            ]}
          >
            <Text style={styles.buttonText}>Create Cross-Section</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={exportLineGeoJSON}
            disabled={!lineGeoJson}
            style={[
              styles.button,
              styles.indigoButton,
              !lineGeoJson ? styles.disabledButton : null,
            ]}
          >
            <Text style={styles.buttonText}>Export Line</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={exportGeoJSON}
            disabled={!isExportEnabled}
            style={[
              styles.button,
              styles.blueButton,
              !isExportEnabled ? styles.disabledButton : null,
            ]}
          >
            <Text style={styles.buttonText}>Export Block Model</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={exportPitGeoJSON}
            disabled={!pitGeoJsonData}
            style={[
              styles.button,
              styles.orangeButton,
              !pitGeoJsonData ? styles.disabledButton : null,
            ]}
          >
            <Text style={styles.buttonText}>Export Pit Data</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Debug Info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          Features: {geoJsonData?.features?.length || 0} blocks,
          {pitGeoJsonData?.features?.length || 0} pit boundaries
        </Text>
      </View>

      {/* Info Messages */}
      {infoMessage ? (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>{infoMessage}</Text>
        </View>
      ) : null}

      {/* Selection Info */}
      {linePoints.length > 0 ? (
        <View style={styles.selectionInfoContainer}>
          <Text style={styles.selectionInfoTitle}>
            Points selected: {linePoints.length}/2
          </Text>
          {linePoints.map((point, idx) => (
            <Text key={idx} style={styles.selectionInfoText}>
              Point {idx + 1}: Lat {point[0].toFixed(6)}, Lng{" "}
              {point[1].toFixed(6)}
            </Text>
          ))}
          {linePoints.length === 2 && (
            <Text style={styles.selectionInfoText}>
              Line distance: {calculateLineDistance(linePoints).toFixed(2)}{" "}
              meters
            </Text>
          )}
        </View>
      ) : null}

      {/* Map as WebView */}
      <View style={styles.mapContainer}>
        {htmlContent ? (
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            style={styles.webView}
            originWhitelist={["*"]}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            useWebKit={true}
            startInLoadingState={true}
            cacheEnabled={false}
            // Force WebView to reinitialize by changing key
            key={`map-${geoJsonData?.features?.length || 0}-${
              pitGeoJsonData?.features?.length || 0
            }`}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <Text>Preparing map data...</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlsContainer: {
    padding: 8,
    backgroundColor: "white",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  debugContainer: {
    padding: 4,
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  debugText: {
    fontSize: 10,
    color: "#666",
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
    minWidth: 100,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "500",
    fontSize: 12,
  },
  activeButton: {
    backgroundColor: "#10b981", // Green
  },
  activeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  inactiveButton: {
    backgroundColor: "#d1d5db", // Gray
  },
  yellowButton: {
    backgroundColor: "#f59e0b", // Yellow
  },
  purpleButton: {
    backgroundColor: "#8b5cf6", // Purple
  },
  indigoButton: {
    backgroundColor: "#6366f1", // Indigo
  },
  blueButton: {
    backgroundColor: "#3b82f6", // Blue
  },
  orangeButton: {
    backgroundColor: "#f97316", // Orange
  },
  redButton: {
    backgroundColor: "#ef4444", // Red
  },
  disabledButton: {
    opacity: 0.5,
  },
  infoContainer: {
    backgroundColor: "#d1fae5", // Light green
    borderColor: "#10b981",
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    margin: 8,
  },
  infoText: {
    color: "#065f46",
    fontSize: 14,
  },
  selectionInfoContainer: {
    backgroundColor: "#dbeafe", // Light blue
    borderColor: "#3b82f6",
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    margin: 8,
  },
  selectionInfoTitle: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#1e40af",
    marginBottom: 4,
  },
  selectionInfoText: {
    fontSize: 12,
    color: "#1e40af",
  },
  mapContainer: {
    flex: 1,
    overflow: "hidden",
  },
  webView: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    padding: 10,
    zIndex: 1000,
  },
  errorText: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
  },
  messageText: {
    textAlign: "center",
    margin: 20,
    color: "#666",
  },
});

export default BlockModelViewer;
