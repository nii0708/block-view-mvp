import * as FileSystem from "expo-file-system";
import { PDFCoordinates } from "../services/FileService";

export const processPDFForMapOverlay = async (
  pdfUri: string,
  coordinates: PDFCoordinates | null,
  convertToImage: boolean = true
): Promise<{
  imageBase64: string | null;
  bounds: [[number, number], [number, number]] | null;
  center: [number, number];
  zoom: number;
  error: string | undefined;
  needsConversion?: boolean;
}> => {
  try {
    console.log("Processing PDF for map overlay...");

    if (coordinates) {
      // Calculate bounds correctly using all four corners
      const lats = [
        coordinates.topLeft.lat,
        coordinates.topRight.lat,
        coordinates.bottomLeft.lat,
        coordinates.bottomRight.lat,
      ];

      const lngs = [
        coordinates.topLeft.lng,
        coordinates.topRight.lng,
        coordinates.bottomLeft.lng,
        coordinates.bottomRight.lng,
      ];

      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // Leaflet bounds format: [[south, west], [north, east]]
      const bounds: [[number, number], [number, number]] = [
        [minLat, minLng],
        [maxLat, maxLng],
      ];

      // Calculate center
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const center: [number, number] = [centerLat, centerLng];

      // Calculate appropriate zoom level based on bounds
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      const maxDiff = Math.max(latDiff, lngDiff);

      // Heuristic for zoom level based on extent
      let zoom = 12;
      if (maxDiff < 0.01) zoom = 17; // Very small area
      else if (maxDiff < 0.02) zoom = 16;
      else if (maxDiff < 0.05) zoom = 15;
      else if (maxDiff < 0.1) zoom = 14;
      else if (maxDiff < 0.2) zoom = 13;
      else if (maxDiff < 0.5) zoom = 12;
      else if (maxDiff < 1) zoom = 11;
      else zoom = 10;

      console.log("PDF bounds calculated:", bounds);
      console.log("PDF center calculated:", center);
      console.log("PDF zoom level:", zoom);

      if (convertToImage) {
        return {
          imageBase64: null,
          bounds,
          center,
          zoom,
          error: undefined,
          needsConversion: true,
        };
      } else {
        return {
          imageBase64: null,
          bounds,
          center,
          zoom,
          error: undefined,
        };
      }
    } else {
      console.warn("No valid coordinates found in PDF metadata");
      return {
        imageBase64: null,
        bounds: null,
        center: [0, 0],
        zoom: 12,
        error: "No coordinates found in PDF metadata",
      };
    }
  } catch (error: any) {
    console.error("Error processing PDF for map overlay:", error);
    return {
      imageBase64: null,
      bounds: null,
      center: [0, 0],
      zoom: 12,
      error: error.message || "Unknown error occurred",
    };
  }
};
