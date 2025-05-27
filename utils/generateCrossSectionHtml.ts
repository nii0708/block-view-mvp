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
  sourceProjection: string,
  customColorMapping?: {
    [key: string]: { color: string; opacity: number } | string;
  }
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

  const customColorMappingString = JSON.stringify(customColorMapping || {});

  // HTML template with fixed legend position
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <!-- CRITICAL: Viewport meta tag for proper touch support -->
      <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=0.5, maximum-scale=10.0, user-scalable=yes" />
      <title>Cross Section View</title>
      
      <!-- Include D3.js -->
      <script src="https://d3js.org/d3.v7.min.js"></script>
      <!-- Include Proj4.js for coordinate conversion -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.8.0/proj4.js"></script>
      
      <style>
        /* Enhanced CSS for unlimited pan/zoom */
        html, body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background-color: white;
          height: 100%;
          width: 100%;
          overflow: hidden;
          /* Allow D3 to handle all touch interactions */
          touch-action: none;
        }

        #chart-container {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background-color: white;
          position: relative;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          /* Allow D3 to handle all touch events */
          touch-action: none;
          -webkit-overflow-scrolling: touch;
          display: flex;
          flex-direction: column;
        }
        
        #chart {
          flex: 1;
          width: 100%;
          background-color: white;
          /* Prevent text selection during zoom */
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          /* Important: allow overflow for unlimited panning */
          overflow: visible;
          position: relative;
        }
        
        /* Fixed legend container */
        #legend-container {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          max-width: 600px;
          background: white;
          border: 1.5px solid #999;
          border-radius: 5px;
          padding: 10px 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 1000;
          display: flex;
          justify-content: space-around;
          align-items: center;
          min-height: 40px;
          opacity: 0.95;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 10px;
        }
        
        .legend-swatch {
          width: 20px;
          height: 12px;
          border: 0.5px solid black;
        }
        
        .legend-line {
          width: 20px;
          height: 2px;
          background-color: currentColor;
        }
        
        .legend-dashed-line {
          width: 20px;
          height: 2px;
          background-image: linear-gradient(to right, currentColor 0%, currentColor 50%, transparent 50%, transparent 100%);
          background-size: 6px 2px;
          background-repeat: repeat-x;
        }
        
        .legend-label {
          font-size: 12px;
          font-weight: 500;
          color: #333;
        }
        
        svg {
          /* Let D3 handle all interactions */
          touch-action: none;
          /* Prevent tap highlight on mobile */
          -webkit-tap-highlight-color: transparent;
          /* Allow overflow for unlimited panning */
          overflow: visible;
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
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .debug-info {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(255,255,255,0.9);
          padding: 10px;
          border-radius: 5px;
          font-size: 12px;
          display: none; /* Change to 'block' for debugging */
          z-index: 100;
        }
      </style>
    </head>
    <body>
      <div id="chart-container">
        <div id="chart"></div>
        <!-- Fixed legend container outside of chart -->
        <div id="legend-container">
          <!-- Legend items will be dynamically added here -->
        </div>
      </div>
      
      <div id="tooltip" class="tooltip"></div>
      
      <!-- Loading removed - handled by React Native layer -->
      
      <script>
        // State variables
        let isRendering = false;
        let hasRendered = false;
        window.currentZoom = null;
        window.svg = null;
        let g = null;
        let lastLogTime = 0;
        
        // Chart dimensions (will be set during rendering)
        let chartDimensions = {
          width: 0,
          height: 0,
          margin: null
        };

        const customColorMapping = ${customColorMappingString};
        
        // Update getRockColor function in the HTML
        function getRockColor(rockType) {
          const rockTypeKey = rockType.toLowerCase();
          
          // Check custom mapping first
          if (customColorMapping && customColorMapping[rockTypeKey]) {
            const mapping = customColorMapping[rockTypeKey];
            if (typeof mapping === 'string') {
              return mapping;
            } else if (mapping && mapping.color) {
              return mapping.color;
            }
          }
          
          // Fallback to defaults
          const rockColors = {
            ore: "#b40c0d",
            waste: "#606060",
            overburden: "#a37c75",
            lim: "#045993",
            sap: "#75499c",
            unknown: "#CCCCCC"
          };
          
          return rockColors[rockTypeKey] || "#CCCCCC";
        }
        
        // Data statistics tracking
        let displayedBlocksCount = 0;
        let displayedElevationPointsCount = 0;
        let displayedPitPointsCount = 0;
        
        // Debug functionality
        const debugMode = false; // Set to true to show debug info
        if (debugMode) {
          document.getElementById('debug-info').style.display = 'block';
        }
        
        function updateDebug(event, data) {
          if (!debugMode) return;
          document.getElementById('last-event').textContent = event;
          if (data.touches !== undefined) {
            document.getElementById('touch-count').textContent = data.touches;
          }
          if (data.scale !== undefined) {
            document.getElementById('zoom-level').textContent = data.scale.toFixed(2);
          }
        }
        
        // Helper functions
        function debug(message) {
          const now = Date.now();
          if (now - lastLogTime > 500) {
            lastLogTime = now;
            console.log(message);
            updateDebug('log', { message });
            
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'debug',
                message: message
              }));
            }
          }
        }
        
        function sendToRN(type, data) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: type,
              ...data
            }));
          }
        }
        
        // Send data statistics
        function sendDataStats() {
          sendToRN('dataStats', {
            stats: {
              displayedBlocks: displayedBlocksCount,
              displayedElevationPoints: displayedElevationPointsCount,
              displayedPitPoints: displayedPitPointsCount
            }
          });
        }
        
        // Update progress - simplified since loading is handled by React Native
        function updateProgress(percent, message) {
          sendToRN('progressUpdate', { percent, message });
        }
        
        // Save to gallery function - Updated to capture full chart
        function saveToGallery() {
          try {
            const svgElement = document.querySelector('svg');
            if (!svgElement) {
              debug("No SVG element found to save to gallery");
              return;
            }
            
            // Send progress to React Native
            sendToRN('progressUpdate', { percent: 50, message: 'Preparing full-size image...' });
            
            // Get the original chart dimensions
            const width = chartDimensions.width;
            const height = chartDimensions.height;
            const margin = chartDimensions.margin;
            
            if (!width || !height || !margin) {
              debug("Chart dimensions not set");
              return;
            }
            
            // Save current transform
            const currentTransform = g ? g.attr('transform') : null;
            
            // Get current zoom transform
            const currentZoomTransform = d3.zoomTransform(svgElement);
            
            // Temporarily reset all transforms
            if (g) {
              g.attr('transform', \`translate(\${margin.left}, \${margin.top})\`);
            }
            
            // Reset zoom transform on SVG
            d3.select(svgElement).call(window.currentZoom.transform, d3.zoomIdentity);
            
            const scaleFactor = 2; // For high resolution
            
            setTimeout(() => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = width * scaleFactor;
                canvas.height = height * scaleFactor;
                const ctx = canvas.getContext('2d');
                
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Create a clean SVG copy with original dimensions
                const svgClone = svgElement.cloneNode(true);
                svgClone.setAttribute('width', width);
                svgClone.setAttribute('height', height);
                svgClone.setAttribute('viewBox', \`0 0 \${width} \${height}\`);
                
                // Ensure the main group has the reset transform
                const mainGroup = svgClone.querySelector('g');
                if (mainGroup) {
                  mainGroup.setAttribute('transform', \`translate(\${margin.left}, \${margin.top})\`);
                }
                
                const svgData = new XMLSerializer().serializeToString(svgClone);
                const DOMURL = window.URL || window.webkitURL || window;
                const img = new Image();
                const svgBlob = new Blob([svgData], {type: 'image/svg+xml'});
                const url = DOMURL.createObjectURL(svgBlob);
                
                sendToRN('progressUpdate', { percent: 75, message: 'Converting to high-resolution image...' });
                
                img.onload = function() {
                  setTimeout(() => {
                    try {
                      ctx.imageSmoothingEnabled = true;
                      ctx.imageSmoothingQuality = 'high';
                      
                      // Scale the drawing to fit the canvas
                      ctx.scale(scaleFactor, scaleFactor);
                      ctx.drawImage(img, 0, 0, width, height);
                      
                      DOMURL.revokeObjectURL(url);
                      
                      // Restore the original transforms
                      if (currentTransform && g) {
                        g.attr('transform', currentTransform);
                      }
                      if (window.currentZoom && svgElement) {
                        d3.select(svgElement).call(window.currentZoom.transform, currentZoomTransform);
                      }
                      
                      const pngDataUrl = canvas.toDataURL('image/png', 0.95);
                      
                      sendToRN('saveToGallery', {
                        dataUrl: pngDataUrl,
                        filename: \`cross-section-full-\${new Date().getTime()}.png\`
                      });
                      
                      debug("Full chart HD image save request sent");
                      
                    } catch (drawError) {
                      debug("Error drawing image: " + drawError.toString());
                      // Restore transforms on error too
                      if (currentTransform && g) {
                        g.attr('transform', currentTransform);
                      }
                      if (window.currentZoom && svgElement) {
                        d3.select(svgElement).call(window.currentZoom.transform, currentZoomTransform);
                      }
                    }
                  }, 10);
                };
                
                img.onerror = function(e) {
                  debug("Error loading SVG image: " + e);
                  DOMURL.revokeObjectURL(url);
                  // Restore transforms on error
                  if (currentTransform && g) {
                    g.attr('transform', currentTransform);
                  }
                  if (window.currentZoom && svgElement) {
                    d3.select(svgElement).call(window.currentZoom.transform, currentZoomTransform);
                  }
                };
                
                img.src = url;
                
              } catch (canvasError) {
                debug("Error creating canvas: " + canvasError.toString());
                // Restore transforms on error
                if (currentTransform && g) {
                  g.attr('transform', currentTransform);
                }
                if (window.currentZoom && svgElement) {
                  d3.select(svgElement).call(window.currentZoom.transform, currentZoomTransform);
                }
              }
            }, 50);
            
          } catch (error) {
            debug("Error in save to gallery: " + error.toString());
          }
        }
        
        // Data preparation
        const lineLength = ${lineLength};
        const sourceProjection = "${sourceProjection}";
        const startLat = ${startLat};
        const startLng = ${startLng};
        const endLat = ${endLat};
        const endLng = ${endLng};
        
        // Process coordinate conversion
        const processCoordinatesToXaxis = (distance) => {
          const ratio = distance / lineLength;
          const lat = startLat + ratio * (endLat - startLat);
          const lng = startLng + ratio * (endLng - startLng);
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
        
        // Set up Proj4 projections
        proj4.defs('EPSG:4326', "+proj=longlat +datum=WGS84 +no_defs");
        proj4.defs(sourceProjection, "+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs");
        
        elevationPoints = ${safeStringify(elevationPoints)};
        
        // Enhanced zoom function without translate limitations
        function createEnhancedZoom(xScale, yScale, innerWidth, innerHeight) {
          // Create zoom behavior with no translate limitations
          const zoom = d3.zoom()
            .scaleExtent([0.5, 10])
            // Remove extent and translateExtent to allow unlimited panning
            .on('start', function(event) {
              debug('Zoom start');
              updateDebug('zoom-start', { scale: event.transform.k });
            })
            .on('zoom', function(event) {
              // Apply transform
              g.attr('transform', event.transform);
              
              // Update debug
              updateDebug('zooming', { scale: event.transform.k });
              
              // Hide tooltip
              d3.select('#tooltip')
                .transition()
                .duration(0)
                .style('opacity', 0);
              
              // Send zoom level to React Native
              sendToRN('zoomUpdate', { 
                scale: event.transform.k,
                x: event.transform.x,
                y: event.transform.y
              });
            })
            .on('end', function(event) {
              debug('Zoom end');
              updateDebug('zoom-end', { scale: event.transform.k });
            });
          
          // Apply zoom to SVG with touch-optimized settings
          window.svg.call(zoom)
            .on("dblclick.zoom", null); // Disable double-click zoom
          
          // Store zoom reference globally
          window.currentZoom = zoom;
          
          // Add touch event listeners for debugging
          svg.node().addEventListener('touchstart', function(e) {
            updateDebug('touchstart', { touches: e.touches.length });
            debug(\`Touch start: \${e.touches.length} fingers\`);
          }, { passive: false });
          
          svg.node().addEventListener('touchmove', function(e) {
            updateDebug('touchmove', { touches: e.touches.length });
            if (e.touches.length === 2) {
              debug('Pinch gesture detected');
              e.preventDefault(); // Prevent default scrolling
            }
          }, { passive: false });
          
          svg.node().addEventListener('touchend', function(e) {
            updateDebug('touchend', { touches: e.touches.length });
            debug(\`Touch end: \${e.touches.length} fingers\`);
          }, { passive: false });
          
          return zoom;
        }
        
        // Create fixed legend function
        function createFixedLegend(uniqueRocks, hasElevation, hasPit) {
          const legendContainer = document.getElementById('legend-container');
          legendContainer.innerHTML = ''; // Clear existing legend
          
          // Add rock types
          Object.entries(uniqueRocks).forEach(([label, color]) => {
            const item = document.createElement('div');
            item.className = 'legend-item';
            
            const swatch = document.createElement('div');
            swatch.className = 'legend-swatch';
            swatch.style.backgroundColor = color;
            
            const labelElement = document.createElement('span');
            labelElement.className = 'legend-label';
            labelElement.textContent = label;
            
            item.appendChild(swatch);
            item.appendChild(labelElement);
            legendContainer.appendChild(item);
          });
          
          // Add terrain elevation
          if (hasElevation) {
            const item = document.createElement('div');
            item.className = 'legend-item';
            
            const line = document.createElement('div');
            line.className = 'legend-line';
            line.style.color = 'green';
            
            const labelElement = document.createElement('span');
            labelElement.className = 'legend-label';
            labelElement.textContent = 'Terrain Elevation';
            
            item.appendChild(line);
            item.appendChild(labelElement);
            legendContainer.appendChild(item);
          }
          
          // Add pit boundary
          if (hasPit) {
            const item = document.createElement('div');
            item.className = 'legend-item';
            
            const dashedLine = document.createElement('div');
            dashedLine.className = 'legend-dashed-line';
            dashedLine.style.color = '#F4AE4D';
            
            const labelElement = document.createElement('span');
            labelElement.className = 'legend-label';
            labelElement.textContent = 'Pit Boundary';
            
            item.appendChild(dashedLine);
            item.appendChild(labelElement);
            legendContainer.appendChild(item);
          }
        }
        
        // Main rendering function
        function renderVisualization() {
          if (isRendering || hasRendered) return;
          
          isRendering = true;
          
          try {
            updateProgress(80, "Rendering visualization...");
            
            // Prepare data
            const sectionBlocks = ${safeStringify(intersectingBlocks)};
            displayedBlocksCount = ${safeStringify(blockCount)};
            updateProgress(30, "Block model processing complete");
            
            const elevationProfile = ${safeStringify(elevationPoints)};
            displayedElevationPointsCount = elevationPoints.filter(p => p.elevation !== null).length;
            
            const pitProfile = ${safeStringify(pitPoints)};
            displayedPitPointsCount = pitProfile.length;
            
            // Send the final data stats
            sendDataStats();
            
            const sortedIntersections = [...pitProfile].sort(
              (a, b) => a.distance - b.distance
            );
            
            const elevRange = ${safeStringify(elevationRange)};
            
            // Setup dimensions - Fixed chart size regardless of content length
            const margin = { top: 40, right: 30, bottom: 200, left: 80 };
            
            // Calculate fixed chart width based on line length
            const minChartWidth = window.innerWidth;
            const pixelsPerMeter = 2; // Adjust this to control chart width
            const calculatedWidth = Math.max(minChartWidth, lineLength * pixelsPerMeter);
            const chartWidth = calculatedWidth; // Fixed width based on line length
            
            // Calculate fixed chart height based on elevation range
            const minHeight = 500;
            const maxHeight = 800;
            const elevationSpan = elevRange.max - elevRange.min;
            
            // Dynamic height calculation based on elevation range
            let baseHeight;
            if (elevationSpan < 20) {
              baseHeight = minHeight; // Small elevation range, use minimum height
            } else if (elevationSpan > 100) {
              baseHeight = maxHeight; // Large elevation range, use maximum height  
            } else {
              // Scale between min and max based on elevation range
              const heightRatio = (elevationSpan - 20) / 80; // normalize between 0-1
              baseHeight = minHeight + (maxHeight - minHeight) * heightRatio;
            }
            
            // Ensure height is proportional to window size
            baseHeight = Math.min(Math.max(window.innerHeight * 0.7, minHeight), maxHeight);
            
            const innerWidth = chartWidth - margin.left - margin.right;
            const innerHeight = baseHeight - margin.top - margin.bottom;
            
            // Store dimensions for screenshot function
            chartDimensions = {
              width: chartWidth,
              height: baseHeight,
              margin: margin
            };
            
            // Adjust container height to account for fixed legend
            const legendHeight = 60; // Height of fixed legend
            const chartContainerHeight = window.innerHeight - legendHeight - 20; // 20px for bottom spacing
            document.getElementById('chart').style.height = chartContainerHeight + 'px';
            
            // Create SVG
            window.svg = d3.select('#chart')
              .append('svg')
              .attr('width', chartWidth)
              .attr('height', baseHeight)
              .attr('viewBox', \`0 0 \${chartWidth} \${baseHeight}\`)
              .style('touch-action', 'none') // Critical for touch events
              .style('-webkit-tap-highlight-color', 'transparent') // Remove tap highlight
              .style('overflow', 'visible'); // Allow content to be visible outside bounds
            
            // Create tooltip
            const tooltip = d3.select('#tooltip');
            
            // Create main group
            g = svg.append('g')
              .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);
            
            // Create scales
            const xScale = d3.scaleLinear()
              .domain([0, lineLength])
              .range([0, innerWidth]);
            
            // Calculate block model elevation range for focus
            let blockMinElev = Infinity;
            let blockMaxElev = -Infinity;
            
            if (sectionBlocks && sectionBlocks.length > 0) {
              sectionBlocks.forEach(block => {
                const blockBottom = block.elevation - block.height/2;
                const blockTop = block.elevation + block.height/2;
                if (blockBottom < blockMinElev) blockMinElev = blockBottom;
                if (blockTop > blockMaxElev) blockMaxElev = blockTop;
              });
            }
            
            // Calculate the actual data range from all sources
            let actualMinElev = Infinity;
            let actualMaxElev = -Infinity;
            
            // Debug logging
            console.log('=== Elevation Range Calculation ===');
            
            // Check blocks
            if (sectionBlocks && sectionBlocks.length > 0) {
              sectionBlocks.forEach(block => {
                const blockBottom = block.elevation - block.height/2;
                const blockTop = block.elevation + block.height/2;
                actualMinElev = Math.min(actualMinElev, blockBottom);
                actualMaxElev = Math.max(actualMaxElev, blockTop);
              });
              console.log(\`Blocks: min=\${actualMinElev}, max=\${actualMaxElev}\`);
            }
            
            // Check elevation profile (FIXED: include all points)
            let elevMin = Infinity;
            let elevMax = -Infinity;
            if (elevationProfile && elevationProfile.length > 0) {
              elevationProfile.forEach(point => {
                if (point.elevation !== null && point.elevation !== undefined) {
                  elevMin = Math.min(elevMin, point.elevation);
                  elevMax = Math.max(elevMax, point.elevation);
                  actualMinElev = Math.min(actualMinElev, point.elevation);
                  actualMaxElev = Math.max(actualMaxElev, point.elevation);
                }
              });
              console.log(\`Elevation Profile: min=\${elevMin}, max=\${elevMax}\`);
              console.log(\`After Elevation - actualMin=\${actualMinElev}, actualMax=\${actualMaxElev}\`);
            }
            
            // Check pit boundary (FIXED: include all points)
            let pitMin = Infinity;
            let pitMax = -Infinity;
            if (pitProfile && pitProfile.length > 0) {
              pitProfile.forEach(point => {
                if (point.elevation !== null && point.elevation !== undefined) {
                  pitMin = Math.min(pitMin, point.elevation);
                  pitMax = Math.max(pitMax, point.elevation);
                  actualMinElev = Math.min(actualMinElev, point.elevation);
                  actualMaxElev = Math.max(actualMaxElev, point.elevation);
                }
              });
              console.log(\`Pit Boundary: min=\${pitMin}, max=\${pitMax}\`);
              console.log(\`After Pit - actualMin=\${actualMinElev}, actualMax=\${actualMaxElev}\`);
            }
            
            // Also check the elevRange that was passed in
            console.log(\`Original elevRange: min=\${elevRange.min}, max=\${elevRange.max}\`);
            
            // If no valid data found from our calculations, use the original elevRange
            if (actualMinElev === Infinity || actualMaxElev === -Infinity) {
              console.log('No valid data found in calculations, using original elevRange');
              actualMinElev = elevRange.min;
              actualMaxElev = elevRange.max;
            }
            
            // Ensure we capture the full range
            actualMinElev = Math.min(actualMinElev, elevRange.min);
            actualMaxElev = Math.max(actualMaxElev, elevRange.max);
            
            console.log(\`Final range before padding: min=\${actualMinElev}, max=\${actualMaxElev}\`);
            
            // Add generous padding to ensure all data is visible
            const padding = Math.max((actualMaxElev - actualMinElev) * 0.15, 5); // At least 5m padding
            let focusedMinElev = actualMinElev - padding;
            let focusedMaxElev = actualMaxElev + padding;
            
            // Ensure reasonable minimum height
            const minHeightRange = 30; // Increased from 20m to 30m
            if (focusedMaxElev - focusedMinElev < minHeightRange) {
              const center = (focusedMaxElev + focusedMinElev) / 2;
              focusedMinElev = center - minHeightRange / 2;
              focusedMaxElev = center + minHeightRange / 2;
            }
            
            console.log(\`Final Y-axis range: \${focusedMinElev.toFixed(1)} to \${focusedMaxElev.toFixed(1)}\`);
            console.log('=== End Elevation Range Calculation ===');
            
            const yScale = d3.scaleLinear()
              .domain([focusedMinElev, focusedMaxElev])
              .range([innerHeight, 0]);
            
            // Apply enhanced zoom with unlimited panning
            createEnhancedZoom(xScale, yScale, innerWidth, innerHeight);
            
            // Create axes
            const tickCount = 15;
            const tickValues = Array.from({ length: tickCount + 1 }, (_, i) => i * (lineLength / tickCount));
            
            const xAxis = d3.axisBottom(xScale)
              .tickValues(tickValues)
              .tickFormat(d => {
                const coordInfo = processCoordinatesToXaxis(d);
                return coordInfo.label;
              });
            
            const yAxis = d3.axisLeft(yScale)
              .tickFormat(d => \`\${d.toFixed(0)}mdpl\`);
            
            // Add axes
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
              .attr('y', innerHeight + 150)
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
                  .ticks(Math.floor(innerHeight / 40)) // Match the y-axis ticks
              );
            
            // Collect unique rock types for legend - USING getRockColor
            const uniqueRocks = {};
            sectionBlocks.forEach(block => {
              const rockType = block.rock || 'unknown';
              const color = getRockColor(rockType); // Use getRockColor instead of block.color
              uniqueRocks[rockType] = color;
            });
            
            // Draw blocks FIRST
            if (sectionBlocks && sectionBlocks.length > 0) {
              try {
                // Create block groups
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
                  .attr('fill', d => getRockColor(d.rock)) // Use getRockColor instead of d.color
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
                
                // Add text displaying the concentrate value
                blockGroups.append('text')
                  .attr('class', 'block-concentrate')
                  .attr('x', d => xScale(d.distance + d.width/2))
                  .attr('y', d => yScale(d.elevation))
                  .attr('text-anchor', 'middle')
                  .attr('dominant-baseline', 'middle')
                  .attr('fill', 'white')
                  .attr('pointer-events', 'none')
                  .text(d => d.concentrate !== undefined ? parseFloat(d.concentrate).toString() : '')
                  .attr('font-size', function(d) {
                    const blockWidth = Math.abs(xScale(d.distance + d.width) - xScale(d.distance));
                    const blockHeight = Math.abs(yScale(d.elevation - d.height/2) - yScale(d.elevation + d.height/2));
                    const minDimension = Math.min(blockWidth, blockHeight);
                    const scaleFactor = 0.35;
                    const minFontSize = 3;
                    const maxFontSize = 20;
                    const calculatedSize = Math.max(minFontSize, Math.min(minDimension * scaleFactor, maxFontSize));
                    return calculatedSize + 'px';
                  });
              } catch (err) {
                debug("Error drawing blocks: " + err.message);
              }
            }
            
            // Draw elevation profile with reduced opacity
            if (elevationProfile.length > 0 && elevationProfile.some(p => p.elevation !== null)) {
              try {
                const line = d3.line()
                  .x(d => xScale(d.distance))
                  .y(d => yScale(d.elevation))
                  .curve(d3.curveLinear)
                  .defined(d => d.elevation !== null);
                
                g.append('path')
                  .datum(elevationProfile.filter(p => p.elevation !== null))
                  .attr('fill', 'none')
                  .attr('stroke', 'green')
                  .attr('stroke-width', 2)
                  .attr('stroke-opacity', 0.5) // Reduced opacity to 50%
                  .attr('d', line);
              } catch (err) {
                debug("Error drawing elevation profile: " + err.message);
              }
            }
            
            // Draw pit boundaries
            if (pitProfile && pitProfile.length > 0) {
              try {
                const filteredPitPoints = [];
                if (pitProfile.length > 0) {
                  filteredPitPoints.push(pitProfile[0]);
                  const minDistance = 2;
                  for (let i = 1; i < pitProfile.length; i++) {
                    const prevPoint = filteredPitPoints[filteredPitPoints.length - 1];
                    const currPoint = pitProfile[i];
                    const distance = Math.abs(currPoint.distance - prevPoint.distance);
                    if (distance > minDistance) {
                      filteredPitPoints.push(currPoint);
                    }
                  }
                }
                
                // Draw background line
                const pitLineBg = d3.line()
                  .x(d => xScale(d.distance))
                  .y(d => yScale(d.elevation))
                  .curve(d3.curveLinear);
                
                g.append('path')
                  .datum(sortedIntersections)
                  .attr('fill', 'none')
                  .attr('stroke', '#F4AE4D')
                  .attr('stroke-width', 1)
                  .attr('stroke-opacity', 0.3)
                  .attr('d', pitLineBg);
                
                // Draw dashed line
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
                
                // Add marker points
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
                    .attr('r', 2)
                    .attr('fill', '#F4AE4D')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1);
                }
              } catch (err) {
                debug("Error drawing pit boundary: " + err.message);
              }
            }
            
            // Draw elevation profile LAST (on top of everything) with low opacity
            if (elevationProfile.length > 0 && elevationProfile.some(p => p.elevation !== null)) {
              try {
                const line = d3.line()
                  .x(d => xScale(d.distance))
                  .y(d => yScale(d.elevation))
                  .curve(d3.curveLinear)
                  .defined(d => d.elevation !== null);
                
                g.append('path')
                  .datum(elevationProfile.filter(p => p.elevation !== null))
                  .attr('fill', 'none')
                  .attr('stroke', 'green')
                  .attr('stroke-width', 2)
                  .attr('stroke-opacity', 0.5) // Reduced opacity to 50%
                  .attr('d', line);
              } catch (err) {
                debug("Error drawing elevation profile: " + err.message);
              }
            }
            
            // Create fixed legend
            createFixedLegend(
              uniqueRocks,
              elevationProfile && elevationProfile.some(p => p.elevation !== null),
              pitProfile && pitProfile.length > 0
            );
            
            updateProgress(100, "Visualization complete");
            
            // Mark as rendered
            hasRendered = true;
            isRendering = false;
            
            // Notify React Native
            sendToRN('renderComplete', { 
              message: 'D3 visualization complete with fixed legend',
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
            sendToRN('renderError', { error: error.toString() });
          }
        }
        
        // Initialize on DOM ready
        document.addEventListener('DOMContentLoaded', function() {
          try {
            // Verify dependencies
            if (!window.d3) {
              sendToRN('renderError', { error: 'D3.js not loaded' });
              return;
            }
            
            if (!window.proj4) {
              sendToRN('renderError', { error: 'Proj4.js not loaded' });
              return;
            }
            
            // Enable touch events globally
            document.addEventListener('touchstart', function() {}, { passive: false });
            
            // Render visualization
            setTimeout(() => {
              renderVisualization();
            }, 200);
            
          } catch (error) {
            debug('Error in main processing: ' + error.toString());
            sendToRN('renderError', { error: error.toString() });
          }
        });
      </script>
    </body>
    </html>
  `;
}
