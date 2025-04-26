import { convertCoordinates } from "./projectionUtils";

interface BlockModelData {
  centroid_x: number;
  centroid_y: number;
  centroid_z?: number;
  dim_x: number;
  dim_y: number;
  dim_z?: number;
  rock: string;
  [key: string]: any;
}

interface GeoJsonFeature {
  type: string;
  properties: any;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

interface GeoJsonFeatureCollection {
  type: string;
  features: GeoJsonFeature[];
}

/**
 * Creates GeoJSON feature collection from block model data
 *
 * @param {Array} data - Array of objects containing block model data
 * @param {string} longCol - Name of the longitude/x column
 * @param {string} latCol - Name of the latitude/y column
 * @param {string} widthCol - Name of the width column
 * @param {string} lengthCol - Name of the length column
 * @param {string} sourceProjection - Projection of the input data
 * @returns {Object} GeoJSON FeatureCollection
 */
export function createPolygonsFromCoordsAndDims(
  data: any[],
  longCol: string,
  latCol: string,
  widthCol: string,
  lengthCol: string,
  sourceProjection = "EPSG:4326"
): GeoJsonFeatureCollection {
  const features: GeoJsonFeature[] = [];

  data.forEach((row, index) => {
    const x = parseFloat(row[longCol]);
    const y = parseFloat(row[latCol]);
    const width = parseFloat(row[widthCol]);
    const length = parseFloat(row[lengthCol]);

    if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(length)) {
      console.warn(`Skipping invalid data row at index ${index}:`, row);
      return; // Skip this row
    }

    // Calculate the corner points of the rectangle
    const halfWidth = width / 2;
    const halfLength = length / 2;

    // Create corner points in the source projection
    const corners = [
      [x - halfWidth, y - halfLength], // bottom-left
      [x + halfWidth, y - halfLength], // bottom-right
      [x + halfWidth, y + halfLength], // top-right
      [x - halfWidth, y + halfLength], // top-left
      [x - halfWidth, y - halfLength], // closing point (same as first)
    ];

    // Convert each corner to WGS84 if needed
    const convertedCorners =
      sourceProjection !== "EPSG:4326"
        ? corners.map((point) => {
            const converted = convertCoordinates(
              point,
              sourceProjection,
              "EPSG:4326"
            );
            // GeoJSON format requires [longitude, latitude] order
            return converted; // proj4 returns [lng, lat] for EPSG:4326
          })
        : corners;

    // Create a GeoJSON feature
    const feature: GeoJsonFeature = {
      type: "Feature",
      properties: {
        ...row,
        id: index,
      },
      geometry: {
        type: "Polygon",
        coordinates: [convertedCorners],
      },
    };

    features.push(feature);
  });

  // Create a GeoJSON FeatureCollection
  return {
    type: "FeatureCollection",
    features: features,
  };
}

/**
 * Filter blocks to only keep the top elevation for each x,y position
 *
 * @param {Array} data - Array of block model data
 * @returns {Array} Filtered data with only top elevation blocks
 */
export function filterTopElevationBlocks(data: any[]): any[] {
  // Create a map to store the highest elevation block for each x,y coordinate
  const topBlocksMap: Record<string, any> = {};

  // Process each block to find the highest at each x,y position
  data.forEach((block) => {
    if (!block.centroid_x || !block.centroid_y || !block.centroid_z) {
      return; // Skip invalid blocks
    }

    // Create a key based on x,y coordinates (rounded to avoid floating point issues)
    const key = `${Math.round(block.centroid_x)}_${Math.round(
      block.centroid_y
    )}`;

    // Check if we already have a block at this position
    if (!topBlocksMap[key] || block.centroid_z > topBlocksMap[key].centroid_z) {
      topBlocksMap[key] = block;
    }
  });

  // Convert map back to array
  return Object.values(topBlocksMap);
}

/**
 * Processes the CSV data for block models
 *
 * @param {Array} data - Parsed CSV data as array of objects
 * @param {string} sourceProjection - Projection of the input data
 * @param {boolean} topElevationOnly - Whether to only include top elevation blocks
 * @returns {Object} Processed GeoJSON FeatureCollection
 */
export function processBlockModelCSV(
  data: any[],
  sourceProjection = "EPSG:4326",
  topElevationOnly = true
): GeoJsonFeatureCollection {
  try {
    // Your provided hex colors
    const hexColors = [
      "#75499c",
      "#b40c0d",
      "#045993",
      "#db6000",
      "#118011",
      "#6d392e",
      "#c059a1",
      "#606060",
      "#9b9c07",
      "#009dad",
      "#8ea6c5",
      "#db9a5a",
      "#78bd6b",
      "#db7876",
      "#a48fb3",
      "#a37c75",
      "#d495b0",
      "#a6a6a6",
      "#b9b96e",
      "#7eb8c2",
    ];

    // Function to create a color mapping for rock types
    function createRockColorMapping(
      data: any[],
      colors: string[]
    ): Record<string, string> {
      // Extract unique rock types
      const uniqueRockTypes = Array.from(
        new Set(data.map((item) => item.rock || "Unknown"))
      );

      // Create mapping object
      const rockColorMap: Record<string, string> = {};

      // Assign colors to rock types
      uniqueRockTypes.forEach((rockType, index) => {
        // Use modulo to handle cases with more rock types than colors
        if (typeof rockType === "string" || typeof rockType === "number") {
          rockColorMap[String(rockType)] = colors[index % colors.length];
        }
      });

      return rockColorMap;
    }

    // Map columns if names are different
    let mappedData = data.map((row) => ({
      centroid_x: row.centroid_x || row.x || row.X || row.easting || 0,
      centroid_y: row.centroid_y || row.y || row.Y || row.northing || 0,
      centroid_z: row.centroid_z || row.z || row.Z || row.elevation || 0,
      dim_x: row.dim_x || row.width || row.block_size || 10,
      dim_y: row.dim_y || row.length || row.block_size || 10,
      dim_z: row.dim_z || row.height || row.block_size || 10,
      rock: row.rock || row.rock_type || row.material || "Unknown",
    }));

    // // If requested, filter to only keep the top elevation blocks
    // if (topElevationOnly) {
    //   console.log(`Original block count: ${mappedData.length}`);
    //   mappedData = filterTopElevationBlocks(mappedData);
    //   console.log(`Filtered to top elevation blocks: ${mappedData.length}`);
    // }

    // Create the mapping
    const rockColorMap = createRockColorMapping(mappedData, hexColors);

    // Add colors to the data
    const filteredData = mappedData.map((row) => ({
      centroid_x: row.centroid_x,
      centroid_y: row.centroid_y,
      centroid_z: row.centroid_z,
      dim_x: row.dim_x,
      dim_y: row.dim_y,
      dim_z: row.dim_z,
      rock: row.rock,
      color: rockColorMap[row.rock] || "#aaaaaa",
    }));

    // Create polygon features with projection conversion
    const polygons = createPolygonsFromCoordsAndDims(
      filteredData,
      "centroid_x",
      "centroid_y",
      "dim_x",
      "dim_y",
      sourceProjection
    );

    return polygons;
  } catch (error) {
    console.error("Error in processBlockModelCSV:", error);
    throw error;
  }
}
