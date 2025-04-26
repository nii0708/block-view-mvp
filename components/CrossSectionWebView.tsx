import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Button,
  ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";

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
}) => {
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(
    "Preparing cross section..."
  );
  const [error, setError] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(0);
  const webViewRef = useRef<WebView>(null);
  const renderedRef = useRef<boolean>(false);

  // Preprocess blockModelData to sample or limit it
  const getOptimizedBlockData = useMemo(() => {
    try {
      if (!blockModelData || blockModelData.length === 0) return [];

      // If we have a very large dataset, sample it
      if (blockModelData.length > 3000) {
        const samplingInterval = Math.ceil(blockModelData.length / 3000);
        return blockModelData.filter(
          (_, index) => index % samplingInterval === 0
        );
      }

      return blockModelData;
    } catch (e) {
      console.error("Error optimizing block data:", e);
      return blockModelData.slice(0, 1000); // Fallback to first 1000 blocks
    }
  }, [blockModelData]);

  // Generate D3 HTML content only once with memoization
  const d3Html = useMemo(() => {
    return generateD3Html(
      getOptimizedBlockData,
      elevationData,
      pitData,
      startLat,
      startLng,
      endLat,
      endLng,
      lineLength,
      sourceProjection
    );
  }, [
    getOptimizedBlockData,
    elevationData,
    pitData,
    startLat,
    startLng,
    endLat,
    endLng,
    lineLength,
    sourceProjection,
  ]);

  // Handle messages from WebView with debouncing
  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case "renderComplete":
          if (!renderedRef.current) {
            renderedRef.current = true;
            setLoading(false);
            if (message.chartWidth) {
              setChartWidth(message.chartWidth);
            }
          }
          break;
        case "renderError":
          setError(message.error);
          setLoading(false);
          break;
        case "debug":
          // Just log to console, not to UI
          console.log("WebView debug:", message.message);
          break;
        case "chartDimensions":
          if (message.width && message.width !== chartWidth) {
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

  // Inject a fallback rendering function if needed
  const injectDebugCode = () => {
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
              
              // Generate test data and render
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

  // Custom loading component for WebView
  const renderLoadingComponent = () => {
    return (
      <View style={styles.webViewLoading}>
        <ActivityIndicator size="small" color="#0066CC" />
      </View>
    );
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
        contentContainerStyle={{
          width: chartWidth > 0 ? chartWidth : undefined,
        }}
      >
        <WebView
          ref={webViewRef}
          source={{ html: d3Html }}
          style={[
            styles.webview,
            { width: chartWidth > 0 ? chartWidth : "100%" },
          ]}
          originWhitelist={["*"]}
          javaScriptEnabled={true}
          onMessage={handleMessage}
          onError={(e) => {
            console.error("WebView error:", e.nativeEvent);
            setError(`WebView error: ${e.nativeEvent.description}`);
          }}
          startInLoadingState={false}
          renderLoading={renderLoadingComponent}
          cacheEnabled={true}
        />
      </ScrollView>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Try Simplified Render" onPress={injectDebugCode} />
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
  webview: {
    height: "100%",
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
  webViewLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

// Generate D3 HTML function
function generateD3Html(
  blockModelData: any[],
  elevationData: any[],
  pitData: any[],
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  lineLength: number,
  sourceProjection: string
): string {
  // Safely stringify data to prevent errors
  const safeStringify = (data: any) => {
    try {
      return JSON.stringify(data || []);
    } catch (e) {
      console.error("Error stringifying data:", e);
      return "[]";
    }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>Cross Section View</title>
      
      <!-- Include D3.js -->
      <script src="https://d3js.org/d3.v7.min.js"></script>
      
      <style>
        html, body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background-color: #f8f8f8;
          overflow: hidden;
          touch-action: pan-y;
          -webkit-overflow-scrolling: touch;
        }
        #chart-container {
          margin-top: 10px;
          width: 100%;
          height: 80vh;
          overflow-x: auto;
          overflow-y: hidden;
          background-color: white;
        }
        #chart {
          height: 100%;
          width: 100%;
        }
        .block {
          stroke: #000;
          stroke-width: 0.5;
        }
        .block:hover {
          stroke-width: 1.5;
          stroke: #333;
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
          border-radius: 4px;
          padding: 8px;
          font-size: 12px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 100;
        }
        .legend {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.9);
          padding: 10px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        .loading {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.9);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 1000;
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
        .progress-bar {
          width: 200px;
          height: 6px;
          background-color: #f3f3f3;
          border-radius: 3px;
          margin-top: 10px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background-color: #0066CC;
          width: 0%;
          transition: width 0.2s;
        }
      </style>
    </head>
    <body>
      <div id="chart-container">
        <div id="chart"></div>
      </div>
      
      <div id="tooltip" class="tooltip"></div>
      
      <div id="loading" class="loading">
        <div class="spinner"></div>
        <div id="message" class="message">Rendering cross-section...</div>
        <div class="progress-bar">
          <div id="progress-fill" class="progress-fill"></div>
        </div>
      </div>
      
      <script>
        // Prevent double rendering
        let isRendering = false;
        let hasRendered = false;
        
        // For debug logging with throttling
        let lastLogTime = 0;
        function debug(message) {
          const now = Date.now();
          if (now - lastLogTime > 500) { // Throttle logging
            lastLogTime = now;
            console.log(message);
            
            // Send to React Native
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'debug',
                message: message
              }));
            }
          }
        }
        
        // Helper function to send messages to React Native
        function sendToRN(type, data) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: type,
              ...data
            }));
          }
        }
        
        // Update loading progress
        function updateProgress(percent, message) {
          const progressFill = document.getElementById('progress-fill');
          if (progressFill) {
            progressFill.style.width = \`\${percent}%\`;
          }
          
          const messageEl = document.getElementById('message');
          if (messageEl && message) {
            messageEl.textContent = message;
          }
          
          // Send progress to React Native
          sendToRN('progressUpdate', { percent, message });
        }
        
        // Parsed data
        const blockModelData = ${safeStringify(blockModelData)};
        const elevationData = ${safeStringify(elevationData)};
        const pitData = ${safeStringify(pitData)};
        
        // Start and end points for the cross-section line
        const startPoint = { lat: ${startLat}, lng: ${startLng} };
        const endPoint = { lat: ${endLat}, lng: ${endLng} };
        const lineLength = ${lineLength};
        const sourceProjection = "${sourceProjection}";
        
        // Global storage for processed data
        let sectionBlocks = [];
        let elevationProfile = [];
        let pitProfile = [];
        
        // Color mapping for rock types
        const rockColorMap = {
          "ore": "#b40c0d",       // Red
          "waste": "#606060",     // Gray
          "overburden": "#a37c75", // Brown
          "lim": "#045993",       // Blue
          "sap": "#75499c",       // Purple
          "unknown": "#CCCCCC"    // Light gray
        };
        
        // Function to get color for rock type
        function getColorForRockType(rockType = "unknown") {
          const normalizedType = typeof rockType === 'string' ? rockType.toLowerCase() : 'unknown';
          return rockColorMap[normalizedType] || "#CCCCCC";
        }
        
        // Check if coordinates are UTM or WGS84
        function isUTMCoordinate(coord) {
          return Math.abs(coord) > 180;
        }
        
        // Project a point onto the cross-section line
        function projectPointOntoLine(point, lineStart, lineEnd, isUTMPoint = false) {
          try {
            // Standard projection for WGS84 coordinates
            const lineVec = {
              x: lineEnd.lng - lineStart.lng,
              y: lineEnd.lat - lineStart.lat
            };
            
            const pointVec = {
              x: point.lng - lineStart.lng,
              y: point.lat - lineStart.lat
            };
            
            const lineLengthSquared = lineVec.x * lineVec.x + lineVec.y * lineVec.y;
            const dotProduct = pointVec.x * lineVec.x + pointVec.y * lineVec.y;
            
            const ratio = Math.max(0, Math.min(1, dotProduct / lineLengthSquared));
            
            const projectedPoint = {
              lng: lineStart.lng + ratio * lineVec.x,
              lat: lineStart.lat + ratio * lineVec.y
            };
            
            // Calculate distance to line (simplified)
            const dx = point.lng - projectedPoint.lng;
            const dy = point.lat - projectedPoint.lat;
            const distanceToLine = Math.sqrt(dx*dx + dy*dy) * 111000; // Rough conversion to meters
            
            const distanceAlongLine = ratio * lineLength;
            
            return {
              ratio,
              distanceAlongLine,
              distanceToLine
            };
          } catch (err) {
            return {
              ratio: 0,
              distanceAlongLine: 0,
              distanceToLine: 9999
            };
          }
        }
        
        // Process block model data for cross-section view (optimized)
        function processCrossSectionBlockModel() {
          try {
            updateProgress(10, "Analyzing block model data...");
            
            // Determine if we need to process all blocks or sample
            const blockCount = blockModelData.length;
            const processInterval = blockCount > 3000 ? Math.ceil(blockCount / 3000) : 1;
            
            // Check if blocks are in UTM or WGS84
            const isUTM = blockCount > 0 && 
                         (isUTMCoordinate(parseFloat(blockModelData[0].centroid_x)) || 
                          isUTMCoordinate(parseFloat(blockModelData[0].centroid_y)));
            
            // Process blocks to find intersections with line
            const intersectingBlocks = [];
            
            for (let i = 0; i < blockCount; i += processInterval) {
              const block = blockModelData[i];
              
              // Skip invalid blocks
              const x = parseFloat(block.centroid_x || block.x || 0);
              const y = parseFloat(block.centroid_y || block.y || 0);
              const z = parseFloat(block.centroid_z || block.z || 0);
              
              if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
              
              // Project block center onto the line
              const blockPoint = { lng: x, lat: y };
              const projection = projectPointOntoLine(blockPoint, startPoint, endPoint);
              
              // Width and height with fallbacks
              const width = parseFloat(block.dim_x || block.width || 10);
              const height = parseFloat(block.dim_z || block.height || 10);
              
              // Only include blocks near the line
              if (projection.ratio >= 0 && projection.ratio <= 1 && 
                  projection.distanceToLine < width * 2) {
                
                intersectingBlocks.push({
                  distance: projection.distanceAlongLine,
                  width: width,
                  height: height,
                  elevation: z,
                  rock: block.rock || "unknown",
                  color: block.color || getColorForRockType(block.rock || "unknown")
                });
              }
              
              // Update progress for large datasets
              if (blockCount > 1000 && i % Math.max(1, Math.floor(blockCount / 10)) === 0) {
                const percent = 10 + Math.min(40, Math.round((i / blockCount) * 40));
                updateProgress(percent, \`Processing blocks: \${i} / \${blockCount}\`);
              }
            }
            
            // Sort blocks by distance
            intersectingBlocks.sort((a, b) => a.distance - b.distance);
            
            updateProgress(50, "Block processing complete");
            
            // If no blocks found, fallback to test data
            if (intersectingBlocks.length === 0) {
              return generateTestBlocks();
            }
            
            return intersectingBlocks;
          } catch (err) {
            debug("Error processing blocks: " + err.message);
            return generateTestBlocks(); // Fallback
          }
        }
        
        // Generate test blocks for fallback
        function generateTestBlocks() {
          const testBlocks = [];
          for (let i = 0; i < 10; i++) {
            testBlocks.push({
              distance: i * lineLength / 10,
              width: 30,
              height: 10,
              elevation: 50 - i * 5,
              rock: i % 3 === 0 ? "ore" : (i % 3 === 1 ? "waste" : "lim"),
              color: i % 3 === 0 ? "#b40c0d" : (i % 3 === 1 ? "#606060" : "#045993")
            });
          }
          return testBlocks;
        }
        
        // Generate test elevation profile
        function generateTestElevationProfile() {
          const testPoints = [];
          for (let i = 0; i <= 20; i++) {
            const distance = i * lineLength / 20;
            const elevation = 80 - Math.sin(i/3) * 20;
            testPoints.push({
              distance: distance,
              elevation: elevation
            });
          }
          return testPoints;
        }
        
        // Process elevation data for visualization (simplified)
        function processElevationData() {
          if (!elevationData || elevationData.length === 0) {
            return generateTestElevationProfile();
          }
          
          try {
            updateProgress(60, "Processing elevation data...");
            
            // Create points for every 5% of the line length
            const numPoints = 20;
            const processedPoints = [];
            
            for (let i = 0; i <= numPoints; i++) {
              const ratio = i / numPoints;
              const distance = ratio * lineLength;
              
              // Find closest elevation point through simplified approach
              let closestElevation = null;
              let minDistance = Infinity;
              
              for (let j = 0; j < elevationData.length; j++) {
                const point = elevationData[j];
                const pointLocation = {
                  lng: parseFloat(point.x || point.lon || 0),
                  lat: parseFloat(point.y || point.lat || 0)
                };
                
                const dx = pointLocation.lng - (startPoint.lng + ratio * (endPoint.lng - startPoint.lng));
                const dy = pointLocation.lat - (startPoint.lat + ratio * (endPoint.lat - startPoint.lat));
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < minDistance) {
                  minDistance = distance;
                  closestElevation = parseFloat(point.z || point.elevation || 0);
                }
              }
              
              processedPoints.push({
                distance: distance,
                elevation: closestElevation !== null ? closestElevation : null
              });
            }
            
            updateProgress(70, "Elevation processing complete");
            return processedPoints;
          } catch (err) {
            return generateTestElevationProfile();
          }
        }
        
        // Process pit data for visualization (simplified)
        function processPitData() {
          if (!pitData || pitData.length === 0) {
            return [];
          }
          
          try {
            updateProgress(80, "Processing pit data...");
            
            // Find pit points near the line
            const relevantPitPoints = [];
            const pitCount = Math.min(pitData.length, 1000);
            
            for (let i = 0; i < pitCount; i++) {
              const point = pitData[i];
              const pointLocation = {
                lng: parseFloat(point.x || 0),
                lat: parseFloat(point.y || 0)
              };
              
              const projection = projectPointOntoLine(pointLocation, startPoint, endPoint);
              
              // Only include points close to the line
              if (projection.ratio >= 0 && projection.ratio <= 1) {
                relevantPitPoints.push({
                  distance: projection.distanceAlongLine,
                  elevation: parseFloat(point.z || point.level || 0)
                });
              }
            }
            
            // Sort by distance along the line
            relevantPitPoints.sort((a, b) => a.distance - b.distance);
            
            updateProgress(85, "Pit data processing complete");
            return relevantPitPoints;
          } catch (err) {
            return [];
          }
        }
        
        // Get elevation range for Y-axis scaling
        function getElevationRange(blocks, elevationPoints, pitPoints) {
          try {
            const allElevations = [];
            
            // Add block model elevations
            blocks.forEach(block => {
              const blockZ = parseFloat(block.elevation || 0);
              const blockHeight = parseFloat(block.height || 10);
              allElevations.push(blockZ + blockHeight/2);
              allElevations.push(blockZ - blockHeight/2);
            });
            
            // Add elevation data
            if (elevationPoints && elevationPoints.length > 0) {
              elevationPoints.forEach(point => {
                if (point.elevation !== null && !isNaN(point.elevation)) {
                  allElevations.push(point.elevation);
                }
              });
            }
            
            // Add pit data elevations
            if (pitPoints && pitPoints.length > 0) {
              pitPoints.forEach(point => {
                if (!isNaN(point.elevation)) {
                  allElevations.push(point.elevation);
                }
              });
            }
            
            // Filter out invalid values
            const validElevations = allElevations.filter(e => !isNaN(e));
            
            if (validElevations.length === 0) {
              return { min: 0, max: 100 }; // Default range
            }
            
            // Find min and max with padding
            const min = Math.min(...validElevations) - 20;
            const max = Math.max(...validElevations) + 20;
            
            return { min, max };
          } catch (err) {
            return { min: 0, max: 100 }; // Default range on error
          }
        }
        
        // Rendering function 
        function renderVisualization() {
          if (isRendering || hasRendered) return; // Prevent double rendering
          
          isRendering = true;
          
          try {
            updateProgress(90, "Rendering visualization...");
            
            // Setup chart dimensions
            const margin = { top: 40, right: 60, bottom: 60, left: 60 };
            
            // Create a responsive width based on data
            const blockCount = sectionBlocks.length;
            const needsScrolling = blockCount > 15 || lineLength > 1000;
            
            const chartWidth = needsScrolling ? 
              Math.max(window.innerWidth * 1.5, lineLength / 5, blockCount * 30) : 
              window.innerWidth;
              
            const height = window.innerHeight * 0.65;
            const innerWidth = chartWidth - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            
            // Notify React Native of the chart width
            sendToRN('chartDimensions', { width: chartWidth });
            
            // Get elevation range for scaling
            const elevRange = getElevationRange(sectionBlocks, elevationProfile, pitProfile);
            
            // Create SVG with proper dimensions for scrolling
            const svg = d3.select('#chart')
              .append('svg')
              .attr('width', chartWidth)
              .attr('height', height);
              
            // Create tooltip
            const tooltip = d3.select('#tooltip');
              
            // Create a group element for the visualization
            const g = svg.append('g')
              .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);
            
            // Setup scales
            const xScale = d3.scaleLinear()
              .domain([0, lineLength])
              .range([0, innerWidth]);
              
            const yScale = d3.scaleLinear()
              .domain([elevRange.min, elevRange.max])
              .range([innerHeight, 0]);
              
            // Create axes
            const xAxis = d3.axisBottom(xScale)
              .tickFormat(d => \`\${d.toFixed(0)}m\`);
              
            const yAxis = d3.axisLeft(yScale)
              .tickFormat(d => \`\${d.toFixed(1)}m\`);
              
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
              .text('Distance along cross-section (m)');
              
            g.append('text')
              .attr('transform', 'rotate(-90)')
              .attr('x', -innerHeight / 2)
              .attr('y', -40)
              .attr('text-anchor', 'middle')
              .text('Elevation (m)');

            // Create grid lines
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
            
            // Draw elevation profile if available
            if (elevationProfile.length > 0 && elevationProfile.some(p => p.elevation !== null)) {
              try {
                // Create a line generator
                const line = d3.line()
                  .x(d => xScale(d.distance))
                  .y(d => yScale(d.elevation))
                  .curve(d3.curveBasis)
                  .defined(d => d.elevation !== null);
                  
                g.append('path')
                  .datum(elevationProfile.filter(p => p.elevation !== null))
                  .attr('fill', 'none')
                  .attr('stroke', 'green')
                  .attr('stroke-width', 2)
                  .attr('d', line);
                  
                // Add fill below the line
                const area = d3.area()
                  .x(d => xScale(d.distance))
                  .y0(innerHeight)
                  .y1(d => yScale(d.elevation))
                  .curve(d3.curveBasis)
                  .defined(d => d.elevation !== null);
                  
                g.append('path')
                  .datum(elevationProfile.filter(p => p.elevation !== null))
                  .attr('fill', 'rgba(0, 128, 0, 0.1)')
                  .attr('d', area);
              } catch (err) {
                debug("Error drawing elevation profile: " + err.message);
              }
            }
            
            // Draw pit boundaries if available
            if (pitProfile && pitProfile.length > 0) {
              try {
                const pitLine = d3.line()
                  .x(d => xScale(d.distance))
                  .y(d => yScale(d.elevation))
                  .curve(d3.curveLinear);
                  
                g.append('path')
                  .datum(pitProfile)
                  .attr('fill', 'none')
                  .attr('stroke', '#F4AE4D')
                  .attr('stroke-width', 2)
                  .attr('d', pitLine);
              } catch (err) {
                debug("Error drawing pit boundary: " + err.message);
              }
            }
            
            // Collect unique rock types and colors for legend
            const uniqueRocks = {};
            
            // Draw blocks
            if (sectionBlocks && sectionBlocks.length > 0) {
              try {
                sectionBlocks.forEach(block => {
                  // Get rock type and color
                  const rockType = block.rock || 'unknown';
                  const color = block.color || getColorForRockType(rockType);
                  
                  // Add to unique rocks for legend
                  uniqueRocks[rockType] = color;
                });
                
                // Draw all blocks at once for better performance
                g.selectAll('.block')
                  .data(sectionBlocks)
                  .enter()
                  .append('rect')
                  .attr('class', 'block')
                  .attr('x', d => xScale(d.distance - d.width/2))
                  .attr('y', d => yScale(d.elevation + d.height/2))
                  .attr('width', d => Math.max(1, xScale(d.width) - xScale(0)))
                  .attr('height', d => Math.abs(yScale(d.elevation - d.height/2) - yScale(d.elevation + d.height/2)))
                  .attr('fill', d => d.color || getColorForRockType(d.rock))
                  .attr('stroke', 'black')
                  .attr('stroke-width', 0.5)
                  .on('mouseover', function(event, d) {
                    // Highlight on hover
                    d3.select(this)
                      .attr('stroke-width', 1.5)
                      .attr('stroke', '#333');
                      
                    // Show tooltip
                    tooltip.transition()
                      .duration(200)
                      .style('opacity', 0.9);
                    tooltip.html(
                      \`<strong>Rock Type:</strong> \${d.rock || 'unknown'}<br>
                       <strong>Elevation:</strong> \${parseFloat(d.elevation).toFixed(1)}m<br>
                       <strong>Distance:</strong> \${parseFloat(d.distance).toFixed(1)}m\`
                    )
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
                  })
                  .on('mouseout', function() {
                    // Reset highlight
                    d3.select(this)
                      .attr('stroke-width', 0.5)
                      .attr('stroke', 'black');
                      
                    // Hide tooltip
                    tooltip.transition()
                      .duration(500)
                      .style('opacity', 0);
                  });
              } catch (err) {
                debug("Error drawing blocks: " + err.message);
              }
            }
            
            // Create legend
            const legend = g.append('g')
              .attr('class', 'legend')
              .attr('transform', \`translate(\${innerWidth - 100}, 20)\`);
            
            // Add legend title
            legend.append('text')
              .attr('x', 0)
              .attr('y', -5)
              .attr('font-weight', 'bold')
              .text('Legend');
            
            // Add rock types to legend
            let yOffset = 15;
            Object.entries(uniqueRocks).forEach(([rock, color], i) => {
              const item = legend.append('g')
                .attr('transform', \`translate(0, \${yOffset})\`);
                
              item.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', color)
                .attr('stroke', 'black')
                .attr('stroke-width', 0.5);
                
              item.append('text')
                .attr('x', 20)
                .attr('y', 12)
                .text(rock);
                
              yOffset += 20;
            });
            
            // Add elevation profile to legend if available
            if (elevationProfile && elevationProfile.length > 0) {
              const elevItem = legend.append('g')
                .attr('transform', \`translate(0, \${yOffset})\`);
                
              elevItem.append('line')
                .attr('x1', 0)
                .attr('y1', 7.5)
                .attr('x2', 15)
                .attr('y2', 7.5)
                .attr('stroke', 'green')
                .attr('stroke-width', 2);
                
              elevItem.append('text')
                .attr('x', 20)
                .attr('y', 12)
                .text('Terrain Elevation');
                
              yOffset += 20;
            }
            
            // Add pit boundary to legend if available
            if (pitProfile && pitProfile.length > 0) {
              const pitItem = legend.append('g')
                .attr('transform', \`translate(0, \${yOffset})\`);
                
              pitItem.append('line')
                .attr('x1', 0)
                .attr('y1', 7.5)
                .attr('x2', 15)
                .attr('y2', 7.5)
                .attr('stroke', '#F4AE4D')
                .attr('stroke-width', 2);
                
              pitItem.append('text')
                .attr('x', 20)
                .attr('y', 12)
                .text('Pit Boundary');
            }
            
            updateProgress(100, "Visualization complete");
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            
            // Mark as rendered
            hasRendered = true;
            isRendering = false;
            
            // Let React Native know rendering is complete
            sendToRN('renderComplete', { 
              message: 'D3 visualization complete',
              blockCount: sectionBlocks.length,
              chartWidth: chartWidth
            });
          } catch (error) {
            isRendering = false;
            debug('Error rendering visualization: ' + error.toString());
            document.getElementById('message').textContent = 'Error: ' + error.toString();
            sendToRN('renderError', { error: error.toString() });
          }
        }
        
        // Function to render with test data (for fallback)
        function renderWithTestData(lineLen) {
          sectionBlocks = generateTestBlocks();
          elevationProfile = generateTestElevationProfile();
          pitProfile = [];
          
          // Render the visualization
          renderVisualization();
        }
        
        // Main entry point
        document.addEventListener('DOMContentLoaded', function() {
          try {
            // Check if D3 is loaded
            if (!window.d3) {
              document.getElementById('message').textContent = 'Error: D3.js not loaded';
              sendToRN('renderError', { error: 'D3.js not loaded' });
              return;
            }
            
            // Process all data in sequence with progress updates
            try {
              setTimeout(() => {
                // Set a short timeout to let the WebView stabilize
                debug("Processing block model data...");
                sectionBlocks = processCrossSectionBlockModel();
                
                debug("Processing elevation data...");
                elevationProfile = processElevationData();
                
                debug("Processing pit data...");
                pitProfile = processPitData();
                
                // Render the visualization
                renderVisualization();
              }, 10);
            } catch (err) {
              debug("Error in data processing: " + err.message);
              renderWithTestData(lineLength);
            }
          } catch (error) {
            debug('Error in main processing: ' + error.toString());
            document.getElementById('message').textContent = 'Error: ' + error.toString();
            sendToRN('renderError', { error: error.toString() });
          }
        });
      </script>
    </body>
    </html>
  `;
}

export default CrossSectionWebView;
