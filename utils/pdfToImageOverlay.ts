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
      // Use all four corners for correct bounds
      const bounds: [[number, number], [number, number]] = [
        [
          Math.min(
            coordinates.bottomLeft.lat,
            coordinates.bottomRight.lat
          ),
          Math.min(
            coordinates.bottomLeft.lng,
            coordinates.topLeft.lng
          )
        ],
        [
          Math.max(
            coordinates.topLeft.lat, 
            coordinates.topRight.lat
          ),
          Math.max(
            coordinates.topRight.lng,
            coordinates.bottomRight.lng
          )
        ]
      ];

      // Calculate center
      const centerLat = (bounds[0][0] + bounds[1][0]) / 2;
      const centerLng = (bounds[0][1] + bounds[1][1]) / 2;
      const center: [number, number] = [centerLat, centerLng];

      // Calculate appropriate zoom level based on bounds
      const latDiff = bounds[1][0] - bounds[0][0];
      const lngDiff = bounds[1][1] - bounds[0][1];
      const maxDiff = Math.max(latDiff, lngDiff);

      // Adjust zoom level based on the area size
      let zoom = 12;
      if (maxDiff < 0.005) zoom = 18;
      else if (maxDiff < 0.01) zoom = 17;
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
