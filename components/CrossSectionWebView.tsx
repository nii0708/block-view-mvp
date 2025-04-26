import React, { useState, useRef, useEffect } from "react";
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
    "Loading cross section..."
  );
  const [error, setError] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState<number>(0);
  const webViewRef = useRef<WebView>(null);

  // Log data for debugging
  useEffect(() => {
    console.log("CrossSectionWebView props:", {
      blockModelCount: blockModelData?.length || 0,
      elevationCount: elevationData?.length || 0,
      pitCount: pitData?.length || 0,
      startPoint: { lat: startLat, lng: startLng },
      endPoint: { lat: endLat, lng: endLng },
      lineLength,
    });

    // Log first few items of each dataset
    if (blockModelData?.length > 0) {
      console.log("Sample block model data:", blockModelData.slice(0, 2));
    }
  }, [blockModelData, elevationData, pitData]);

  // Preprocess blockModelData to sample or limit it
  const getOptimizedBlockData = () => {
    try {
      if (!blockModelData || blockModelData.length === 0) return [];

      // If we have a very large dataset, sample it
      if (blockModelData.length > 3000) {
        console.log(
          `Sampling block model data from ${blockModelData.length} to 3000 blocks`
        );

        // Option 1: Simple random sampling
        // return blockModelData.sort(() => 0.5 - Math.random()).slice(0, 3000);

        // Option 2: Systematic sampling (take every Nth block)
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
  };

  // Safely stringify data
  const safeStringify = (data: any) => {
    try {
      return JSON.stringify(data || []);
    } catch (e) {
      console.error("Error stringifying data:", e);
      return "[]";
    }
  };

  // Generate simpler test data for debugging
  const generateTestData = () => {
    const testBlocks = [];
    // Create some test blocks along the cross-section line
    for (let i = 0; i < 10; i++) {
      const ratio = i / 10;
      const lng = startLng + ratio * (endLng - startLng);
      const lat = startLat + ratio * (endLat - startLat);

      // Alternate between ore, waste, and lim rock types
      const rockType = i % 3 === 0 ? "ore" : i % 3 === 1 ? "waste" : "lim";
      const color =
        i % 3 === 0 ? "#b40c0d" : i % 3 === 1 ? "#606060" : "#045993";

      testBlocks.push({
        centroid_x: lng,
        centroid_y: lat,
        centroid_z: 50 - i * 5,
        dim_x: 10,
        dim_y: 10,
        dim_z: 10,
        rock: rockType,
        color: color,
      });
    }
    return testBlocks;
  };

  // D3 implementation with progressive loading and performance optimizations
  const generateD3Html = () => {
    // Optimize block model data before sending to WebView
    const optimizedBlockData = getOptimizedBlockData();
    console.log(`Sending ${optimizedBlockData.length} blocks to WebView`);

    // Use test data for fallback if needed
    const useTestData = optimizedBlockData.length === 0;
    const dataBlocks = useTestData ? generateTestData() : optimizedBlockData;

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
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f8f8f8;
          overflow: hidden;
          touch-action: pan-y;
        }
        .header {
          background-color: white;
          padding: 15px;
          border-bottom: 1px solid #ddd;
          position: sticky;
          top: 0;
          z-index: 10;
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
        #chart-container {
          width: 100%;
          height: 70vh;
          overflow-x: auto;
          overflow-y: hidden;
          background-color: white;
          border-top: 1px solid #ddd;
          -webkit-overflow-scrolling: touch;
        }
        #chart {
          height: 100%;
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
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Cross Section View</h1>
        <div class="info">
          <div>Start: ${startLat.toFixed(6)}, ${startLng.toFixed(6)}</div>
          <div>End: ${endLat.toFixed(6)}, ${endLng.toFixed(6)}</div>
          <div>Length: ${lineLength.toFixed(1)} meters</div>
        </div>
      </div>
      
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
        // For debug logging
        function debug(message) {
          console.log(message);
          
          // Send to React Native for logging
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'debug',
              message: message
            }));
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
        
        // Setup a timeout to prevent infinite processing
        const processTimeout = setTimeout(() => {
          if (document.getElementById('loading').style.display !== 'none') {
            debug("Processing timeout reached, using fallback data");
            document.getElementById('message').textContent = 'Taking too long, using simplified data...';
            
            // Force rendering with simplified data
            sectionBlocks = generateTestBlocks();
            elevationProfile = generateTestElevationProfile();
            pitProfile = [];
            
            // Render the visualization
            setTimeout(renderVisualization, 500);
          }
        }, 20000); // 20 second timeout
        
        // Parsed data
        const blockModelData = ${safeStringify(dataBlocks)};
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
        
        // Color mapping for rock types - match the colors used in top-down view
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
            // If we're dealing with UTM coordinates but the line is in WGS84
            if (isUTMPoint) {
              // Calculate UTM bounds
              let utmMinX = Infinity, utmMaxX = -Infinity;
              let utmMinY = Infinity, utmMaxY = -Infinity;
              
              // Sample a subset of blocks for bounds calculation
              const sampleSize = Math.min(blockModelData.length, 1000);
              for (let i = 0; i < sampleSize; i++) {
                const block = blockModelData[i];
                const x = parseFloat(block.centroid_x);
                const y = parseFloat(block.centroid_y);
                
                if (!isNaN(x) && !isNaN(y)) {
                  utmMinX = Math.min(utmMinX, x);
                  utmMaxX = Math.max(utmMaxX, x);
                  utmMinY = Math.min(utmMinY, y);
                  utmMaxY = Math.max(utmMaxY, y);
                }
              }
              
              // Calculate relative position in UTM space
              const relX = (point.x - utmMinX) / (utmMaxX - utmMinX);
              const relY = (point.y - utmMinY) / (utmMaxY - utmMinY);
              
              // Use position to determine distance along line
              // This is a simplified approach
              const ratio = (relX + relY) / 2;
              const distance = ratio * lineLength;
              
              return {
                ratio,
                distanceAlongLine: distance,
                distanceToLine: 0  // Simplified
              };
            }
            
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
            console.error("Error in projection:", err.message);
            return {
              ratio: 0,
              distanceAlongLine: 0,
              distanceToLine: 9999
            };
          }
        }
        
        // Process block model data for cross-section view
        function processCrossSectionBlockModel() {
          try {
            updateProgress(10, "Analyzing block model data...");
            debug("Processing block model data for cross-section...");
            
            // Check if blocks are in UTM or WGS84
            const isUTM = blockModelData.length > 0 && 
                         (isUTMCoordinate(parseFloat(blockModelData[0].centroid_x)) || 
                          isUTMCoordinate(parseFloat(blockModelData[0].centroid_y)));
            
            debug(\`Block model appears to be in \${isUTM ? 'UTM' : 'WGS84'} coordinates\`);
            updateProgress(20, \`Processing \${blockModelData.length} blocks...\`);
            
            // Determine the maximum number of blocks to process for performance
            const maxBlocks = isUTM ? blockModelData.length : 3000;
            const processInterval = Math.max(1, Math.ceil(blockModelData.length / maxBlocks));
            
            // Process blocks to find intersections with line
            const intersectingBlocks = [];
            let processedCount = 0;
            
            for (let i = 0; i < blockModelData.length; i += processInterval) {
              const block = blockModelData[i];
              
              // Get block information
              const x = parseFloat(block.centroid_x);
              const y = parseFloat(block.centroid_y);
              const z = parseFloat(block.centroid_z);
              const width = parseFloat(block.dim_x) || 10;
              const height = parseFloat(block.dim_z) || 10;
              
              // Skip invalid blocks
              if (isNaN(x) || isNaN(y) || isNaN(z)) {
                continue;
              }
              
              // For UTM projection, use a different approach
              if (isUTM) {
                // Project block center onto the line
                const projection = projectPointOntoLine(
                  { x, y }, 
                  startPoint, 
                  endPoint,
                  true // Flag that this is a UTM point
                );
                
                // Only include blocks that are along the line segment
                if (projection.ratio >= 0 && projection.ratio <= 1) {
                  intersectingBlocks.push({
                    ...block,
                    distance: projection.distanceAlongLine,
                    width: width,
                    height: height,
                    elevation: z,
                    rock: block.rock || "unknown",
                    color: block.color || getColorForRockType(block.rock)
                  });
                }
              } else {
                // For WGS84 coordinates, use direct projection
                const blockPoint = { lng: x, lat: y };
                const projection = projectPointOntoLine(blockPoint, startPoint, endPoint);
                
                // Add the block if it's close enough to the line
                if (projection.ratio >= 0 && projection.ratio <= 1 && 
                    projection.distanceToLine < width * 2) {
                  intersectingBlocks.push({
                    ...block,
                    distance: projection.distanceAlongLine,
                    width: width,
                    height: height,
                    elevation: z,
                    rock: block.rock || "unknown",
                    color: block.color || getColorForRockType(block.rock)
                  });
                }
              }
              
              // Update progress periodically
              processedCount++;
              if (processedCount % Math.max(1, Math.floor(blockModelData.length / 10)) === 0) {
                const percent = 20 + Math.min(40, Math.round((processedCount / blockModelData.length) * 40));
                updateProgress(percent, \`Processing blocks: \${processedCount} / \${blockModelData.length}\`);
              }
            }
            
            debug(\`Found \${intersectingBlocks.length} blocks intersecting with cross-section line\`);
            updateProgress(60, \`Found \${intersectingBlocks.length} blocks for cross-section\`);
            
            // If no blocks found, fall back to test blocks
            if (intersectingBlocks.length === 0) {
              debug("No blocks found, using test blocks");
              return generateTestBlocks();
            }
            
            // Optimize the number of blocks if there are too many
            let optimizedBlocks = intersectingBlocks;
            if (intersectingBlocks.length > 500) {
              debug(\`Optimizing: reducing from \${intersectingBlocks.length} to 500 blocks\`);
              const interval = Math.ceil(intersectingBlocks.length / 500);
              optimizedBlocks = intersectingBlocks.filter((_, i) => i % interval === 0);
            }
            
            // Sort blocks by distance along the line
            optimizedBlocks.sort((a, b) => a.distance - b.distance);
            
            updateProgress(70, "Block processing complete");
            return optimizedBlocks;
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
        
        // Calculate min and max elevations for Y-axis scaling
        function getElevationRange(blocks, elevationPoints, pitPoints) {
          try {
            const allElevations = [];
            
            // Add block model elevations
            blocks.forEach(block => {
              const blockZ = parseFloat(block.elevation || block.centroid_z || 0);
              const blockHeight = parseFloat(block.height || block.dim_z || 10);
              const top = blockZ + blockHeight/2;
              const bottom = blockZ - blockHeight/2;
              
              if (!isNaN(top)) allElevations.push(top);
              if (!isNaN(bottom)) allElevations.push(bottom);
            });
            
            // Add elevation data
            if (elevationPoints && elevationPoints.length > 0) {
              elevationPoints.forEach(point => {
                if (point.z !== undefined && !isNaN(point.z)) {
                  allElevations.push(parseFloat(point.z));
                } else if (point.elevation !== undefined && !isNaN(point.elevation)) {
                  allElevations.push(parseFloat(point.elevation));
                }
              });
            }
            
            // Add pit data elevations
            if (pitPoints && pitPoints.length > 0) {
              pitPoints.forEach(point => {
                if (point.z !== undefined && !isNaN(point.z)) {
                  allElevations.push(parseFloat(point.z));
                } else if (point.level !== undefined && !isNaN(point.level)) {
                  allElevations.push(parseFloat(point.level));
                }
              });
            }
            
            // Filter out invalid values
            const validElevations = allElevations.filter(e => !isNaN(e));
            
            if (validElevations.length === 0) {
              debug("No valid elevations found, using default range");
              return { min: 0, max: 100 }; // Default range
            }
            
            // Find min and max with padding
            const min = Math.min(...validElevations) - 20;
            const max = Math.max(...validElevations) + 20;
            
            debug(\`Elevation range: \${min.toFixed(1)} to \${max.toFixed(1)}\`);
            return { min, max };
          } catch (err) {
            debug("Error getting elevation range: " + err.message);
            return { min: 0, max: 100 }; // Default range on error
          }
        }
        
        // Process elevation data for visualization
        function processElevationData() {
          if (!elevationData || elevationData.length === 0) {
            debug("No elevation data to process");
            return generateTestElevationProfile();
          }
          
          try {
            updateProgress(75, "Processing elevation data...");
            
            // Create points for every 5% of the line length
            const numPoints = 20;
            const processedPoints = [];
            
            for (let i = 0; i <= numPoints; i++) {
              const ratio = i / numPoints;
              const distance = ratio * lineLength;
              
              // Find closest elevation points and interpolate
              let closestElevation = null;
              let minDistance = Infinity;
              
              elevationData.forEach(point => {
                const pointLocation = {
                  lng: parseFloat(point.x || point.lon || 0),
                  lat: parseFloat(point.y || point.lat || 0)
                };
                
                const projection = projectPointOntoLine(pointLocation, startPoint, endPoint);
                const distanceFromRatio = Math.abs(projection.ratio - ratio);
                
                if (distanceFromRatio < minDistance) {
                  minDistance = distanceFromRatio;
                  closestElevation = parseFloat(point.z || point.elevation || 0);
                }
              });
              
              processedPoints.push({
                distance: distance,
                elevation: closestElevation !== null ? closestElevation : null
              });
            }
            
            debug(\`Processed \${processedPoints.length} elevation points\`);
            return processedPoints;
          } catch (err) {
            debug("Error processing elevation data: " + err.message);
            return generateTestElevationProfile();
          }
        }
        
        // Generate test elevation profile
        function generateTestElevationProfile() {
          const testPoints = [];
          for (let i = 0; i <= 20; i++) {
            const distance = i * lineLength / 20;
            // Create a simple terrain profile
            const elevation = 80 - Math.sin(i/3) * 20;
            testPoints.push({
              distance: distance,
              elevation: elevation
            });
          }
          debug("Generated test elevation profile");
          return testPoints;
        }
        
        // Process pit data for visualization
        function processPitData() {
          if (!pitData || pitData.length === 0) {
            debug("No pit data to process");
            return [];
          }
          
          try {
            updateProgress(85, "Processing pit data...");
            
            // Find pit points near the line
            const relevantPitPoints = [];
            
            pitData.forEach(point => {
              const pointLocation = {
                lng: parseFloat(point.x || 0),
                lat: parseFloat(point.y || 0)
              };
              
              const projection = projectPointOntoLine(pointLocation, startPoint, endPoint);
              
              // Only include points close to the line
              if (projection.ratio >= 0 && projection.ratio <= 1) {
                relevantPitPoints.push({
                  ...point,
                  distance: projection.distanceAlongLine,
                  elevation: parseFloat(point.z || point.level || 0)
                });
              }
            });
            
            // Sort by distance along the line
            relevantPitPoints.sort((a, b) => a.distance - b.distance);
            
            debug(\`Processed \${relevantPitPoints.length} pit points\`);
            return relevantPitPoints;
          } catch (err) {
            debug("Error processing pit data: " + err.message);
            return [];
          }
        }
        
        // Rendering function (separated for progressive loading)
        function renderVisualization() {
          try {
            updateProgress(90, "Rendering visualization...");
            
            // Clear any existing timeout
            clearTimeout(processTimeout);
            
            // Setup chart dimensions
            const margin = { top: 40, right: 60, bottom: 60, left: 60 };
            
            // Decide if we need horizontal scrolling
            const blockCount = sectionBlocks.length;
            const needsScrolling = blockCount > 15 || lineLength > 1000;
            
            // Calculate width for the chart
            const chartWidth = needsScrolling ? 
              Math.max(window.innerWidth * 1.5, lineLength / 5, blockCount * 30) : 
              window.innerWidth;
              
            const height = window.innerHeight * 0.65;
            const innerWidth = chartWidth - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            
            // Notify React Native of the chart width
            sendToRN('chartDimensions', { width: chartWidth });
            
            // Get elevation range for scaling
            const elevRange = getElevationRange(sectionBlocks, elevationData, pitData);
            
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
              
            updateProgress(92, "Drawing terrain elevation...");
            
            // Draw elevation profile if available
            if (elevationProfile.length > 0 && elevationProfile.some(p => p.elevation !== null)) {
              try {
                // Create a line generator
                const line = d3.line()
                  .x(d => xScale(d.distance))
                  .y(d => yScale(d.elevation))
                  .curve(d3.curveBasis)
                  .defined(d => d.elevation !== null); // Skip null elevations
                  
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
                  .defined(d => d.elevation !== null); // Skip null elevations
                  
                g.append('path')
                  .datum(elevationProfile.filter(p => p.elevation !== null))
                  .attr('fill', 'rgba(0, 128, 0, 0.1)')
                  .attr('d', area);
              } catch (err) {
                debug("Error drawing elevation profile: " + err.message);
              }
            }
            
            updateProgress(94, "Drawing pit boundaries...");
            
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
            
            updateProgress(96, "Drawing blocks...");
            
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
                
                // Draw blocks - use optimized rendering for large datasets
                const blockSelection = g.selectAll('.block')
                  .data(sectionBlocks);
                
                blockSelection.enter()
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
            
            updateProgress(98, "Creating legend...");
            
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
            
            // Let React Native know rendering is complete
            sendToRN('renderComplete', { 
              message: 'D3 visualization complete',
              blockCount: sectionBlocks.length,
              chartWidth: chartWidth
            });
          } catch (error) {
            debug('Error rendering visualization: ' + error.toString());
            document.getElementById('message').textContent = 'Error: ' + error.toString();
            sendToRN('renderError', { error: error.toString() });
          }
        }
        
        // Main entry point
        document.addEventListener('DOMContentLoaded', async function() {
          try {
            debug('D3.js visualization starting');
            
            // Check if D3 is loaded
            if (!window.d3) {
              document.getElementById('message').textContent = 'Error: D3.js not loaded';
              sendToRN('renderError', { error: 'D3.js not loaded' });
              return;
            }
            
            // Process all data in sequence with progress updates
            try {
              debug("Processing block model data...");
              sectionBlocks = processCrossSectionBlockModel();
              debug(\`Processed \${sectionBlocks.length} blocks for cross-section\`);
              
              debug("Processing elevation data...");
              elevationProfile = processElevationData();
              
              debug("Processing pit data...");
              pitProfile = processPitData();
              
              // Render the visualization
              renderVisualization();
            } catch (err) {
              debug("Error in data processing: " + err.message);
              // Use fallback data
              sectionBlocks = generateTestBlocks();
              elevationProfile = generateTestElevationProfile();
              pitProfile = [];
              
              // Render with fallback data
              renderVisualization();
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
  };

  const d3Html = generateD3Html();

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === "renderComplete") {
        console.log("Render complete message received:", message);
        setLoading(false);
        if (message.chartWidth) {
          setChartWidth(message.chartWidth);
        }
      } else if (message.type === "renderError") {
        setError(message.error);
      } else if (message.type === "debug") {
        // Just log to console, not to UI
        console.log("WebView debug:", message.message);
      } else if (message.type === "chartDimensions") {
        // Update chart dimensions for scrolling
        if (message.width) {
          setChartWidth(message.width);
        }
      } else if (message.type === "progressUpdate") {
        // Update loading progress message
        if (message.message) {
          setLoadingMessage(message.message);
        }
      }
    } catch (e) {
      console.error("Error parsing WebView message:", e);
    }
  };

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
              
              // Generate test blocks
              const testBlocks = [];
              for (let i = 0; i < 10; i++) {
                testBlocks.push({
                  distance: i * ${lineLength} / 10,
                  width: 30,
                  height: 10,
                  elevation: 50 - i * 5,
                  rock: i % 3 === 0 ? "ore" : (i % 3 === 1 ? "waste" : "lim"),
                  color: i % 3 === 0 ? "#b40c0d" : (i % 3 === 1 ? "#606060" : "#045993")
                });
              }
              
              // Generate test elevation profile
              const testElevation = [];
              for (let i = 0; i <= 20; i++) {
                testElevation.push({
                  distance: i * ${lineLength} / 20,
                  elevation: 80 - Math.sin(i/3) * 20
                });
              }
              
              // Use test data
              sectionBlocks = testBlocks;
              elevationProfile = testElevation;
              pitProfile = [];
              
              // Render visualization with test data
              renderVisualization();
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

      {/* Use ScrollView for horizontal scrolling with dynamic width */}
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
          onLoadStart={() => console.log("WebView load starting...")}
          onLoad={() => console.log("WebView loaded successfully!")}
          scrollEnabled={true}
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
