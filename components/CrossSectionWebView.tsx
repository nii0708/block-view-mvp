import React, { useState, useRef, useEffect, useMemo } from "react";
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import { createPolygonsFromCoordsAndDims, processBlockModelCSV } from "@/utils/blockModelUtils";

const CrossSectionWebView: React.FC<CrossSectionWebViewProps> = ({
  startLat,
  startLng,
  endLat,
  endLng,
  blockModelData,
  elevationData = [],
  pitData = [],
  lineLength,
  sourceProjection = 'EPSG:32652',
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const [processedData, setProcessedData] = useState(null);
  const [crossSectionData, setCrossSectionData] = useState([]);

  // Helper functions for cross-section calculations
  const lineIntersectsPolygon = (lineStart, lineEnd, polygon) => {
    // For each edge of the polygon, check if it intersects with the line segment
    for (let i = 0; i < polygon.length - 1; i++) {
      const polyPointA = polygon[i];
      const polyPointB = polygon[i + 1];

      if (lineSegmentIntersection(
        lineStart[0], lineStart[1],
        lineEnd[0], lineEnd[1],
        polyPointA[0], polyPointA[1],
        polyPointB[0], polyPointB[1]
      )) {
        return true;
      }
    }

    // Also check if any of the line endpoints are inside the polygon
    if (pointInPolygon(lineStart, polygon) || pointInPolygon(lineEnd, polygon)) {
      return true;
    }

    return false;
  };

  const lineSegmentIntersection = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    // Calculate denominators
    const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

    // Lines are parallel or coincident
    if (den === 0) {
      return false;
    }

    // Calculate the line intersection parameters
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;

    // Check if the intersection is within both line segments
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  };

  const pointInPolygon = (point, polygon) => {
    // Ray-casting algorithm
    let inside = false;
    const x = point[0];
    const y = point[1];

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  };

  const calculatePolygonCentroid = (polygon) => {
    // Simple average of all vertices (excluding the last if it's the same as the first)
    const points = polygon.length > 0 && polygon[0][0] === polygon[polygon.length - 1][0] &&
      polygon[0][1] === polygon[polygon.length - 1][1]
      ? polygon.slice(0, -1) : polygon;

    const sumX = points.reduce((sum, point) => sum + point[0], 0);
    const sumY = points.reduce((sum, point) => sum + point[1], 0);

    return [sumX / points.length, sumY / points.length];
  };

  // Project a point onto a line and calculate the distance along the line
  const projectPointOntoLine = (point, lineStart, lineEnd) => {
    const x0 = point[0];
    const y0 = point[1];
    const x1 = lineStart[0];
    const y1 = lineStart[1];
    const x2 = lineEnd[0];
    const y2 = lineEnd[1];

    // Vector from start to end of line
    const lineVectorX = x2 - x1;
    const lineVectorY = y2 - y1;

    // Vector from start of line to point
    const pointVectorX = x0 - x1;
    const pointVectorY = y0 - y1;

    // Calculate dot product
    const dotProduct = pointVectorX * lineVectorX + pointVectorY * lineVectorY;

    // Calculate squared length of the line
    const lineSquaredLength = lineVectorX ** 2 + lineVectorY ** 2;

    // Calculate the projection ratio (0 means at start, 1 means at end)
    const ratio = Math.max(0, Math.min(1, dotProduct / lineSquaredLength));

    // Calculate the projected point
    const projectedX = x1 + ratio * lineVectorX;
    const projectedY = y1 + ratio * lineVectorY;

    // Calculate the distance from the start of the line
    const distance = ratio * Math.sqrt(lineSquaredLength);

    return {
      projectedPoint: [projectedX, projectedY],
      distance: distance
    };
  };

  // Calculate intersection points between a line and polygon
  const calculateIntersectionPoints = (startPoint, endPoint, polygon) => {
    const intersections = [];
    
    // Check intersections with each edge of the polygon
    for (let i = 0; i < polygon.length - 1; i++) {
      const polyPointA = polygon[i];
      const polyPointB = polygon[i + 1];
      
      // Calculate intersection
      const x1 = startPoint[0], y1 = startPoint[1];
      const x2 = endPoint[0], y2 = endPoint[1];
      const x3 = polyPointA[0], y3 = polyPointA[1];
      const x4 = polyPointB[0], y4 = polyPointB[1];
      
      // Calculate denominators
      const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
      
      // Skip if lines are parallel
      if (den === 0) continue;
      
      // Calculate the line intersection parameters
      const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
      const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;
      
      // Check if the intersection is within both line segments
      if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
        // Calculate intersection point
        const intersectX = x1 + ua * (x2 - x1);
        const intersectY = y1 + ua * (y2 - y1);
        
        // Calculate distance from start point
        const dx = intersectX - startPoint[0];
        const dy = intersectY - startPoint[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        intersections.push({
          point: [intersectX, intersectY],
          distance: distance
        });
      }
    }
    
    return intersections;
  };

  // Process data before sending to WebView
  useEffect(() => {
    try {
      // First process the block model data into GeoJSON with colors
      const geoJsonData = processBlockModelCSV(
        blockModelData,
        sourceProjection,
        false // Set topElevationOnly to false to include all blocks
      );
      
      setProcessedData(geoJsonData);
      console.log(`Processed ${geoJsonData.features.length} block features`);

      // Define the cross-section line
      const startPoint = [startLng, startLat];
      const endPoint = [endLng, endLat];
      
      // Find blocks that intersect with the line
      const intersectingBlocks = [];

      if (geoJsonData && geoJsonData.features) {
        geoJsonData.features.forEach(feature => {
          if (!feature.geometry || !feature.geometry.coordinates || 
              !feature.geometry.coordinates[0] || feature.geometry.coordinates[0].length === 0) {
            return;
          }

          const polygon = feature.geometry.coordinates[0]; // First (and only) polygon ring

          // Check if the line intersects this polygon
          if (lineIntersectsPolygon(startPoint, endPoint, polygon)) {
            // Calculate the intersection points between the line and polygon
            const intersections = calculateIntersectionPoints(startPoint, endPoint, polygon);

            // If we have intersection points, calculate the segment length within the block
            if (intersections.length >= 2) {
              // Sort intersections by distance along the line
              intersections.sort((a, b) => a.distance - b.distance);

              // Take the first and last intersection to get the entry and exit points
              const entryPoint = intersections[0];
              const exitPoint = intersections[intersections.length - 1];

              // Calculate the segment length within the block
              const segmentLength = exitPoint.distance - entryPoint.distance;

              // Calculate the centroid for this block
              const centroid = calculatePolygonCentroid(polygon);

              // Add the block to our intersecting blocks with its distance along line
              intersectingBlocks.push({
                distance: entryPoint.distance,
                height: feature.properties.centroid_z,
                rockType: feature.properties.rock,
                color: feature.properties.color,
                dimensions: {
                  width: segmentLength, // Use the calculated segment width
                  height: feature.properties.dim_z
                },
                lng: feature.properties.centroid_x,
                lat: feature.properties.centroid_y,
                entryPoint: entryPoint.point,
                exitPoint: exitPoint.point,
                // Include additional properties needed for visualization
                isIntersection: true
              });
            }
          }
        });
      }

      // Sort by distance along the line
      intersectingBlocks.sort((a, b) => a.distance - b.distance);
      setCrossSectionData(intersectingBlocks);
      
      console.log(`Found ${intersectingBlocks.length} blocks in cross-section`);
    } catch (error) {
      console.error("Error preprocessing data:", error);
      setError("Failed to process geological data");
    }
  }, [blockModelData, sourceProjection, startLat, startLng, endLat, endLng]);

  // Safely stringify data
  const safeStringify = (data) => {
    try {
      if (!data) return "[]";
      return JSON.stringify(data);
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
            log('Initializing cross-section visualization');
            
            // Use pre-processed cross-section data from React Native
            const profileData = ${safeStringify(crossSectionData)};
            const elevationData = ${safeStringify(elevationData)};
            
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
            const width = Math.min(800, window.innerWidth - 40);
            const height = Math.min(400, window.innerHeight * 0.6);
            const margin = { top: 40, right: 60, bottom: 60, left: 60 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            
            log("Rendering profile data for " + profileData.length + " blocks");
            
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
              .domain([0, d3.max(profileData, d => d.distance + d.dimensions.width) || totalDistance])
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
            
            // No need to scale block width - we're using the actual intersection width
            const blockMinWidth = 2; // Minimum width in pixels
            
            // Create a tooltip div
            const tooltip = d3.select('body').append('div')
              .attr('class', 'tooltip')
              .style('opacity', 0);
            
            // Log the profile data for debugging
            log("Rendering profile data: " + profileData.length + " blocks");
            
            // Add blocks for each intersection
            g.selectAll('.block')
              .data(profileData)
              .enter()
              .append('rect')
              .attr('class', 'block')
              .attr('x', d => xScale(d.distance))
              .attr('y', d => yScale(d.height + d.dimensions.height/2))
              .attr('width', d => Math.max(blockMinWidth, xScale(d.distance + d.dimensions.width) - xScale(d.distance)))
              .attr('height', d => Math.abs(yScale(d.height - d.dimensions.height/2) - yScale(d.height + d.dimensions.height/2)))
              .attr('fill', d => d.color || colorScale(d.rockType))
              .attr('stroke', '#333')
              .attr('stroke-width', 0.5)
              .attr('opacity', 1)
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
                    "Distance: " + d.distance.toFixed(1) + "m"
                  )
                  .style('left', (event.pageX + 10) + 'px')
                  .style('top', (event.pageY - 28) + 'px');
              })
              .on('mouseout', function(event, d) {
                d3.select(this)
                  .attr('stroke-width', 0.5)
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