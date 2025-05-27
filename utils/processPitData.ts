import { convertCoordinates } from "./projectionUtils";

interface PitDataPoint {
  x: number | string;
  y: number | string;
  z: number | string;
  interior?: number | string;
  none?: number | string;
  type?: number | string;
  [key: string]: any;
}

export const processPitDataToGeoJSON = (
  pitData: PitDataPoint[],
  sourceProjection: string
): any | null => {
  if (!pitData || pitData.length === 0) {
    return null;
  }

  try {
    // Clean up the data - the STR file format has 6 columns:
    // interior, x, y, z, none, type
    const cleanData = pitData.filter(
      (item) => item.x != null && item.y != null && item.z != null
    );

    if (cleanData.length === 0) {
      console.warn("No valid pit data points after cleaning");
      return null;
    }

    console.log(
      `Processing ${cleanData.length} pit boundary points with sourceProjection: ${sourceProjection}`
    );

    // Print first few data points for debugging

    // PERUBAHAN KRITIS: Fungsi konversi koordinat yang benar
    const convertToWGS84 = (x: number | string, y: number | string) => {
      try {
        // TAHAP 1: Konversi ke format numerik
        const numX = parseFloat(String(x));
        const numY = parseFloat(String(y));

        // PENGUJIAN: Log koordinat input dengan lebih terstruktur
        // console.log(
        //   `Input point: [${numX}, ${numY}] from source: ${sourceProjection}`
        // );

        // PERBAIKAN: Konversi koordinat dengan proporsi yang tepat
        // Untuk kebanyakan UTM zone, kita gunakan order [east, north] -> [long, lat]
        const result = convertCoordinates(
          [numX, numY],
          sourceProjection,
          "EPSG:4326"
        );

        // console.log(`Converted to WGS84: [${result[0]}, ${result[1]}]`);

        // IMPORTANT: GeoJSON mengharapkan koordinat dalam format [longitude, latitude]
        // result[0] = longitude, result[1] = latitude
        return result;
      } catch (error) {
        console.error(`Failed to convert [${x}, ${y}]:`, error);
        return [0, 0];
      }
    };

    // Group data by z-level (elevation)
    const groupedByLevel: Record<string, number[][]> = {};
    cleanData.forEach((point) => {
      // Use full precision for level like your colleague's code
      const level = parseFloat(String(point.z));
      if (!groupedByLevel[level]) {
        groupedByLevel[level] = [];
      }

      // Store coordinates with x and y in the correct order
      groupedByLevel[level].push([
        parseFloat(String(point.x)),
        parseFloat(String(point.y)),
      ]);
    });

    // Pre-allocate arrays for LineStrings and levels
    const lineStrings: any[] = [];
    const levels: number[] = [];

    // Process each level to create LineStrings
    Object.entries(groupedByLevel).forEach(([levelStr, coords]) => {
      const level = parseFloat(levelStr);
      // console.log(`Processing level ${level} with ${coords.length} points`);

      // Track coordinates similar to the web code
      const coordList: number[][] = [];

      // Process each coordinate in the level
      for (const coord of coords) {
        // Convert to tuple-like string for comparison
        const coordKey = `${coord[0]},${coord[1]}`;

        // Check if this coordinate is already in our list (closing the loop)
        const existingIndex = coordList.findIndex(
          (c) => `${c[0]},${c[1]}` === coordKey
        );

        if (existingIndex !== -1) {
          // We found a duplicate, so this closes a line
          // Add the coordinate to complete the line
          coordList.push(coord);

          // Check if we have enough points for a LineString
          if (coordList.length > 1) {
            // Convert coordinates to WGS84 and create a GeoJSON LineString
            const lineStringCoords = coordList.map((c) => {
              // Konversi dengan urutan koordinat yang benar
              return convertToWGS84(c[0], c[1]);
            });

            // Add the LineString to our collection
            lineStrings.push({
              type: "Feature",
              properties: {
                level: level,
                type: "pit_boundary",
              },
              geometry: {
                type: "LineString",
                coordinates: lineStringCoords,
              },
            });

            // Store the level for this LineString
            levels.push(level);

            // console.log(
            //   `Created closed LineString at level ${level} with ${lineStringCoords.length} points`
            // );
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
        const lineStringCoords = coordList.map((c) => {
          // Konversi dengan urutan koordinat yang benar
          return convertToWGS84(c[0], c[1]);
        });

        // Add the LineString to our collection
        lineStrings.push({
          type: "Feature",
          properties: {
            level: level,
            type: "pit_boundary",
          },
          geometry: {
            type: "LineString",
            coordinates: lineStringCoords,
          },
        });

        // Store the level for this LineString
        levels.push(level);

        console.log(
          `Created open LineString at level ${level} with ${lineStringCoords.length} points`
        );
      }
    });

    // Create the final GeoJSON object
    const pitGeoJson = {
      type: "FeatureCollection",
      features: lineStrings,
    };

    console.log(
      `Created GeoJSON with ${lineStrings.length} LineString features across ${
        new Set(levels).size
      } levels`
    );

    // Debug koordinat hasil
    if (
      lineStrings.length > 0 &&
      lineStrings[0].geometry.coordinates.length > 0
    ) {

    }

    return pitGeoJson;
  } catch (error) {
    console.error("Error processing pit data:", error);
    return null;
  }
};
