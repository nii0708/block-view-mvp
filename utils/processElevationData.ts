import proj4 from "proj4";

// Process elevation data
export function processElevationData(
  elevationData: any[],
  sourceProjection: any,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  lineLength: number
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

    // Convert elevation data to UTM if needed
    const convertedElevationData = [];

    // Check coordinate ranges to detect if we're dealing with lat/lon or UTM
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
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
    const isWGS84Range =
      minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90;

    // Convert all elevation points to UTM
    for (let i = 0; i < elevationData.length; i++) {
      const point = elevationData[i];
      let pointX = parseFloat(point.x || 0);
      let pointY = parseFloat(point.y || 0);
      const pointElev = parseFloat(point.elevation || point.z || 0);

      // Convert point to UTM if it's in WGS84
      if (
        isWGS84Range &&
        pointX > -180 &&
        pointX < 180 &&
        pointY > -90 &&
        pointY < 90
      ) {
        try {
          const converted = proj4("EPSG:4326", sourceProjection, [
            pointX,
            pointY,
          ]);
          pointX = converted[0];
          pointY = converted[1];
        } catch (err) {
          // Continue with original coordinates
        }
      }

      convertedElevationData.push({
        x: pointX,
        y: pointY,
        elevation: pointElev,
      });
    }

    const elevationPoints = [];
    const numPoints = 100; // More points for smoother curve

    // Generate evenly spaced points along the UTM line
    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      const distance = ratio * lineLength;

      // Get coordinates along the UTM line
      const pointX =
        startPointUTM[0] + ratio * (endPointUTM[0] - startPointUTM[0]);
      const pointY =
        startPointUTM[1] + ratio * (endPointUTM[1] - startPointUTM[1]);

      // Find closest elevation point in UTM space
      let closestElevation = null;
      let minDistance = Infinity;

      for (let j = 0; j < convertedElevationData.length; j++) {
        const point = convertedElevationData[j];
        const dx = point.x - pointX;
        const dy = point.y - pointY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
          minDistance = distance;
          closestElevation = point.elevation;
        }
      }

      // Only use points that are reasonably close (within 20m)
      if (minDistance < 20) {
        elevationPoints.push({
          distance: distance,
          elevation: closestElevation !== null ? closestElevation : null,
        });
      } else {
        elevationPoints.push({
          distance: distance,
          elevation: null,
        });
      }
    }

    //   // Store the count of valid elevation points
    //   displayedElevationPointsCount = elevationPoints.filter(p => p.elevation !== null).length;

    //   updateProgress(50, "Elevation processing complete");

    //   // Send updated data stats
    //   sendDataStats();

    //   return elevationPoints.length > 0 ? elevationPoints : generateTestElevationProfile();
    return elevationPoints;
  } catch (err) {
    console.log("Error processing elevation data:", err);
    //   return generateTestElevationProfile();
    //   debug("Error processing elevation data: " + err.message);
    //   return generateTestElevationProfile();
  }
}
