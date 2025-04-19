// src/utils/processPitData.js
import proj4 from 'proj4';

export const processPitDataToGeoJSON = (pitData, sourceProjection) => {
  if (!pitData || pitData.length === 0) {
    return null;
  }

  try {
    // Clean up the data - the STR file format has 6 columns:
    // interior, x, y, z, none, type
    const cleanData = pitData.filter(item =>
      item.x != null && item.y != null && item.z != null
    );

    if (cleanData.length === 0) {
      console.warn("No valid pit data points after cleaning");
      return null;
    }

    // Define projections
    proj4.defs('EPSG:32652', '+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs');

    // Convert coordinates from source projection to WGS84
    const convertToWGS84 = (x, y) => {
      try {
        // Make sure we're using the right format for the conversion
        const result = proj4(sourceProjection, 'EPSG:4326', [parseFloat(y), parseFloat(x)]);
        return result;
      } catch (error) {
        console.error(`Failed to convert [${x}, ${y}]:`, error);
        return [0, 0]; // Return a default value in case of error
      }
    };

    // Group data by z-level (elevation)
    const groupedByLevel = {};
    cleanData.forEach(point => {
      const level = parseFloat(point.z);
      if (!groupedByLevel[level]) {
        groupedByLevel[level] = [];
      }

      // Store the coordinates in [y, x] order to match Python example
      groupedByLevel[level].push([parseFloat(point.y), parseFloat(point.x)]);
    });

    // Pre-allocate arrays for LineStrings and levels
    const lineStrings = [];
    const levels = [];

    // Process each level to create LineStrings
    Object.entries(groupedByLevel).forEach(([level, coords]) => {
      // Track coordinates similar to the Python code
      const coordList = [];

      // Process each coordinate in the level
      for (const coord of coords) {
        // Convert to tuple-like string for comparison (in JS we can't use arrays as object keys)
        const coordKey = `${coord[0]},${coord[1]}`;

        // Check if this coordinate is already in our list (closing the loop)
        const existingIndex = coordList.findIndex(c => `${c[0]},${c[1]}` === coordKey);

        if (existingIndex !== -1) {
          // We found a duplicate, so this closes a line
          // Add the coordinate to complete the line
          coordList.push(coord);

          // Check if we have enough points for a LineString
          if (coordList.length > 1) {
            // Convert coordinates to WGS84 and create a GeoJSON LineString
            const lineStringCoords = coordList.map(c => {
              // Convert from [y, x] to WGS84 [longitude, latitude]
              return convertToWGS84(c[1], c[0]);
            });

            // Add the LineString to our collection
            lineStrings.push({
              type: 'Feature',
              properties: {
                level: parseFloat(level),
                type: 'pit_boundary'
              },
              geometry: {
                type: 'LineString',
                coordinates: lineStringCoords
              }
            });

            // Store the level for this LineString
            levels.push(parseFloat(level));
          }

          // Reset for the next line
          coordList.length = 0;
        } else {
          // New coordinate, add to the list
          coordList.push(coord);
        }
      }

      // Handle any remaining coordinates at the end
      if (coordList.length > 1) {
        // Convert coordinates to WGS84 and create a GeoJSON LineString
        const lineStringCoords = coordList.map(c => {
          // Convert from [y, x] to WGS84 [longitude, latitude]
          return convertToWGS84(c[1], c[0]);
        });

        // Add the LineString to our collection
        lineStrings.push({
          type: 'Feature',
          properties: {
            level: parseFloat(level),
            type: 'pit_boundary'
          },
          geometry: {
            type: 'LineString',
            coordinates: lineStringCoords
          }
        });

        // Store the level for this LineString
        levels.push(parseFloat(level));
      }
    });

    // Create the final GeoJSON object
    const pitGeoJson = {
      type: 'FeatureCollection',
      features: lineStrings
    };

    return pitGeoJson;
  } catch (error) {
    console.error("Error processing pit data:", error);
    return null;
  }
};