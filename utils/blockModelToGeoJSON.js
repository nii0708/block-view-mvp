// src/utils/blockModelToGeoJSON.js
import { processBlockModelCSV } from './blockModelUtils';

export const blockModelToGeoJSON = (blockModelData, sourceProjection = 'EPSG:4326') => {
  if (!blockModelData || blockModelData.length === 0) {
    return {
      geoJsonData: null,
      mapCenter: [0, 0],
      mapZoom: 12,
      isExportEnabled: false
    };
  }
  
  try {
    // Process the data into GeoJSON with the specified projection
    const processedData = processBlockModelCSV(blockModelData, sourceProjection);
    console.log('DATA BLOCK', processedData);
    
    // Calculate initial map center if features are available
    let mapCenter = [0, 0];
    
    if (processedData.features && processedData.features.length > 0) {
      const firstFeature = processedData.features[0];
      if (firstFeature.geometry && firstFeature.geometry.coordinates && 
          firstFeature.geometry.coordinates[0] && firstFeature.geometry.coordinates[0][0]) {
        // Note: React Native mapping libraries may have different coordinate order requirements
        // For react-native-maps: [latitude, longitude] order is expected
        const coords = firstFeature.geometry.coordinates[0][0];
        mapCenter = [coords[1], coords[0]];
        console.log('Setting map center to:', mapCenter);
      }
    }
    
    return {
      geoJsonData: processedData,
      mapCenter,
      mapZoom: 12,
      isExportEnabled: processedData.features.length > 0
    };
  } catch (error) {
    console.error("Error processing block model data:", error);
    return {
      geoJsonData: null,
      mapCenter: [0, 0],
      mapZoom: 12,
      isExportEnabled: false,
      error: error.message
    };
  }
};