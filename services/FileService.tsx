import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Papa from "papaparse";

import DxfParser from "dxf-parser";
import { PDFDocument, PDFName } from "pdf-lib";

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
    const result = await DocumentPicker.getDocumentAsync({
      type,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    // Return the first asset if available
    if (result.assets && result.assets.length > 0) {
      const file = result.assets[0] as FileInfo;

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
    file = await pickFile("*/*");

    if (file) {
      // Check if the file has a .csv extension
      if (!file.name.toLowerCase().endsWith(".csv")) {
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
    file = await pickFile("*/*");

    if (file) {
      // Check if the file has a .str extension
      if (!file.name.toLowerCase().endsWith(".str")) {
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

          const match = Object.values(
            results.data[0] as Record<string, unknown>
          ).includes("Variable descriptions:");
          if (match) {
            const typedData = results.data.slice(3) as CSVRow[];
            resolve(typedData);
          } else {
            const typedData = results.data as CSVRow[];
            resolve(typedData);
          }
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
    const getFileExtension = (uri: string): string | null => {
      const match = uri.match(/\.([a-zA-Z0-9]+)$/);
      return match ? match[1].toLowerCase() : null;
    };
    const fileContent = await FileSystem.readAsStringAsync(fileUri);
    const extension = getFileExtension(fileUri);

    if (extension === "str") {
      return new Promise((resolve, reject) => {
        Papa.parse(fileContent, {
          header: false,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              console.error("STR parsing errors:", results.errors);
              reject(
                new Error(
                  `Error parsing STR file: ${results.errors[0].message}`
                )
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

            resolve(processedData);
          },
          error: (error: Error) => {
            console.error("Error parsing STR file:", error);
            reject(error);
          },
        });
      });
    } else if (extension === "dxf") {
      return new Promise((resolve, reject) => {
        try {
          const parser = new DxfParser();
          const dxf = parser.parseSync(fileContent);

          if (!dxf || !dxf.entities) {
            reject(new Error("Invalid DXF file or no entities found"));
            return;
          }

          // Use type assertion to tell TypeScript that entities have vertices
          const data = (dxf.entities as any[]).map((e) => {
            // Add null check for entity and vertices
            if (e && e.vertices && Array.isArray(e.vertices)) {
              return e.vertices;
            }
            return []; // Return empty array for entities without vertices
          });

          // Create closed polygons by adding first vertex to the end of each entity's vertices
          const closedData = data.map((vertices) => {
            if (vertices.length > 0) {
              // Create a new array with all existing vertices plus the first one repeated at the end
              return [...vertices, vertices[0]];
            }
            return vertices;
          });

          // Process the data with closed polygons - fixing property names to match LiDARPoint interface
          const processedData: LiDARPoint[] = closedData
            .flat()
            .map((vertex, index) => {
              // Make sure all properties exist and match LiDARPoint interface
              return {
                id: vertex.handle || index, // Use handle if available, otherwise use index
                lat: vertex.y || 0, // Note: x and y are swapped as per your original code
                lon: vertex.x || 0, // 'lon' not 'long' to match LiDARPoint
                z: vertex.z || 0,
                desc: "", // Add required desc property
              };
            });

          resolve(processedData);
        } catch (error) {
          console.error("Error parsing DXF:", error);
          reject(error);
        }
      });
    } else {
      console.log("Not compatible extension:", extension);
      // Return empty array for incompatible extensions
      return Promise.resolve([]);
    }
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

    // NEW
    const uint8Array = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
    const pdfDoc = await PDFDocument.load(uint8Array);

    // Get context and catalog with null checks
    const context = pdfDoc.context;
    const catalog = pdfDoc.catalog;

    // Handle getting pages with null checks and proper type assertions
    // Use type assertion for PDFDict to ensure get method is available
    const pagesRef = (catalog as any).get(PDFName.of("Pages"));
    if (!pagesRef) {
      throw new Error("Pages reference not found in PDF");
    }

    const pagesDict = context.lookup(pagesRef);
    if (!pagesDict) {
      throw new Error("Pages dictionary not found");
    }

    // Use type assertion to ensure get method is available
    const kidsArray = (pagesDict as any).get(PDFName.of("Kids"));
    if (!kidsArray || !kidsArray.size) {
      throw new Error("No kids/pages found in PDF");
    }

    const firstKidRef = kidsArray.get(0);
    const firstKid = context.lookup(firstKidRef);
    if (!firstKid) {
      throw new Error("First page not found");
    }

    // Safe access to MediaBox with proper type handling
    const mediaBoxObj = (firstKid as any).get(PDFName.of("MediaBox"));
    if (!mediaBoxObj || !mediaBoxObj.array) {
      throw new Error("MediaBox not found or invalid");
    }
    const mediaBox = mediaBoxObj.array.map((el: any) => el.numberValue);

    // Safe access to VP with proper type handling
    const vpObj = (firstKid as any).get(PDFName.of("VP"));
    if (!vpObj || !vpObj.array) {
      throw new Error("VP not found or invalid");
    }
    console.log("vpObj : ", vpObj);

    let VP_array;

    if (vpObj.array && vpObj.array.length > 1) {
      VP_array = vpObj.array;
    } else {
      VP_array = vpObj.context;
    }

    console.log("VP_array : ", VP_array);
    console.log("VP_array.length : ", VP_array.length);

    let areaBBOXMax = 0;
    let bboxList: number[] = [];
    let gptsList: number[] = [];
    console.log("VP_array.size : ", VP_array.length);
    // Process the VP array safely
    for (let i = 0; i < VP_array.length; i++) {
      const item = VP_array[i];
      if (!item) continue;

      // Safe access to BBox
      const bboxObj = (item as any).get(PDFName.of("BBox"));
      if (!bboxObj || !bboxObj.array) continue;

      const BBOX = bboxObj.array.map((el: any) => el.numberValue);
      const areaBBOX =
        Math.abs(BBOX[2] - BBOX[0]) * Math.abs(BBOX[1] - BBOX[3]);
      console.log("areaBBOX : ", areaBBOX);

      if (areaBBOX > areaBBOXMax) {
        areaBBOXMax = areaBBOX;
        console.log("areaBBOXMax : ", areaBBOXMax);

        // Safe access to Measure
        const measureObj = (item as any).get(PDFName.of("Measure"));
        if (!measureObj) continue;

        const MeasureDict = context.lookup(measureObj);
        if (!MeasureDict) continue;

        // Safe access to GPTS
        const gptsObj = (MeasureDict as any).get(PDFName.of("GPTS"));
        if (!gptsObj || !gptsObj.array) continue;

        const GPT = gptsObj.array.map((el: any) => el.numberValue);

        // Calculate coordinates with explicit typing
        const lat = GPT.filter((_: any, i: number) => i % 2 === 0);
        const lon = GPT.filter((_: any, i: number) => i % 2 === 1);
        const xs = BBOX.filter((_: any, i: number) => i % 2 === 0);
        const ys = BBOX.filter((_: any, i: number) => i % 2 === 1);

        // Only proceed if we have enough data
        if (
          lat.length > 0 &&
          lon.length > 0 &&
          xs.length > 0 &&
          ys.length > 0
        ) {
          const maxLon = Math.max(...lon);
          const minLon = Math.min(...lon);
          const maxLat = Math.max(...lat);
          const minLat = Math.min(...lat);
          const maxXs = Math.max(...xs);
          const minXs = Math.min(...xs);
          const maxYs = Math.max(...ys);
          const minYs = Math.min(...ys);

          bboxList = [minXs, minYs, maxXs, maxYs];
          gptsList = [minLon, minLat, maxLon, maxLat];
        }
      }
    }

    // Only proceed with calculation if we have valid data
    if (gptsList.length === 4 && bboxList.length === 4) {
      const dLon = gptsList[2] - gptsList[0];
      const dLat = gptsList[3] - gptsList[1];
      const dX = Math.abs(bboxList[2] - bboxList[0]);
      const dY = Math.abs(bboxList[3] - bboxList[1]);
      const gradY = dLat / dY;
      const gradX = dLon / dX;

      const left = gptsList[0] - gradX * bboxList[0];
      const right = gptsList[2] + gradX * (mediaBox[2] - bboxList[2]);
      const upper = gptsList[3] + gradY * Math.abs(mediaBox[3] - bboxList[3]);
      const bottom = gptsList[1] - gradY * bboxList[1];

      console.log("Calculated map bounds:", { left, bottom, right, upper });

      // Create coordinates object - convert number[] to string for raw property
      const coordinates: PDFCoordinates = {
        topLeft: { lat: upper, lng: left },
        topRight: { lat: upper, lng: right },
        bottomLeft: { lat: bottom, lng: left },
        bottomRight: { lat: bottom, lng: right },
        raw: gptsList.join(" "), // Convert array to string to match PDFCoordinates type
      };

      return {
        coordinates,
        imageBase64: pdfBase64,
      };
    } else {
      // Fall back to regex pattern matching method
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
