import { convertCoordinates } from "./projectionUtils";

/**
 * Processes raw elevation data into a format suitable for visualization
 *
 * @param data Raw elevation data array
 * @param sourceProjection The source projection of the data (e.g., 'EPSG:32652')
 * @param lonField Name of the longitude/x field in the data
 * @param latField Name of the latitude/y field in the data
 * @param elevField Name of the elevation/z field in the data
 * @returns Processed elevation data with converted coordinates
 */
export const processElevationData = (
  data: any[],
  sourceProjection = "EPSG:4326",
  lonField = "lon",
  latField = "lat",
  elevField = "z"
) => {
  if (!data || data.length === 0) {
    console.warn("No elevation data to process");
    return [];
  }

  console.log(`Processing ${data.length} elevation data points...`);
  console.log(`Sample point:`, data.length > 0 ? data[0] : "No data");

  return data
    .map((point, index) => {
      const x = parseFloat(String(point[lonField]));
      const y = parseFloat(String(point[latField]));
      const elevation = parseFloat(String(point[elevField]));

      if (isNaN(x) || isNaN(y) || isNaN(elevation)) {
        console.warn(`Invalid elevation data at index ${index}:`, point);
        return null;
      }

      let wgs84Coords;
      if (sourceProjection !== "EPSG:4326") {
        // Use convertCoordinates with correct parameter order [y, x] for consistency
        wgs84Coords = convertCoordinates([y, x], sourceProjection, "EPSG:4326");
      } else {
        wgs84Coords = [x, y];
      }

      return {
        original: { x, y },
        wgs84: { lng: wgs84Coords[0], lat: wgs84Coords[1] },
        elevation,
      };
    })
    .filter((point) => point !== null);
};

/**
 * Generates elevation profile data along a line
 *
 * @param elevationPoints Processed elevation points
 * @param lineGeoJson GeoJSON LineString representing the cross-section line
 * @param sampleCount Number of sample points along the line
 * @returns Array of elevation profile points
 */
export const generateElevationProfile = (
  elevationPoints: any[],
  lineGeoJson: any,
  sampleCount = 100
) => {
  if (!elevationPoints || elevationPoints.length === 0 || !lineGeoJson) {
    return [];
  }

  const lineCoords = lineGeoJson.geometry.coordinates;
  if (lineCoords.length < 2) {
    return [];
  }

  const startPoint = lineCoords[0]; // [lng, lat]
  const endPoint = lineCoords[1]; // [lng, lat]
  const lineLength = calculateDistance(
    startPoint[0],
    startPoint[1],
    endPoint[0],
    endPoint[1]
  );

  // Generate sample points along the line
  const samplePoints = [];
  for (let i = 0; i < sampleCount; i++) {
    const ratio = i / (sampleCount - 1);

    const lng = startPoint[0] + ratio * (endPoint[0] - startPoint[0]);
    const lat = startPoint[1] + ratio * (endPoint[1] - startPoint[1]);
    const distanceAlongLine = ratio * lineLength;

    // Interpolate elevation at this point
    const elevation = interpolateElevation(lng, lat, elevationPoints);

    samplePoints.push({
      lng,
      lat,
      distance: distanceAlongLine,
      elevation,
      hasData: elevation !== null,
    });
  }

  return samplePoints;
};

/**
 * Calculate the distance between two points in meters
 */
const calculateDistance = (
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number => {
  // Haversine formula
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Interpolate elevation at a given point using IDW (Inverse Distance Weighting)
 */
const interpolateElevation = (
  lng: number,
  lat: number,
  elevationPoints: any[],
  power = 2,
  searchRadius = 0.001
): number | null => {
  // Find nearby points
  const nearbyPoints = elevationPoints.filter(
    (point) =>
      Math.abs(point.wgs84.lng - lng) < searchRadius &&
      Math.abs(point.wgs84.lat - lat) < searchRadius
  );

  if (nearbyPoints.length === 0) {
    return null; // No nearby points
  }

  if (nearbyPoints.length === 1) {
    return nearbyPoints[0].elevation;
  }

  // Calculate IDW interpolation
  let weightSum = 0;
  let valueSum = 0;

  nearbyPoints.forEach((point) => {
    const distance = calculateDistance(
      lng,
      lat,
      point.wgs84.lng,
      point.wgs84.lat
    );

    // Handle exact match
    if (distance < 0.0000001) {
      weightSum = 1;
      valueSum = point.elevation;
      return;
    }

    const weight = 1 / Math.pow(distance, power);
    weightSum += weight;
    valueSum += weight * point.elevation;
  });

  return valueSum / weightSum;
};
