// src/utils/debugAnalyzer.js
/**
 * Utility functions for debugging data issues
 */

/**
 * Analyzes GeoJSON data and reports potential issues
 * 
 * @param {Object} geoJson - GeoJSON object to analyze
 * @returns {Object} Analysis results
 */
export function analyzeGeoJSON(geoJson) {
    const results = {
      valid: false,
      featureCount: 0,
      geometryTypes: {},
      hasCoordinates: false,
      coordinateStats: {
        min: [Number.MAX_VALUE, Number.MAX_VALUE],
        max: [Number.MIN_VALUE, Number.MIN_VALUE],
        validCount: 0,
        invalidCount: 0
      },
      propertyKeys: new Set(),
      issues: []
    };
    
    // Basic validation
    if (!geoJson) {
      results.issues.push("GeoJSON is null or undefined");
      return results;
    }
    
    if (typeof geoJson !== 'object') {
      results.issues.push(`GeoJSON is not an object, got ${typeof geoJson}`);
      return results;
    }
    
    if (geoJson.type !== 'FeatureCollection') {
      results.issues.push(`Expected FeatureCollection, got ${geoJson.type}`);
    }
    
    if (!geoJson.features || !Array.isArray(geoJson.features)) {
      results.issues.push("Features property is missing or not an array");
      return results;
    }
    
    // Analyze features
    results.featureCount = geoJson.features.length;
    
    if (results.featureCount === 0) {
      results.issues.push("FeatureCollection contains no features");
      return results;
    }
    
    geoJson.features.forEach((feature, index) => {
      // Check feature type
      if (!feature.type || feature.type !== 'Feature') {
        results.issues.push(`Feature at index ${index} has invalid type: ${feature.type}`);
      }
      
      // Check geometry
      if (!feature.geometry) {
        results.issues.push(`Feature at index ${index} has no geometry`);
        return;
      }
      
      const geometryType = feature.geometry.type;
      results.geometryTypes[geometryType] = (results.geometryTypes[geometryType] || 0) + 1;
      
      // Check coordinates based on geometry type
      if (!feature.geometry.coordinates) {
        results.issues.push(`Feature at index ${index} has no coordinates`);
        return;
      }
      
      results.hasCoordinates = true;
      
      // Check coordinates format
      let coordinates = [];
      try {
        switch (geometryType) {
          case 'Point':
            coordinates = [feature.geometry.coordinates];
            break;
          case 'LineString':
          case 'MultiPoint':
            coordinates = feature.geometry.coordinates;
            break;
          case 'Polygon':
          case 'MultiLineString':
            coordinates = feature.geometry.coordinates.flat();
            break;
          case 'MultiPolygon':
            coordinates = feature.geometry.coordinates.flat(2);
            break;
          default:
            results.issues.push(`Unsupported geometry type at index ${index}: ${geometryType}`);
            return;
        }
        
        // Validate sample of coordinates (max 100 to avoid performance issues)
        const sampleSize = Math.min(coordinates.length, 100);
        for (let i = 0; i < sampleSize; i++) {
          const coord = coordinates[i];
          if (!Array.isArray(coord) || coord.length < 2) {
            results.coordinateStats.invalidCount++;
            continue;
          }
          
          const [x, y] = coord;
          if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
            results.coordinateStats.invalidCount++;
            continue;
          }
          
          results.coordinateStats.validCount++;
          
          // Update min/max
          results.coordinateStats.min[0] = Math.min(results.coordinateStats.min[0], x);
          results.coordinateStats.min[1] = Math.min(results.coordinateStats.min[1], y);
          results.coordinateStats.max[0] = Math.max(results.coordinateStats.max[0], x);
          results.coordinateStats.max[1] = Math.max(results.coordinateStats.max[1], y);
        }
      } catch (e) {
        results.issues.push(`Error processing coordinates at index ${index}: ${e.message}`);
      }
      
      // Check properties
      if (feature.properties) {
        Object.keys(feature.properties).forEach(key => {
          results.propertyKeys.add(key);
        });
      } else {
        results.issues.push(`Feature at index ${index} has no properties`);
      }
    });
    
    // Convert Set to Array for easier logging
    results.propertyKeys = Array.from(results.propertyKeys);
    
    // Final validity check
    results.valid = results.issues.length === 0 && 
                    results.hasCoordinates &&
                    results.coordinateStats.validCount > 0;
    
    return results;
  }
  
  /**
   * Logs a detailed analysis of GeoJSON data
   * 
   * @param {Object} geoJson - GeoJSON object to analyze
   */
  export function logGeoJSONAnalysis(geoJson) {
    const analysis = analyzeGeoJSON(geoJson);
    
    console.log('===== GeoJSON Analysis =====');
    console.log(`Valid: ${analysis.valid}`);
    console.log(`Feature count: ${analysis.featureCount}`);
    console.log('Geometry types:', analysis.geometryTypes);
    console.log('Property keys:', analysis.propertyKeys);
    console.log('Coordinate stats:', {
      validCount: analysis.coordinateStats.validCount,
      invalidCount: analysis.coordinateStats.invalidCount,
      boundingBox: [
        analysis.coordinateStats.min,
        analysis.coordinateStats.max
      ]
    });
    
    if (analysis.issues.length > 0) {
      console.log('Issues found:', analysis.issues);
    } else {
      console.log('No issues found');
    }
    
    console.log('============================');
    
    return analysis;
  }