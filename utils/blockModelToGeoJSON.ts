import { processBlockModelCSV } from "./blockModelUtils";
import { filterTopElevationBlocks } from "./blockModelUtils";

interface BlockModelGeoJSONResult {
  geoJsonData: any | null;
  mapCenter: number[];
  mapZoom: number;
  isExportEnabled: boolean;
  error?: string;
}

export const blockModelToGeoJSON = (
  blockModelData: any[],
  sourceProjection = "EPSG:4326",
  topElevationOnly = false
): BlockModelGeoJSONResult => {
  try {
    // Pastikan data hanya memiliki atribut yang diperlukan
    const mappedData = blockModelData.map((row) => ({
      centroid_x: row.centroid_x || row.x || row.X || row.easting || 0,
      centroid_y: row.centroid_y || row.y || row.Y || row.northing || 0,
      centroid_z: row.centroid_z || row.z || row.Z || row.elevation || 0,
      dim_x: row.dim_x || row.width || row.block_size || 10,
      dim_y: row.dim_y || row.length || row.block_size || 10,
      dim_z: row.dim_z || row.height || row.block_size || 10,
      rock: row.rock || row.rock_type || row.material || "Unknown",
    }));

    // Filter top elevation blocks jika diminta
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
        console.log("Setting map center to:", mapCenter);
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
