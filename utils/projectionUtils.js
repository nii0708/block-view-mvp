import proj4 from 'proj4';

// Define common projections
// const projections = {
//   'EPSG:4326': '+proj=longlat +datum=WGS84 +no_defs', // WGS84
//   'EPSG:32652': '+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs', // UTM Zone 52
//   // Add more projections as needed
// };

const projections = {
  // WGS84 (World Geodetic System 1984) - Base coordinate system
  'EPSG:4326': '+proj=longlat +datum=WGS84 +no_defs',
  
  // UTM Zone 46 (North)
  'EPSG:32646': '+proj=utm +zone=46 +datum=WGS84 +units=m +no_defs',
  // UTM Zone 46 (South)
  'EPSG:32746': '+proj=utm +zone=46 +south +datum=WGS84 +units=m +no_defs',
  
  // UTM Zone 47 (North)
  'EPSG:32647': '+proj=utm +zone=47 +datum=WGS84 +units=m +no_defs',
  // UTM Zone 47 (South)
  'EPSG:32747': '+proj=utm +zone=47 +south +datum=WGS84 +units=m +no_defs',
  
  // UTM Zone 48 (North)
  'EPSG:32648': '+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs',
  // UTM Zone 48 (South)
  'EPSG:32748': '+proj=utm +zone=48 +south +datum=WGS84 +units=m +no_defs',
  
  // UTM Zone 49 (North)
  'EPSG:32649': '+proj=utm +zone=49 +datum=WGS84 +units=m +no_defs',
  // UTM Zone 49 (South)
  'EPSG:32749': '+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs',
  
  // UTM Zone 50 (North)
  'EPSG:32650': '+proj=utm +zone=50 +datum=WGS84 +units=m +no_defs',
  // UTM Zone 50 (South)
  'EPSG:32750': '+proj=utm +zone=50 +south +datum=WGS84 +units=m +no_defs',
  
  // UTM Zone 51 (North)
  'EPSG:32651': '+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs',
  // UTM Zone 51 (South)
  'EPSG:32751': '+proj=utm +zone=51 +south +datum=WGS84 +units=m +no_defs',
  
  // UTM Zone 52 (North)
  'EPSG:32652': '+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs',
  // UTM Zone 52 (South)
  'EPSG:32752': '+proj=utm +zone=52 +south +datum=WGS84 +units=m +no_defs',
  
  // UTM Zone 53 (North)
  'EPSG:32653': '+proj=utm +zone=53 +datum=WGS84 +units=m +no_defs',
  // UTM Zone 53 (South)
  'EPSG:32753': '+proj=utm +zone=53 +south +datum=WGS84 +units=m +no_defs',
  
  // UTM Zone 54 (North)
  'EPSG:32654': '+proj=utm +zone=54 +datum=WGS84 +units=m +no_defs',
  // UTM Zone 54 (South)
  'EPSG:32754': '+proj=utm +zone=54 +south +datum=WGS84 +units=m +no_defs',
  
  // UTM Zone 55 (North)
  'EPSG:32655': '+proj=utm +zone=55 +datum=WGS84 +units=m +no_defs',
  // UTM Zone 55 (South)
  'EPSG:32755': '+proj=utm +zone=55 +south +datum=WGS84 +units=m +no_defs',
  
  // UTM Zone 56 (North)
  'EPSG:32656': '+proj=utm +zone=56 +datum=WGS84 +units=m +no_defs',
  // UTM Zone 56 (South)
  'EPSG:32756': '+proj=utm +zone=56 +south +datum=WGS84 +units=m +no_defs',
  
  // UTM Zone 57 (North)
  'EPSG:32657': '+proj=utm +zone=57 +datum=WGS84 +units=m +no_defs',
  // UTM Zone 57 (South)
  'EPSG:32757': '+proj=utm +zone=57 +south +datum=WGS84 +units=m +no_defs'
};

/**
 * Converts coordinates from one projection to another
 * 
 * @param {number[]} coords - Coordinates in source projection [x, y]
 * @param {string} fromProj - Source projection code
 * @param {string} toProj - Target projection code
 * @returns {number[]} Coordinates in target projection
 */
export function convertCoordinates(coords, fromProj, toProj) {
  // Register projections if not already done
  if (!proj4.defs(fromProj)) {
    proj4.defs(fromProj, projections[fromProj]);
  }
  
  if (!proj4.defs(toProj)) {
    proj4.defs(toProj, projections[toProj]);
  }
  
  // Do the conversion
  const result = proj4(fromProj, toProj, coords);
  
  // Debug logging for conversion
//   console.log(`Converting ${fromProj} to ${toProj}: ${coords} => ${result}`);
  
  return result;
}

/**
 * Converts coordinates from one projection to another
 * 
 * @param {number[][]} coords - Array of coordinate pairs in source projection [[x1, y1], [x2, y2], ...]
 * @param {string} fromProj - Source projection code
 * @param {string} toProj - Target projection code
 * @returns {number[][]} Array of coordinate pairs in target projection
 */
export function convertCoordinatesArray(coords, fromProj, toProj) {
  return coords.map(coord => convertCoordinates(coord, fromProj, toProj));
}

/**
 * Converts a GeoJSON object from one projection to another
 * 
 * @param {Object} geojson - GeoJSON object in source projection
 * @param {string} fromProj - Source projection code
 * @param {string} toProj - Target projection code 
 * @returns {Object} GeoJSON object in target projection
 */
export function convertGeoJSON(geojson, fromProj, toProj) {
  // Create a deep copy of the GeoJSON to avoid modifying the original
  const result = JSON.parse(JSON.stringify(geojson));
  
  // Process each feature
  result.features = result.features.map(feature => {
    // Only handle polygon geometries for now
    if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates = feature.geometry.coordinates.map(ring => 
        ring.map(coord => convertCoordinates(coord, fromProj, toProj))
      );
    }
    return feature;
  });
  
  return result;
}