import proj4 from "proj4";

//  Process block data for visualization
export function processCrossSectionBlocks(
  blockModelData: any[],
  sourceProjection: any,
  startLat: any,
  startLng: any,
  endLat: any,
  endLng: any
) {
  try {
    const startPoint = { lat: startLat, lng: startLng };
    const endPoint = { lat: endLat, lng: endLng };

    // Convert line endpoints from WGS84 to UTM coordinates
    const startPointUTM = proj4("EPSG:4326", sourceProjection, [
      startPoint.lng,
      startPoint.lat,
    ]);
    const endPointUTM = proj4("EPSG:4326", sourceProjection, [
      endPoint.lng,
      endPoint.lat,
    ]);

    const intersectingBlocks = [];

    // Functions for checking if a line intersects with a polygon
    function lineIntersectsPolygon(lineStart: any, lineEnd: any, polygon: any) {
      // Check each side of the polygon for intersection with the line
      for (let i = 0; i < polygon.length - 1; i++) {
        const polyPointA = polygon[i];
        const polyPointB = polygon[i + 1];

        if (
          lineSegmentIntersection(
            lineStart[0],
            lineStart[1],
            lineEnd[0],
            lineEnd[1],
            polyPointA[0],
            polyPointA[1],
            polyPointB[0],
            polyPointB[1]
          )
        ) {
          return true;
        }
      }

      // Also check if the start or end point of the line is inside the polygon
      if (
        pointInPolygon(lineStart, polygon) ||
        pointInPolygon(lineEnd, polygon)
      ) {
        return true;
      }
      return false;
    }

    // Function to check if two line segments intersect
    function lineSegmentIntersection(
      x1: any,
      y1: any,
      x2: any,
      y2: any,
      x3: any,
      y3: any,
      x4: any,
      y4: any
    ) {
      // Calculate denominator
      const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

      // Lines are parallel or coincident
      if (den === 0) {
        return false;
      }

      // Calculate intersection parameters
      const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
      const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;

      // Check if intersection is within both line segments
      return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    // Function to check if a point is inside a polygon
    function pointInPolygon(point: any, polygon: any) {
      // Ray-casting algorithm
      let inside = false;
      const x = point[0];
      const y = point[1];

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0],
          yi = polygon[i][1];
        const xj = polygon[j][0],
          yj = polygon[j][1];

        const intersect =
          yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }

      return inside;
    }

    // Function to find the intersection of two line segments
    function findLineSegmentIntersection(
      x1: any,
      y1: any,
      x2: any,
      y2: any,
      x3: any,
      y3: any,
      x4: any,
      y4: any
    ) {
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
          y: y1 + ua * (y2 - y1),
        };
      }

      return null;
    }

    // Function to calculate intersection points between a line and polygon
    function calculateIntersectionPoints(
      lineStart: any,
      lineEnd: any,
      polygon: any
    ) {
      const intersections = [];

      // For each edge of the polygon, check if it intersects with the line segment
      for (let i = 0; i < polygon.length - 1; i++) {
        const polyPointA = polygon[i];
        const polyPointB = polygon[i + 1];

        const intersection = findLineSegmentIntersection(
          lineStart[0],
          lineStart[1],
          lineEnd[0],
          lineEnd[1],
          polyPointA[0],
          polyPointA[1],
          polyPointB[0],
          polyPointB[1]
        );

        if (intersection) {
          // Calculate distance from start of line to intersection point
          const dist = Math.sqrt(
            (intersection.x - lineStart[0]) ** 2 +
              (intersection.y - lineStart[1]) ** 2
          );

          intersections.push({
            point: [intersection.x, intersection.y],
            distance: dist,
          });
        }
      }

      // If we found fewer than 2 intersections, the line might start or end inside the polygon
      if (intersections.length < 2) {
        // Check if either line endpoint is inside the polygon
        if (pointInPolygon(lineStart, polygon)) {
          intersections.push({
            point: [lineStart[0], lineStart[1]],
            distance: 0,
          });
        }

        if (pointInPolygon(lineEnd, polygon)) {
          const lineLength = Math.sqrt(
            (lineEnd[0] - lineStart[0]) ** 2 + (lineEnd[1] - lineStart[1]) ** 2
          );
          intersections.push({
            point: [lineEnd[0], lineEnd[1]],
            distance: lineLength,
          });
        }
      }

      return intersections;
    }

    // Convert block data into polygons for intersection calculation
    for (let i = 0; i < blockModelData.length; i++) {
      const block = blockModelData[i];

      // Skip invalid blocks
      if (!block.centroid_x && !block.x) continue;
      if (!block.centroid_y && !block.y) continue;
      if (!block.centroid_z && !block.z && !block.elevation) continue;

      // Get coordinates
      const x = parseFloat(block.centroid_x || block.x || 0);
      const y = parseFloat(block.centroid_y || block.y || 0);
      const z = parseFloat(block.centroid_z || block.z || block.elevation || 0);
      const width = parseFloat(block.dim_x || block.width || 12.5);
      const height = parseFloat(block.dim_z || block.height || 1);

      // Create polygon for the block
      // Half width/height to create polygon from center point
      const halfWidth = width / 2;
      const halfDepth = width / 2; // Assume depth = width if not specified

      // Create rectangular polygon for the block (x,y coordinates)
      const polygon = [
        [x - halfWidth, y - halfDepth], // Bottom left
        [x + halfWidth, y - halfDepth], // Bottom right
        [x + halfWidth, y + halfDepth], // Top right
        [x - halfWidth, y + halfDepth], // Top left
        [x - halfWidth, y - halfDepth], // Back to bottom left to close polygon
      ];

      // Define start and end points of cross-section line
      const lineStart = [startPointUTM[0], startPointUTM[1]];
      const lineEnd = [endPointUTM[0], endPointUTM[1]];

      // Check if line intersects with polygon
      if (lineIntersectsPolygon(lineStart, lineEnd, polygon)) {
        // Calculate intersection points
        const intersections = calculateIntersectionPoints(
          lineStart,
          lineEnd,
          polygon
        );

        // If we have at least 2 intersection points (entry and exit)
        if (intersections.length >= 2) {
          // Sort by distance from start point
          intersections.sort((a, b) => a.distance - b.distance);

          // Get entry and exit points (first and last)
          const entryPoint = intersections[0];
          const exitPoint = intersections[intersections.length - 1];

          // Calculate width of the segment that is actually intersected
          const segmentLength = exitPoint.distance - entryPoint.distance;

          // Add block with correct dimensions
          intersectingBlocks.push({
            distance: entryPoint.distance,
            width: segmentLength,
            height: height,
            elevation: z,
            rock: block.rock || "unknown",
            color: block.color,
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

    // Store the count of displayed blocks for reporting back to React Native
    // displayedBlocksCount = intersectingBlocks.length;

    // updateProgress(30, "Block processing complete");

    // Send an early data stats update
    // sendDataStats();
    return intersectingBlocks;
    // return intersectingBlocks.length > 0 ? intersectingBlocks : generateTestBlocks();
  } catch (err) {
    console.log("Error processing blocks:", err);
    // debug("Error processing blocks: " + err.message);
    // return generateTestBlocks();
  }
}
