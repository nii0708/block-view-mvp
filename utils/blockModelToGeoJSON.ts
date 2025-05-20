import { processBlockModelCSV } from "./blockModelUtils";
import { filterTopElevationBlocks } from "./blockModelUtils";

interface BlockModelGeoJSONResult {
  geoJsonData: any | null;
  mapCenter: number[];
  mapZoom: number;
  isExportEnabled: boolean;
  error?: string;
}

// Define a type for the picked attributes
type PickedAttributeType = Record<string, string[]>;

export const blockModelToGeoJSON = (
  blockModelData: any[],
  sourceProjection = "EPSG:4326",
  topElevationOnly = false,
  pickedAttribute?: PickedAttributeType | null
): BlockModelGeoJSONResult => {
  try {
    console.log("picked attribute", pickedAttribute);

    // Determine which attribute to use for rock type classification
    let attributeKey = "rock"; // Default attribute
    
    // If we have a picked attribute, use the first key as the attribute to display
    if (pickedAttribute && Object.keys(pickedAttribute).length > 0) {
      attributeKey = Object.keys(pickedAttribute)[0]; // Get the first key (e.g., "p0810")
      console.log("Using attribute key:", attributeKey);
    }

    // Map the data with the selected attribute as the "rock" property for visualization
    const mappedData = blockModelData.map((row) => {
      // Get the value for rock based on the picked attribute key or fallback to default
      const rockValue = attributeKey !== "rock" && row[attributeKey] 
        ? row[attributeKey] 
        : (row.rock || row.rock_type || row.material || "Unknown");
      
      return {
        centroid_x: row.centroid_x || row.x || row.X || row.easting || 0,
        centroid_y: row.centroid_y || row.y || row.Y || row.northing || 0,
        centroid_z: row.centroid_z || row.z || row.Z || row.elevation || 0,
        dim_x: row.xinc || row.dim_x || row.width || row.block_size || 10,
        dim_y: row.yinc || row.dim_y || row.length || row.block_size || 10,
        dim_z: row.zinc || row.dim_z || row.height || row.block_size || 10,
        rock: rockValue, // Use the value from the picked attribute
        originalData: row, // Optionally keep the original data for debugging
      };
    });

    // Filter top elevation blocks if requested
    const filteredData = topElevationOnly
      ? filterTopElevationBlocks(mappedData)
      : mappedData;

    // Process the data into GeoJSON with the specified projection
    const processedData = processBlockModelCSV(filteredData, sourceProjection);

    // Calculate initial map center if features are available
    let mapCenter = [0, 0];

    if (processedData.features && processedData.features.length > 0) {
      const firstFeature = processedData.features[0];
      if (
        firstFeature.geometry &&
        firstFeature.geometry.coordinates &&
        firstFeature.geometry.coordinates[0] &&
        firstFeature.geometry.coordinates[0][0]
      ) {
        // PENTING: Untuk Leaflet di WebView: urutan [latitude, longitude] diharapkan
        // GeoJSON uses [longitude, latitude] tapi Leaflet expects [latitude, longitude]
        const coords = firstFeature.geometry.coordinates[0][0];
        mapCenter = [coords[1], coords[0]];
      }
    }

    return {
      geoJsonData: processedData,
      mapCenter,
      mapZoom: 14, // Gunakan zoom yang lebih tinggi untuk melihat detail lebih baik
      isExportEnabled: processedData.features.length > 0,
    };
  } catch (error: any) {
    console.error("Error processing block model data:", error);
    return {
      geoJsonData: null,
      mapCenter: [0, 0],
      mapZoom: 12,
      isExportEnabled: false,
      error: error.message,
    };
  }
};