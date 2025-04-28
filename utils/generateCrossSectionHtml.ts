export const generateD3Html = (
  blockModelData: any[],
  elevationData: any[],
  pitData: any[],
  startPoint: { lat: number; lng: number },
  endPoint: { lat: number; lng: number },
  lineLength: number,
  sourceProjection: string
) => {
  // Convert the data to JSON strings for embedding in HTML
  const blockDataJSON = JSON.stringify(blockModelData);
  const elevationDataJSON = JSON.stringify(elevationData);
  const pitDataJSON = JSON.stringify(pitData);

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
          margin: 0;
          font-family: Arial, sans-serif;
          overflow: hidden;
        }
        #chart {
          width: 100%;
          height: 100vh;
        }
        .block {
          stroke: #000;
          stroke-width: 0.5;
        }
        .axis-label {
          font-size: 12px;
          text-anchor: middle;
        }
        .legend {
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div id="chart"></div>
      
      <script>
        // Data passed from React Native
        const blockModelData = ${blockDataJSON};
        const elevationData = ${elevationDataJSON};
        const pitData = ${pitDataJSON};
        const startPoint = ${JSON.stringify(startPoint)};
        const endPoint = ${JSON.stringify(endPoint)};
        const lineLength = ${lineLength};
        const sourceProjection = "${sourceProjection}";
        
        // Line GeoJSON
        const lineGeoJson = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [startPoint.lng, startPoint.lat],
              [endPoint.lng, endPoint.lat]
            ]
          }
        };
        
        // Setup dimensions
        const dimensions = {
          width: window.innerWidth,
          height: window.innerHeight * 0.8,
          margin: { top: 40, right: 40, bottom: 60, left: 60 }
        };
        
        // Calculate the distance between two points
        const calculateDistance = (startPoint, endPoint) => {
          return Math.sqrt(
            Math.pow(endPoint[0] - startPoint[0], 2) + 
            Math.pow(endPoint[1] - startPoint[1], 2)
          );
        };
        
        // Find the exact intersection point between two line segments
        // bisa pake turf.js (sebaiknya)
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

        // Function to render the cross-section
        function renderCrossSection(svg, crossSectionData, dims, elevationProfile, pitIntersections = []) {
          // Clear previous content
          svg.selectAll("*").remove();

          const { width, height, margin } = dims;
          const innerWidth = width - margin.left - margin.right;
          const innerHeight = height - margin.top - margin.bottom;

          // Create a group element for the visualization
          const g = svg.append("g")
            .attr("transform", \`translate(\${margin.left}, \${margin.top})\`);

          // Find min and max elevation values for scaling
          const blocks = crossSectionData.blocks || [];

          // Check if we have any data to display
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
          
          // Draw blocks
          if (blocks.length > 0) {
            g.selectAll(".block")
              .data(blocks)
              .enter()
              .append("rect")
              .attr("class", "block")
              .attr("x", d => xScale(d.distance))
              .attr("y", d => yScale(d.elevation + d.dimensions[2] / 2))
              .attr("width", d => xScale(d.distance + d.width) - xScale(d.distance)) 
              .attr("height", d => Math.abs(yScale(d.elevation - d.dimensions[2] / 2) - yScale(d.elevation + d.dimensions[2] / 2)))
              .attr("fill", d => d.properties.color || "#999")
              .attr("stroke", "black")
              .attr("stroke-width", 0.5);
          }
          
          // Draw elevation profile if available
          if (elevationProfile && elevationProfile.length > 0) {
            // Create a line generator
            const line = d3.line()
              .x(d => xScale(d.distance))
              .y(d => yScale(d.elevation))
              .curve(d3.curveBasis);
              
            g.append("path")
              .datum(elevationProfile.filter(p => p.elevation !== null))
              .attr("fill", "none")
              .attr("stroke", "green")
              .attr("stroke-width", 2)
              .attr("d", line);
              
            // Add fill below line
            const areaGenerator = d3.area()
              .x(d => xScale(d.distance))
              .y0(innerHeight)
              .y1(d => yScale(d.elevation))
              .curve(d3.curveBasis);
              
            g.append("path")
              .datum(elevationProfile.filter(p => p.elevation !== null))
              .attr("fill", "rgba(0, 128, 0, 0.1)")
              .attr("d", areaGenerator);
          }
          
          // Draw pit boundary intersections
          if (pitIntersections && pitIntersections.length > 0) {
            const pitLine = d3.line()
              .x(d => xScale(d.distance))
              .y(d => yScale(d.elevation))
              .curve(d3.curveLinear);
              
            g.append("path")
              .datum(pitIntersections)
              .attr("fill", "none")
              .attr("stroke", "#F4AE4D")
              .attr("stroke-width", 2)
              .attr("d", pitLine);
          }
          
          // Add legend
          const legendItems = [];
          
          // Add rock types to legend
          const uniqueRocks = Array.from(new Set(blocks.map(b => b.properties.rock)));
          uniqueRocks.forEach(rock => {
            const color = blocks.find(b => b.properties.rock === rock)?.properties.color || "#999";
            legendItems.push({
              label: rock,
              color: color,
              type: 'rect'
            });
          });
          
          // Add elevation profile to legend
          if (elevationProfile && elevationProfile.length > 0) {
            legendItems.push({
              label: 'Terrain Elevation',
              color: 'green',
              type: 'line'
            });
          }
          
          // Add pit boundary to legend
          if (pitIntersections && pitIntersections.length > 0) {
            legendItems.push({
              label: 'Pit Boundary',
              color: '#F4AE4D',
              type: 'line'
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
                .attr("stroke-width", 2);
            }
            
            legend.append("text")
              .attr("x", 20)
              .attr("y", i * 20 + 12)
              .text(item.label);
          });
        }
        
        // Simplified handler to calculate cross-section (for demonstration)
        function calculateCrossSection(geoJsonData, lineCoords) {
          if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) return { blocks: [], lineLength: 0 };
          
          const startPoint = lineCoords[0]; // [lng, lat]
          const endPoint = lineCoords[1]; // [lng, lat]
          const lineLength = calculateDistance(startPoint, endPoint);
          
          const intersectingBlocks = [];
          
          // Process blocks and find intersections with the line
          geoJsonData.features.forEach(feature => {
            // Simple intersection check for demo
            const polygon = feature.geometry.coordinates[0];
            let intersects = false;
            
            // Check if any point of the polygon is near the line
            for (let i = 0; i < polygon.length - 1; i++) {
              const intersection = findLineSegmentIntersection(
                startPoint[0], startPoint[1],
                endPoint[0], endPoint[1],
                polygon[i][0], polygon[i][1],
                polygon[i+1][0], polygon[i+1][1]
              );
              
              if (intersection) {
                intersects = true;
                break;
              }
            }
            
            // Also check if the line start or end is inside the polygon
            if (!intersects) {
              if (pointInPolygon(startPoint, polygon) || pointInPolygon(endPoint, polygon)) {
                intersects = true;
              }
            }
            
            if (intersects) {
              // Calculate approximate distance along the line
              const centroid = [
                feature.properties.centroid_x,
                feature.properties.centroid_y
              ];
              
              // Project centroid onto line
              const dx = endPoint[0] - startPoint[0];
              const dy = endPoint[1] - startPoint[1];
              const t = ((centroid[0] - startPoint[0]) * dx + (centroid[1] - startPoint[1]) * dy) / (dx * dx + dy * dy);
              const projectedDistance = Math.max(0, Math.min(1, t)) * lineLength;
              
              // Add block to results
              intersectingBlocks.push({
                centroid: [
                  centroid[0],
                  centroid[1],
                  feature.properties.centroid_z || 0
                ],
                dimensions: [
                  feature.properties.dim_x || 10,
                  feature.properties.dim_y || 10,
                  feature.properties.dim_z || 10
                ],
                properties: {
                  rock: feature.properties.rock || 'unknown',
                  color: feature.properties.color || '#CCCCCC'
                },
                distance: projectedDistance - (feature.properties.dim_x / 2 || 5),
                width: feature.properties.dim_x || 10,
                elevation: feature.properties.centroid_z || 0
              });
            }
          });
          
          // Sort blocks by distance
          intersectingBlocks.sort((a, b) => a.distance - b.distance);
          
          return {
            blocks: intersectingBlocks,
            lineLength: lineLength,
            startPoint,
            endPoint
          };
        }
        
        // Main execution
        document.addEventListener('DOMContentLoaded', function() {
          try {
            // Convert raw block model data to GeoJSON format
            // In a real implementation, you would process the raw data properly
            const processedGeoJSON = {
              type: "FeatureCollection",
              features: blockModelData.map((block, index) => ({
                type: "Feature",
                properties: {
                  centroid_x: parseFloat(block.centroid_x || block.x || 0),
                  centroid_y: parseFloat(block.centroid_y || block.y || 0),
                  centroid_z: parseFloat(block.centroid_z || block.z || 0),
                  dim_x: parseFloat(block.dim_x || block.width || 10),
                  dim_y: parseFloat(block.dim_y || block.length || 10),
                  dim_z: parseFloat(block.dim_z || block.height || 10),
                  rock: block.rock || 'unknown',
                  color: block.color || '#CCCCCC'
                },
                geometry: {
                  type: "Polygon",
                  coordinates: [[
                    [block.centroid_x - block.dim_x/2, block.centroid_y - block.dim_y/2],
                    [block.centroid_x + block.dim_x/2, block.centroid_y - block.dim_y/2],
                    [block.centroid_x + block.dim_x/2, block.centroid_y + block.dim_y/2],
                    [block.centroid_x - block.dim_x/2, block.centroid_y + block.dim_y/2],
                    [block.centroid_x - block.dim_x/2, block.centroid_y - block.dim_y/2]
                  ]]
                }
              }))
            };
            
            // Process elevation data
            const elevationProfile = elevationData.map((point, index) => ({
              distance: (index / (elevationData.length - 1)) * lineLength,
              elevation: parseFloat(point.z || point.elevation || 0),
              x: parseFloat(point.x || point.lon || 0),
              y: parseFloat(point.y || point.lat || 0)
            }));
            
            // Process pit data (simplified)
            const pitIntersections = pitData.slice(0, 20).map((point, index) => ({
              distance: (index / 19) * lineLength,
              elevation: parseFloat(point.z || 0),
              point: [parseFloat(point.x || 0), parseFloat(point.y || 0)]
            }));
            
            // Calculate cross section
            const crossSectionData = calculateCrossSection(
              processedGeoJSON, 
              [[startPoint.lng, startPoint.lat], [endPoint.lng, endPoint.lat]]
            );
            
            // Create SVG
            const svg = d3.select("#chart")
              .append("svg")
              .attr("width", dimensions.width)
              .attr("height", dimensions.height);
            
            // Render the cross-section
            renderCrossSection(svg, crossSectionData, dimensions, elevationProfile, pitIntersections);
            
            // Send completion message to React Native
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'renderComplete',
                blockCount: crossSectionData.blocks.length
              }));
            }
          } catch (error) {
            console.error("Error rendering cross section:", error);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'renderError',
                error: error.toString()
              }));
            }
          }
        });
      </script>
    </body>
    </html>
  `;
};
