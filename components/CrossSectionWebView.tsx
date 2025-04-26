import React, { useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
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

  // D3 implementation that builds on our working basic view
  const d3Html = `
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
        }
        .header {
          background-color: white;
          padding: 15px;
          border-bottom: 1px solid #ddd;
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
        }
        .block {
          stroke: #000;
          stroke-width: 0.5;
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
      
      <div id="chart"></div>
      
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
        
        // Helper function to log to console and React Native
        function log(message) {
          console.log(message);
          sendToRN('log', { message });
        }
        
        // Parsed data
        const blockModelData = ${safeStringify(blockModelData)};
        const elevationData = ${safeStringify(elevationData)};
        const pitData = ${safeStringify(pitData)};
        
        // Start and end points for the cross-section line
        const startPoint = { lat: ${startLat}, lng: ${startLng} };
        const endPoint = { lat: ${endLat}, lng: ${endLng} };
        const lineLength = ${lineLength};
        
        // Calculate min and max elevations
        function getElevationRange() {
          const allElevations = [];
          
          // Add block model elevations
          blockModelData.forEach(block => {
            if (block.centroid_z !== undefined && !isNaN(block.centroid_z)) {
              allElevations.push(parseFloat(block.centroid_z));
            }
          });
          
          // Add elevation data
          elevationData.forEach(point => {
            if (point.z !== undefined && !isNaN(point.z)) {
              allElevations.push(parseFloat(point.z));
            } else if (point.elevation !== undefined && !isNaN(point.elevation)) {
              allElevations.push(parseFloat(point.elevation));
            }
          });
          
          // Add pit data elevations
          pitData.forEach(point => {
            if (point.z !== undefined && !isNaN(point.z)) {
              allElevations.push(parseFloat(point.z));
            } else if (point.level !== undefined && !isNaN(point.level)) {
              allElevations.push(parseFloat(point.level));
            }
          });
          
          // Filter out any invalid values
          const validElevations = allElevations.filter(e => !isNaN(e));
          
          if (validElevations.length === 0) {
            return { min: 0, max: 100 }; // Default range
          }
          
          // Find min and max with padding
          const min = Math.min(...validElevations) - 10;
          const max = Math.max(...validElevations) + 10;
          
          return { min, max };
        }
        
        // Process elevation data for visualization
        function processElevationData() {
          if (!elevationData || elevationData.length === 0) {
            return [];
          }
          
          return elevationData.map((point, index) => ({
            distance: (index / (elevationData.length - 1)) * lineLength,
            elevation: parseFloat(point.z || point.elevation || 0),
            x: parseFloat(point.x || point.lon || 0),
            y: parseFloat(point.y || point.lat || 0)
          }));
        }
        
        // Process pit data for visualization
        function processPitData() {
          if (!pitData || pitData.length === 0) {
            return [];
          }
          
          return pitData.map((point, index) => ({
            distance: (index / (pitData.length - 1)) * lineLength,
            elevation: parseFloat(point.z || point.level || 0),
            x: parseFloat(point.x || 0),
            y: parseFloat(point.y || 0)
          }));
        }
        
        document.addEventListener('DOMContentLoaded', function() {
          try {
            log('Initializing D3 visualization');
            
            // Setup dimensions
            const margin = { top: 40, right: 40, bottom: 60, left: 60 };
            const width = window.innerWidth;
            const height = window.innerHeight * 0.7;
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            
            // Get elevation range
            const elevRange = getElevationRange();
            log(\`Elevation range: \${elevRange.min} to \${elevRange.max}\`);
            
            // Create SVG
            const svg = d3.select('#chart')
              .append('svg')
              .attr('width', width)
              .attr('height', height);
              
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
              .tickFormat(d => \`\${d}m\`);
              
            const yAxis = d3.axisLeft(yScale)
              .tickFormat(d => \`\${d}m\`);
              
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
              
            // Process elevations for visualization
            const processedElevations = processElevationData();
            const processedPitData = processPitData();
            
            // Draw elevation profile if available
            if (processedElevations.length > 0) {
              // Create a line generator
              const line = d3.line()
                .x(d => xScale(d.distance))
                .y(d => yScale(d.elevation))
                .curve(d3.curveBasis);
                
              g.append('path')
                .datum(processedElevations)
                .attr('fill', 'none')
                .attr('stroke', 'green')
                .attr('stroke-width', 2)
                .attr('d', line);
                
              // Add fill below the line
              const area = d3.area()
                .x(d => xScale(d.distance))
                .y0(innerHeight)
                .y1(d => yScale(d.elevation))
                .curve(d3.curveBasis);
                
              g.append('path')
                .datum(processedElevations)
                .attr('fill', 'rgba(0, 128, 0, 0.1)')
                .attr('d', area);
            }
            
            // Draw pit boundaries if available
            if (processedPitData.length > 0) {
              const pitLine = d3.line()
                .x(d => xScale(d.distance))
                .y(d => yScale(d.elevation))
                .curve(d3.curveLinear);
                
              g.append('path')
                .datum(processedPitData)
                .attr('fill', 'none')
                .attr('stroke', '#F4AE4D')
                .attr('stroke-width', 2)
                .attr('d', pitLine);
            }
            
            // Draw blocks if available
            if (blockModelData.length > 0) {
              // Sample blocks - just for illustration
              const sampleBlocks = blockModelData.filter((_, i) => i % 20 === 0).map((block, i) => ({
                distance: (i / (Math.floor(blockModelData.length / 20))) * lineLength,
                width: parseFloat(block.dim_x || 10),
                elevation: parseFloat(block.centroid_z || 0),
                height: parseFloat(block.dim_z || 10),
                color: block.color || '#CCCCCC'
              }));
              
              g.selectAll('.block')
                .data(sampleBlocks)
                .enter()
                .append('rect')
                .attr('class', 'block')
                .attr('x', d => xScale(d.distance))
                .attr('y', d => yScale(d.elevation + d.height/2))
                .attr('width', d => Math.max(2, xScale(d.width) - xScale(0)))
                .attr('height', d => Math.abs(yScale(d.elevation - d.height/2) - yScale(d.elevation + d.height/2)))
                .attr('fill', d => d.color)
                .attr('stroke', 'black')
                .attr('stroke-width', 0.5);
            }
            
            // Add legend
            const legend = g.append('g')
              .attr('transform', \`translate(\${innerWidth - 120}, 20)\`);
              
            // Add legend for blocks if we have them
            if (blockModelData.length > 0) {
              legend.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', '#CCCCCC');
                
              legend.append('text')
                .attr('x', 20)
                .attr('y', 10)
                .text('Block Model');
            }
            
            // Add legend for elevation if we have it
            if (processedElevations.length > 0) {
              legend.append('line')
                .attr('x1', 0)
                .attr('y1', 30)
                .attr('x2', 12)
                .attr('y2', 30)
                .attr('stroke', 'green')
                .attr('stroke-width', 2);
                
              legend.append('text')
                .attr('x', 20)
                .attr('y', 33)
                .text('Elevation');
            }
            
            // Add legend for pit boundaries if we have them
            if (processedPitData.length > 0) {
              legend.append('line')
                .attr('x1', 0)
                .attr('y1', 50)
                .attr('x2', 12)
                .attr('y2', 50)
                .attr('stroke', '#F4AE4D')
                .attr('stroke-width', 2);
                
              legend.append('text')
                .attr('x', 20)
                .attr('y', 53)
                .text('Pit Boundary');
            }
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            
            // Let React Native know rendering is complete
            sendToRN('renderComplete', { message: 'D3 visualization complete' });
            log('D3 visualization rendered successfully');
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

  const handleMessage = (event: any) => {
    console.log("Received message from WebView:", event.nativeEvent.data);
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "renderComplete") {
        console.log("Render complete message received!");
        setLoading(false);
      } else if (message.type === "renderError") {
        setError(message.error);
      } else if (message.type === "log") {
        console.log("WebView log:", message.message);
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
        }}
        onLoadStart={() => console.log("WebView load starting...")}
        onLoad={() => console.log("WebView loaded successfully!")}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
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
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    padding: 10,
  },
  errorText: {
    color: "red",
    fontSize: 14,
  },
});

export default CrossSectionWebView;
