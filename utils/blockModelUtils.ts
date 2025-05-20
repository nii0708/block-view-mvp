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
  topElevationOnly = true,
  attributeKey = "rock", // Default to "rock" for backward compatibility
   customColors?: {[key: string]: {color: string, opacity: number}}
): GeoJsonFeatureCollection {
  try {
    console.log(
      `🔄 PROCESSING WITH KEY: '${attributeKey}', sample data:`,
      data.slice(0, 2).map((item) => ({
        keys: Object.keys(item).slice(0, 10),
        [attributeKey]: item[attributeKey],
      }))
    );

    // Predefined colors for consistent mapping
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

    // Guarantee case-insensitive attribute matching
    const normalizedKey = attributeKey.toLowerCase();

    // Find the actual key with the correct case in the data
    const actualKey =
      data.length > 0
        ? Object.keys(data[0]).find(
            (key) => key.toLowerCase() === normalizedKey
          ) || attributeKey
        : attributeKey;

    console.log(
      `🔄 Using actual attribute key: '${actualKey}' for requested '${attributeKey}'`
    );

    // Map columns for consistent access
    let mappedData = data.map((row) => {
      // Check if the attribute exists
      const hasAttr = actualKey in row;
      if (!hasAttr && Math.random() < 0.01) {
        // Log for 1% of rows
        console.log(
          `⚠️ Row missing attribute '${actualKey}'`,
          Object.keys(row).slice(0, 5)
        );
      }

      return {
        ...row, // Keep original data
        centroid_x: row.centroid_x || row.x || row.X || row.easting || 0,
        centroid_y: row.centroid_y || row.y || row.Y || row.northing || 0,
        centroid_z: row.centroid_z || row.z || row.Z || row.elevation || 0,
        dim_x: row.dim_x || row.xinc || row.width || row.block_size || 12.5,
        dim_y: row.dim_y || row.yinc || row.length || row.block_size || 12.5,
        dim_z: row.dim_z || row.zinc || row.height || row.block_size || 1,
        // Store the attribute explicitly
        _attributeKey: actualKey,
        _attributeValue: row[actualKey] || "Unknown",
      };
    });

    if (topElevationOnly) {
      console.log(
        `🔄 Filtering from ${mappedData.length} blocks to top elevation only`
      );
      mappedData = filterTopElevationBlocks(mappedData);
      console.log(`🔄 Filtered to ${mappedData.length} top elevation blocks`);
    }

    // Get unique values for the selected attribute
    const uniqueValues = Array.from(
      new Set(data.map((item) => String(item[attributeKey] || "Unknown")))
    );

    // Create color mapping - UBAH BAGIAN INI
    const colorMap: Record<string, string> = {};
    uniqueValues.forEach((value, index) => {
      // PENTING: Prioritaskan customColors jika ada
      if (customColors && customColors[value]) {
        colorMap[value] = customColors[value].color;
      } else {
        colorMap[value] = hexColors[index % hexColors.length];
      }
    });

    // Apply colors to data - UBAH BAGIAN INI
    const coloredData = mappedData.map((row) => {
      const attrValue = String(row[actualKey] || "Unknown");
      // Ambil opacity dari customColors jika ada
      const opacity =
        customColors && customColors[attrValue]
          ? customColors[attrValue].opacity
          : 0.7;

      return {
        ...row,
        _attributeKey: actualKey,
        _attributeValue: attrValue,
        color: colorMap[attrValue] || "#aaaaaa",
        opacity: opacity,
      };
    });

    // Sample the data to verify coloring
    if (coloredData.length > 0) {
      console.log("🔄 Sample colored data:", {
        attributeKey: coloredData[0]._attributeKey,
        attributeValue: coloredData[0]._attributeValue,
        color: coloredData[0].color,
      });
    }

    // Create GeoJSON features
    const features = coloredData.map((row, index) => {
      // Calculate polygon corners
      const x = row.centroid_x;
      const y = row.centroid_y;
      const width = row.dim_x;
      const length = row.dim_y;

      const halfWidth = width / 2;
      const halfLength = length / 2;

      const corners = [
        [x - halfWidth, y - halfLength],
        [x + halfWidth, y - halfLength],
        [x + halfWidth, y + halfLength],
        [x - halfWidth, y + halfLength],
        [x - halfWidth, y - halfLength],
      ];

      // Convert coordinates if needed
      const convertedCorners =
        sourceProjection !== "EPSG:4326"
          ? corners.map((point) => {
              try {
                return convertCoordinates(point, sourceProjection, "EPSG:4326");
              } catch (e) {
                console.error("🔄 Coordinate conversion error:", e);
                return point;
              }
            })
          : corners;

      // Create feature with ALL properties
      return {
        type: "Feature",
        properties: {
          ...row,
          id: index,
          // Ensure these critical properties are present
          selectedAttributeKey: actualKey,
          categoryValue: row[actualKey] || "Unknown",
        },
        geometry: {
          type: "Polygon",
          coordinates: [convertedCorners],
        },
      };
    });

    // Create final GeoJSON
    return {
      type: "FeatureCollection",
      features,
    };
  } catch (error) {
    console.error("🔄 Error in processBlockModelCSV:", error);
    throw error;
  }
}

/**
 * Create initial color mapping from rock types found in data
 * @param rockTypes - Array of unique rock types
 * @returns Object mapping rock types to colors with opacity
 */
export function createInitialColorMapping(rockTypes: string[]): {
  [key: string]: { color: string; opacity: number };
} {
  const defaultColors = [
    "#FF0000", // Red
    "#00FF00", // Green
    "#0000FF", // Blue
    "#FFFF00", // Yellow
    "#FF00FF", // Magenta
    "#00FFFF", // Cyan
    "#FFA500", // Orange
    "#800080", // Purple
    "#FFC0CB", // Pink
    "#808080", // Gray
    "#8B4513", // Brown
    "#000000", // Black
  ];

  const mapping: { [key: string]: { color: string; opacity: number } } = {};

  rockTypes.forEach((rockType, index) => {
    mapping[rockType] = {
      color: defaultColors[index % defaultColors.length],
      opacity: 0.7,
    };
  });

  return mapping;
}

/**
 * Apply custom color mapping with opacity to GeoJSON features
 * @param geoJsonData - The GeoJSON data to update
 * @param colorMapping - The custom color mapping with opacity for rock types
 * @returns Updated GeoJSON data with new colors and opacity
 */
export function applyColorMapping(
  geoJsonData: any,
  colorMapping: { [key: string]: { color: string; opacity: number } },
  attributeKey = "rock" // Default attribute to use
): any {
  if (!geoJsonData || !geoJsonData.features) {
    return geoJsonData;
  }

  console.log(`Applying color mapping for attribute: ${attributeKey}`, {
    totalFeatures: geoJsonData.features.length,
    mappingKeys: Object.keys(colorMapping),
  });

  // Create a new GeoJSON object with updated colors and opacity
  const updatedGeoJson = {
    ...geoJsonData,
    features: geoJsonData.features.map((feature: any) => {
      // Pastikan attributeKey yang tepat digunakan
      if (
        feature.properties &&
        feature.properties[attributeKey] !== undefined
      ) {
        const attrValue = String(feature.properties[attributeKey]);
        const mapping = colorMapping[attrValue];

        if (mapping) {
          return {
            ...feature,
            properties: {
              ...feature.properties,
              color: mapping.color,
              opacity: mapping.opacity,
              // Track which attribute was used for coloring
              _coloredBy: attributeKey,
              _coloredValue: attrValue,
            },
          };
        }
      }
      return feature;
    }),
  };

  return updatedGeoJson;
}
