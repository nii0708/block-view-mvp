// src/components/CrossSection.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import * as turf from '@turf/turf';
import { processBlockModelCSV } from '../utils/blockModelUtils';
import { generateElevationProfile } from '../utils/elevationUtils';
import { processPitDataToGeoJSON } from '../utils/processPitData';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const CrossSection = ({ blockModelData, lineGeoJson, sourceProjection, elevationData, pitData }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [crossSectionData, setCrossSectionData] = useState(null);
  const [elevationProfile, setElevationProfile] = useState(null);
  const [processedGeoJSON, setProcessedGeoJSON] = useState(null);
  const [processedPitData, setProcessedPitData] = useState(null);
  const [pitIntersections, setPitIntersections] = useState([]);
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get('window').width - 32, // Account for padding
    height: 400,
    margin: { top: 40, right: 40, bottom: 60, left: 60 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // First, process the blockModelData into GeoJSON using blockModelUtils
  useEffect(() => {
    if (!blockModelData || blockModelData.length === 0) {
      setProcessedGeoJSON(null);
      return;
    }

    try {
      // Process the block model data into GeoJSON
      const geoJsonData = processBlockModelCSV(blockModelData, sourceProjection);
      setProcessedGeoJSON(geoJsonData);
    } catch (error) {
      console.error('Error processing block model data:', error);
      setProcessedGeoJSON(null);
      setError('Failed to process block model data');
    }
  }, [blockModelData, sourceProjection]);

  // Process pit data into GeoJSON
  useEffect(() => {
    if (!pitData || pitData.length === 0) {
      setProcessedPitData(null);
      return;
    }

    try {
      // Process the pit data to GeoJSON
      const pitGeoJson = processPitDataToGeoJSON(pitData, sourceProjection);
      setProcessedPitData(pitGeoJson);
    } catch (error) {
      console.error('Error processing pit data:', error);
      setProcessedPitData(null);
      setError('Failed to process pit data');
    }
  }, [pitData, sourceProjection]);

  // Generate elevation profile if we have elevation data and a line
  useEffect(() => {
    if (!elevationData || !lineGeoJson) {
      setElevationProfile(null);
      return;
    }

    try {
      // Generate elevation profile with 500 points along the line
      const profile = generateElevationProfile(elevationData, lineGeoJson, 500);
      setElevationProfile(profile);
    } catch (error) {
      console.error('Error generating elevation profile:', error);
      setElevationProfile(null);
      setError('Failed to generate elevation profile');
    }
  }, [elevationData, lineGeoJson]);

  // Find pit intersections with cross-section line
  useEffect(() => {
    if (!processedPitData || !lineGeoJson || !lineGeoJson.geometry) {
      setPitIntersections([]);
      return;
    }

    try {
      // Extract line coordinates
      const lineCoords = lineGeoJson.geometry.coordinates;

      if (lineCoords.length < 2) {
        setPitIntersections([]);
        return;
      }

      // Create our pit intersections array
      const intersections = [];
      
      processedPitData.features.forEach(feature => {
        // Convert line and ring to Turf line features
        const ringLine = turf.lineString(feature.geometry.coordinates.map(coord => coord.slice(0, 2)));
        
        // Find intersections
        const intersectionPoints = turf.lineIntersect(ringLine, lineGeoJson);
        
        // Process intersections
        if (intersectionPoints.features.length > 0) {
          intersectionPoints.features.forEach(intersectionFeature => {
            const intersectionCoord = intersectionFeature.geometry;
            const dist = turf.distance(intersectionCoord.coordinates, lineCoords[0], {units: 'kilometers'})/100;

            intersections.push({
              point: intersectionCoord.coordinates,
              distance: dist,
              elevation: feature.properties.level,
              type: 'pit_boundary'
            });
          });
        }
      });
      
      setPitIntersections(intersections);
    } catch (error) {
      console.error('Error finding pit intersections:', error);
      setPitIntersections([]);
      setError('Failed to calculate pit intersections');
    }
  }, [processedPitData, lineGeoJson]);

  // Calculate cross-section data when line or processed GeoJSON changes
  useEffect(() => {
    if (!processedGeoJSON || !lineGeoJson || !lineGeoJson.geometry) {
      setCrossSectionData(null);
      return;
    }

    // Extract line coordinates (already in [lng, lat] format in GeoJSON)
    const lineCoords = lineGeoJson.geometry.coordinates;

    if (lineCoords.length < 2) {
      setCrossSectionData(null);
      return;
    }

    // Calculate the cross-section data using the processed GeoJSON
    const crossSection = calculateCrossSection(processedGeoJSON, lineCoords, sourceProjection);
    setCrossSectionData(crossSection);
  }, [processedGeoJSON, lineGeoJson, sourceProjection]);

  // Generate HTML content for WebView when data changes
  useEffect(() => {
    if (crossSectionData) {
      generateCrossSectionHtml(crossSectionData, elevationProfile, pitIntersections, dimensions);
    } else {
      setHtmlContent('');
    }
  }, [crossSectionData, elevationProfile, pitIntersections, dimensions]);

  // Generate the HTML content for the WebView
  const generateCrossSectionHtml = (data, elevationProfile, pitIntersections, dimensions) => {
    setIsLoading(true);
    
    // Convert all the necessary data to JSON strings for the WebView
    const dataJson = JSON.stringify(data);
    const elevationProfileJson = elevationProfile ? JSON.stringify(elevationProfile) : 'null';
    const pitIntersectionsJson = pitIntersections ? JSON.stringify(pitIntersections) : '[]';
    const dimensionsJson = JSON.stringify(dimensions);
    
    // Create HTML content with embedded D3
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            overflow: hidden;
          }
          svg {
            display: block;
            margin: 0 auto;
            touch-action: none;
          }
          .legend text { 
            font-size: 12px; 
          }
          .x-axis-label, .y-axis-label {
            font-size: 12px;
          }
          .tooltip { 
            pointer-events: none; 
          }
          .block:hover {
            stroke-width: 2;
          }
        </style>
        <script src="https://d3js.org/d3.v7.min.js"></script>
      </head>
      <body>
        <svg id="visualization"></svg>
        
        <script>
          // Data passed from React Native
          const crossSectionData = ${dataJson};
          const elevationProfile = ${elevationProfileJson};
          const pitIntersections = ${pitIntersectionsJson};
          const dimensions = ${dimensionsJson};
          
          // Find the exact intersection point between two line segments
          const findLineSegmentIntersection = (x1, y1, x2, y2, x3, y3, x4, y4) => {
            // Calculate denominators
            const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

            // Lines are parallel or coincident
            if (den === 0) {
              return null;
            }

            // Calculate the line intersection parameters
            const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
            const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;

            // Check if the intersection is within both line segments
            if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
              return {
                x: x1 + ua * (x2 - x1),
                y: y1 + ua * (y2 - y1)
              };
            }

            return null;
          };
          
          // Render the cross-section visualization
          const renderCrossSection = () => {
            // Get window dimensions
            const windowWidth = window.innerWidth;
            const width = dimensions.width || windowWidth;
            const height = dimensions.height;
            const margin = dimensions.margin;
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            
            // Create/setup the SVG
            const svg = d3.select("#visualization")
              .attr("width", width)
              .attr("height", height);
            
            // Clear previous content
            svg.selectAll("*").remove();
            
            // Create a group element for the visualization
            const g = svg.append("g")
              .attr("transform", \`translate(\${margin.left}, \${margin.top})\`);
              
            // Check if we have any data to display
            const blocks = crossSectionData.blocks || [];
            
            if (blocks.length === 0 &&
              (!elevationProfile || elevationProfile.length === 0) &&
              (!pitIntersections || pitIntersections.length === 0)) {
              // No data to render
              g.append("text")
                .attr("x", innerWidth / 2)
                .attr("y", innerHeight / 2)
                .attr("text-anchor", "middle")
                .text("No data intersects with the current line.");
              return;
            }
            
            // Collect all elevation values from blocks, elevation profile, and pit intersections
            let allElevations = blocks.map(b => b.elevation);

            if (elevationProfile && elevationProfile.length > 0) {
              allElevations = [...allElevations, ...elevationProfile.map(p => p.elevation)];
            }

            if (pitIntersections && pitIntersections.length > 0) {
              allElevations = [...allElevations, ...pitIntersections.map(p => p.elevation)];
            }

            // Filter out any null or undefined values
            allElevations = allElevations.filter(e => e !== null && e !== undefined && !isNaN(e));

            // If we still have no valid elevations, set default min/max
            const minElevation = allElevations.length > 0 ? Math.min(...allElevations) - 10 : 0;
            const maxElevation = allElevations.length > 0 ? Math.max(...allElevations) + 10 : 100;
            
            // Create scales
            const xScale = d3.scaleLinear()
              .domain([0, crossSectionData.lineLength])
              .range([0, innerWidth]);

            const yScale = d3.scaleLinear()
              .domain([minElevation, maxElevation])
              .range([innerHeight, 0]);
              
            // Create axes
            const xAxis = d3.axisBottom(xScale);
            const yAxis = d3.axisLeft(yScale);

            // Add axes to the visualization
            g.append("g")
              .attr("class", "x-axis")
              .attr("transform", \`translate(0, \${innerHeight})\`)
              .call(xAxis);

            g.append("g")
              .attr("class", "y-axis")
              .call(yAxis);

            // Add axis labels
            g.append("text")
              .attr("class", "x-axis-label")
              .attr("x", innerWidth / 2)
              .attr("y", innerHeight + 40)
              .attr("text-anchor", "middle")
              .text("Distance along cross-section (m)");

            g.append("text")
              .attr("class", "y-axis-label")
              .attr("transform", "rotate(-90)")
              .attr("x", -innerHeight / 2)
              .attr("y", -40)
              .attr("text-anchor", "middle")
              .text("Elevation (m)");

            // Draw a reference line for the cross-section path
            g.append("line")
              .attr("x1", 0)
              .attr("y1", innerHeight)
              .attr("x2", innerWidth)
              .attr("y2", innerHeight)
              .attr("stroke", "#aaa")
              .attr("stroke-width", 1)
              .attr("stroke-dasharray", "5,5");
              
            // Draw elevation profile if available
            if (elevationProfile && elevationProfile.length > 0) {
              // Process elevation data to handle missing values
              const validSegments = [];
              let currentSegment = [];

              elevationProfile.forEach((point, index) => {
                if (point.elevation !== null && point.elevation !== undefined && !isNaN(point.elevation)) {
                  // Valid point - add to current segment
                  currentSegment.push(point);
                } else {
                  // Invalid point - if we have points in the current segment, finish it and start a new one
                  if (currentSegment.length > 0) {
                    validSegments.push([...currentSegment]);
                    currentSegment = [];
                  }
                }
              });

              // Don't forget to add the last segment if it has points
              if (currentSegment.length > 0) {
                validSegments.push(currentSegment);
              }

              // Create a line generator
              const line = d3.line()
                .x(d => xScale(d.distance))
                .y(d => yScale(d.elevation))
                .curve(d3.curveBasis);

              // Draw each valid segment
              validSegments.forEach(segment => {
                g.append("path")
                  .datum(segment)
                  .attr("fill", "none")
                  .attr("stroke", "green")
                  .attr("stroke-width", 1)
                  .attr("d", line);

                // For each segment, draw vertical lines down to zero for the start and end points
                if (segment.length > 0) {
                  const firstPoint = segment[0];
                  const lastPoint = segment[segment.length - 1];

                  // Starting drop line
                  g.append("line")
                    .attr("x1", xScale(firstPoint.distance))
                    .attr("y1", yScale(firstPoint.elevation))
                    .attr("x2", xScale(firstPoint.distance))
                    .attr("y2", yScale(0))  // Drop to zero elevation
                    .attr("stroke", "green")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "2,2");

                  // Ending drop line
                  g.append("line")
                    .attr("x1", xScale(lastPoint.distance))
                    .attr("y1", yScale(lastPoint.elevation))
                    .attr("x2", xScale(lastPoint.distance))
                    .attr("y2", yScale(0))  // Drop to zero elevation
                    .attr("stroke", "green")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "2,2");
                }
              });
            }

            // Add blocks to the visualization
            g.selectAll(".block")
              .data(blocks)
              .enter()
              .append("rect")
              .attr("class", "block")
              .attr("x", d => xScale(d.distance))
              .attr("y", d => yScale(d.elevation + d.dimensions[2] / 2))
              .attr("width", d => xScale(d.distance + d.width) - xScale(d.distance)) // Use the calculated width
              .attr("height", d => Math.abs(yScale(d.elevation - d.dimensions[2] / 2) - yScale(d.elevation + d.dimensions[2] / 2)))
              .attr("fill", d => {
                return d.properties.color;
              })
              .attr("stroke", "black")
              .attr("stroke-width", 0.5)
              .append("title")
              .text(d => \`Rock type: \${d.properties.rock}, Elevation: \${d.elevation.toFixed(2)}m, Distance: \${d.distance.toFixed(2)}m, Width: \${d.width.toFixed(2)}m\`);

            // Add distance markers along the x-axis
            const blocksByDistance = d3.group(blocks, d => Math.floor(d.distance));

            // Draw pit boundary intersections
            if (pitIntersections && pitIntersections.length > 0) {
              // Create a path for all pit intersections
              const pitLine = d3.line()
                .x(d => xScale(d.distance))
                .y(d => yScale(d.elevation))
                .curve(d3.curveLinear);

              // Group pit intersections if they're close to each other
              const sortedIntersections = [...pitIntersections].sort((a, b) => a.distance - b.distance);

              // Draw the pit segments
              const pitSegments = [sortedIntersections];

              pitSegments.forEach(segment => {
                g.append("path")
                  .datum(segment)
                  .attr("fill", "none")
                  .attr("stroke", "#F4AE4D")  // Orange for pit boundaries
                  .attr("stroke-width", 0.6)
                  .attr("d", pitLine)
                  .append("title")
                  .text("Pit Boundary");
              });
            }

            g.selectAll(".distance-marker")
              .data(Array.from(blocksByDistance.keys()))
              .enter()
              .append("line")
              .attr("class", "distance-marker")
              .attr("x1", d => xScale(d))
              .attr("y1", innerHeight)
              .attr("x2", d => xScale(d))
              .attr("y2", innerHeight + 10)
              .attr("stroke", "#555")
              .attr("stroke-width", 1);

            // Create a unified legend
            const legendItems = [];

            // Add rock types to legend
            const uniquePairs = new Set();
            const uniquePairsArray = [];
            
            blocks.forEach(item => {
              const rock = item.properties.rock;
              const color = item.properties.color;
              const pairString = \`\${rock}:\${color}\`;
              
              // Only add if this pair hasn't been seen before
              if (!uniquePairs.has(pairString)) {
                uniquePairs.add(pairString);
                uniquePairsArray.push({ rock, color });
              }
            });
            
            uniquePairsArray.forEach(d => {
              legendItems.push({
                label: d.rock,
                color: d.color,
                type: 'rect'
              });
            });

            // Add elevation profile to legend if available
            if (elevationProfile && elevationProfile.length > 0) {
              legendItems.push({
                label: 'Terrain Elevation Profile',
                color: 'green',
                type: 'line',
                size: 2
              });
            }

            // Add pit boundary to legend if available
            if (pitIntersections && pitIntersections.length > 0) {
              legendItems.push({
                label: 'Pit Boundary',
                color: '#F4AE4D',
                type: 'line',
                size: 2,
                dashed: false
              });
            }

            // Draw the legend
            const legend = g.append("g")
              .attr("class", "legend")
              .attr("transform", \`translate(\${innerWidth - 150}, 20)\`);

            legendItems.forEach((item, i) => {
              if (item.type === 'rect') {
                legend.append("rect")
                  .attr("x", 0)
                  .attr("y", i * 20)
                  .attr("width", 15)
                  .attr("height", 15)
                  .attr("fill", item.color);
              } else if (item.type === 'line') {
                legend.append("line")
                  .attr("x1", 0)
                  .attr("y1", i * 20 + 7.5)
                  .attr("x2", 15)
                  .attr("y2", i * 20 + 7.5)
                  .attr("stroke", item.color)
                  .attr("stroke-width", item.size || 2)
                  .attr("stroke-dasharray", item.dashed ? "3,3" : null);
              }

              legend.append("text")
                .attr("x", 20)
                .attr("y", i * 20 + 12)
                .text(item.label);
            });
            
            // Notify React Native that render is complete
            window.ReactNativeWebView.postMessage("renderComplete");
          };
          
          // Initial render
          renderCrossSection();
          
          // Handle window resize
          window.addEventListener('resize', () => {
            renderCrossSection();
          });
        </script>
      </body>
    </html>
    `;
    
    setHtmlContent(html);
  };

  // Function to handle the download of elevation profile data as CSV
  const handleDownloadElevationProfile = async () => {
    if (!elevationProfile || elevationProfile.length === 0) {
      alert('No elevation profile data available to download.');
      return;
    }

    try {
      // Create CSV content
      let csvContent = "";

      // Add headers
      csvContent += "index,distance,elevation,x,y\n";

      // Add data rows
      elevationProfile.forEach((point, index) => {
        const row = [
          index,
          point.distance ? point.distance.toFixed(6) : "0",
          point.elevation ? point.elevation.toFixed(6) : "0",
          point.x ? point.x.toFixed(6) : "0",
          point.y ? point.y.toFixed(6) : "0"
        ].join(",");
        csvContent += row + "\n";
      });

      // Create a temporary file
      const fileUri = `${FileSystem.cacheDirectory}elevation_profile.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        alert('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error downloading elevation profile:', error);
      alert('Failed to download elevation profile data');
    }
  };

  // Find the exact intersection point between two line segments
  const findLineSegmentIntersection = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    // Calculate denominators
    const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

    // Lines are parallel or coincident
    if (den === 0) {
      return null;
    }

    // Calculate the line intersection parameters
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;

    // Check if the intersection is within both line segments
    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      return {
        x: x1 + ua * (x2 - x1),
        y: y1 + ua * (y2 - y1)
      };
    }

    return null;
  };

  // Calculate the cross-section by finding exact intersections with the line
  const calculateCrossSection = (geoJsonData, lineCoords, sourceProjection) => {
    if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) return null;

    // Create a line segment from the coordinates
    const startPoint = lineCoords[0]; // [lng, lat]
    const endPoint = lineCoords[1]; // [lng, lat]

    // Extract blocks from the GeoJSON features with exact intersections
    const intersectingBlocks = [];

    // For each polygon feature, check if the line intersects it
    geoJsonData.features.forEach(feature => {
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

          // Project the centroid onto the line
          const projectedDistance = projectPointOntoLine(
            [centroid[0], centroid[1], feature.properties.centroid_z || 0],
            startPoint,
            endPoint
          );

          // Add the block to our intersecting blocks with its distance along the line
          intersectingBlocks.push({
            centroid: [
              centroid[0], // lng
              centroid[1], // lat
              feature.properties.centroid_z || 0 // z (elevation)
            ],
            dimensions: [
              feature.properties.dim_x || 12.5,
              feature.properties.dim_y || 12.5,
              feature.properties.dim_z || 1
            ],
            properties: {
              rock: feature.properties.rock || 'unknown',
              color: feature.properties.color || '#FFFFFF'
            },
            // Distance to start of the block segment
            distance: entryPoint.distance,
            // Width of the block along the line
            width: segmentLength,
            elevation: feature.properties.centroid_z || 0,
            projectedPoint: projectedDistance.projectedPoint,
            entryPoint: entryPoint.point,
            exitPoint: exitPoint.point
          });
        }
      }
    });

    // Sort blocks by distance along the line
    intersectingBlocks.sort((a, b) => a.distance - b.distance);

    return {
      blocks: intersectingBlocks,
      lineLength: calculateLineLength(startPoint, endPoint),
      startPoint,
      endPoint
    };
  };

  // Calculate intersection points between a line and polygon
  const calculateIntersectionPoints = (lineStart, lineEnd, polygon) => {
    const intersections = [];

    // For each edge of the polygon, check if it intersects with the line segment
    for (let i = 0; i < polygon.length - 1; i++) {
      const polyPointA = polygon[i];
      const polyPointB = polygon[i + 1];

      const intersection = findLineSegmentIntersection(
        lineStart[0], lineStart[1],
        lineEnd[0], lineEnd[1],
        polyPointA[0], polyPointA[1],
        polyPointB[0], polyPointB[1]
      );

      if (intersection) {
        // Calculate distance from start of line to intersection point
        const dist = Math.sqrt(
          (intersection.x - lineStart[0]) ** 2 +
          (intersection.y - lineStart[1]) ** 2
        );

        intersections.push({
          point: [intersection.x, intersection.y],
          distance: dist
        });
      }
    }

    // If we found fewer than 2 intersections, the line might start or end inside the polygon
    if (intersections.length < 2) {
      // Check if either line endpoint is inside the polygon
      if (pointInPolygon(lineStart, polygon)) {
        intersections.push({
          point: [lineStart[0], lineStart[1]],
          distance: 0
        });
      }

      if (pointInPolygon(lineEnd, polygon)) {
        const lineLength = calculateLineLength(lineStart, lineEnd);
        intersections.push({
          point: [lineEnd[0], lineEnd[1]],
          distance: lineLength
        });
      }
    }

    return intersections;
  };

  // Check if a line segment intersects a polygon
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

  // Check if a point is inside a polygon
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

  // Check if two line segments intersect
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

  // Helper function to calculate the centroid of a polygon
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

  // Calculate the length of a line segment
  const calculateLineLength = (start, end) => {
    return Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2);
  };

  // Handle WebView message events
  const handleWebViewMessage = (event) => {
    if (event.nativeEvent.data === "renderComplete") {
      setIsLoading(false);
    }
  };

  if (!blockModelData) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>
          Please upload block model data to see the cross-section.
        </Text>
      </View>
    );
  }

  if (!lineGeoJson) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>
          Please draw a line on the map to generate a cross-section.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cross-Section View</Text>
        
        <View style={styles.infoContainer}>
          {crossSectionData ? (
            <View>
              <Text style={styles.infoText}>
                {crossSectionData.blocks.length > 0 
                  ? `${crossSectionData.blocks.length} blocks intersect with the line.` 
                  : 'No blocks intersect with the line.'}
              </Text>
              
              <Text style={styles.infoText}>
                {elevationProfile 
                  ? `Elevation profile generated with ${elevationProfile.length} points.` 
                  : 'No elevation data available.'}
              </Text>
              
              <Text style={styles.infoText}>
                {pitIntersections && pitIntersections.length > 0 
                  ? `Found ${pitIntersections.length} pit boundary intersections.` 
                  : 'No pit boundaries intersect with the line.'}
              </Text>
            </View>
          ) : (
            <Text style={styles.infoText}>
              {processedGeoJSON ? 'Calculating cross-section...' : 'Processing data...'}
            </Text>
          )}
        </View>
      </View>

      {/* Download Button */}
      {elevationProfile && elevationProfile.length > 0 && (
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={handleDownloadElevationProfile}
        >
          <Text style={styles.downloadButtonText}>
            Download Elevation Profile Data
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.webViewContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Generating visualization...</Text>
          </View>
        )}
        
        {htmlContent ? (
          <WebView
            source={{ html: htmlContent }}
            style={styles.webView}
            originWhitelist={['*']}
            scrollEnabled={false}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        ) : (
          <View style={styles.loadingView}>
            <Text>Preparing data...</Text>
          </View>
        )}
      </View>
      
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
    padding: 16,
    backgroundColor: '#fff'
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  infoContainer: {
    marginBottom: 8
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  downloadButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 16
  },
  downloadButtonText: {
    color: '#fff',
    fontWeight: '500'
  },
  webViewContainer: {
    height: 400,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f9f9f9'
  },
  webView: {
    flex: 1
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  loadingText: {
    fontSize: 14,
    color: '#666'
  },
  messageText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#ffdddd',
    borderRadius: 4
  },
  errorText: {
    color: '#cc0000'
  }
});

export default CrossSection;