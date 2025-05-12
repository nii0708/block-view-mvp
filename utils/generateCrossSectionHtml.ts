import { processCrossSectionBlocks } from "./processCrossSectionBlocks";
import { processElevationData } from "./processElevationData";
import { processPitData } from "./processPitDataCrossSection";

export function generateD3Html(
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
  const intersectingBlocks: any = processCrossSectionBlocks(
    blockModelData,
    sourceProjection,
    startLat,
    startLng,
    endLat,
    endLng
  );

  const blockCount = intersectingBlocks.length;

  let elevationPoints = processElevationData(
    elevationData,
    sourceProjection,
    startLat,
    startLng,
    endLat,
    endLng,
    lineLength
  );

  const pitPoints = processPitData(pitData);

  const safeStringify = (data: any) => {
    try {
      return JSON.stringify(data || []);
    } catch (e) {
      console.error("Error stringifying data:", e);
      return "[]";
    }
  };

  // HTML template with D3.js - Adding data stats messaging and screenshot function
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>Cross Section View</title>
      
      <!-- Include D3.js -->
      <script src="https://d3js.org/d3.v7.min.js"></script>
      <!-- Include Proj4.js for coordinate conversion - CRITICAL! -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.8.0/proj4.js"></script>
      
      <style>
        /* CSS styles with improved layout */
        html, body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background-color: white;
          overflow: hidden;
          touch-action: pan-y;
          -webkit-overflow-scrolling: touch;
        }

        #chart-container {
          margin-top: 10px;
          width: 100%;
          min-height: 85vh; /* Use viewport height instead of fixed height */
          height: auto;
          overflow-x: auto;
          overflow-y: hidden; /* Prevent vertical scroll in container */
          background-color: white;
          padding-bottom: 20px; /* Add padding at bottom */
        }
        #chart {
          height: 100%;
          width: 100%;
          background-color: white;
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
        .x.axis text {
          text-anchor: middle;
          dominant-baseline: hanging;
          font-size: 10px;
          white-space: pre;
        }
        .grid line {
          stroke: #f0f0f0; 
          stroke-opacity: 0.5; 
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
        .block-concentrate {
          font-family: Arial, sans-serif;
          font-weight: bold;
          fill: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
          pointer-events: none;
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
        // State variables
        let isRendering = false;
        let hasRendered = false;
        let chartWidthSent = false;
        let lastLogTime = 0;
        
        // Data statistics tracking
        let displayedBlocksCount = 0;
        let displayedElevationPointsCount = 0;
        let displayedPitPointsCount = 0;
        
        // For logging
        function debug(message) {
          const now = Date.now();
          if (now - lastLogTime > 500) {
            lastLogTime = now;
            console.log(message);
            
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'debug',
                message: message
              }));
            }
          }
        }
        
        // Helper to send messages to React Native
        function sendToRN(type, data) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: type,
              ...data
            }));
          }
        }
        
        // Save to gallery function
        function saveToGallery() {
          try {
            const svgElement = document.querySelector('svg');
            if (!svgElement) {
              debug("No SVG element found to save to gallery");
              return;
            }
            
            // Update UI to show progress
            if (document.getElementById('loading')) {
              document.getElementById('loading').style.display = 'flex';
              document.getElementById('message').textContent = 'Preparing HD image...';
              document.getElementById('progress-fill').style.width = '50%';
            }
            
            // Get the SVG dimensions
            const svgRect = svgElement.getBoundingClientRect();
            const width = svgRect.width;
            const height = svgRect.height;
            
            // Use a more modest scale factor to prevent performance issues
            const scaleFactor = 2;
            
            // Create canvas with timeout to prevent UI freezing
            setTimeout(() => {
              try {
                // Create canvas with dimensions based on scale factor
                const canvas = document.createElement('canvas');
                canvas.width = width * scaleFactor;
                canvas.height = height * scaleFactor;
                const ctx = canvas.getContext('2d');
                
                // Fill with white background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Get SVG data
                const svgData = new XMLSerializer().serializeToString(svgElement);
                
                // Create a more efficient image/SVG processing approach
                const DOMURL = window.URL || window.webkitURL || window;
                const img = new Image();
                const svgBlob = new Blob([svgData], {type: 'image/svg+xml'});
                const url = DOMURL.createObjectURL(svgBlob);
                
                // Update progress
                if (document.getElementById('message')) {
                  document.getElementById('message').textContent = 'Converting image...';
                  document.getElementById('progress-fill').style.width = '75%';
                }
                
                img.onload = function() {
                  // Use setTimeout to prevent UI freeze
                  setTimeout(() => {
                    try {
                      // Set rendering quality
                      ctx.imageSmoothingEnabled = true;
                      ctx.imageSmoothingQuality = 'high';
                      
                      // Draw image at scaled size
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      DOMURL.revokeObjectURL(url);
                      
                      // Generate PNG at moderate quality for better performance
                      const pngDataUrl = canvas.toDataURL('image/png', 0.9);
                      
                      // Notify React Native to save to gallery
                      sendToRN('saveToGallery', {
                        dataUrl: pngDataUrl,
                        filename: 'cross-section-hd.png'
                      });
                      
                      debug("HD image save request sent");
                      
                      // Hide loading indicator if visible
                      if (document.getElementById('loading')) {
                        document.getElementById('loading').style.display = 'none';
                      }
                    } catch (drawError) {
                      debug("Error drawing image: " + drawError.toString());
                      if (document.getElementById('loading')) {
                        document.getElementById('loading').style.display = 'none';
                      }
                    }
                  }, 10); // Small delay to let UI update
                };
                
                img.onerror = function(e) {
                  debug("Error loading SVG image: " + e);
                  DOMURL.revokeObjectURL(url);
                  if (document.getElementById('loading')) {
                    document.getElementById('loading').style.display = 'none';
                  }
                };
                
                // Initiate image loading
                img.src = url;
                
              } catch (canvasError) {
                debug("Error creating canvas: " + canvasError.toString());
                if (document.getElementById('loading')) {
                  document.getElementById('loading').style.display = 'none';
                }
                
                // Fallback to original resolution if HD fails
                sendFallbackImage(svgElement);
              }
            }, 50); // Delay to let UI update before heavy processing
            
          } catch (error) {
            debug("Error in save to gallery: " + error.toString());
            if (document.getElementById('loading')) {
              document.getElementById('loading').style.display = 'none';
            }
            
            // Try fallback at original resolution
            try {
              sendFallbackImage(document.querySelector('svg'));
            } catch (e) {
              debug("Fallback save also failed: " + e.toString());
            }
          }
        }

        // Fallback function that sends the original resolution image if HD fails
        function sendFallbackImage(svgElement) {
          if (!svgElement) return;
          
          try {
            debug("Using fallback image save at original resolution");
            
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], {type: 'image/svg+xml'});
            const url = URL.createObjectURL(svgBlob);
            
            const img = new Image();
            const canvas = document.createElement('canvas');
            const svgRect = svgElement.getBoundingClientRect();
            
            canvas.width = svgRect.width;
            canvas.height = svgRect.height;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            img.onload = function() {
              ctx.drawImage(img, 0, 0);
              URL.revokeObjectURL(url);
              
              const pngDataUrl = canvas.toDataURL('image/png', 0.8);
              
              sendToRN('saveToGallery', {
                dataUrl: pngDataUrl,
                filename: 'cross-section.png'
              });
              
              debug("Fallback image save request sent");
            };
            
            img.onerror = function() {
              debug("Fallback image loading failed");
              URL.revokeObjectURL(url);
            };
            
            img.src = url;
          } catch (error) {
            debug("Fallback image generation failed: " + error.toString());
          }
        }
        
        // Send data statistics back to React Native
        function sendDataStats() {
          sendToRN('dataStats', {
            stats: {
              displayedBlocks: displayedBlocksCount,
              displayedElevationPoints: displayedElevationPointsCount,
              displayedPitPoints: displayedPitPointsCount
            }
          });
        }
        
        // Update progress
        function updateProgress(percent, message) {
          const progressFill = document.getElementById('progress-fill');
          if (progressFill) {
            progressFill.style.width = \`\${percent}%\`;
          }
          
          const messageEl = document.getElementById('message');
          if (messageEl && message) {
            messageEl.textContent = message;
          }
          
          sendToRN('progressUpdate', { percent, message });
        }
                
        // Start and end points
        const lineLength = ${lineLength};
        const sourceProjection = "${sourceProjection}";
        const startLat = ${startLat};
        const startLng = ${startLng};
        const endLat = ${endLat};
        const endLng = ${endLng};
        
        // Function to convert distance to coordinates
        const processCoordinatesToXaxis = (distance) => {
          // Calculate the ratio of the given distance to the total distance
          const ratio = distance / lineLength;
          
          // Calculate the interpolated coordinates
          const lat = startLat + ratio * (endLat - startLat);
          const lng = startLng + ratio * (endLng - startLng);
          
          // Format coordinates for display
          const formattedLat = lat.toFixed(6) + (lat >= 0 ? '°N' : '°S');
          const formattedLng = lng.toFixed(6) + (lng >= 0 ? '°E' : '°W');
          
          return {
            x: distance,
            lat: lat,
            lng: lng,
            formattedLat: formattedLat,
            formattedLng: formattedLng,
            label: \`\${formattedLat}, \${formattedLng}\`
          };
        };
        
        // Set up Proj4 projections for coordinate conversion
        proj4.defs('EPSG:4326', "+proj=longlat +datum=WGS84 +no_defs");
        proj4.defs(sourceProjection, "+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs");

        elevationPoints = ${safeStringify(elevationPoints)};
        
        // Get elevation range for Y-axis scaling
        function getElevationRange(blocks, elevationPoints, pitPoints) {
          try {
            const allElevations = [];
            
            // Add block elevations
            blocks.forEach(block => {
              allElevations.push(block.elevation + block.height/2);
              allElevations.push(block.elevation - block.height/2);
            });
            
            // Add elevation profile points
            if (elevationPoints && elevationPoints.length > 0) {
              elevationPoints.forEach(point => {
                if (point.elevation !== null && !isNaN(point.elevation)) {
                  allElevations.push(point.elevation);
                }
              });
            }
            
            // Add pit points
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
              return { min: 0, max: 100 };
            }
            
            // Find min and max with padding
            const min = Math.min(...validElevations) - 20;
            const max = Math.max(...validElevations) + 20;
            
            return { min, max };
          } catch (err) {
            return { min: 0, max: 100 };
          }
        }
        
        // Main rendering function
        function renderVisualization() {
          if (isRendering || hasRendered) return;
          isRendering = true;
          
          try {
            updateProgress(80, "Rendering visualization...");
            
            // First, process the data
            // For Block Model
            const sectionBlocks = ${safeStringify(intersectingBlocks)};
            displayedBlocksCount = ${safeStringify(blockCount)};
            updateProgress(30, "Block model processing complete");

            // For Elevation
            const elevationProfile = ${safeStringify(elevationPoints)};
            displayedElevationPointsCount = elevationPoints.filter(p => p.elevation !== null).length;

            const pitProfile = ${safeStringify(pitPoints)};
            displayedPitPointsCount = pitProfile.length;
            
            // Send the final data stats
            sendDataStats();
            
            const sortedIntersections = [...pitProfile].sort(
              (a, b) => a.distance - b.distance
            );
            
            // Get elevation range
            const elevRange = getElevationRange(sectionBlocks, elevationProfile, pitProfile);
            
            // Setup dimensions - Adjusted to provide more space for legend
            const margin = { top: 20, right: 30, bottom: 280, left: 80 }; // Increased bottom margin for legend below axis label

            const chartWidth = Math.max(window.innerWidth, lineLength / 2);
            const height = window.innerHeight * 0.85; // Slightly increase overall height
            const innerWidth = chartWidth - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;
            
            // Notify React Native of chart width
            if (!chartWidthSent) {
              sendToRN('chartDimensions', { width: chartWidth });
              chartWidthSent = true;
            }
            
            // Create SVG - with explicit viewBox for better control
            const svg = d3.select('#chart')
              .append('svg')
              .attr('width', chartWidth)
              .attr('height', height)
              .attr('viewBox', \`0 0 \${chartWidth} \${height}\`)
              .attr('preserveAspectRatio', 'xMidYMid meet');
              
            // Create tooltip
            const tooltip = d3.select('#tooltip');
              
            // Create main group
            const g = svg.append('g')
              .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);
            
            // Create scales
            const xScale = d3.scaleLinear()
              .domain([0, lineLength])
              .range([0, innerWidth]);

            const yScale = d3.scaleLinear()
              .domain([elevRange.min, elevRange.max])
              .range([innerHeight, 0]);
          
            // Generate tick values at reasonable intervals
            const tickCount = 25; // Adjust as needed
            const tickValues = Array.from({ length: tickCount + 1 }, (_, i) => i * (lineLength / tickCount));
            
            // Create axes with coordinate labels
            const xAxis = d3.axisBottom(xScale)
              .tickValues(tickValues)
              .tickFormat(d => {
                // Convert distance to coordinates
                const coordInfo = processCoordinatesToXaxis(d);
                return coordInfo.label;
              });

            const yAxis = d3.axisLeft(yScale)
              .tickFormat(d => \`\${d.toFixed(0)}mdpl\`);
              
            // Add axes with rotated labels for better readability
            g.append('g')
              .attr('class', 'x axis')
              .attr('transform', \`translate(0, \${innerHeight})\`)
              .call(xAxis)
              .selectAll("text")  
              .style("text-anchor", "end")
              .attr("dx", "-.8em")
              .attr("dy", ".15em")
              .attr("transform", "rotate(-90)");
              
            g.append('g')
              .attr('class', 'y axis')
              .call(yAxis);
              
            // Add axis labels
            g.append('text')
              .attr('x', innerWidth / 2)
              .attr('y', innerHeight + 170) // Position for x-axis label
              .attr('text-anchor', 'middle')
              .attr('font-size', '14px')
              .attr('font-weight', '500')
              .text('Cross-section coordinates');
              
            g.append('text')
              .attr('transform', 'rotate(-90)')
              .attr('x', -innerHeight / 2)
              .attr('y', -60)
              .attr('text-anchor', 'middle')
              .attr('font-size', '14px')
              .attr('font-weight', '500')
              .text('Elevation (mdpl)');

            // Add grid
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
                        
            // Collect unique rock types for legend
            const uniqueRocks = {};
            
            // Draw blocks
            if (sectionBlocks && sectionBlocks.length > 0) {
              try {
                // Gather unique rock types
                sectionBlocks.forEach(block => {
                  const rockType = block.rock || 'unknown';
                  const color = block.color; 
                  uniqueRocks[rockType] = color;
                });
                
                // Create separate layers
                const blockLayer = g.append('g').attr('class', 'block-layer');
                const textLayer = g.append('g').attr('class', 'text-layer');

                // Draw blocks FIRST in block layer
                blockLayer.selectAll('.block')
                  .data(sectionBlocks)
                  .enter()
                  .append('rect')
                  .attr('class', 'block')
                  .attr('x', d => xScale(d.distance))
                  .attr('y', d => yScale(d.elevation + d.height/2))
                  .attr('width', d => xScale(d.distance + d.width) - xScale(d.distance))
                  .attr('height', d => Math.abs(yScale(d.elevation - d.height/2) - yScale(d.elevation + d.height/2)))
                  .attr('fill', d => d.color)
                  .attr('stroke', 'black')
                  .attr('stroke-width', 0.25)
                  .on('mouseover', function(event, d) {
                    // Highlight on hover
                    d3.select(this)
                      .attr('stroke-width', 2)
                      .attr('stroke', '#333');
                                          
                    // Show tooltip
                    tooltip.transition()
                      .duration(200)
                      .style('opacity', 1);
                    
                    // Calculate tooltip position
                    let left = event.pageX + 10;
                    let top = event.pageY - 28;
                    
                    // Ensure tooltip doesn't go off screen
                    const tooltipWidth = 280;
                    const tooltipHeight = 200;
                    
                    if (left + tooltipWidth > window.innerWidth) {
                      left = event.pageX - tooltipWidth - 10;
                    }
                    
                    if (top < 0) {
                      top = event.pageY + 20;
                    }
                    
                    // Format concentration values
                    const formatConc = (value) => {
                      return value !== -99 && value !== undefined && value !== null 
                        ? parseFloat(value).toFixed(3) + '%' 
                        : 'N/A';
                    };
                    
                    tooltip.html(
                      \`<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        <div style="margin-bottom: 6px;"><strong style="color: #212529; font-weight: 600;">Rock Type:</strong> <span style="color: #495057;">\${d.rock || 'unknown'}</span></div>
                        <div style="margin-bottom: 6px;"><strong style="color: #212529; font-weight: 600;">Ni:</strong> <span style="color: #495057;">\${formatConc(d.ni_ok)}</span></div>
                        <div style="margin-bottom: 6px;"><strong style="color: #212529; font-weight: 600;">Fe:</strong> <span style="color: #495057;">\${formatConc(d.fe_ok)}</span></div>
                        <div style="margin-bottom: 6px;"><strong style="color: #212529; font-weight: 600;">Co:</strong> <span style="color: #495057;">\${formatConc(d.co_idw)}</span></div>
                        <div style="margin-bottom: 6px;"><strong style="color: #212529; font-weight: 600;">Elevation:</strong> <span style="color: #495057;">\${parseFloat(d.elevation).toFixed(1)}mdpl</span></div>
                        <div style="margin-bottom: 6px;"><strong style="color: #212529; font-weight: 600;">Distance:</strong> <span style="color: #495057;">\${parseFloat(d.distance).toFixed(1)}m</span></div>
                        <div style="margin-bottom: 6px;"><strong style="color: #212529; font-weight: 600;">Width:</strong> <span style="color: #495057;">\${parseFloat(d.width).toFixed(1)}m</span></div>
                        <div><strong style="color: #212529; font-weight: 600;">Height:</strong> <span style="color: #495057;">\${parseFloat(d.height).toFixed(1)}m</span></div>
                      </div>\`
                    )
                    .style('left', left + 'px')
                    .style('top', top + 'px');
                  })
                  .on('mouseout', function() {
                    // Reset on mouseout
                    d3.select(this)
                      .attr('stroke-width', 0.5)
                      .attr('stroke', 'black');
                      
                    // Hide tooltip
                    tooltip.transition()
                      .duration(500)
                      .style('opacity', 0);
                  });

                // Draw text AFTER in text layer (will be on top)
                textLayer.selectAll('.block-text')
                  .data(sectionBlocks)
                  .enter()
                  .append('text')
                  .attr('x', d => xScale(d.distance + d.width/2))
                  .attr('y', d => yScale(d.elevation))
                  .attr('text-anchor', 'middle')
                  .attr('dominant-baseline', 'middle')
                  .attr('fill', 'white')
                  .attr('font-size', function(d) {
                    const blockWidth = Math.abs(xScale(d.distance + d.width) - xScale(d.distance));
                    const blockHeight = Math.abs(yScale(d.elevation - d.height/2) - yScale(d.elevation + d.height/2));
                    const minDimension = Math.min(blockWidth, blockHeight);
                    const scaleFactor = 0.35;
                    const minFontSize = 6;
                    const maxFontSize = 16;
                    const calculatedSize = Math.max(minFontSize, Math.min(minDimension * scaleFactor, maxFontSize));
                    return calculatedSize + 'px';
                  })
                  .attr('font-weight', 'bold')
                  .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
                  .text(d => {
                    if (d.ni_ok !== -99 && d.ni_ok !== undefined && d.ni_ok !== null) {
                      return parseFloat(d.ni_ok).toFixed(2) + '%';
                    }
                    return '';
                  })
                  .attr('visibility', function(d) {
                    // Hide text if no valid value
                    if (d.ni_ok === -99 || d.ni_ok === undefined || d.ni_ok === null) {
                      return 'hidden';
                    }
                    
                    // Calculate block dimensions in pixels
                    const blockWidth = Math.abs(xScale(d.distance + d.width) - xScale(d.distance));
                    const blockHeight = Math.abs(yScale(d.elevation - d.height/2) - yScale(d.elevation + d.height/2));
                    
                    // Hide text if block is too small
                    if (blockWidth < 20 || blockHeight < 20) {
                      return 'hidden';
                    }
                    
                    return 'visible';
                  });
                  
              } catch (err) {
                debug("Error drawing blocks: " + err.message);
              }
            }
            
            // Draw elevation profile
            if (elevationProfile.length > 0 && elevationProfile.some(p => p.elevation !== null)) {
              try {
                // Create line generator
                const line = d3.line()
                  .x(d => xScale(d.distance))
                  .y(d => yScale(d.elevation))
                  .curve(d3.curveLinear)
                  .defined(d => d.elevation !== null);
                  
                // Add path
                g.append('path')
                  .datum(elevationProfile.filter(p => p.elevation !== null))
                  .attr('fill', 'none')
                  .attr('stroke', 'green')
                  .attr('stroke-width', 2)
                  .attr('d', line);
              } catch (err) {
                debug("Error drawing elevation profile: " + err.message);
              }
            }
                      
            // Draw pit boundaries
            if (pitProfile && pitProfile.length > 0) {
              try {
                // Reduced filtering - only filter very close points
                const filteredPitPoints = [];
                if (pitProfile.length > 0) {
                  // Add the first point
                  filteredPitPoints.push(pitProfile[0]);
                  
                  // Only filter extremely close points (2m instead of 5m)
                  const minDistance = 2; // meters
                  for (let i = 1; i < pitProfile.length; i++) {
                    const prevPoint = filteredPitPoints[filteredPitPoints.length - 1];
                    const currPoint = pitProfile[i];
                    
                    // Calculate distance between points
                    const distance = Math.abs(currPoint.distance - prevPoint.distance);
                    
                    // Only add if the point is far enough from previous point
                    if (distance > minDistance) {
                      filteredPitPoints.push(currPoint);
                    }
                  }
                }

                // 1. First, draw a thicker solid line behind the dashed line for better visibility
                const pitLineBg = d3.line()
                  .x(d => xScale(d.distance))
                  .y(d => yScale(d.elevation))
                  .curve(d3.curveLinear); // Use linear for more accurate representation
                
                g.append('path')
                  .datum(sortedIntersections)
                  .attr('fill', 'none')
                  .attr('stroke', '#F4AE4D')  // Orange pit boundary color
                  .attr('stroke-width', 1)    // Thicker solid line behind
                  .attr('stroke-opacity', 0.3) // Semi-transparent
                  .attr('d', pitLineBg);
                
                // 2. Draw dashed line over it
                const pitLine = d3.line()
                  .x(d => xScale(d.distance))
                  .y(d => yScale(d.elevation))
                  .curve(d3.curveLinear);
                
                g.append('path')
                  .datum(sortedIntersections)
                  .attr('fill', 'none')
                  .attr('stroke', '#F4AE4D')
                  .attr('stroke-width', 1.0)
                  .attr('stroke-dasharray', '5,5')
                  .attr('d', pitLine);
                
                // Add fewer marker points - just at key inflection points
                if (filteredPitPoints.length > 3) {
                  g.selectAll('.pit-marker')
                    .data(filteredPitPoints.filter((_, i) => 
                      i === 0 || i === filteredPitPoints.length - 1 || i % Math.max(3, Math.ceil(filteredPitPoints.length / 15)) === 0
                    ))
                    .enter()
                    .append('circle')
                    .attr('class', 'pit-marker')
                    .attr('cx', d => xScale(d.distance))
                    .attr('cy', d => yScale(d.elevation))
                    .attr('r', 2)  // Larger markers
                    .attr('fill', '#F4AE4D')
                    .attr('stroke', '#fff')  // White border for visibility
                    .attr('stroke-width', 1);
                }
              } catch (err) {
                debug("Error drawing pit boundary: " + err.message);
              }
            }
            
            // Create legend - Position below the x-axis label
            const legendWidth = innerWidth * 0.9;
            const legendHeight = 50;
            const legendX = margin.left + (innerWidth - legendWidth) / 2;
            // Position legend below the x-axis label with some spacing
            const legendY = margin.top + innerHeight + 190; // 190 = 170 (axis label position) + 20 (spacing)

            // Create the legend container with a light background
            const legendBox = svg.append('g')
              .attr('class', 'legend-container')
              .attr('transform', \`translate(\${legendX}, \${legendY})\`);

            // Add a subtle background to make legend more visible
            legendBox.append('rect')
              .attr('width', legendWidth)
              .attr('height', legendHeight)
              .attr('rx', 5) // Rounded corners
              .attr('ry', 5) // Fixed ry value
              .attr('fill', 'white')
              .attr('stroke', '#ddd')
              .attr('stroke-width', 1)
              .attr('opacity', 0.95);

            // Calculate how many items we need to display
            const legendItems = [...Object.entries(uniqueRocks)];
            if (elevationProfile && elevationProfile.some(p => p.elevation !== null)) {
              legendItems.push(['Terrain Elevation', 'green']);
            }
            if (pitProfile && pitProfile.length > 0) {
              legendItems.push(['Pit Boundary', '#F4AE4D']);
            }

            // Calculate spacing
            const itemWidth = legendWidth / legendItems.length;

            // Add each legend item with equal spacing
            legendItems.forEach((item, i) => {
              const [label, color] = item;
              const x = i * itemWidth;
              
              const legendItem = legendBox.append('g')
                .attr('transform', \`translate(\${x + itemWidth/2 - 50}, 25)\`); // Center items better
              
              if (label === 'Terrain Elevation') {
                // Draw a line for terrain elevation
                legendItem.append('line')
                  .attr('x1', 0)
                  .attr('y1', 0)
                  .attr('x2', 20)
                  .attr('y2', 0)
                  .attr('stroke', color)
                  .attr('stroke-width', 2.5);
              } else if (label === 'Pit Boundary') {
                // Draw a dashed line for pit boundary
                // First a solid background
                legendItem.append('line')
                  .attr('x1', 0)
                  .attr('y1', 0) 
                  .attr('x2', 20)
                  .attr('y2', 0)
                  .attr('stroke', color)
                  .attr('stroke-width', 3.5)
                  .attr('stroke-opacity', 0.3);
                  
                // Then the dashed line
                legendItem.append('line')
                  .attr('x1', 0)
                  .attr('y1', 0)
                  .attr('x2', 20)
                  .attr('y2', 0)
                  .attr('stroke', color)
                  .attr('stroke-width', 2.5)
                  .attr('stroke-dasharray', '3,3');
              } else {
                // Draw a rectangle for rock types
                legendItem.append('rect')
                  .attr('width', 20)
                  .attr('height', 12)
                  .attr('fill', color)
                  .attr('stroke', 'black')
                  .attr('stroke-width', 0.5);
              }
              
              // Add label text with better visibility
              legendItem.append('text')
                .attr('x', 25)
                .attr('y', 5)
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '12px')
                .attr('font-weight', '500') // Slightly bold
                .text(label);
            });
            
            updateProgress(100, "Visualization complete");
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            
            // Mark as rendered
            hasRendered = true;
            isRendering = false;
            
            // Notify React Native with data stats
            sendToRN('renderComplete', { 
              message: 'D3 visualization complete',
              chartWidth: chartWidth,
              dataStats: {
                displayedBlocks: displayedBlocksCount,
                displayedElevationPoints: displayedElevationPointsCount,
                displayedPitPoints: displayedPitPointsCount
              }
            });
          } catch (error) {
            isRendering = false;
            debug('Error rendering visualization: ' + error.toString());
            document.getElementById('message').textContent = 'Error: ' + error.toString();
            sendToRN('renderError', { error: error.toString() });
          }
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
            
            // Check if Proj4 is loaded
            if (!window.proj4) {
              document.getElementById('message').textContent = 'Error: Proj4.js not loaded';
              sendToRN('renderError', { error: 'Proj4.js not loaded' });
              return;
            }
            
            // Add a short delay to let WebView stabilize
            setTimeout(() => {
              renderVisualization();
            }, 200);
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
