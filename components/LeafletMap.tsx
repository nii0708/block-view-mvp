import React, { useRef, useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { WebView } from "react-native-webview";

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
  pdfOverlayData?: {
    imageBase64: string | null;
    bounds: [[number, number], [number, number]];
    center: [number, number];
    zoom: number;
  } | null;
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
  pdfOverlayData = null,
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

  // Filter pit data berdasarkan range elevasi
  const getFilteredPitData = () => {
    if (!pitGeoJsonData || !pitGeoJsonData.features) {
      return pitGeoJsonData;
    }

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

    return {
      ...pitGeoJsonData,
      features: filteredFeatures,
    };
  };

  // Update GeoJSON data and PDF overlay when changed
  useEffect(() => {
    if (mapIsReady && webViewRef.current) {
      // Jangan batasi jumlah fitur kecuali SANGAT besar
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
              skipFitBounds: true, // Prevent auto-zooming
              pdfOverlayData: ${JSON.stringify(pdfOverlayData)}
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
    pdfOverlayData,
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

  useEffect(() => {
    if (onAddPointFromCrosshair && mapIsReady) {
      onAddPointFromCrosshair(addPointFromCrosshair);
    }
  }, [onAddPointFromCrosshair, addPointFromCrosshair, mapIsReady]);

  // HTML content with improved Leaflet map and PDF overlay support
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
          max-width: 250px;
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
        #coordinates-display {
          display: none;
        }
        
        /* Crosshair styles */
        .crosshair {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 30px;
          height: 30px;
          margin: -15px 0 0 -15px;
          pointer-events: none;
          z-index: 1000;
        }
        .crosshair:before,
        .crosshair:after {
          content: '';
          position: absolute;
          background: ${lineColor};
        }
        .crosshair:before {
          width: 2px;
          height: 100%;
          left: 50%;
          margin-left: -1px;
        }
        .crosshair:after {
          height: 2px;
          width: 100%;
          top: 50%;
          margin-top: -1px;
        }
        
        /* Point and line styling */
        .line-preview {
          stroke: ${lineColor};
          stroke-width: 2;
          stroke-dasharray: 5, 5;
          pointer-events: none;
        }
        .point-marker {
          opacity: 0.8;
          border: 2px solid #fff;
          box-shadow: 0 0 5px rgba(0,0,0,0.5);
        }
        
        /* PDF overlay styles */
        .pdf-overlay {
          pointer-events: auto;
          opacity: 0.7;
        }
        .pdf-popup {
          max-width: 250px;
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
        let tempLine;
        let firstPoint = null;
        let useCrosshairForDrawing = ${useCrosshairForDrawing};
        let lineColor = "${lineColor}";
        
        // PDF layer reference
        let pdfLayer = null;
        
        // Prevent multiple updates by tracking state
        let lastUpdateState = "";
        let processingUpdate = false;
        
        // Initialize map
        function initMap() {
          try {
            console.log('DOM loaded, initializing map');
            
            // Configure Leaflet for better mobile performance
            L.Browser.mobile = true;
            L.Browser.touch = true;
            
            // Create map instance with optimization settings
            map = L.map('map', {
              center: ${JSON.stringify(mapCenter)},
              zoom: ${mapZoom},
              attributionControl: false,
              preferCanvas: true,
              zoomSnap: 0.5,
              zoomAnimation: false,
              markerZoomAnimation: false,
              maxZoom: 19,
              renderer: L.canvas({ tolerance: 5 })
            });
            
            // Add touch handling improvements
            map.touchZoom.disable();
            map.touchZoom.enable();
            map.dragging.disable();
            map.dragging.enable();
            
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
            
            // Track map center changes with throttling
            let lastMoveTime = 0;
            map.on('move', function() {
              const now = Date.now();
              if (now - lastMoveTime < 100) return; // Throttle to 10 updates per second
              lastMoveTime = now;
              
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
        
        // Function to add point from crosshair - IMPROVED
        function addPointFromCrosshair() {
          try {
            const centerPoint = map.getCenter();
            console.log("addPointFromCrosshair called, center:", centerPoint);
            
            // Check if we're still in drawing mode
            if (!isDrawingMode) {
              console.log("Not in drawing mode, ignoring point add");
              return;
            }
            
            if (!firstPoint) {
              // First point
              firstPoint = centerPoint;
              console.log("Setting first point:", firstPoint);
              
              // Create visible marker
              const marker = L.circleMarker(centerPoint, {
                radius: 6,
                color: lineColor,
                fillColor: '#fff',
                fillOpacity: 1,
                weight: 2,
                className: 'point-marker'
              }).addTo(map);
              markers.push(marker);
              
              // Create temporary line for preview
              tempLine = L.polyline([centerPoint, centerPoint], {
                color: lineColor,
                weight: 2,
                dashArray: '5, 5'
              }).addTo(map);
              
              // Notify React Native of the first point
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'pointAdded',
                data: {
                  point: [centerPoint.lat, centerPoint.lng],
                  isFirstPoint: true,
                  pointKey: \`first-\${centerPoint.lat}-\${centerPoint.lng}\` // Add a unique key
                }
              }));
            } else {
              // Second point - complete the line
              const secondPoint = centerPoint;
              console.log("Setting second point:", secondPoint);
              
              // Create marker for second point
              const marker = L.circleMarker(secondPoint, {
                radius: 6,
                color: lineColor,
                fillColor: '#fff',
                fillOpacity: 1,
                weight: 2,
                className: 'point-marker'
              }).addTo(map);
              markers.push(marker);
              
              // Create the final line
              if (lineLayer) {
                map.removeLayer(lineLayer);
              }
              
              lineLayer = L.polyline([firstPoint, secondPoint], {
                color: lineColor,
                weight: 3
              }).addTo(map);
              console.log("Created permanent line between points");
              
              // Remove preview line
              if (tempLine) {
                map.removeLayer(tempLine);
                tempLine = null;
              }
              
              // Notify React Native of the complete line with a unique key
              const lineKey = \`line-\${firstPoint.lat}-\${firstPoint.lng}-\${secondPoint.lat}-\${secondPoint.lng}\`;
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'lineComplete',
                data: {
                  points: [
                    [firstPoint.lat, firstPoint.lng],
                    [secondPoint.lat, secondPoint.lng]
                  ],
                  isLineComplete: true,
                  lineKey: lineKey
                }
              }));
              
              // Reset first point
              firstPoint = null;
            }
          } catch (err) {
            console.error("Error in addPointFromCrosshair:", err);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              data: {
                message: "Error adding point: " + err.message
              }
            }));
          }
        }
        
        // Update map with GeoJSON data and PDF overlay (SIMPLIFIED)
        async function updateMapData(data) {
  try {
    console.log("updateMapData called", data);
    
    // PERUBAHAN: Proses block model terlebih dahulu
    // Block model GeoJSON handling - prioritaskan
    if (data.geoJsonData && data.geoJsonData !== null) {
      if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
        geoJsonLayer = null;
      }
      
      if (data.geoJsonData.features && data.geoJsonData.features.length > 0) {
        geoJsonLayer = L.geoJSON(data.geoJsonData, {
          style: function(feature) {
            return {
              fillColor: feature.properties.color || '#3388ff',
              weight: 1,
              opacity: 0.9, // Meningkatkan opacity dari 0.7 ke 0.9
              color: 'black',
              fillOpacity: 0.7 // Meningkatkan opacity dari 0.4 ke 0.7
            };
          },
          onEachFeature: function(feature, layer) {
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
      }
    } else if (data.geoJsonData === null) {
      // Remove the layer if data is null
      if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
        geoJsonLayer = null;
      }
    }
    
    // Pit GeoJSON handling dengan opacity lebih rendah
    if (data.pitGeoJsonData && data.pitGeoJsonData !== null) {
      if (pitLayer) {
        map.removeLayer(pitLayer);
        pitLayer = null;
      }
      
      if (data.pitGeoJsonData.features && data.pitGeoJsonData.features.length > 0) {
        pitLayer = L.geoJSON(data.pitGeoJsonData, {
          style: function(feature) {
            return {
              color: '#FF6600',
              weight: 2, // Mengurangi lebar garis dari 3 ke 2
              opacity: 0.7, // Mengurangi opacity dari 0.8 ke 0.7
              dashArray: '5, 5'
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
      }
    } else if (data.pitGeoJsonData === null) {
      // Remove the layer if data is null
      if (pitLayer) {
        map.removeLayer(pitLayer);
        pitLayer = null;
      }
    }
    
    // PERUBAHAN: Kurangi opacity PDF agar block model lebih menonjol
    // Handle PDF overlay dengan opacity lebih rendah
    if (data.pdfOverlayData) {
      if (pdfLayer) {
        map.removeLayer(pdfLayer);
        pdfLayer = null;
      }
      
      if (data.pdfOverlayData.bounds) {
        if (data.pdfOverlayData.imageBase64) {
          console.log('Adding PDF as image overlay...');
          
          // Gunakan format image yang benar
          const imageUrl = \`data:image/jpeg;base64,\${data.pdfOverlayData.imageBase64}\`;
          
          // SOLUSI: Buat bounds dengan format yang benar untuk Leaflet
          // Leaflet mengharapkan: [[southLat, westLng], [northLat, eastLng]]
          const swapBounds = [
            [data.pdfOverlayData.bounds[0][0], data.pdfOverlayData.bounds[0][1]],
            [data.pdfOverlayData.bounds[1][0], data.pdfOverlayData.bounds[1][1]]
          ];
          
          // Log bounds untuk debugging
          console.log('Original bounds:', data.pdfOverlayData.bounds);
          console.log('Using bounds:', swapBounds);
          
          // PERUBAHAN: Kurangi opacity PDF dari 0.7 ke 0.4
          pdfLayer = L.imageOverlay(imageUrl, swapBounds, {
            opacity: 0.4, // Kurangi opacity agar block model lebih terlihat
            interactive: true,
            className: 'pdf-overlay',
            attribution: 'PDF Map',
            crs: L.CRS.EPSG4326
          }).addTo(map);
          
          pdfLayer.bindPopup(
            '<div class="pdf-popup">' +
            '<strong>PDF Map</strong><br>' +
            'Geospatial PDF Overlay<br>' +
            '<small>Click to see full extent</small>' +
            '</div>'
          );
          
          console.log('PDF image overlay created successfully');
          
          // PERUBAHAN: Hilangkan auto-fit bounds untuk PDF
          // Komentari atau hapus kode berikut:
          // if (!data.skipFitBounds && data.pdfOverlayData.bounds) {
          //   console.log('Fitting PDF bounds...');
          //   const pdfBounds = L.latLngBounds(data.pdfOverlayData.bounds);
          //   map.fitBounds(pdfBounds, { 
          //     padding: [20, 20],
          //     maxZoom: data.pdfOverlayData.zoom || 14
          //   });
          // }
        } else {
          // Belum ada image, tampilkan sebagai marker sementara
          console.log('Adding PDF as marker (processing)...');
          
          const pdfCenter = [
            (data.pdfOverlayData.bounds[0][0] + data.pdfOverlayData.bounds[1][0]) / 2,
            (data.pdfOverlayData.bounds[0][1] + data.pdfOverlayData.bounds[1][1]) / 2
          ];
          
          const pdfMarker = L.marker(pdfCenter, {
            icon: L.divIcon({
              className: 'pdf-processing-marker',
              html: '<div style="background: #ff0; padding: 5px 10px; border-radius: 3px; border: 1px solid #000; font-weight: bold;">PDF Processing...</div>',
              iconSize: [120, 30],
              iconAnchor: [60, 15]
            })
          }).addTo(map)
          .bindPopup(
            '<div class="pdf-popup">' +
            '<strong>PDF Location</strong><br>' +
            'Converting to image...<br>' +
            '<small>Please wait</small>' +
            '</div>'
          );
          
          pdfLayer = pdfMarker;
          console.log('PDF processing marker created at:', pdfCenter);
          
          // PERUBAHAN: Hilangkan center map pada PDF location
          // Komentari atau hapus kode berikut:
          // if (!data.skipFitBounds) {
          //   map.setView(pdfCenter, data.pdfOverlayData.zoom || 14);
          // }
        }
      }
    }
        }
            
            // Only fit bounds once on initial load, not on updates
            if (!data.skipFitBounds) {
  let finalBounds = null;
  
  // PERUBAHAN: Prioritaskan block model (geoJsonLayer)
  if (geoJsonLayer && geoJsonLayer.getBounds && geoJsonLayer.getBounds().isValid()) {
    finalBounds = geoJsonLayer.getBounds();
    
    if (pitLayer && pitLayer.getBounds && pitLayer.getBounds().isValid()) {
      finalBounds.extend(pitLayer.getBounds());
    }
    
    // PDF bounds ditambahkan hanya jika block model sudah ada
    if (data.pdfOverlayData && data.pdfOverlayData.bounds) {
      const pdfBounds = L.latLngBounds(data.pdfOverlayData.bounds);
      finalBounds.extend(pdfBounds);
    }
  } else if (pitLayer && pitLayer.getBounds && pitLayer.getBounds().isValid()) {
    finalBounds = pitLayer.getBounds();
    
    // PDF bounds ditambahkan jika tidak ada block model tapi ada pit
    if (data.pdfOverlayData && data.pdfOverlayData.bounds) {
      const pdfBounds = L.latLngBounds(data.pdfOverlayData.bounds);
      finalBounds.extend(pdfBounds);
    }
  } 
  // Prioritas terakhir adalah PDF jika tidak ada block model atau pit
  else if (data.pdfOverlayData && data.pdfOverlayData.bounds) {
    finalBounds = L.latLngBounds(data.pdfOverlayData.bounds);
  }
  
  if (finalBounds && finalBounds.isValid()) {
    map.fitBounds(finalBounds, { 
      padding: [30, 30],
      maxZoom: 14
    });
  } else if (data.mapCenter && data.mapCenter.length === 2) {
    map.setView(data.mapCenter, data.mapZoom || 12);
  }
}
            
            console.log('Map data update complete');
          } catch (error) {
            console.error('Error updating map data:', error);
          }
        }
        
        // Function to update the selected points and drawing mode - IMPROVED
        function updateMapState(state) {
          try {
            // Prevent repeated same-state updates
            const stateString = JSON.stringify(state);
            if (lastUpdateState === stateString || processingUpdate) {
              return;
            }
            
            lastUpdateState = stateString;
            processingUpdate = true;
            
            console.log("updateMapState called with:", stateString);
            
            // Set drawing mode
            isDrawingMode = state.isDrawingMode;
            
            if (isDrawingMode) {
              map._container.style.cursor = 'crosshair';
              document.getElementById('map').classList.add('drawing-active');
            } else {
              map._container.style.cursor = '';
              document.getElementById('map').classList.remove('drawing-active');
            }
            
            // Clear existing markers and lines
            console.log("Clearing existing markers and lines");
            markers.forEach(marker => map.removeLayer(marker));
            markers = [];
            
            if (lineLayer) {
              map.removeLayer(lineLayer);
              lineLayer = null;
            }
            
            if (tempLine) {
              map.removeLayer(tempLine);
              tempLine = null;
            }
            
            // Reset first point
            firstPoint = null;
            
            // If we have line points, add markers and potentially a line
            if (state.linePoints && state.linePoints.length > 0) {
              console.log("Processing line points:", state.linePoints);
              
              // Add markers for each point
              state.linePoints.forEach(point => {
                const marker = L.circleMarker([point[0], point[1]], {
                  radius: 6,
                  color: lineColor,
                  fillColor: '#fff',
                  fillOpacity: 1,
                  weight: 2,
                  className: 'point-marker'
                }).addTo(map);
                markers.push(marker);
              });
              
              // If we have 2 points, draw a line
              if (state.linePoints.length === 2) {
                console.log("Creating line between points");
                lineLayer = L.polyline(state.linePoints, {
                  color: lineColor,
                  weight: 3
                }).addTo(map);
                
                // Don't fit bounds automatically - let the user control zoom
                if (!state.noZoom) {
                  const lineBounds = L.latLngBounds(state.linePoints);
                  map.fitBounds(lineBounds, {
                    padding: [50, 50]
                  });
                }
              }
              
              // If we have 1 point and we're in drawing mode, set firstPoint for preview
              if (state.linePoints.length === 1 && isDrawingMode) {
                const point = state.linePoints[0];
                firstPoint = L.latLng(point[0], point[1]);
                
                // Create temporary line for preview
                tempLine = L.polyline([firstPoint, map.getCenter()], {
                  color: lineColor,
                  weight: 2,
                  dashArray: '5, 5'
                }).addTo(map);
              }
            }
            
            processingUpdate = false;
            console.log('Map state updated successfully');
          } catch (error) {
            processingUpdate = false;
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

      {/* Coordinates display hidden by default */}
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
    display: "none",
  },
  coordinatesText: {
    fontSize: 12,
    color: "#333",
  },
});

export default LeafletMap;
