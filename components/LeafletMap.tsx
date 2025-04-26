import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { WebView } from "react-native-webview";

interface LeafletMapProps {
  onMapPress?: (point: any) => void;
  onMapReady?: () => void;
  style?: any;
  geoJsonData?: any;
  pitGeoJsonData?: any;
  mapCenter?: number[];
  mapZoom?: number;
  selectedPoints?: any[];
  isCreateLineMode?: boolean;
  elevationRange?: { min: number; max: number };
}

interface GeoJSONFeature {
  type: string;
  properties: {
    level?: number;
    [key: string]: any;
  };
  geometry: {
    type: string;
    coordinates: any[];
  };
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  onMapPress,
  onMapReady,
  style,
  geoJsonData,
  pitGeoJsonData,
  mapCenter = [-2.5, 120],
  mapZoom = 5,
  selectedPoints = [],
  isCreateLineMode = false,
  elevationRange = { min: 0, max: 1000 }, // Default range
}) => {
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  const [mapIsReady, setMapIsReady] = useState(false);
  const [currentCoordinates, setCurrentCoordinates] = useState({
    lat: 0,
    lng: 0,
  });

  // Filter pit data berdasarkan range elevasi
  const getFilteredPitData = () => {
    if (!pitGeoJsonData || !pitGeoJsonData.features) {
      return pitGeoJsonData;
    }

    console.log(
      `Filtering pit data with elevation range: ${elevationRange.min} to ${elevationRange.max}`
    );

    // Use a wide buffer to include more features
    const buffer = 50; // Add a 50m buffer on either side

    const filteredFeatures = pitGeoJsonData.features.filter(
      (feature: GeoJSONFeature) => {
        const featureLevel = feature.properties?.level || 0;
        return (
          featureLevel >= elevationRange.min - buffer &&
          featureLevel <= elevationRange.max + buffer
        );
      }
    );

    console.log(
      `Filtered pit features from ${pitGeoJsonData.features.length} to ${filteredFeatures.length}`
    );

    return {
      ...pitGeoJsonData,
      features: filteredFeatures,
    };
  };

  useEffect(() => {
    if (mapIsReady && webViewRef.current) {
      console.log("..");

      // Jangan batasi jumlah fitur kecuali SANGAT besar
      let optimizedGeoJsonData = geoJsonData;

      console.log("Jumlah data yang di lempar ke leafletmap "
        + optimizedGeoJsonData?.features?.length
      )

      if (optimizedGeoJsonData?.features?.length > 5000) {
        console.log(
          `WARNING: Limiting WebView GeoJSON features from ${optimizedGeoJsonData.features.length} to 5000 for performance`
        );
        optimizedGeoJsonData = {
          ...optimizedGeoJsonData,
          features: optimizedGeoJsonData.features.slice(0, 5000),
        };
      } else {
        console.log(
          `Rendering all ${
            optimizedGeoJsonData?.features?.length || 0
          } block model features`
        );
      }

      // Get filtered pit data based on elevation range
      const filteredPitData = getFilteredPitData();

      webViewRef.current.injectJavaScript(`
      (function() {
        try {
          if (typeof updateMapData === 'function') {
            console.log("Calling updateMapData with GeoJSON and PitGeoJSON data");
            updateMapData({
              geoJsonData: ${JSON.stringify(optimizedGeoJsonData)},
              pitGeoJsonData: ${JSON.stringify(filteredPitData)},
              mapCenter: ${JSON.stringify(mapCenter)},
              mapZoom: ${mapZoom}
            });
            return true;
          } else {
            console.log("updateMapData function not found");
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
  ]);

  // Update selected points and drawing mode
  useEffect(() => {
    if (mapIsReady && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        (function() {
          try {
            if (typeof updateMapState === 'function') {
              console.log("Updating map state with selected points and drawing mode");
              updateMapState({
                isDrawingMode: ${isCreateLineMode},
                linePoints: ${JSON.stringify(selectedPoints)}
              });
              return true;
            } else {
              console.log("updateMapState function not found");
            }
          } catch (error) {
            console.error("Error updating map state:", error);
          }
        })();
      `);
    }
  }, [selectedPoints, isCreateLineMode, mapIsReady]);

  // HTML content with Leaflet map with performance optimizations
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>Mining Map</title>
      
      <!-- Include Leaflet CSS -->
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      
      <style>
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        #map {
          width: 100%;
          height: 100%;
          background-color: #f5f5f5;
        }
        .leaflet-popup-content {
          max-width: 200px;
          overflow: auto;
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
        .drawing-active {
          cursor: crosshair !important;
        }
        /* Hide the built-in coordinates display since we handle it in React Native */
        #coordinates-display {
          display: none;
        }
        
        /* Styling for the drawing tool */
        .line-preview {
          stroke: white;
          stroke-width: 2;
          stroke-dasharray: 5, 5;
          pointer-events: none;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div id="loading">Loading map...</div>
      
      <!-- Include Leaflet JS -->
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      
      <script>
        // Global variables
        let map;
        let geoJsonLayer;
        let pitLayer;
        let markers = [];
        let lineLayer;
        let isDrawingMode = false;
        let crosshairMarker;
        let tempLine; // For the line preview during drawing
        let firstPoint = null; // First point of the drawing line
        
        // Initialize map
        function initMap() {
          try {
            console.log('DOM loaded, initializing map');
            
            // Configure Leaflet for better mobile performance
            L.Browser.mobile = true;
            L.Browser.touch = true;
            
            // Create map instance with initial center and performance optimizations
            map = L.map('map', {
              center: ${JSON.stringify(mapCenter)},
              zoom: ${mapZoom},
              attributionControl: false,
              preferCanvas: true, // Use canvas for better performance
              zoomSnap: 0.5,
              zoomAnimation: false, // Disable animations for better performance
              markerZoomAnimation: false,
              maxZoom: 19,
              renderer: L.canvas({ tolerance: 5 }) // Improve performance by reducing precision
            });
            
            // Disable and re-enable interactions for better mobile performance
            map.keyboard.disable();
            map.dragging.disable();
            map.dragging.enable();
            map.touchZoom.disable();
            map.touchZoom.enable();
            
            // Add base layers
            const baseOSM = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors'
            });
            
            const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
              maxZoom: 19
            });
            
            // Add satellite by default
            satellite.addTo(map);
            
            // Add layer control
            const baseLayers = {
              "OpenStreetMap": baseOSM,
              "Satellite": satellite
            };
            
            L.control.layers(baseLayers).addTo(map);
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            
            // Notify React Native when map is ready
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapReady'
            }));
            
            // Track map center changes for coordinate display
            map.on('move', function() {
              const center = map.getCenter();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapMove',
                data: {
                  lat: center.lat,
                  lng: center.lng
                }
              }));
            });
            
            // Add click event handler with throttling
            let lastClick = 0;
            map.on('click', function(e) {
              // Throttle clicks to 300ms to prevent double-clicks
              const now = Date.now();
              if (now - lastClick < 300) return;
              lastClick = now;
              
              console.log('Map clicked at', e.latlng);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapClick',
                data: {
                  lat: e.latlng.lat,
                  lng: e.latlng.lng,
                  x: e.containerPoint.x,
                  y: e.containerPoint.y
                }
              }));
              
              // If in drawing mode, handle drawing
              if (isDrawingMode) {
                handleDrawingClick(e.latlng);
              }
            });
            
            // Add mousemove event for line drawing preview
            map.on('mousemove', function(e) {
              if (isDrawingMode && firstPoint) {
                updateDrawingPreview(e.latlng);
              }
            });
            
            // Also handle touch move for mobile
            map.on('touchmove', function(e) {
              if (isDrawingMode && firstPoint && e.touches && e.touches.length > 0) {
                const touchPoint = map.containerPointToLatLng([
                  e.touches[0].clientX,
                  e.touches[0].clientY
                ]);
                updateDrawingPreview(touchPoint);
              }
            });
            
            // Send initial center coordinates
            const initialCenter = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapMove',
              data: {
                lat: initialCenter.lat,
                lng: initialCenter.lng
              }
            }));
            
            console.log('Map initialization complete');
          } catch (error) {
            console.error('Error initializing map:', error);
          }
        }
        
        // Function to handle drawing line clicks
        function handleDrawingClick(latlng) {
          if (!firstPoint) {
            // First click - set the first point
            firstPoint = latlng;
            
            // Create a marker at the first point
            const marker = L.marker(latlng).addTo(map);
            markers.push(marker);
            
            // Create the temporary line
            tempLine = L.polyline([latlng, latlng], {
              color: 'white',
              weight: 2,
              dashArray: '5, 5'
            }).addTo(map);
          } else {
            // Second click - complete the line
            const secondPoint = latlng;
            
            // Add marker for the second point
            const marker = L.marker(secondPoint).addTo(map);
            markers.push(marker);
            
            // Create the final line
            if (lineLayer) {
              map.removeLayer(lineLayer);
            }
            
            lineLayer = L.polyline([firstPoint, secondPoint], {
              color: 'blue',
              weight: 3
            }).addTo(map);
            
            // Remove the preview line
            if (tempLine) {
              map.removeLayer(tempLine);
              tempLine = null;
            }
            
            // Notify React Native of the complete line
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'lineComplete',
              data: {
                points: [
                  [firstPoint.lat, firstPoint.lng],
                  [secondPoint.lat, secondPoint.lng]
                ]
              }
            }));
            
            // Reset first point to allow drawing a new line
            firstPoint = null;
          }
        }
        
        // Update the drawing preview line
        function updateDrawingPreview(currentPoint) {
          if (tempLine && firstPoint) {
            tempLine.setLatLngs([firstPoint, currentPoint]);
          }
        }
        
        // Function to update the map with new data
        function updateMapData(data) {
          try {
            console.log("updateMapData called");
            
            // If we have GeoJSON data for block model
            if (data.geoJsonData && data.geoJsonData.features) {
              console.log("Processing block model GeoJSON data with", data.geoJsonData.features.length, "features");
              
              // Remove existing layer if it exists
              if (geoJsonLayer) {
                map.removeLayer(geoJsonLayer);
              }
              
              // Add the GeoJSON layer with performance optimizations
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
                  // Only add popup for specific rock types to reduce memory usage
                  if (feature.properties && (feature.properties.rock === 'ore' || Math.random() < 0.01)) {
                    const props = feature.properties;
                    const popupContent = \`
                      <div>
                        <strong>Rock Type:</strong> \${props.rock || 'Unknown'}<br>
                        <strong>Centroid Z:</strong> \${props.centroid_z ? props.centroid_z.toFixed(2) : 'N/A'}
                      </div>
                    \`;
                    layer.bindPopup(popupContent);
                  }
                }
              }).addTo(map);
              
              console.log("Block model GeoJSON layer added to map");
              
              // PENTING: Focus ke block model secara langsung setelah layer ditambahkan
              if (geoJsonLayer.getBounds && geoJsonLayer.getBounds().isValid()) {
                console.log("Immediately focusing to block model bounds");
                map.fitBounds(geoJsonLayer.getBounds(), { 
                  padding: [30, 30],
                  maxZoom: 14  // Batasi zoom maksimum
                });
              }
            }
            
            // If we have pit data
            if (data.pitGeoJsonData && data.pitGeoJsonData.features) {
              console.log("Processing pit GeoJSON data with", data.pitGeoJsonData.features.length, "features");
              
              // Debug info for pit data
              console.log("Pit data features sample:", 
                data.pitGeoJsonData.features.length > 0 ? 
                JSON.stringify(data.pitGeoJsonData.features[0].geometry.coordinates.slice(0, 2)) : 'No features');
              
              // Remove existing layer if it exists
              if (pitLayer) {
                map.removeLayer(pitLayer);
              }
              
              // Add the pit layer with improved styling and grouping
              pitLayer = L.geoJSON(data.pitGeoJsonData, {
                style: function(feature) {
                  return {
                    color: '#FF6600', // Brighter orange
                    weight: 4,        // Thicker lines
                    opacity: 1.0,     // Fully opaque
                    dashArray: '5, 5' // Dashed line pattern
                  };
                },
                onEachFeature: function(feature, layer) {
                  if (feature.properties) {
                    const props = feature.properties;
                    const popupContent = \`
                      <div>
                        <strong>Type:</strong> Pit Boundary<br>
                        <strong>Elevation:</strong> \${props.level ? props.level.toFixed(2) : 'N/A'} m
                      </div>
                    \`;
                    layer.bindPopup(popupContent);
                  }
                }
              }).addTo(map);
              
              console.log("Pit GeoJSON layer added to map");
              
              // PENTING: Log koordinat pit untuk debugging
              if (pitLayer && pitLayer.getBounds && pitLayer.getBounds().isValid()) {
                const bounds = pitLayer.getBounds();
                console.log("Pit layer bounds:", [
                  [bounds.getSouth(), bounds.getWest()],
                  [bounds.getNorth(), bounds.getEast()]
                ]);
              }
            }
            
            // VERSI PERBAIKAN: Fit bounds dengan prioritas yang jelas
            let finalBounds = null;
            
            // Prioritas 1: Jika kedua layer tersedia, gunakan keduanya
            if (geoJsonLayer && geoJsonLayer.getBounds && geoJsonLayer.getBounds().isValid() && 
                pitLayer && pitLayer.getBounds && pitLayer.getBounds().isValid()) {
              
              finalBounds = geoJsonLayer.getBounds().extend(pitLayer.getBounds());
              console.log("Using combined bounds from both layers");
            }
            // Prioritas 2: Jika hanya block model yang tersedia
            else if (geoJsonLayer && geoJsonLayer.getBounds && geoJsonLayer.getBounds().isValid()) {
              finalBounds = geoJsonLayer.getBounds();
              console.log("Using bounds from block model only");
            }
            // Prioritas 3: Jika hanya pit boundary yang tersedia
            else if (pitLayer && pitLayer.getBounds && pitLayer.getBounds().isValid()) {
              finalBounds = pitLayer.getBounds();
              console.log("Using bounds from pit boundary only");
            }
            
            // Jika ada bounds yang valid, gunakan
            if (finalBounds && finalBounds.isValid()) {
              // Tambahkan padding untuk memastikan semua terlihat
              const paddedBounds = L.latLngBounds(
                [finalBounds.getSouth() - 0.01, finalBounds.getWest() - 0.01],
                [finalBounds.getNorth() + 0.01, finalBounds.getEast() + 0.01]
              );
              
              console.log("Fitting map to bounds with padding");
              map.fitBounds(paddedBounds, { 
                padding: [30, 30],
                maxZoom: 14  // Batasi zoom maksimum
              });
              
              // Send the initial center coordinates after fitting bounds
              const center = map.getCenter();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapMove',
                data: {
                  lat: center.lat,
                  lng: center.lng
                }
              }));
            }
            // Jika tidak ada bounds, gunakan koordinat yang diberikan
            else if (data.mapCenter && data.mapCenter.length === 2) {
              console.log("Setting map center to:", data.mapCenter);
              map.setView(data.mapCenter, data.mapZoom || 12);
            }
            
            console.log('Map data update complete');
          } catch (error) {
            console.error('Error updating map data:', error);
          }
        }
        
        // Function to update the selected points and drawing mode
        function updateMapState(state) {
          try {
            console.log("updateMapState called");
            
            // Set drawing mode
            isDrawingMode = state.isDrawingMode;
            
            // Add visual indicator
            if (isDrawingMode) {
              map._container.style.cursor = 'crosshair';
              document.getElementById('map').classList.add('drawing-active');
              
              // Reset drawing state when entering drawing mode
              firstPoint = null;
              if (tempLine) {
                map.removeLayer(tempLine);
                tempLine = null;
              }
            } else {
              map._container.style.cursor = '';
              document.getElementById('map').classList.remove('drawing-active');
              
              // Clean up any incomplete drawing
              if (tempLine) {
                map.removeLayer(tempLine);
                tempLine = null;
              }
              firstPoint = null;
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
              console.log("Adding points to map:", state.linePoints);
              
              // Add markers for each point
              state.linePoints.forEach(point => {
                const marker = L.marker([point[0], point[1]]).addTo(map);
                markers.push(marker);
              });
              
              // If we have 2 points, draw a line
              if (state.linePoints.length === 2) {
                lineLayer = L.polyline(state.linePoints, {
                  color: 'blue',
                  weight: 3
                }).addTo(map);
              }
            }
            
            console.log('Map state updated');
          } catch (error) {
            console.error('Error updating map state:', error);
          }
        }
        
        // Initialize the map when the page loads
        document.addEventListener('DOMContentLoaded', initMap);
      </script>
    </body>
    </html>
  `;

  // Handle messages from WebView
  const handleMessage = (event: any) => {
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
        // Update the current coordinates when the map moves
        setCurrentCoordinates(message.data);
      } else if (message.type === "lineComplete" && onMapPress) {
        // Pass the completed line to the parent component
        onMapPress({
          ...message.data,
          isLineComplete: true,
        });
      }
    } catch (error) {
      console.error("Error parsing WebView message:", error);
    }
  };

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

      {/* Dynamic coordinates display based on map center */}
      <View style={styles.coordinatesContainer}>
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
