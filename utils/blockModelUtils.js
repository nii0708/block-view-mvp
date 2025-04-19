import { convertCoordinates } from './projectionUtils';

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
export function createPolygonsFromCoordsAndDims(data, longCol, latCol, widthCol, lengthCol, sourceProjection = 'EPSG:4326') {
  const features = [];
  
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
      [x - halfWidth, y - halfLength]  // closing point (same as first)
    ];
    
    // Convert each corner to WGS84 if needed
    const convertedCorners = sourceProjection !== 'EPSG:4326' 
      ? corners.map(point => {
          const converted = convertCoordinates(point, sourceProjection, 'EPSG:4326');
          // GeoJSON format requires [longitude, latitude] order
          return converted; // proj4 returns [lng, lat] for EPSG:4326
        })
      : corners;
    
    // Create a GeoJSON feature
    const feature = {
      type: "Feature",
      properties: {
        ...row,
        id: index
      },
      geometry: {
        type: "Polygon",
        coordinates: [convertedCorners]
      }
    };
    
    features.push(feature);
  });
  
  // Create a GeoJSON FeatureCollection
  return {
    type: "FeatureCollection",
    features: features
  };
}

/**
 * Removes duplicate polygons based on their geometry
 * 
 * @param {Object} featureCollection - GeoJSON FeatureCollection
 * @returns {Object} Deduplicated GeoJSON FeatureCollection
 */
export function removeDuplicateGeometries(featureCollection) {
  const uniqueGeometries = new Map();
  
  featureCollection.features.forEach(feature => {
    const geometryString = JSON.stringify(feature.geometry.coordinates);
    if (!uniqueGeometries.has(geometryString)) {
      uniqueGeometries.set(geometryString, feature);
    }
  });
  
  return {
    type: "FeatureCollection",
    features: Array.from(uniqueGeometries.values())
  };
}

/**
 * Processes the CSV data for block models
 * 
 * @param {Array} data - Parsed CSV data as array of objects
 * @param {string} sourceProjection - Projection of the input data
 * @returns {Object} Processed GeoJSON FeatureCollection
 */
export function processBlockModelCSV(data, sourceProjection = 'EPSG:4326') {
  try {
    // Your provided hex colors
    const hexColors = [
      "#75499c", "#b40c0d", "#045993", "#db6000", "#118011", 
      "#6d392e", "#c059a1", "#606060", "#9b9c07", "#009dad",
      "#8ea6c5", "#db9a5a", "#78bd6b", "#db7876", "#a48fb3", 
      "#a37c75", "#d495b0", "#a6a6a6", "#b9b96e", "#7eb8c2"
    ];

    // Function to create a color mapping for rock types
    function createRockColorMapping(data, colors) {
      // Extract unique rock types
      const uniqueRockTypes = [...new Set(data.map(item => item.rock))];
      
      // Create mapping object
      const rockColorMap = {};
      
      // Assign colors to rock types
      uniqueRockTypes.forEach((rockType, index) => {
        // Use modulo to handle cases with more rock types than colors
        rockColorMap[rockType] = colors[index % colors.length];
      });
      
      return rockColorMap;
    }

    // Create the mapping
    const rockColorMap = createRockColorMapping(data, hexColors);
    
    // Filter to only the columns we need
    const filteredData = data.map(row => ({
      centroid_x: row.centroid_x,
      centroid_y: row.centroid_y,
      centroid_z: row.centroid_z,
      dim_x: row.dim_x,
      dim_y: row.dim_y,
      dim_z: row.dim_z,
      rock: row.rock,
      color: rockColorMap[row.rock]
    }));
    
    // Create polygon features with projection conversion
    const polygons = createPolygonsFromCoordsAndDims(
      filteredData,
      'centroid_x',
      'centroid_y',
      'dim_x',
      'dim_y',
      sourceProjection
    );
    
    return polygons;
  } catch (error) {
    console.error("Error in processBlockModelCSV:", error);
    throw error;
  }
}