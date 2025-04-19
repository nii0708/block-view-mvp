// src/utils/elevationUtils.js
import { convertCoordinates } from './projectionUtils';

export const processElevationData = (data, sourceProjection, lonField = 'x', latField = 'y', elevField = 'z') => {
  if (!data || data.length === 0) {
    console.warn('No elevation data to process');
    return [];
  }
  // console.log('ORI ELEVATION :', data)
  // data = processData(data)
  // console.log('NEW ELEVATION :', data)

  return data.map((point, index) => {
    const x = parseFloat(point[lonField]);
    const y = parseFloat(point[latField]);
    const elevation = parseFloat(point[elevField]);

    if (isNaN(x) || isNaN(y) || isNaN(elevation)) {
      console.warn(`Invalid elevation data at index ${index}:`, point);
      return null;
    }

    let wgs84Coords;
    if (sourceProjection !== 'EPSG:4326') {
      wgs84Coords = convertCoordinates([x, y], sourceProjection, 'EPSG:4326');
    } else {
      wgs84Coords = [x, y];
    }

    return {
      original: { x, y },
      wgs84: { lng: wgs84Coords[0], lat: wgs84Coords[1] },
      elevation
    };
  }).filter(point => point !== null);
};

export const generateElevationProfile = (elevationPoints, lineGeoJson, sampleCount = 100) => {
  if (!elevationPoints || elevationPoints.length === 0 || !lineGeoJson) {
    return [];
  }

  const lineCoords = lineGeoJson.geometry.coordinates;
  if (lineCoords.length < 2) {
    return [];
  }

  const startPoint = lineCoords[0]; // [lng, lat]
  const endPoint = lineCoords[1]; // [lng, lat]
  const lineLength = calculateDistance(
    startPoint[0], startPoint[1],
    endPoint[0], endPoint[1]
  );

  // First pass: generate all sample points
  const samplePoints = [];
  for (let i = 0; i < sampleCount; i++) {
    const ratio = i / (sampleCount - 1);
    
    const lng = startPoint[0] + ratio * (endPoint[0] - startPoint[0]);
    const lat = startPoint[1] + ratio * (endPoint[1] - startPoint[1]);
    const distanceAlongLine = ratio * lineLength;
    
    // Try to get elevation data
    const hasElevation = hasElevationData(lng, lat, elevationPoints);
    
    // Create point with or without elevation
    if (hasElevation) {
      const elevation = interpolateElevation(lng, lat, elevationPoints);
      samplePoints.push({
        lng,
        lat,
        distance: distanceAlongLine,
        elevation,
        hasData: true
      });
    } else {
      samplePoints.push({
        lng,
        lat,
        distance: distanceAlongLine,
        elevation: null,
        hasData: false
      });
    }
  }

  // Second pass: organize into segments with special points for breaks
  const result = [];
  let currentSegment = [];

  for (let i = 0; i < samplePoints.length; i++) {
    const point = samplePoints[i];
    
    if (point.hasData) {
      // Add point to current segment
      currentSegment.push(point);
    } else {
      // We've hit a point without data
      
      // If we had a segment before, mark the end of the segment
      if (currentSegment.length > 0) {
        // Add all points from the current segment
        result.push(...currentSegment);
        
        // Add a "segment break" marker point
        result.push({
          ...point,
          isSegmentBreak: true
        });
        
        // Reset the segment
        currentSegment = [];
      } else {
        // Add a single point to indicate no data
        result.push({
          ...point,
          isSegmentBreak: true
        });
      }
    }
  }
  
  // Add the last segment if it exists
  if (currentSegment.length > 0) {
    result.push(...currentSegment);
  }

  return result;
};

// Helper to check if elevation data is available for a point
const hasElevationData = (lng, lat, elevationPoints, searchRadius = 0.00005) => {
  // Check if there are nearby points in the default radius
  const nearbyPoints = elevationPoints.filter(point => 
    Math.abs(point.wgs84.lng - lng) < searchRadius && 
    Math.abs(point.wgs84.lat - lat) < searchRadius
  );
  
  if (nearbyPoints.length > 0) {
    return true;
  }
  
  // Check with extended radius
  const extendedPoints = elevationPoints.filter(point => 
    Math.abs(point.wgs84.lng - lng) < searchRadius * 5 && 
    Math.abs(point.wgs84.lat - lat) < searchRadius * 5
  );
  
  return extendedPoints.length > 0;
};

const interpolateElevation = (lng, lat, elevationPoints, power = 2, searchRadius = 0.00005) => {
  const nearbyPoints = elevationPoints.filter(point => 
    Math.abs(point.wgs84.lng - lng) < searchRadius && 
    Math.abs(point.wgs84.lat - lat) < searchRadius
  );
  
  if (nearbyPoints.length === 0) {
    const extendedPoints = elevationPoints.filter(point => 
      Math.abs(point.wgs84.lng - lng) < searchRadius * 5 && 
      Math.abs(point.wgs84.lat - lat) < searchRadius * 5
    );
    
    if (extendedPoints.length === 0) {
      return null; // No nearby data points
    }
    
    let nearestDist = Infinity;
    let nearestElev = 0;
    
    extendedPoints.forEach(point => {
      const dist = calculateDistance(
        lng, lat, 
        point.wgs84.lng, point.wgs84.lat
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestElev = point.elevation;
      }
    });
    
    return nearestElev;
  }
  if (nearbyPoints.length === 1) {
    return nearbyPoints[0].elevation;
  }
  
  let weightSum = 0;
  let valueSum = 0;
  
  nearbyPoints.forEach(point => {
    const distance = calculateDistance(
      lng, lat,
      point.wgs84.lng, point.wgs84.lat
    );
    
    if (distance < 0.0000001) {
      weightSum = 1;
      valueSum = point.elevation;
      return;
    }
    
    const weight = 1 / Math.pow(distance, power);
    weightSum += weight;
    valueSum += weight * point.elevation;
  });
  
  return valueSum / weightSum;
};

const calculateDistance = (lng1, lat1, lng2, lat2) => {
  // Simplified Euclidean distance in degrees
  return Math.sqrt(
    Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2)
  );
};