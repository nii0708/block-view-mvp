// src/utils/lineDrawerUtils.js

/**
 * Adds a point to an existing line array
 * If the line already has 2 points, it starts a new line with the new point
 */
export const addPointToLine = (linePoints, newPoint) => {
    // If we already have 2 points, reset to the new point to start a new line
    if (linePoints.length >= 2) {
      return [newPoint];
    }
    // Otherwise add this point to the existing line
    return [...linePoints, newPoint];
  };

  /**
   * Converts an array of [lat, lng] points to a GeoJSON LineString
   */
  export const pointsToGeoJSONLine = (points) => {
    if (!points || points.length < 2) {
      return null;
    }

    // Convert from Leaflet [lat, lng] to GeoJSON [lng, lat]
    const coordinates = points.map(point => [point[1], point[0]]);

    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      },
      properties: {
        type: 'cross-section-line'
      }
    };
  };

  /**
   * Converts GeoJSON LineString back to an array of [lat, lng] points for Leaflet
   */
  export const geoJSONLineToPoints = (geoJSONLine) => {
    if (!geoJSONLine || !geoJSONLine.geometry || !geoJSONLine.geometry.coordinates) {
      return [];
    }

    // Convert from GeoJSON [lng, lat] to Leaflet [lat, lng]
    return geoJSONLine.geometry.coordinates.map(coord => [coord[1], coord[0]]);
  };

  /**
   * Calculate line length in meters
   * Uses the Haversine formula to compute distance between points
   */
  export const calculateLineDistance = (points) => {
    if (!points || points.length < 2) {
      return 0;
    }

    // Haversine formula
    const getDistanceFromLatLngInM = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // Earth's radius in meters
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Calculate total distance along all segments
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const [lat1, lng1] = points[i];
      const [lat2, lng2] = points[i + 1];
      totalDistance += getDistanceFromLatLngInM(lat1, lng1, lat2, lng2);
    }

    return totalDistance;
  };