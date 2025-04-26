import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Papa from "papaparse"; // Perlu diinstall

export interface FileInfo {
  name: string;
  uri: string;
  type: string;
  size?: number;
  mimeType?: string;
  lastModified?: number;
}

export interface MiningDataFile {
  name: string;
  date: string;
  files: {
    blockModel: FileInfo | null;
    elevation: FileInfo | null;
    pit: FileInfo | null; 
    orthophoto: FileInfo | null;
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

// Nama file untuk menyimpan data
const STORAGE_KEY = "mining_data_files.json";

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
          if (results.data.length > 0) {
            // console.log(`Sample CSV row:`, results.data[0]);
          }

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
 */
export const parseLiDARFile = async (
  fileUri: string
): Promise<LiDARPoint[]> => {
  try {
    console.log(`Reading STR file from URI: ${fileUri.substring(0, 50)}...`);
    const fileContent = await FileSystem.readAsStringAsync(fileUri);
    console.log(`STR file content length: ${fileContent.length} bytes`);
    console.log(`STR sample: ${fileContent.substring(0, 100)}...`);

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

          // Process each row into the required format
          const processedData = dataRows
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
