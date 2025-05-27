import proj4 from "proj4";

// Define common projections
const projections: { [key: string]: string } = {
  // WGS84 (World Geodetic System 1984) - Base coordinate system
  "EPSG:4326": "+proj=longlat +datum=WGS84 +no_defs",

  // UTM Zone 46-57 (North and South)
  "EPSG:32646": "+proj=utm +zone=46 +datum=WGS84 +units=m +no_defs",
  "EPSG:32746": "+proj=utm +zone=46 +south +datum=WGS84 +units=m +no_defs",
  "EPSG:32647": "+proj=utm +zone=47 +datum=WGS84 +units=m +no_defs",
  "EPSG:32747": "+proj=utm +zone=47 +south +datum=WGS84 +units=m +no_defs",
  "EPSG:32648": "+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs",
  "EPSG:32748": "+proj=utm +zone=48 +south +datum=WGS84 +units=m +no_defs",
  "EPSG:32649": "+proj=utm +zone=49 +datum=WGS84 +units=m +no_defs",
  "EPSG:32749": "+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs",
  "EPSG:32650": "+proj=utm +zone=50 +datum=WGS84 +units=m +no_defs",
  "EPSG:32750": "+proj=utm +zone=50 +south +datum=WGS84 +units=m +no_defs",
  "EPSG:32651": "+proj=utm +zone=51 +datum=WGS84 +units=m +no_defs",
  "EPSG:32751": "+proj=utm +zone=51 +south +datum=WGS84 +units=m +no_defs",
  "EPSG:32652": "+proj=utm +zone=52 +datum=WGS84 +units=m +no_defs",
  "EPSG:32752": "+proj=utm +zone=52 +south +datum=WGS84 +units=m +no_defs",
  "EPSG:32653": "+proj=utm +zone=53 +datum=WGS84 +units=m +no_defs",
  "EPSG:32753": "+proj=utm +zone=53 +south +datum=WGS84 +units=m +no_defs",
  "EPSG:32654": "+proj=utm +zone=54 +datum=WGS84 +units=m +no_defs",
  "EPSG:32754": "+proj=utm +zone=54 +south +datum=WGS84 +units=m +no_defs",
  "EPSG:32655": "+proj=utm +zone=55 +datum=WGS84 +units=m +no_defs",
  "EPSG:32755": "+proj=utm +zone=55 +south +datum=WGS84 +units=m +no_defs",
  "EPSG:32656": "+proj=utm +zone=56 +datum=WGS84 +units=m +no_defs",
  "EPSG:32756": "+proj=utm +zone=56 +south +datum=WGS84 +units=m +no_defs",
  "EPSG:32657": "+proj=utm +zone=57 +datum=WGS84 +units=m +no_defs",
  "EPSG:32757": "+proj=utm +zone=57 +south +datum=WGS84 +units=m +no_defs",
};

// Cache for projection conversions
const conversionCache = new Map<string, number[]>();

// Initialize projections
const initializeProjections = (): void => {
  Object.entries(projections).forEach(([code, def]) => {
    if (!proj4.defs(code)) {
      proj4.defs(code, def);
    }
  });
};

// Initialize on first import
initializeProjections();

/**
 * Converts coordinates from one projection to another
 * With caching for improved performance
 *
 * @param {number[]} coords - Coordinates in source projection [x, y]
 * @param {string} fromProj - Source projection code
 * @param {string} toProj - Target projection code
 * @returns {number[]} Coordinates in target projection
 */
export function convertCoordinates(
  coords: number[],
  fromProj: string,
  toProj: string
): number[] {
  try {
    // Validate input
    if (!coords || coords.length < 2) {
      console.error("Invalid coordinates:", coords);
      return [0, 0];
    }

    // If converting to same projection, return original
    if (fromProj === toProj) {
      return coords;
    }

    // Round coordinates for caching (to 2 decimal places)
    const roundedX = Math.round(coords[0] * 100) / 100;
    const roundedY = Math.round(coords[1] * 100) / 100;

    // Create cache key
    const cacheKey = `${fromProj}_${toProj}_${roundedX}_${roundedY}`;

    // Check cache
    if (conversionCache.has(cacheKey)) {
      return conversionCache.get(cacheKey)!;
    }

    // Register projections if not already done
    if (!proj4.defs(fromProj)) {
      if (!projections[fromProj]) {
        console.error("Unknown projection:", fromProj);
        return coords;
      }
      proj4.defs(fromProj, projections[fromProj]);
    }

    if (!proj4.defs(toProj)) {
      if (!projections[toProj]) {
        console.error("Unknown projection:", toProj);
        return coords;
      }
      proj4.defs(toProj, projections[toProj]);
    }

    // Do the conversion
    const result = proj4(fromProj, toProj, [roundedX, roundedY]);

    // Cache the result (limit cache size to avoid memory issues)
    if (conversionCache.size > 5000) {
      // Clear half the cache when it gets too large
      const keys = Array.from(conversionCache.keys()).slice(0, 2500);
      keys.forEach((k) => conversionCache.delete(k));
    }

    conversionCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error("Error in convertCoordinates:", error);
    console.error("Problematic input:", { coords, fromProj, toProj });
    return coords; // Return original coordinates on error
  }
}

/**
 * Converts coordinates from one projection to another
 * Optimized for batch processing
 *
 * @param {number[][]} coords - Array of coordinate pairs in source projection [[x1, y1], [x2, y2], ...]
 * @param {string} fromProj - Source projection code
 * @param {string} toProj - Target projection code
 * @returns {number[][]} Array of coordinate pairs in target projection
 */
export function convertCoordinatesArray(
  coords: number[][],
  fromProj: string,
  toProj: string
): number[][] {
  return coords.map((coord) => convertCoordinates(coord, fromProj, toProj));
}
