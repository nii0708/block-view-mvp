import { processCrossSectionBlocks } from "./processCrossSectionBlocks";
import { processElevationData } from "./processElevationData";
import { processPitData } from "./processPitDataCrossSection";
import { getElevationRange } from "./getElevationRange";

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

  const elevationRange = getElevationRange(
    intersectingBlocks,
    elevationPoints,
    pitPoints
  );

  const safeStringify = (data: any) => {
    try {
      return JSON.stringify(data || []);
    } catch (e) {
      console.error("Error stringifying data:", e);
      return "[]";
    }
  };

  // HTML template with D3.js - Adding data stats messaging
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
      <title>Cross Section View</title>
      
      <!-- Include D3.js -->
      <script src="https://d3js.org/d3.v7.min.js"></script>
      <!-- Include Proj4.js for coordinate conversion - CRITICAL! -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.8.0/proj4.js"></script>
      
      <style>
        /* CSS styles dengan perbaikan untuk tooltip */
        html, body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background-color: white;
          height: auto;
          overflow: hidden;
        }

        #chart-container {
          margin-top: 10px;
          width: 100%;
          overflow: hidden;
          background-color: white;
          position: relative; // Important for legend positioning
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        #chart {
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
          position: fixed;
          background: #FFFFFF;
          border: 1px solid #DEE2E6;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 14px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease-in-out;
          z-index: 100;
          max-width: 280px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          color: #495057;
          line-height: 1.5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        }
        .legend-container {
          /* Removed since we're back to SVG legend */
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

        // Save to gallery function - this just sends a request to React Native to handle
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
    // Reduce from 3x to 2x if there are performance problems
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
              
              // Generate PNG at moderate quality for better performance (0.8 instead of 1.0)
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
            const elevRange = ${safeStringify(elevationRange)}
            
            // Calculate proper dimensions
            const margin = { top: 40, right: 30, bottom: 200, left: 80 }; // Further increase bottom margin 

            // Use full width for mobile
            const chartWidth = window.innerWidth;
            
            // Calculate height based on viewport but ensure it's not too small
            const minHeight = 400;
            const maxHeight = 800;
            const baseHeight = Math.min(Math.max(window.innerHeight * 0.7, minHeight), maxHeight);
            
            const innerWidth = chartWidth - margin.left - margin.right;
            const innerHeight = baseHeight - margin.top - margin.bottom;
            
            // Calculate total SVG height including margins and legend spacing
            const legendSpacing = 100; // More space for legend after rotated labels
            const totalHeight = baseHeight + legendSpacing;
            
            // Set the container height to match content
            document.getElementById('chart-container').style.height = totalHeight + 'px';
            
            // Create SVG
            const svg = d3.select('#chart')
            .append('svg')
            .attr('width', chartWidth)
            .attr('height', totalHeight)
            .attr('viewBox', \`0 0 \${chartWidth} \${totalHeight}\`);
            
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
              
            // Create zoom behavior for pinch-to-zoom
            const zoom = d3.zoom()
              .scaleExtent([0.5, 10]) // Allow zoom from 0.5x to 10x
              .translateExtent([[-chartWidth, -totalHeight], [chartWidth * 2, totalHeight * 2]]) // Allow more free panning
              .on('zoom', function(event) {
                g.attr('transform', \`translate(\${margin.left + event.transform.x}, \${margin.top + event.transform.y}) scale(\${event.transform.k})\`);
                
                // Hide tooltip during zoom
                tooltip.transition()
                  .duration(0)
                  .style('opacity', 0);
              });
            
            // Apply zoom to SVG
            svg.call(zoom);
          
            // Generate tick values at reasonable intervals
            const tickCount = 15;
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
              .attr('y', innerHeight + 150) // Moved further down to clear rotated coordinates
              .attr('text-anchor', 'middle')
              .text('Cross-section coordinates');
              
            g.append('text')
              .attr('transform', 'rotate(-90)')
              .attr('x', -innerHeight / 2)
              .attr('y', -60)
              .attr('text-anchor', 'middle')
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
            
            if (sectionBlocks && sectionBlocks.length > 0) {
  try {
    // Gather unique rock types
    sectionBlocks.forEach(block => {
      const rockType = block.rock || 'unknown';
      const color = block.color 
      uniqueRocks[rockType] = color;
    });
    
    // Create a group for each block that will contain both the rectangle and the text
    const blockGroups = g.selectAll('.block-group')
      .data(sectionBlocks)
      .enter()
      .append('g')
      .attr('class', 'block-group');
    
    // Add rectangles to each group
    blockGroups.append('rect')
      .attr('class', 'block')
      .attr('x', d => xScale(d.distance))
      .attr('y', d => yScale(d.elevation + d.height/2))
      .attr("width", d => xScale(d.distance + d.width) - xScale(d.distance))
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
        const tooltipWidth = 200;
        const tooltipHeight = 150;
        
        if (left + tooltipWidth > window.innerWidth) {
          left = event.pageX - tooltipWidth - 10;
        }
        
        if (top < 0) {
          top = event.pageY + 20;
        }
        
        tooltip.html(
          \`<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="margin-bottom: 6px;"><strong style="color: #212529; font-weight: 600;">Rock Type:</strong> <span style="color: #495057;">\${d.rock || 'unknown'}</span></div>
            <div style="margin-bottom: 6px;"><strong style="color: #212529; font-weight: 600;">Concentrate:</strong> <span style="color: #495057;">\${d.concentrate !== undefined ? parseFloat(d.concentrate) : 'N/A'}</span></div>
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
    
    // Add text displaying the concentrate value in the middle of each block
    blockGroups.append('text')
  .attr('class', 'block-concentrate')
  .attr('x', d => xScale(d.distance + d.width/2)) // Center horizontally
  .attr('y', d => yScale(d.elevation)) // Center vertically
  .attr('text-anchor', 'middle') // Ensure text is centered
  .attr('dominant-baseline', 'middle') // Vertical alignment
  .attr('fill', 'white') // Text color
  .attr('pointer-events', 'none') // Make text non-interactive
  .text(d => d.concentrate !== undefined ? parseFloat(d.concentrate) : '')
  .attr('font-size', function(d) {
    // Calculate block dimensions in pixels
    const blockWidth = Math.abs(xScale(d.distance + d.width) - xScale(d.distance));
    const blockHeight = Math.abs(yScale(d.elevation - d.height/2) - yScale(d.elevation + d.height/2));
    
    // Calculate a font size proportional to the block size
    // Base size on the smaller dimension (width or height)
    const minDimension = Math.min(blockWidth, blockHeight);
    
    // More aggressive scaling factor - adjust based on total blocks
    // This makes the text size more proportional to block size
    const scaleFactor = 0.35; 
    
    // More dynamic min/max constraints based on block size
    const minFontSize = 3; // Smaller minimum size
    const maxFontSize = 20; // Smaller maximum size
    
    // Calculate font size with improved constraints
    const calculatedSize = Math.max(minFontSize, Math.min(minDimension * scaleFactor, maxFontSize));
    
    return calculatedSize + 'px';
  })
  .attr('visibility', function(d) {
    // Calculate block dimensions in pixels
    const blockWidth = Math.abs(xScale(d.distance + d.width) - xScale(d.distance));
    const blockHeight = Math.abs(yScale(d.elevation - d.height/2) - yScale(d.elevation + d.height/2));
    
    // Text length based on the actual displayed text
    const textContent = d.concentrate !== undefined ? parseFloat(d.concentrate) : '';
    const textLength = textContent.length;
    
    // Estimate space needed - now more conservative
    const minWidthNeeded = textLength * 5; // Pixels per character (reduced from 6)
    const minHeightNeeded = 6; // Minimum height needed for text
    
    
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
            
            // Create legend OUTSIDE the zoomed group but INSIDE SVG
            const legendWidth = innerWidth * 0.8;
            const legendHeight = 40;
            const legendX = (innerWidth - legendWidth) / 2;
            const legendY = baseHeight - 40; // Position legend just below chart

            // Create the legend container directly on SVG (not in the zoomed group)
            const legendBox = svg.append('g')
              .attr('class', 'legend-container')
              .attr('transform', \`translate(\${margin.left + legendX}, \${legendY})\`);

            // Add a subtle background to make legend more visible
            legendBox.append('rect')
              .attr('width', legendWidth)
              .attr('height', legendHeight)
              .attr('rx', 5)
              .attr('ry', 5)
              .attr('fill', 'white')
              .attr('stroke', '#999')
              .attr('stroke-width', 1.5)
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
                .attr('transform', \`translate(\${x + 10}, 20)\`);
              
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
                .attr('font-weight', '500')
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
