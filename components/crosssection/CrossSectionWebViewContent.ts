/**
 * Generate D3 HTML content for cross section visualization
 */
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
  // Safely stringify data to prevent errors
  const safeStringify = (data: any) => {
    try {
      return JSON.stringify(data || []);
    } catch (e) {
      console.error("Error stringifying data:", e);
      return "[]";
    }
  };

  // HTML template with D3.js
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
  height: 80vh;
  overflow-x: auto;
  overflow-y: hidden;
  background-color: white;
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
        
        // For logging
        function debug(message) {
          const now = Date.now();
          if (now - lastLogTime > 500) {
            lastLogTime = now;
            
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
        
        // Parse data
        const blockModelData = ${safeStringify(blockModelData)};
        const elevationData = ${safeStringify(elevationData)};
        const pitData = ${safeStringify(pitData)};
        
        // Start and end points
        const startPoint = { lat: ${startLat}, lng: ${startLng} };
        const endPoint = { lat: ${endLat}, lng: ${endLng} };
        const lineLength = ${lineLength};
        const sourceProjection = "${sourceProjection}";
        
        // Set up Proj4 projections for coordinate conversion
        proj4.defs('EPSG:4326', "+proj=longlat +datum=WGS84 +no_defs");
        proj4.defs(sourceProjection, "+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs");

        // Convert line endpoints from WGS84 to UTM coordinates
        const startPointUTM = proj4('EPSG:4326', sourceProjection, [startPoint.lng, startPoint.lat]);
        const endPointUTM = proj4('EPSG:4326', sourceProjection, [endPoint.lng, endPoint.lat]);

        debug('Start point in UTM: ' + JSON.stringify(startPointUTM));
        debug('End point in UTM: ' + JSON.stringify(endPointUTM));
        
        // Color mapping for rock types
        const rockColorMap = {
          "ore": "#b40c0d",
          "waste": "#606060",
          "overburden": "#a37c75",
          "lim": "#045993",
          "sap": "#75499c",
          "unknown": "#CCCCCC"
        };
        
        // Get color for rock type
        function getColorForRock(rockType = "unknown") {
          const normalizedType = typeof rockType === 'string' ? rockType.toLowerCase() : 'unknown';
          return rockColorMap[normalizedType] || "#CCCCCC";
        }
        
        // Project point onto line with UTM coordinate support
        function projectPointOnLine(point, lineStart, lineEnd) {
  try {
    // Check for valid input
    if (!point || !lineStart || !lineEnd) {
      return { ratio: 0, distanceAlongLine: 0, distanceToLine: 9999 };
    }
    
    // IMPORTANT: Convert point coordinates to UTM 
    // We need to check if the point is already in UTM or needs conversion
    let pointX = point.x;
    let pointY = point.y;
    
    // If point is in WGS84 (lat/lng), convert it to UTM
    if (!point.isUTM && pointX && pointY && 
        pointX > -180 && pointX < 180 && 
        pointY > -90 && pointY < 90) {
      // This looks like it's in WGS84, convert to UTM
      try {
        const converted = proj4('EPSG:4326', sourceProjection, [pointX, pointY]);
        pointX = converted[0];
        pointY = converted[1];
      } catch (err) {
        // Continue with original coordinates
      }
    }
    
    // Use UTM coordinates for line
    const x1 = startPointUTM[0];
    const y1 = startPointUTM[1];
    const x2 = endPointUTM[0];
    const y2 = endPointUTM[1];
    
    // Vector from start to end of line
    const lineVectorX = x2 - x1;
    const lineVectorY = y2 - y1;
    
    // Vector from start of line to point
    const pointVectorX = pointX - x1;
    const pointVectorY = pointY - y1;
    
    // Length of the line segment squared
    const lineLengthSquared = lineVectorX * lineVectorX + lineVectorY * lineVectorY;
    
    // Prevent division by zero
    if (lineLengthSquared === 0) {
      return {
        ratio: 0,
        distanceAlongLine: 0,
        distanceToLine: Math.sqrt(pointVectorX * pointVectorX + pointVectorY * pointVectorY)
      };
    }
    
    // Calculate dot product
    const dotProduct = pointVectorX * lineVectorX + pointVectorY * lineVectorY;
    
    // Ratio along line segment
    const ratio = Math.max(0, Math.min(1, dotProduct / lineLengthSquared));
    
    // Calculate projected point
    const projectedX = x1 + ratio * lineVectorX;
    const projectedY = y1 + ratio * lineVectorY;
    
    // Distance from point to projection on line
    const dx = pointX - projectedX;
    const dy = pointY - projectedY;
    const distanceToLine = Math.sqrt(dx*dx + dy*dy);
    
    // Distance along the line
    const distanceAlongLine = ratio * lineLength;
    
    return {
      ratio,
      distanceAlongLine,
      distanceToLine,
      projectedPoint: [projectedX, projectedY]
    };
  } catch (err) {
    console.error("Error in projectPointOnLine:", err);
    return {
      ratio: 0,
      distanceAlongLine: 0,
      distanceToLine: 9999
    };
  }
}
        
        // Process block data for visualization
        function processCrossSectionBlocks() {
  try {
    updateProgress(10, "Processing block model data...");
    
    if (!blockModelData || blockModelData.length === 0) {
      debug("No block model data available");
      return generateTestBlocks();
    }
    
    const intersectingBlocks = [];
    // Mengurangi interval sampling untuk akurasi lebih baik
    const processInterval = blockModelData.length > 10000 ? 2 : 1;
    
    // Konversi block data menjadi polygon untuk perhitungan interseksi
    for (let i = 0; i < blockModelData.length; i += processInterval) {
      const block = blockModelData[i];
      
      // Skip invalid blocks
      if (!block.centroid_x && !block.x) continue;
      if (!block.centroid_y && !block.y) continue;
      if (!block.centroid_z && !block.z && !block.elevation) continue;
      
      // Get coordinates
      const x = parseFloat(block.centroid_x || block.x || block.X ||0);
      const y = parseFloat(block.centroid_y || block.y || block.Y ||0);
      const z = parseFloat(block.centroid_z || block.z || block.Z || block.elevation || 0);
      const width = parseFloat(block.dim_x || block.xinc || block.width || 10);
      const height = parseFloat(block.dim_z || block.zinc || block.height || 10);
      
      // Buat polygon untuk blok
      // Half width/height untuk membuat polygon dari titik pusat
      const halfWidth = width / 2;
      const halfDepth = width / 2; // Asumsi depth = width jika tidak ada
      
      // Buat polygon persegi panjang untuk blok (x,y coordinates)
      const polygon = [
        [x - halfWidth, y - halfDepth],  // Kiri bawah
        [x + halfWidth, y - halfDepth],  // Kanan bawah
        [x + halfWidth, y + halfDepth],  // Kanan atas
        [x - halfWidth, y + halfDepth],  // Kiri atas
        [x - halfWidth, y - halfDepth]   // Kembali ke kiri bawah untuk menutup polygon
      ];
      
      // Tentukan titik awal dan akhir garis cross-section
      const lineStart = [startPointUTM[0], startPointUTM[1]];
      const lineEnd = [endPointUTM[0], endPointUTM[1]];
      
      function lineIntersectsPolygon(lineStart, lineEnd, polygon) {
  // Untuk setiap sisi polygon, cek apakah berpotongan dengan garis
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

  // Cek juga apakah titik awal atau akhir garis berada di dalam polygon
  if (pointInPolygon(lineStart, polygon) || pointInPolygon(lineEnd, polygon)) {
    return true;
  }

  return false;
}

// Fungsi untuk mengecek apakah dua segmen garis berpotongan
function lineSegmentIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Hitung denominator
  const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Garis sejajar atau berimpit
  if (den === 0) {
    return false;
  }

  // Hitung parameter perpotongan garis
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;

  // Cek apakah perpotongan berada dalam kedua segmen
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

// Fungsi untuk mengecek apakah sebuah titik berada di dalam polygon
function pointInPolygon(point, polygon) {
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
}

// Fungsi untuk menghitung titik-titik perpotongan antara garis dan polygon
function calculateIntersectionPoints(startPoint, endPoint, polygon) {
  const intersections = [];
  
  // Cek perpotongan dengan setiap sisi polygon
  for (let i = 0; i < polygon.length - 1; i++) {
    const polyPointA = polygon[i];
    const polyPointB = polygon[i + 1];
    
    // Hitung perpotongan
    const x1 = startPoint[0], y1 = startPoint[1];
    const x2 = endPoint[0], y2 = endPoint[1];
    const x3 = polyPointA[0], y3 = polyPointA[1];
    const x4 = polyPointB[0], y4 = polyPointB[1];
    
    // Hitung denominator
    const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    
    // Lewati jika garis sejajar
    if (den === 0) continue;
    
    // Hitung parameter perpotongan garis
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;
    
    // Cek apakah perpotongan berada dalam kedua segmen
    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
      // Hitung titik perpotongan
      const intersectX = x1 + ua * (x2 - x1);
      const intersectY = y1 + ua * (y2 - y1);
      
      // Hitung jarak dari titik awal garis
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
}

      // Cek apakah garis memotong polygon
      if (lineIntersectsPolygon(lineStart, lineEnd, polygon)) {
        // Hitung titik-titik perpotongan
        const intersections = calculateIntersectionPoints(lineStart, lineEnd, polygon);
        
        // Jika ada minimal 2 titik perpotongan (masuk dan keluar)
        if (intersections.length >= 2) {
          // Urutkan berdasarkan jarak dari titik awal
          intersections.sort((a, b) => a.distance - b.distance);
          
          // Ambil titik masuk dan keluar (yang terjauh)
          const entryPoint = intersections[0];
          const exitPoint = intersections[intersections.length - 1];
          
          // Hitung lebar segmen yang benar-benar dipotong
          const segmentLength = exitPoint.distance - entryPoint.distance;
          
          // Tentukan jarak dari awal garis
          const distanceAlongLine = entryPoint.distance;
          
          // Tambahkan blok dengan dimensi yang benar
          intersectingBlocks.push({
            distance: distanceAlongLine,
            width: segmentLength, // Lebar sebenarnya dari perpotongan
            height: height,
            elevation: z,
            rock: block.rock || "unknown",
            color: block.color || getColorForRock(block.rock || "unknown")
          });
        }
      } else {
        // Jika tidak ada perpotongan langsung, cek apakah centroid dekat dengan garis
        const projection = projectPointOnLine(
          { x: x, y: y },
          startPoint,
          endPoint
        );
        
        // Hanya include blok yang sangat dekat dengan garis (lebih ketat, misal 20m)
        if (Math.abs(projection.ratio) <= 1 && projection.distanceToLine < 20) {
          intersectingBlocks.push({
            distance: projection.distanceAlongLine,
            width: width * 0.7, // Kurangi lebar untuk menghindari overlap berlebihan
            height: height,
            elevation: z,
            rock: block.rock || "unknown",
            color: block.color || getColorForRock(block.rock || "unknown")
          });
        }
      }
    }
    
    // Sort blocks by distance and then elevation for proper rendering
    intersectingBlocks.sort((a, b) => {
      // First by distance (ascending)
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      // Then by elevation (ascending)
      return a.elevation - b.elevation;
    });
    
    updateProgress(30, "Block processing complete");
    
    return intersectingBlocks.length > 0 ? intersectingBlocks : generateTestBlocks();
  } catch (err) {
    debug("Error processing blocks: " + err.message);
    return generateTestBlocks();
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
        
        // Process elevation data
        function processElevationData() {
  try {
    updateProgress(40, "Processing elevation data...");
    
    if (!elevationData || elevationData.length === 0) {
      return generateTestElevationProfile();
    }
    
    // Convert elevation data to UTM if needed
    const convertedElevationData = [];
    
    // Check coordinate ranges to detect if we're dealing with lat/lon or UTM
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < Math.min(100, elevationData.length); i++) {
      const point = elevationData[i];
      const x = parseFloat(point.x || 0);
      const y = parseFloat(point.y || 0);
      if (!isNaN(x) && !isNaN(y)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    
    // Determine if this looks like WGS84 (lat/lon) or UTM
    const isWGS84Range = minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90;
    
    // Convert all elevation points to UTM
    for (let i = 0; i < elevationData.length; i++) {
      const point = elevationData[i];
      let pointX = parseFloat(point.x || 0);
      let pointY = parseFloat(point.y || 0);
      const pointElev = parseFloat(point.elevation || point.z || 0);
      
      // Convert point to UTM if it's in WGS84
      if (isWGS84Range && pointX > -180 && pointX < 180 && pointY > -90 && pointY < 90) {
        try {
          const converted = proj4('EPSG:4326', sourceProjection, [pointX, pointY]);
          pointX = converted[0];
          pointY = converted[1];
        } catch (err) {
          // Continue with original coordinates
        }
      }
      
      convertedElevationData.push({
        x: pointX,
        y: pointY,
        elevation: pointElev
      });
    }
    
    const elevationPoints = [];
    const numPoints = 100; // More points for smoother curve
    
    // Generate evenly spaced points along the UTM line
    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      const distance = ratio * lineLength;
      
      // Get coordinates along the UTM line
      const pointX = startPointUTM[0] + ratio * (endPointUTM[0] - startPointUTM[0]);
      const pointY = startPointUTM[1] + ratio * (endPointUTM[1] - startPointUTM[1]);
      
      // Find closest elevation point in UTM space
      let closestElevation = null;
      let minDistance = Infinity;
      
      for (let j = 0; j < convertedElevationData.length; j++) {
        const point = convertedElevationData[j];
        const dx = point.x - pointX;
        const dy = point.y - pointY;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestElevation = point.elevation;
        }
      }
      
      // Only use points that are reasonably close (within 200m)
      if (minDistance < 200) {
        elevationPoints.push({
          distance: distance,
          elevation: closestElevation !== null ? closestElevation : null
        });
      } else {
        elevationPoints.push({
          distance: distance,
          elevation: null
        });
      }
    }
    
    // If not enough valid points found, use IDW interpolation to fill gaps
    if (elevationPoints.filter(p => p.elevation !== null).length < numPoints * 0.3) {
      // Try Inverse Distance Weighting interpolation
      for (let i = 0; i < elevationPoints.length; i++) {
        if (elevationPoints[i].elevation === null) {
          const pointX = startPointUTM[0] + (i / numPoints) * (endPointUTM[0] - startPointUTM[0]);
          const pointY = startPointUTM[1] + (i / numPoints) * (endPointUTM[1] - startPointUTM[1]);
          
          // Calculate IDW
          let weightSum = 0;
          let valueSum = 0;
          
          for (let j = 0; j < convertedElevationData.length; j++) {
            const point = convertedElevationData[j];
            const dx = point.x - pointX;
            const dy = point.y - pointY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Skip very distant points
            if (dist > 500) continue;
            
            // Inverse distance squared
            const weight = 1 / (dist * dist + 0.1); // Add small value to prevent division by zero
            weightSum += weight;
            valueSum += weight * point.elevation;
          }
          
          if (weightSum > 0) {
            elevationPoints[i].elevation = valueSum / weightSum;
          }
        }
      }
    }
    
    updateProgress(50, "Elevation processing complete");
    
    return elevationPoints.length > 0 ? elevationPoints : generateTestElevationProfile();
  } catch (err) {
    return generateTestElevationProfile();
  }
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
        
        // Process pit data - FIXED to use the same projection as the blocks
         function processPitData() {
  try {
    updateProgress(60, "Processing pit data...");
    
    if (!pitData || pitData.length === 0) {
      debug("No pit data available");
      return [];
    }
    
    // DEBUG: Log some sample pit data to check coordinates
    if (pitData.length > 0) {
      const sample = pitData[0];
      let sampleX, sampleY, sampleZ;
      
      if (sample.geometry && sample.properties) {
        // It's a GeoJSON feature
        sampleX = sample.geometry.coordinates[0][0];
        sampleY = sample.geometry.coordinates[0][1];
        sampleZ = sample.properties.level || 0;
      } else {
        // It's a direct point
        sampleX = parseFloat(sample.x || 0);
        sampleY = parseFloat(sample.y || 0);
        sampleZ = parseFloat(sample.z || sample.level || sample.elevation || 0);
      }
      
      
      // Check coordinate ranges to detect if we're dealing with lat/lon or UTM
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < Math.min(50, pitData.length); i++) {
        const point = pitData[i];
        let x, y;
        
        if (point.geometry && point.properties) {
          x = point.geometry.coordinates[0][0];
          y = point.geometry.coordinates[0][1];
        } else {
          x = parseFloat(point.x || 0);
          y = parseFloat(point.y || 0);
        }
        
        if (!isNaN(x) && !isNaN(y)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
      
      // Determine if this looks like WGS84 (lat/lon) or UTM
      const isWGS84Range = minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90;
    }
    
    const pitPoints = [];
    
    // Process each pit point
    for (let i = 0; i < pitData.length; i++) {
      const point = pitData[i];
      let x, y, elev;
      
      // Handle different possible data structures
      if (point.geometry && point.properties) {
        // It's a GeoJSON feature
        x = point.geometry.coordinates[0][0];
        y = point.geometry.coordinates[0][1];
        elev = point.properties.level || 0;
      } else {
        // It's a direct point
        x = parseFloat(point.x || 0);
        y = parseFloat(point.y || 0);
        elev = parseFloat(point.z || point.level || point.elevation || 0);
      }
      
      // Project point onto line
      const projection = projectPointOnLine(
        { x: x, y: y },
        startPoint,
        endPoint
      );
      
      // Only include points near the line (within 150m)
      if (Math.abs(projection.ratio) <= 1.2 && projection.distanceToLine < 150) {
        pitPoints.push({
          distance: projection.distanceAlongLine,
          elevation: elev
        });
      }
    }
    
    // Sort by distance
    pitPoints.sort((a, b) => a.distance - b.distance);
    
    updateProgress(70, "Pit data processing complete");
    
    return pitPoints;
  } catch (err) {
    debug("Error processing pit data: " + err.message);
    return [];
  }
}
        
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
            const sectionBlocks = processCrossSectionBlocks();
            const elevationProfile = processElevationData();
            const pitProfile = processPitData();
            
            // Get elevation range
            const elevRange = getElevationRange(sectionBlocks, elevationProfile, pitProfile);
            
            // Setup dimensions
            const margin = { top: 20, right: 30, bottom: 100, left: 60 }; 
const chartWidth = Math.max(window.innerWidth, lineLength / 2);
const height = window.innerHeight * 0.7;
const innerWidth = chartWidth - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;
            
            // Notify React Native of chart width
            if (!chartWidthSent) {
  sendToRN('chartDimensions', { width: chartWidth });
  chartWidthSent = true;
}
            
            // Create SVG
            const svg = d3.select('#chart')
  .append('svg')
  .attr('width', chartWidth)
  .attr('height', height);
              
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
              
            // Create axes
            const xAxis = d3.axisBottom(xScale)
  .tickFormat(d => \`\${(d/1000).toFixed(3)}\`); // Show as kilometers with 3 decimal places
  
const yAxis = d3.axisLeft(yScale)
  .tickFormat(d => \`\${d.toFixed(0)}m\`);
              
            // Add axes
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
  .text('Distance along cross-section (km)');
  
g.append('text')
  .attr('transform', 'rotate(-90)')
  .attr('x', -innerHeight / 2)
  .attr('y', -40)
  .attr('text-anchor', 'middle')
  .text('Elevation (m)');

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
            
            // Draw elevation profile
            if (elevationProfile.length > 0 && elevationProfile.some(p => p.elevation !== null)) {
  try {
    // Create line generator
    const line = d3.line()
      .x(d => xScale(d.distance))
      .y(d => yScale(d.elevation))
      .curve(d3.curveBasis)
      .defined(d => d.elevation !== null);
      
    // Add path
    g.append('path')
      .datum(elevationProfile.filter(p => p.elevation !== null))
      .attr('fill', 'none')
      .attr('stroke', 'green')
      .attr('stroke-width', 2)
      .attr('d', line);
      
    // Area fill telah dihapus
  } catch (err) {
    debug("Error drawing elevation profile: " + err.message);
  }
}
            
            // Draw pit boundaries - Make sure this is drawn
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
      .datum(filteredPitPoints)
      .attr('fill', 'none')
      .attr('stroke', '#F4AE4D')  // Orange pit boundary color
      .attr('stroke-width', 3)    // Thicker solid line behind
      .attr('stroke-opacity', 0.3) // Semi-transparent
      .attr('d', pitLineBg);
    
    // 2. Draw dashed line over it
    const pitLine = d3.line()
      .x(d => xScale(d.distance))
      .y(d => yScale(d.elevation))
      .curve(d3.curveLinear);
    
    g.append('path')
      .datum(filteredPitPoints)
      .attr('fill', 'none')
      .attr('stroke', '#F4AE4D')
      .attr('stroke-width', 2.5)
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
        .attr('r', 4)  // Larger markers
        .attr('fill', '#F4AE4D')
        .attr('stroke', '#fff')  // White border for visibility
        .attr('stroke-width', 1);
    }
  } catch (err) {
    debug("Error drawing pit boundary: " + err.message);
  }
} else {
  debug("No pit profile data to draw");
}
            
            // Collect unique rock types for legend
            const uniqueRocks = {};
            
            // Draw blocks
            if (sectionBlocks && sectionBlocks.length > 0) {
              try {
                // Gather unique rock types
                sectionBlocks.forEach(block => {
                  const rockType = block.rock || 'unknown';
                  const color = block.color || getColorForRock(rockType);
                  uniqueRocks[rockType] = color;
                });
                
                // Add blocks
                g.selectAll('.block')
  .data(sectionBlocks)
  .enter()
  .append('rect')
  .attr('class', 'block')
  .attr('x', d => xScale(d.distance - d.width/2))
  .attr('y', d => yScale(d.elevation + d.height/2))
  .attr('width', d => Math.max(1, xScale(d.distance + d.width/2) - xScale(d.distance - d.width/2)))
  .attr('height', d => Math.max(3, Math.abs(yScale(d.elevation - d.height/2) - yScale(d.elevation + d.height/2))))
  .attr('fill', d => d.color || getColorForRock(d.rock))
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
                      .style('opacity', 0.9);
                    tooltip.html(
                      \`<strong>Rock Type:</strong> \${d.rock || 'unknown'}<br>
                      <strong>Elevation:</strong> \${parseFloat(d.elevation).toFixed(1)}m<br>
                      <strong>Distance:</strong> \${parseFloat(d.distance).toFixed(1)}m<br>
                      <strong>Width:</strong> \${parseFloat(d.width).toFixed(1)}m<br>
                      <strong>Height:</strong> \${parseFloat(d.height).toFixed(1)}m\`
                    )
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
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
              } catch (err) {
                debug("Error drawing blocks: " + err.message);
              }
            }
            
            // Create legend
            const legendWidth = innerWidth * 0.8; // Wider for better visibility
const legendHeight = 40; // Taller
const legendX = margin.left + (innerWidth - legendWidth) / 2; // Center horizontally
const legendY = margin.top + innerHeight + 45; // Position below x-axis

// Create the legend container with a light background
const legendBox = svg.append('g')
  .attr('class', 'legend-container')
  .attr('transform', \`translate(\${legendX}, \${legendY})\`);

// Add a subtle background to make legend more visible
legendBox.append('rect')
  .attr('width', legendWidth)
  .attr('height', legendHeight)
  .attr('rx', 5) // Rounded corners
  .attr('ry', 5)
  .attr('fill', 'white')
  .attr('stroke', '#ddd')
  .attr('stroke-width', 1)
  .attr('opacity', 0.8);

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
    .attr('font-weight', '500') // Slightly bold
    .text(label);
});
            
            updateProgress(100, "Visualization complete");
            
            // Hide loading indicator
            document.getElementById('loading').style.display = 'none';
            
            // Mark as rendered
            hasRendered = true;
            isRendering = false;
            
            // Notify React Native
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
        
        // Function to render with test data
        function renderWithTestData(lineLen) {
          try {
            const testBlocks = generateTestBlocks();
            const testElevation = generateTestElevationProfile();
            
            // Use test data to render
            renderVisualizationWithData(testBlocks, testElevation, []);
          } catch (err) {
            debug("Error in test render: " + err.message);
            document.getElementById('message').textContent = 'Error in test render: ' + err.message;
            sendToRN('renderError', { error: err.message });
          }
        }
        
        // Simplified render function with provided data
        function renderVisualizationWithData(blocks, elevation, pit) {
          // Similar to renderVisualization but uses provided data instead of processing
          // Implementation would be similar but without the data processing steps
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
