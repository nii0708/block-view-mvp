import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Papa from "papaparse";

export interface FileInfo {
  name: string;
  uri: string;
  type: string;
  size?: number;
  mimeType?: string;
  lastModified?: number;
}

// Tambahkan interface untuk PDF coordinates
export interface PDFCoordinates {
  topLeft: { lat: number; lng: number };
  topRight: { lat: number; lng: number };
  bottomLeft: { lat: number; lng: number };
  bottomRight: { lat: number; lng: number };
  raw?: string; // Optional raw GPTS data
}

// Update interface MiningDataFile untuk include pdfCoordinates
export interface MiningDataFile {
  name: string;
  date: string;
  files: {
    blockModel: FileInfo | null;
    elevation: FileInfo | null;
    pit: FileInfo | null;
    orthophoto: FileInfo | null;
    pdfCoordinates?: PDFCoordinates | null; // Tambahkan field ini
  };
}

// Tipe untuk hasil parsing CSV
interface CSVRow {
  [key: string]: string | number | null;
}

// Tipe untuk baris dalam file LiDAR STR
type LiDARRow = (string | number)[];

// Tipe untuk hasil parsing LiDAR
interface LiDARPoint {
  id: number;
  lat: number;
  lon: number;
  z: number;
  desc: string;
}

// Tipe untuk data PDF dengan informasi lengkap
export interface PDFData {
  fileUri: string;
  fileName: string;
  coordinates?: PDFCoordinates;
  isProcessing?: boolean;
}

// Nama file untuk menyimpan data
const STORAGE_KEY = "mining_data_files.json";

/**
 * Pick a PDF file for geospatial data
 */
export const pickPDF = async (): Promise<PDFData | null> => {
  // First try with specific types
  let file = await pickFile([
    "application/pdf",
    "application/x-pdf",
    "application/acrobat",
    "text/pdf",
    "text/x-pdf",
  ]);

  // If that doesn't work, try with all file types and filter by extension
  if (!file) {
    console.log(
      "Specific PDF MIME types didn't work, trying with any file type"
    );
    file = await pickFile("*/*");

    if (file) {
      // Check if the file has a .pdf extension
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        console.log(`File ${file.name} is not a PDF file`);
        alert("Please select a PDF file (with .pdf extension)");
        return null;
      }
    }
  }

  if (!file) return null;

  // Return PDF data with processing flag
  return {
    fileUri: file.uri,
    fileName: file.name,
    coordinates: undefined,
    isProcessing: false,
  };
};

/**
 * Pick a file from device storage with extensive logging
 */
export const pickFile = async (
  type: string | string[] = "*/*"
): Promise<FileInfo | null> => {
  try {
    console.log(`Attempting to pick file with type: ${JSON.stringify(type)}`);

    const result = await DocumentPicker.getDocumentAsync({
      type,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      console.log("Document picking was canceled");
      return null;
    }

    // Return the first asset if available
    if (result.assets && result.assets.length > 0) {
      const file = result.assets[0] as FileInfo;
      console.log("Selected file details:", {
        name: file.name,
        type: file.type,
        mimeType: file.mimeType,
        uri: file.uri.substring(0, 50) + "...", // Log partial URI for debugging
      });
      return file;
    }

    return null;
  } catch (error: any) {
    console.error("Error picking document:", error);
    return null;
  }
};

/**
 * Pick a CSV file specifically - using expanded MIME types and fallback approach
 */
export const pickCSV = async (): Promise<FileInfo | null> => {
  // First try with specific MIME types
  let file = await pickFile([
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/comma-separated-values",
  ]);

  // If that doesn't work, try with all file types and filter by extension
  if (!file) {
    console.log(
      "Specific CSV MIME types didn't work, trying with any file type"
    );
    file = await pickFile("*/*");

    if (file) {
      // Check if the file has a .csv extension
      if (!file.name.toLowerCase().endsWith(".csv")) {
        console.log(`File ${file.name} is not a CSV file`);
        alert("Please select a CSV file (with .csv extension)");
        return null;
      }
    }
  }

  return file;
};

/**
 * Pick an STR file (for LiDAR data)
 */
export const pickLiDAR = async (): Promise<FileInfo | null> => {
  // First try with specific types
  let file = await pickFile(["application/octet-stream", "text/plain"]);

  // If that doesn't work, try with all file types and filter by extension
  if (!file) {
    console.log(
      "Specific STR MIME types didn't work, trying with any file type"
    );
    file = await pickFile("*/*");

    if (file) {
      // Check if the file has a .str extension
      if (!file.name.toLowerCase().endsWith(".str")) {
        console.log(`File ${file.name} is not an STR file`);
        alert("Please select an STR file (with .str extension)");
        return null;
      }
    }
  }

  return file;
};

/**
 * Pick an SVG file (for orthophoto data)
 */
export const pickSVG = async (): Promise<FileInfo | null> => {
  // First try with specific types
  let file = await pickFile(["image/svg+xml", "image/*"]);

  // If that doesn't work, try with all file types and filter by extension
  if (!file) {
    console.log(
      "Specific SVG MIME types didn't work, trying with any file type"
    );
    file = await pickFile("*/*");

    if (file) {
      // Check if the file has a .svg extension
      if (!file.name.toLowerCase().endsWith(".svg")) {
        console.log(`File ${file.name} is not an SVG file`);
        alert("Please select an SVG file (with .svg extension)");
        return null;
      }
    }
  }

  return file;
};

/**
 * Parse a CSV file and return the parsed data
 */
export const parseCSVFile = async (fileUri: string): Promise<CSVRow[]> => {
  try {
    // console.log(`Reading CSV file from URI: ${fileUri.substring(0, 50)}...`);
    const fileContent = await FileSystem.readAsStringAsync(fileUri);
    // console.log(`CSV file content length: ${fileContent.length} bytes`);
    // console.log(`CSV sample: ${fileContent.substring(0, 100)}...`);

    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            console.error("CSV parsing errors:", results.errors);
            reject(
              new Error(`Error parsing CSV: ${results.errors[0].message}`)
            );
            return;
          }

          // console.log(
          //   `Successfully parsed CSV with ${results.data.length} rows`
          // );
          // if (results.data.length > 0) {
          //   console.log(`Sample CSV row:`, results.data[0]);
          // }

          // Skip the first 3 rows for block model data (important!)
          const typedData = results.data.slice(2) as CSVRow[];
          resolve(typedData);
        },
        error: (error: Error) => {
          console.error("Error parsing CSV:", error);
          reject(error);
        },
      });
    });
  } catch (error: any) {
    console.error("Error reading file:", error);
    throw error;
  }
};

/**
 * Parse an STR file (LiDAR data) and return the parsed data
 * Added options for sampling to reduce data size
 */
export const parseLiDARFile = async (
  fileUri: string,
  options: {
    maxPoints?: number; // Maximum number of points to return
    sampleRate?: number; // Sample every N points
  } = {}
): Promise<LiDARPoint[]> => {
  try {
    // console.log(`Reading STR file from URI: ${fileUri.substring(0, 50)}...`);
    const fileContent = await FileSystem.readAsStringAsync(fileUri);
    // console.log(`STR file content length: ${fileContent.length} bytes`);
    // console.log(`STR sample: ${fileContent.substring(0, 100)}...`);

    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: false,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            console.error("STR parsing errors:", results.errors);
            reject(
              new Error(`Error parsing STR file: ${results.errors[0].message}`)
            );
            return;
          }

          console.log(
            `Successfully parsed STR with ${results.data.length} rows`
          );
          if (results.data.length > 0) {
            console.log(`Sample STR row:`, results.data[0]);
          }

          // Skip header row and process data rows
          const dataRows = results.data.slice(1) as LiDARRow[];

          // Apply sampling if requested
          let processedRows = dataRows;

          // If maxPoints is specified, calculate appropriate sampling rate
          if (options.maxPoints && dataRows.length > options.maxPoints) {
            const sampleRate = Math.ceil(dataRows.length / options.maxPoints);
            console.log(
              `Data has ${dataRows.length} points, sampling every ${sampleRate}th point to get ~${options.maxPoints} points`
            );
            processedRows = dataRows.filter(
              (_, index) => index % sampleRate === 0
            );
          }
          // Otherwise if sampleRate is specified, use that
          else if (options.sampleRate && options.sampleRate > 1) {
            const rate = options.sampleRate; // Create a local constant to satisfy TypeScript
            console.log(`Sampling every ${rate}th point`);
            processedRows = dataRows.filter((_, index) => index % rate === 0);
          }

          // Process each row into the required format
          const processedData = processedRows
            .filter((row: LiDARRow) => {
              // Ensure row has enough columns
              return Array.isArray(row) && row.length >= 4;
            })
            .map((row: LiDARRow) => {
              return {
                id: parseInt(String(row[0])) || 1,
                lat: parseFloat(String(row[1])) || 0,
                lon: parseFloat(String(row[2])) || 0,
                z: parseFloat(String(row[3])) || 0,
                desc: row.length >= 5 ? String(row[4]) : "",
              };
            });

          console.log(`Processed ${processedData.length} LiDAR points`);
          resolve(processedData);
        },
        error: (error: Error) => {
          console.error("Error parsing STR file:", error);
          reject(error);
        },
      });
    });
  } catch (error: any) {
    console.error("Error reading file:", error);
    throw error;
  }
};

/**
 * Save file information to local storage
 */
export const saveFileInfo = async (
  files: MiningDataFile[]
): Promise<boolean> => {
  try {
    const filePath = FileSystem.documentDirectory + STORAGE_KEY;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(files));
    console.log("Files saved successfully to:", filePath);
    return true;
  } catch (error: any) {
    console.error("Error saving file info:", error);
    return false;
  }
};

/**
 * Get saved file information from local storage
 */
export const getFileInfo = async (): Promise<MiningDataFile[]> => {
  try {
    const filePath = FileSystem.documentDirectory + STORAGE_KEY;
    const fileInfoString = await FileSystem.readAsStringAsync(filePath);
    return JSON.parse(fileInfoString) as MiningDataFile[];
  } catch (error: any) {
    console.log("No saved files found or error reading files:", error);
    return [];
  }
};

/**
 * Delete a mining data file by name
 */
export const deleteFileByName = async (fileName: string): Promise<boolean> => {
  try {
    const files = await getFileInfo();
    const updatedFiles = files.filter((file) => file.name !== fileName);

    if (files.length === updatedFiles.length) {
      // No file was removed
      return false;
    }

    return await saveFileInfo(updatedFiles);
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return false;
  }
};

/**
 * Convert PDF to base64 for WebView (if needed for display)
 */
export const convertPDFToBase64 = async (pdfUri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(pdfUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error("Error converting PDF to base64:", error);
    throw error;
  }
};

/**
 * Get PDF coordinates for a specific file
 */
export const getPDFCoordinates = async (
  fileName: string
): Promise<PDFCoordinates | null> => {
  try {
    const files = await getFileInfo();
    const file = files.find((f) => f.name === fileName);

    if (file && file.files.pdfCoordinates) {
      return file.files.pdfCoordinates;
    }

    return null;
  } catch (error: any) {
    console.error("Error getting PDF coordinates:", error);
    return null;
  }
};

/**
 * Native PDF metadata extraction (offline)
 * Extracts GPTS coordinates without external libraries
 */

export const extractPDFCoordinatesNative = async (
  pdfUri: string
): Promise<{
  coordinates: PDFCoordinates | null;
  imageBase64: string | null;
}> => {
  try {
    console.log("Starting PDF extraction with improved pattern matching...");

    const pdfBase64 = await FileSystem.readAsStringAsync(pdfUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Decode base64 to search for metadata
    const binaryStr = atob(pdfBase64);

    // Extract VP (viewport) arrays and their BBox and GPTS data
    const vpPattern = /\/VP\s*\[((?:[^[\]]+|\[[^\]]*\])*)\]/g;
    let vpMatch;
    let maxAreaBBox = 0;
    let selectedBBox: number[] = [];
    let selectedGPTS: number[] = [];

    while ((vpMatch = vpPattern.exec(binaryStr)) !== null) {
      const vpContent = vpMatch[1];

      // Extract BBox from this VP
      const bboxPattern = /\/BBox\s*\[([^\]]+)\]/;
      const bboxMatch = bboxPattern.exec(vpContent);

      if (bboxMatch) {
        const bboxValues = bboxMatch[1]
          .trim()
          .split(/\s+/)
          .map(Number)
          .filter((num) => !isNaN(num));

        if (bboxValues.length === 4) {
          // Calculate area of this BBox
          const areaBBox =
            Math.abs(bboxValues[2] - bboxValues[0]) *
            Math.abs(bboxValues[3] - bboxValues[1]);

          // Find Measure dictionary and GPTS in this VP
          const measurePattern = /\/Measure\s*<<(.*?)>>/s;
          const measureMatch = measurePattern.exec(vpContent);

          if (measureMatch && areaBBox > maxAreaBBox) {
            const measureContent = measureMatch[1];
            const gptsPattern = /\/GPTS\s*\[([^\]]+)\]/;
            const gptsMatch = gptsPattern.exec(measureContent);

            if (gptsMatch) {
              const gptsValues = gptsMatch[1]
                .trim()
                .split(/\s+/)
                .map(Number)
                .filter((num) => !isNaN(num));

              if (gptsValues.length >= 8) {
                // Need at least 4 coordinate pairs
                maxAreaBBox = areaBBox;
                selectedBBox = bboxValues;
                selectedGPTS = gptsValues;
                console.log("Found larger BBox area:", areaBBox);
                console.log("BBox:", bboxValues);
                console.log("GPTS:", gptsValues);
              }
            }
          }
        }
      }
    }

    // If we found valid GPTS and BBox data
    if (selectedGPTS.length >= 8 && selectedBBox.length === 4) {
      // Extract MediaBox for reference
      const mediaBoxPattern = /\/MediaBox\s*\[([^\]]+)\]/;
      const mediaBoxMatch = mediaBoxPattern.exec(binaryStr);
      let mediaBox = [0, 0, 612, 792]; // Default letter size

      if (mediaBoxMatch) {
        mediaBox = mediaBoxMatch[1]
          .trim()
          .split(/\s+/)
          .map(Number)
          .filter((num) => !isNaN(num));
      }

      // Calculate the coordinates similar to your Node.js script
      // Separate lat/lon values (GPTS alternates lat,lng,lat,lng...)
      const lat = selectedGPTS.filter((_, index) => index % 2 === 0);
      const lon = selectedGPTS.filter((_, index) => index % 2 === 1);

      // Get min/max values
      const minLat = Math.min(...lat);
      const maxLat = Math.max(...lat);
      const minLon = Math.min(...lon);
      const maxLon = Math.max(...lon);

      // Calculate gradients for extrapolation
      const dLat = maxLat - minLat;
      const dLon = maxLon - minLon;
      const dX = Math.abs(selectedBBox[2] - selectedBBox[0]);
      const dY = Math.abs(selectedBBox[3] - selectedBBox[1]);

      const gradY = dLat / dY;
      const gradX = dLon / dX;

      // Extrapolate to map corners using the gradients
      const left = minLon - gradX * selectedBBox[0];
      const right = maxLon + gradX * (mediaBox[2] - selectedBBox[2]);
      const upper = maxLat + gradY * Math.abs(mediaBox[3] - selectedBBox[3]);
      const bottom = minLat - gradY * selectedBBox[1];

      console.log("Calculated map bounds:", { left, bottom, right, upper });

      // Create coordinates object
      const coordinates: PDFCoordinates = {
        topLeft: { lat: upper, lng: left },
        topRight: { lat: upper, lng: right },
        bottomLeft: { lat: bottom, lng: left },
        bottomRight: { lat: bottom, lng: right },
        raw: selectedGPTS.join(" "),
      };

      return {
        coordinates,
        imageBase64: pdfBase64,
      };
    } else {
      // Fall back to existing method if no VP with GPTS found
      console.log(
        "No valid VP with GPTS found, falling back to original method"
      );

      // Extract arrays using your original pattern
      const arrayPattern =
        /\/(BBox|LPTS|GPTS|MediaBox|BleedBox|CropBox|TrimBox)\s*\[([^\]]+)\]/g;
      const results: { key: string; values: number[] }[] = [];
      let match: RegExpExecArray | null;

      while ((match = arrayPattern.exec(binaryStr)) !== null) {
        const key = match[1];
        const rawValues = match[2].trim();
        const values = rawValues
          .split(/\s+/)
          .map(Number)
          .filter((num) => !isNaN(num));

        results.push({ key, values });
        console.log(`Found ${key}:`, values);
      }

      // Look for GPTS (Geographic Projection Transformation System) first
      const gptsData = results.find((item) => item.key === "GPTS");
      let coordinates: PDFCoordinates | null = null;

      if (gptsData && gptsData.values.length === 8) {
        // GPTS format: [lat1 lng1 lat2 lng2 lat3 lng3 lat4 lng4]
        coordinates = {
          topLeft: { lat: gptsData.values[0], lng: gptsData.values[1] },
          topRight: { lat: gptsData.values[2], lng: gptsData.values[3] },
          bottomRight: { lat: gptsData.values[4], lng: gptsData.values[5] },
          bottomLeft: { lat: gptsData.values[6], lng: gptsData.values[7] },
          raw: gptsData.values.join(" "),
        };
      } else {
        // Fallback to LPTS if GPTS not found
        const lptsData = results.find((item) => item.key === "LPTS");

        if (lptsData && lptsData.values.length === 8) {
          // Convert LPTS to geographic coordinates (simplified conversion)
          coordinates = convertLPTSToGPS(lptsData.values);
        }
      }

      // Validate the coordinates
      if (coordinates && !validateCoordinates(coordinates)) {
        coordinates = null;
      }

      return {
        coordinates,
        imageBase64: pdfBase64,
      };
    }
  } catch (error) {
    console.error("Error extracting PDF metadata:", error);
    return {
      coordinates: null,
      imageBase64: null,
    };
  }
};

// Helper function to convert LPTS to GPS coordinates
const convertLPTSToGPS = (lptsValues: number[]): PDFCoordinates | null => {
  // This is a simplified conversion - you may need to adjust based on your specific projection
  // For Indonesian projections, you might need to use a proper projection library

  // For now, we'll assume LPTS values are already in decimal degrees
  // You may need to implement proper coordinate transformation here
  return {
    topLeft: { lat: lptsValues[0], lng: lptsValues[1] },
    topRight: { lat: lptsValues[2], lng: lptsValues[3] },
    bottomRight: { lat: lptsValues[4], lng: lptsValues[5] },
    bottomLeft: { lat: lptsValues[6], lng: lptsValues[7] },
    raw: lptsValues.join(" "),
  };
};

// Helper function to validate coordinates
const validateCoordinates = (coords: PDFCoordinates): boolean => {
  const isValidLat = (lat: number) => lat >= -90 && lat <= 90;
  const isValidLng = (lng: number) => lng >= -180 && lng <= 180;

  // Check if all coordinates are valid
  const allValid =
    isValidLat(coords.topLeft.lat) &&
    isValidLat(coords.topRight.lat) &&
    isValidLat(coords.bottomLeft.lat) &&
    isValidLat(coords.bottomRight.lat) &&
    isValidLng(coords.topLeft.lng) &&
    isValidLng(coords.topRight.lng) &&
    isValidLng(coords.bottomLeft.lng) &&
    isValidLng(coords.bottomRight.lng);

  // Also check if coordinates look reasonable (not all zeros)
  const notAllZeros =
    coords.topLeft.lat !== 0 ||
    coords.topLeft.lng !== 0 ||
    coords.topRight.lat !== 0 ||
    coords.topRight.lng !== 0 ||
    coords.bottomLeft.lat !== 0 ||
    coords.bottomLeft.lng !== 0 ||
    coords.bottomRight.lat !== 0 ||
    coords.bottomRight.lng !== 0;

  return allValid && notAllZeros;
};
