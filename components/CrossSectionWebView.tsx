import React, { useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";

interface CrossSectionWebViewProps {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  blockModelData: any[];
  elevationData?: any[];
  pitData?: any[];
  lineLength: number;
  onClose?: () => void;
}

const CrossSectionWebView: React.FC<CrossSectionWebViewProps> = ({
  startLat,
  startLng,
  endLat,
  endLng,
  blockModelData,
  elevationData = [],
  pitData = [],
  lineLength,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  // Safely stringify data
  const safeStringify = (data: any) => {
    try {
      return JSON.stringify(data || []);
    } catch (e) {
      console.error("Error stringifying data:", e);
      return "[]";
    }
  };

  // Create the HTML content with D3 visualization
  const d3Html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>Cross Section View</title>
      
      <!-- Include D3.js -->
      <script src="https://d3js.org/d3.v7.min.js"></script>
      <!-- Include Turf.js for geographical calculations -->
      <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
      
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f8f8f8;
        }
        .header {
          background-color: white;
          padding: 15px;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        h1 {
          margin: 0;
          color: #0066CC;
          font-size: 20px;
        }
        .info {
          padding: 10px 15px;
          font-size: 14px;
        }
        #chart {
          width: 100%;
          height: 70vh;
          background-color: white;
          border-top: 1px solid #ddd;
          display: flex;
          justify-content: center;
        }
        .axis path,
        .axis line {
          stroke: #ccc;
        }
        .axis text {
          font-size: 12px;
          fill: #666;
        }
        .grid line {
          stroke: #e0e0e0;
          stroke-opacity: 0.7;
        }
        .grid path {
          stroke-width: 0;
        }
        .tooltip {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 3px;
          padding: 6px;
          pointer-events: none;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .loading {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.8);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .spinner {
          border: 5px solid #f3f3f3;
          border-top: 5px solid #0066CC;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .message {
          margin-top: 10px;
          font-size: 14px;
          color: #333;
        }
        .footer {
          padding: 10px 15px;
          font-size: 12px;
          color: #666;
        }
        .close-btn {
          background-color: #f0f0f0;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        .close-btn:hover {
          background-color: #e0e0e0;
        }
        .block {
          stroke: #333;
          stroke-width: 0.5;
        }
        .elevation-line {
          fill: none;
          stroke: green;
          stroke-width: 2;
        }
        .elevation-area {
          fill: rgba(0, 128, 0, 0.1);
        }
        .section-line {
          stroke: red;
          stroke-width: 2;
          stroke-dasharray: 5,5;
          opacity: 0.7;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Cross Section View</h1>
        <button id="closeButton" class="close-btn">Close</button>
      </div>
      
      <div class="info">
        <div>Start: ${startLat.toFixed(6)}, ${startLng.toFixed(6)}</div>
        <div>End: ${endLat.toFixed(6)}, ${endLng.toFixed(6)}</div>
        <div>Length: ${lineLength.toFixed(1)} meters</div>
      </div>
      
      <div id="chart"></div>
      
      <div class="footer">
        <p>Showing cross-section with geological blocks intersected by the line. Hover over blocks for details.</p>
      </div>
      
      <div id="loading" class="loading">
        <div class="spinner"></div>
        <div id="message" class="message">Rendering cross-section...</div>
      </div>
      
      <script>
        // Helper function to send messages to React Native
        function sendToRN(type, data) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: type,
              ...data
            }));
          }
        }
        
        // Handle close button click
        document.getElementById('closeButton').addEventListener('click', function() {
          sendToRN('close', {});
        });
        
        // Helper function to log to console and React Native
        function log(message) {
          console.log(message);
          sendToRN('log', { message });
        }
        
        document.addEventListener('DOMContentLoaded', function() {
          try {
            log('Initializing cross-section visualization with line intersection');
            
            // Parse data
            const blockModelData = ${safeStringify(blockModelData)};
            log("Block model data length: " + (blockModelData ? blockModelData.length : 0));
            
            const elevationData = ${safeStringify(elevationData)};
            log("Elevation data length: " + (elevationData ? elevationData.length : 0));
            
            // Start and end points for the cross-section line
            const startLat = ${startLat};
            const startLng = ${startLng};
            const endLat = ${endLat};
            const endLng = ${endLng};
            
            // Convert points to GeoJSON format [lng, lat]
            const startPoint = turf.point([startLng, startLat]);
            const endPoint = turf.point([endLng, endLat]);
            
            // Create a line between the points
            const line = turf.lineString([
              [startLng, startLat],
              [endLng, endLat]
            ]);
            
            // Calculate the total distance of the line in meters
            const totalDistance = turf.length(line, { units: 'meters' });
            log("Total line distance: " + totalDistance.toFixed(2) + " meters");
            
            // Setup dimensions - responsive to container
            const width = Math.min(800, window.innerWidth - 40);  // Max width 800px, with 20px padding on each side
            const height = Math.min(400, window.innerHeight * 0.6);  // Max height 400px
            const margin = { top: 40, right: 60, bottom: 60, left: 60 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            
            // Create GeoJSON features from block model data
            const geoJsonData = {
              type: 'FeatureCollection',
              features: blockModelData
                .filter(block => {
                  // Filter out blocks with missing critical coordinates
                  return block && 
                         typeof block.centroid_x === 'number' && 
                         typeof block.centroid_y === 'number' && 
                         typeof block.centroid_z === 'number';
                })
                .map(block => {
                  // Set default values for any missing properties
                  const centroid_x = block.centroid_x;
                  const centroid_y = block.centroid_y;
                  const centroid_z = block.centroid_z;
                  const dim_x = block.dim_x || 10; // Default dimension if missing
                  const dim_y = block.dim_y || 10;
                  const dim_z = block.dim_z || 10;
                  
                  // Create a polygon for the block
                  return {
                    type: 'Feature',
                    properties: {
                      centroid_x,
                      centroid_y,
                      centroid_z,
                      dim_x,
                      dim_y,
                      dim_z,
                      rock: block.rock || 'UNKNOWN',
                      color: block.color || '#CCCCCC'
                    },
                    geometry: {
                      type: 'Polygon',
                      coordinates: [[
                        // Create a simple polygon around the centroid
                        [centroid_x - dim_x/2, centroid_y - dim_y/2],
                        [centroid_x + dim_x/2, centroid_y - dim_y/2],
                        [centroid_x + dim_x/2, centroid_y + dim_y/2],
                        [centroid_x - dim_x/2, centroid_y + dim_y/2],
                        [centroid_x - dim_x/2, centroid_y - dim_y/2]
                      ]]
                    }
                  };
                })
            };
            
            log("Valid GeoJSON features: " + geoJsonData.features.length);
            
            // Check which blocks are intersected by the line
            const intersectedBlocks = [];
            
            geoJsonData.features.forEach(block => {
              try {
                // Check if the line intersects the block polygon
                const polygon = turf.polygon(block.geometry.coordinates);
                const intersects = turf.booleanIntersects(line, polygon);
                
                if (intersects) {
                  // Find the intersection point(s)
                  const intersection = turf.lineIntersect(line, polygon);
                  if (intersection.features.length > 0) {
                    // Calculate distance along the line for each intersection point
                    const distances = intersection.features.map(point => {
                      return turf.distance(startPoint, point, { units: 'meters' });
                    });
                    
                    // Add to intersected blocks with distance along line
                    intersectedBlocks.push({
                      block: block,
                      distance: Math.min(...distances) // Use the closest intersection
                    });
                  }
                }
              } catch (e) {
                log("Error checking intersection for block: " + e.message);
              }
            });
            
            log("Blocks intersected by line: " + intersectedBlocks.length);
            
            // Sort blocks by distance along the line
            intersectedBlocks.sort((a, b) => a.distance - b.distance);
            
            // Create profile data from intersected blocks
            const profileData = intersectedBlocks.map(item => {
              const block = item.block;
              const distance = item.distance;
              
              return {
                distance: distance,
                height: block.properties.centroid_z,
                rockType: block.properties.rock,
                color: block.properties.color,
                dimensions: {
                  width: block.properties.dim_x,
                  height: block.properties.dim_z
                },
                lng: block.properties.centroid_x,
                lat: block.properties.centroid_y
              };
            });
            
            log("Created profile data for " + profileData.length + " blocks");
            
            // If no blocks intersected, sample points along the line (fallback)
            if (profileData.length === 0) {
              log("No blocks intersected the line directly. Using nearest block sampling as fallback.");
              
              // Sample points along the line
              const samplingDistance = 5; // meters between sample points
              const numSamples = Math.max(20, Math.ceil(totalDistance / samplingDistance));
              
              log("Sampling " + numSamples + " points along the line");
              
              // Generate points along the line
              const points = Array.from({ length: numSamples }, (_, i) => {
                const fraction = i / (numSamples - 1);
                try {
                  return turf.along(line, totalDistance * fraction, { units: 'meters' });
                } catch (e) {
                  return null;
                }
              }).filter(p => p !== null);
              
              // For each point, find the nearest block
              points.forEach((point, index) => {
                try {
                  // Get the coordinates
                  const ptLng = point.geometry.coordinates[0];
                  const ptLat = point.geometry.coordinates[1];
                  
                  // Find the nearest block
                  let nearestBlock = null;
                  let minDistance = Infinity;
                  
                  geoJsonData.features.forEach(feature => {
                    const featureCenter = [
                      feature.properties.centroid_x,
                      feature.properties.centroid_y
                    ];
                    
                    try {
                      const distance = turf.distance(
                        turf.point([ptLng, ptLat]),
                        turf.point([featureCenter[0], featureCenter[1]]),
                        { units: 'meters' }
                      );
                      
                      if (distance < minDistance) {
                        minDistance = distance;
                        nearestBlock = feature;
                      }
                    } catch (e) {
                      // Skip if distance calculation fails
                    }
                  });
                  
                  if (nearestBlock) {
                    // Calculate distance from start point
                    const distanceFromStart = turf.distance(
                      startPoint,
                      point,
                      { units: 'meters' }
                    );
                    
                    // Add to profile data
                    profileData.push({
                      distance: distanceFromStart,
                      height: nearestBlock.properties.centroid_z,
                      rockType: nearestBlock.properties.rock,
                      color: nearestBlock.properties.color,
                      dimensions: {
                        width: nearestBlock.properties.dim_x,
                        height: nearestBlock.properties.dim_z
                      },
                      lng: nearestBlock.properties.centroid_x,
                      lat: nearestBlock.properties.centroid_y,
                      isNearestOnly: true // Flag to indicate it's not a direct intersection
                    });
                  }
                } catch (e) {
                  log("Error processing point at index " + index + ": " + e.message);
                }
              });
              
              // Sort by distance
              profileData.sort((a, b) => a.distance - b.distance);
            }
            
            // Process elevation data if available
            let elevationProfile = [];
            if (elevationData && elevationData.length > 0) {
              // Project elevation data points onto the line
              elevationProfile = elevationData
                .filter(point => {
                  // Filter out points with invalid coordinates
                  const hasX = point.lon !== undefined || point.x !== undefined;
                  const hasY = point.lat !== undefined || point.y !== undefined;
                  return hasX && hasY;
                })
                .map(point => {
                  try {
                    const x = point.lon !== undefined ? point.lon : (point.x !== undefined ? point.x : 0);
                    const y = point.lat !== undefined ? point.lat : (point.y !== undefined ? point.y : 0);
                    const pointGeo = turf.point([x, y]);
                    const nearestOnLine = turf.nearestPointOnLine(line, pointGeo);
                    
                    return {
                      distance: nearestOnLine.properties.location * totalDistance,
                      height: point.z !== undefined ? point.z : (point.elevation !== undefined ? point.elevation : 0)
                    };
                  } catch (e) {
                    return null;
                  }
                })
                .filter(item => item !== null)
                .sort((a, b) => a.distance - b.distance);
            }
            
            // Find the min and max heights across all datasets
            const allHeights = [
              ...(profileData ? profileData.map(d => d.height - d.dimensions.height/2) : []),
              ...(profileData ? profileData.map(d => d.height + d.dimensions.height/2) : []),
              ...(elevationProfile ? elevationProfile.map(d => d.height) : [])
            ].filter(h => h !== undefined && h !== null && !isNaN(h) && isFinite(h));
            
            // Default height range if no valid heights
            let minHeight = 0;
            let maxHeight = 100;
            
            if (allHeights.length > 0) {
              minHeight = d3.min(allHeights) || 0;
              maxHeight = d3.max(allHeights) || 100;
            }
            
            // Make sure we have a valid range
            if (minHeight === maxHeight) {
              minHeight -= 10;
              maxHeight += 10;
            }
            
            const heightPadding = Math.max(1, (maxHeight - minHeight) * 0.1);
            
            // Create SVG
            const svg = d3.select('#chart')
              .append('svg')
              .attr('width', width)
              .attr('height', height);
              
            // Create a group element for the visualization
            const g = svg.append('g')
              .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);
            
            // Create scales
            const xScale = d3.scaleLinear()
              .domain([0, d3.max(profileData, d => d.distance) || totalDistance])
              .range([0, innerWidth]);
              
            const yScale = d3.scaleLinear()
              .domain([minHeight - heightPadding, maxHeight + heightPadding])
              .range([innerHeight, 0]);
              
            // Create a color scale for rock types
            const rockTypes = [...new Set(profileData.map(d => d.rockType))];
            const colorScale = d3.scaleOrdinal()
              .domain(rockTypes)
              .range(d3.schemeCategory10);
              
            // Create axes
            const xAxis = d3.axisBottom(xScale)
              .tickFormat(d => d + "m");
              
            const yAxis = d3.axisLeft(yScale)
              .tickFormat(d => d + "m");
            
            // Add grid lines
            g.append('g')
              .attr('class', 'grid')
              .attr('transform', \`translate(0, \${innerHeight})\`)
              .call(
                d3.axisBottom(xScale)
                  .tickSize(-innerHeight)
                  .tickFormat('')
              );
              
            g.append('g')
              .attr('class', 'grid')
              .call(
                d3.axisLeft(yScale)
                  .tickSize(-innerWidth)
                  .tickFormat('')
              );
              
            // Add axes to the visualization
            g.append('g')
              .attr('class', 'x axis')
              .attr('transform', \`translate(0, \${innerHeight})\`)
              .call(xAxis);
              
            g.append('g')
              .attr('class', 'y axis')
              .call(yAxis);
              
            // Add axis labels
            g.append('text')
              .attr('x', innerWidth / 2)
              .attr('y', innerHeight + 40)
              .attr('text-anchor', 'middle')
              .text('Distance Along Line (meters)');
              
            g.append('text')
              .attr('transform', 'rotate(-90)')
              .attr('x', -innerHeight / 2)
              .attr('y', -40)
              .attr('text-anchor', 'middle')
              .text('Elevation (meters)');
              
            // Add title
            g.append('text')
              .attr('x', innerWidth / 2)
              .attr('y', -15)
              .attr('text-anchor', 'middle')
              .attr('font-weight', 'bold')
              .text('Vertical Profile Along Line');
              
            // Draw line representing the section line
            g.append('line')
              .attr('class', 'section-line')
              .attr('x1', xScale(0))
              .attr('y1', innerHeight)
              .attr('x2', xScale(totalDistance))
              .attr('y2', innerHeight);
              
            // Draw elevation profile if available
            if (elevationProfile.length > 0) {
              const elevationLine = d3.line()
                .x(d => xScale(d.distance))
                .y(d => yScale(d.height))
                .curve(d3.curveBasis);
                
              g.append('path')
                .datum(elevationProfile)
                .attr('class', 'elevation-line')
                .attr('d', elevationLine);
                
              // Add fill below the line
              const area = d3.area()
                .x(d => xScale(d.distance))
                .y0(innerHeight)
                .y1(d => yScale(d.height))
                .curve(d3.curveBasis);
                
              g.append('path')
                .datum(elevationProfile)
                .attr('class', 'elevation-area')
                .attr('d', area);
            }
            
            // Calculate block width based on proximity
            // If blocks are too close together, adjust width to prevent overlap
            const blockMinWidth = 2; // Minimum width in pixels
            let blockWidthScale = 1;
            
            if (profileData.length > 1) {
              const avgDistance = totalDistance / (profileData.length - 1);
              const avgBlockWidth = d3.mean(profileData, d => d.dimensions.width);
              
              // If blocks would overlap, scale them down
              if (avgBlockWidth > avgDistance) {
                blockWidthScale = 0.8 * avgDistance / avgBlockWidth;
              }
            }
            
            // Create a tooltip div
            const tooltip = d3.select('body').append('div')
              .attr('class', 'tooltip')
              .style('opacity', 0);
              
            // Add blocks for each intersection point
            g.selectAll('.block')
              .data(profileData)
              .enter()
              .append('rect')
              .attr('class', 'block')
              .attr('x', d => xScale(d.distance) - (xScale(d.dimensions.width * blockWidthScale) - xScale(0)) / 2)
              .attr('y', d => yScale(d.height + d.dimensions.height/2))
              .attr('width', d => Math.max(blockMinWidth, xScale(d.dimensions.width * blockWidthScale) - xScale(0)))
              .attr('height', d => Math.abs(yScale(d.height - d.dimensions.height/2) - yScale(d.height + d.dimensions.height/2)))
              .attr('fill', d => d.color || colorScale(d.rockType))
              .attr('stroke', '#333')
              .attr('stroke-width', d => d.isNearestOnly ? 0.3 : 0.5) // Different stroke for nearest-only blocks
              .attr('opacity', d => d.isNearestOnly ? 0.8 : 1) // Different opacity for nearest-only blocks
              .on('mouseover', function(event, d) {
                d3.select(this)
                  .attr('stroke-width', 2)
                  .attr('stroke', '#000');
                
                tooltip.transition()
                  .duration(200)
                  .style('opacity', .9);
                  
                tooltip.html(
                    "Height: " + d.height.toFixed(1) + "m<br>" +
                    "Rock: " + d.rockType + "<br>" + 
                    "Width: " + d.dimensions.width.toFixed(1) + "m<br>" +
                    "Depth: " + d.dimensions.height.toFixed(1) + "m<br>" +
                    "Distance: " + d.distance.toFixed(1) + "m" +
                    (d.isNearestOnly ? "<br><i>(Nearest block)</i>" : "")
                  )
                  .style('left', (event.pageX + 10) + 'px')
                  .style('top', (event.pageY - 28) + 'px');
              })
              .on('mouseout', function(event, d) {
                d3.select(this)
                  .attr('stroke-width', d.isNearestOnly ? 0.3 : 0.5)
                  .attr('stroke', '#333');
                
                tooltip.transition()
                  .duration(500)
                  .style('opacity', 0);
              });
              
            // Add a legend
            const legend = g.append('g')
              .attr('class', 'legend')
              .attr('transform', \`translate(\${innerWidth - 120}, 20)\`);
              
            // Add legend for rock types
            rockTypes.forEach((rockType, i) => {
              const legendRow = legend.append('g')
                .attr('transform', \`translate(0, \${i * 20})\`);
                
              legendRow.append('rect')
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', colorScale(rockType));
                
              legendRow.append('text')
                .attr('x', 20)
                .attr('y', 9)
                .attr('font-size', '12px')
                .text(rockType);
            });
            
            // Add legend for elevation if available
            if (elevationProfile.length > 0) {
              const elevLegend = legend.append('g')
                .attr('transform', \`translate(0, \${rockTypes.length * 20 + 10})\`);
                
              elevLegend.append('line')
                .attr('x1', 0)
                .attr('y1', 6)
                .attr('x2', 12)
                .attr('y2', 6)
                .attr('stroke', 'green')
                .attr('stroke-width', 2);
                
              elevLegend.append('text')
                .attr('x', 20)
                .attr('y', 9)
                .attr('font-size', '12px')
                .text('Elevation');
            }
            
            // Add section line to legend
            const sectionLegend = legend.append('g')
              .attr('transform', \`translate(0, \${rockTypes.length * 20 + (elevationProfile.length > 0 ? 30 : 10)})\`);
              
            sectionLegend.append('line')
              .attr('x1', 0)
              .attr('y1', 6)
              .attr('x2', 12)
              .attr('y2', 6)
              .attr('class', 'section-line');
              
            sectionLegend.append('text')
              .attr('x', 20)
              .attr('y', 9)
              .attr('font-size', '12px')
              .text('Section Line');
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            
            // Let React Native know rendering is complete
            sendToRN('renderComplete', { message: 'Cross-section visualization complete' });
            log('Cross-section visualization rendered successfully');
          } catch (error) {
            console.error('Error rendering visualization:', error);
            document.getElementById('message').textContent = 'Error: ' + error.toString();
            sendToRN('renderError', { error: error.toString() });
          }
        });
      </script>
    </body>
    </html>
  `;

  // Handle messages from WebView
  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'renderComplete':
          console.log("Render complete message received");
          setLoading(false);
          break;
        case 'renderError':
          console.error("Render error:", message.error);
          setError(message.error);
          setLoading(false);
          break;
        case 'log':
          console.log("WebView log:", message.message);
          break;
        case 'close':
          console.log("Close button clicked");
          if (onClose) onClose();
          break;
        default:
          console.log("Unknown message type:", message.type);
      }
    } catch (e) {
      console.error("Error parsing WebView message:", e);
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading cross section...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: d3Html }}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        onMessage={handleMessage}
        onError={(e) => {
          console.error("WebView error:", e.nativeEvent);
          setError(`WebView error: ${e.nativeEvent.description}`);
          setLoading(false);
        }}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {!loading && !error && onClose && (
        <TouchableOpacity 
          style={styles.closeButtonAbsolute}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(240, 240, 240, 0.8)",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#0066CC",
  },
  errorContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 0, 0, 0.05)",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  closeButtonAbsolute: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    zIndex: 5,
  },
  closeButtonText: {
    color: "#333",
    fontSize: 14,
  },
});

export default CrossSectionWebView;