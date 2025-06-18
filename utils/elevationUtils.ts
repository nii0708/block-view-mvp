import { convertCoordinates } from "./projectionUtils";

/**
 * Creates a bounding box from block model data with optional buffer
 * @param blockModelData Array of block model points
 * @param buffer Buffer distance to extend the bounding box (in coordinate units)
 * @returns Object with min and max coordinates
 */
export const createBoundingBoxFromBlockModel = (
  blockModelData: any[],
  buffer = 50 // Default buffer of 50 units
) => {
  if (!blockModelData || blockModelData.length === 0) {
    return null;
  }

  const startTime = Date.now();

  // Extract x,y coordinates from block model data
  const xValues = blockModelData
    .map((item) => {
      const x = parseFloat(
        String(item.centroid_x || item.x || item.X || item.easting || 0)
      );
      return isNaN(x) ? 0 : x;
    })
    .filter((x) => x !== 0);

  const yValues = blockModelData
    .map((item) => {
      const y = parseFloat(
        String(item.centroid_y || item.y || item.Y || item.northing || 0)
      );
      return isNaN(y) ? 0 : y;
    })
    .filter((y) => y !== 0);

  if (xValues.length === 0 || yValues.length === 0) {
    console.warn("Could not extract valid coordinates from block model data");
    return null;
  }

  // Calculate min and max with buffer
  const minX = Math.min(...xValues) - buffer;
  const maxX = Math.max(...xValues) + buffer;
  const minY = Math.min(...yValues) - buffer;
  const maxY = Math.max(...yValues) + buffer;

  return { minX, maxX, minY, maxY };
};

/**
 * Detects which fields contain x/y/z coordinates in the data
 * @param data Sample data array
 * @returns Object with detected field names
 */
const detectCoordinateFields = (data: any[]) => {
  if (!data || data.length === 0) {
    return { lonField: "lon", latField: "lat", elevField: "z" };
  }

  const firstRow = data[0];
  const keys = Object.keys(firstRow);

  // Debug log to see what fields are available
  console.log("Available fields in elevation data:", keys);
  console.log("Sample values:", firstRow);

  // Detect longitude/x field
  let lonField =
    keys.find((k) => {
      const lower = k.toLowerCase();
      return (
        lower === "lon" ||
        lower === "longitude" ||
        lower === "x" ||
        lower === "easting" ||
        lower === "lng"
      );
    }) || "lon";

  // Detect latitude/y field
  let latField =
    keys.find((k) => {
      const lower = k.toLowerCase();
      return (
        lower === "lat" ||
        lower === "latitude" ||
        lower === "y" ||
        lower === "northing"
      );
    }) || "lat";

  // Detect elevation/z field
  let elevField =
    keys.find((k) => {
      const lower = k.toLowerCase();
      return (
        lower === "z" ||
        lower === "elevation" ||
        lower === "elev" ||
        lower === "height" ||
        lower === "alt" ||
        lower === "altitude"
      );
    }) || "z";

  console.log(
    "Detected fields - lon:",
    lonField,
    "lat:",
    latField,
    "elev:",
    elevField
  );

  return { lonField, latField, elevField };
};

/**
 * Filters elevation data to only include points within or near block model area
 * @param elevationData Raw elevation data array
 * @param blockModelBoundingBox Bounding box from block model data
 * @param lonField Name of the longitude/x field in the data
 * @param latField Name of the latitude/y field in the data
 * @returns Filtered elevation data array
 */
export const filterElevationDataByBlockModel = (
  elevationData: any[],
  blockModelBoundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null,
  lonField = "lon",
  latField = "lat"
) => {
  if (!elevationData || elevationData.length === 0 || !blockModelBoundingBox) {
    return elevationData;
  }

  const startTime = Date.now();

  const { minX, maxX, minY, maxY } = blockModelBoundingBox;

  // Create a simplified validation function
  const isInBounds = (x: number, y: number) =>
    x >= minX && x <= maxX && y >= minY && y <= maxY;

  const filteredData = elevationData.filter((point) => {
    const x = parseFloat(String(point[lonField]));
    const y = parseFloat(String(point[latField]));

    if (isNaN(x) || isNaN(y)) return false;
    return isInBounds(x, y);
  });

  const endTime = Date.now();
  console.log(
    `Filtered elevation data from ${elevationData.length} to ${
      filteredData.length
    } points (${((endTime - startTime) / 1000).toFixed(2)}s)`
  );

  return filteredData;
};

/**
 * Processes raw elevation data into a format suitable for visualization
 * Optimized for memory usage and performance
 *
 * @param data Raw elevation data array
 * @param sourceProjection The source projection of the data (e.g., 'EPSG:32652')
 * @param lonField Name of the longitude/x field in the data
 * @param latField Name of the latitude/y field in the data
 * @param elevField Name of the elevation/z field in the data
 * @param blockModelBoundingBox Optional bounding box from block model data to filter points
 * @returns Processed elevation data with converted coordinates
 */
export const processElevationData = (
  data: any[],
  sourceProjection = "EPSG:4326",
  lonField = "lon",
  latField = "lat",
  elevField = "z",
  blockModelBoundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null = null
) => {
  if (!data || data.length === 0) {
    console.warn("No elevation data to process");
    return [];
  }

  const startTime = Date.now();

  // Auto-detect fields if using default values
  if (lonField === "lon" && latField === "lat" && elevField === "z") {
    const detected = detectCoordinateFields(data);
    lonField = detected.lonField;
    latField = detected.latField;
    elevField = detected.elevField;
  }

  // Log sample data to debug field names
  if (data.length > 0) {
    console.log("Sample elevation data point:", data[0]);
    console.log(
      "Using fields - lon:",
      lonField,
      "lat:",
      latField,
      "elev:",
      elevField
    );
  }

  // Filter data by block model bounding box if provided
  let dataToProcess = data;
  if (blockModelBoundingBox) {
    dataToProcess = filterElevationDataByBlockModel(
      data,
      blockModelBoundingBox,
      lonField,
      latField
    );
  }

  // If we still have too many points, sample them
  if (dataToProcess.length > 10000) {
    const sampleRate = Math.ceil(dataToProcess.length / 10000);
    console.log(`Sampling elevation data at rate 1/${sampleRate}`);
    dataToProcess = dataToProcess.filter(
      (_, index) => index % sampleRate === 0
    );
  }

  // Filter out invalid points (0,0) before processing
  const validDataToProcess = dataToProcess.filter((point) => {
    const x = parseFloat(String(point[lonField]));
    const y = parseFloat(String(point[latField]));
    // Filter out 0,0 coordinates which are invalid for Jakarta
    return !(x === 0 && y === 0) && !isNaN(x) && !isNaN(y);
  });

  console.log(
    `Filtered out ${
      dataToProcess.length - validDataToProcess.length
    } invalid (0,0) points`
  );

  console.log(
    `Processing ${validDataToProcess.length} valid points, first point:`,
    validDataToProcess.length > 0
      ? `x: ${validDataToProcess[0][lonField]}, y: ${validDataToProcess[0][latField]}, z: ${validDataToProcess[0][elevField]}`
      : "No data"
  );

  const conversionStart = Date.now();

  // Process each point in chunks to avoid blocking the main thread
  const chunkSize = 1000;
  const processedData: any[] = [];

  for (let i = 0; i < validDataToProcess.length; i += chunkSize) {
    const chunk = validDataToProcess.slice(i, i + chunkSize);

    // Process this chunk
    const processedChunk = chunk
      .map((point) => {
        const x = parseFloat(String(point[lonField]));
        const y = parseFloat(String(point[latField]));
        const elevation = parseFloat(String(point[elevField]));

        if (isNaN(x) || isNaN(y) || isNaN(elevation)) {
          return null;
        }

        let wgs84Coords;
        if (sourceProjection !== "EPSG:4326") {
          // Check if coordinates look like lat/lon (small values) or projected (large values)
          const isLatLon = Math.abs(x) <= 180 && Math.abs(y) <= 90;

          if (isLatLon) {
            // Already in WGS84, no conversion needed
            wgs84Coords = [x, y];
          } else {
            // Convert from projected to WGS84
            // Use [x, y] order for proj4
            wgs84Coords = convertCoordinates(
              [x, y],
              sourceProjection,
              "EPSG:4326"
            );
          }
        } else {
          // Already WGS84
          wgs84Coords = [x, y];
        }

        return {
          original: { x, y },
          wgs84: { lng: wgs84Coords[0], lat: wgs84Coords[1] },
          lng: wgs84Coords[0], // Add direct lng/lat for easier access
          lat: wgs84Coords[1],
          elevation,
        };
      })
      .filter((item) => item !== null);

    processedData.push(...processedChunk);

    // Log progress periodically
    if (i % 5000 === 0 && i > 0) {
      console.log(`Processed ${i} elevation points so far...`);
    }
  }

  const endTime = Date.now();
  console.log(
    `Completed elevation processing: ${processedData.length} points in ${
      (endTime - startTime) / 1000
    }s`
  );

  // Log sample of processed data to verify coordinates
  if (processedData.length > 0) {
    console.log("Sample processed elevation point:", processedData[0]);
    console.log(
      "Coordinate range - Lat:",
      Math.min(...processedData.map((p) => p.lat)),
      "to",
      Math.max(...processedData.map((p) => p.lat)),
      "Lng:",
      Math.min(...processedData.map((p) => p.lng)),
      "to",
      Math.max(...processedData.map((p) => p.lng))
    );
  }

  return processedData;
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
      Math.abs(point.lng - lng) < searchRadius &&
      Math.abs(point.lat - lat) < searchRadius
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
    const distance = calculateDistance(lng, lat, point.lng, point.lat);

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
