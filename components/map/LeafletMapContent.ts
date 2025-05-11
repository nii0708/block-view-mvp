/**
 * Generates the HTML content for the Leaflet map
 */
export const generateLeafletMapContent = (
  lineColor: string,
  useCrosshairForDrawing: boolean
): string => {
  return `
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
              center: [0, 0],
              zoom: 12,
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
        
        // Update map with GeoJSON data
        function updateMapData(data) {
          try {
            console.log("updateMapData called");
            
            // Block model GeoJSON handling
            if (data.geoJsonData && data.geoJsonData.features) {
              if (geoJsonLayer) {
                map.removeLayer(geoJsonLayer);
              }
              
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
            
            // Pit GeoJSON handling
            if (data.pitGeoJsonData && data.pitGeoJsonData.features) {
              if (pitLayer) {
                map.removeLayer(pitLayer);
              }
              
              pitLayer = L.geoJSON(data.pitGeoJsonData, {
                style: function(feature) {
                  return {
                    color: '#FF6600',
                    weight: 4,
                    opacity: 1.0,
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
            
            // Only fit bounds once on initial load, not on updates
            if (!data.skipFitBounds) {
              let finalBounds = null;
              
              if (geoJsonLayer && geoJsonLayer.getBounds && geoJsonLayer.getBounds().isValid()) {
                finalBounds = geoJsonLayer.getBounds();
                
                if (pitLayer && pitLayer.getBounds && pitLayer.getBounds().isValid()) {
                  finalBounds.extend(pitLayer.getBounds());
                }
              } else if (pitLayer && pitLayer.getBounds && pitLayer.getBounds().isValid()) {
                finalBounds = pitLayer.getBounds();
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
};
