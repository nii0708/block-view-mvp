export interface ProjectionInfo {
  code: string;
  name: string;
  description: string;
}

// Daftar proyeksi yang tersedia
export const PROJECTIONS: ProjectionInfo[] = [
  // Base coordinate system
  {
    code: "EPSG:4326",
    name: "WGS84 (EPSG:4326)",
    description: "Standar GPS coordinates",
  },

  // Northern hemisphere UTM zones - Indonesia
  {
    code: "EPSG:32646",
    name: "UTM Zone 46N (EPSG:32646)",
    description: "West Indonesia (North)",
  },
  {
    code: "EPSG:32647",
    name: "UTM Zone 47N (EPSG:32647)",
    description: "West Indonesia (North)",
  },
  {
    code: "EPSG:32648",
    name: "UTM Zone 48N (EPSG:32648)",
    description: "Central Indonesia (North)",
  },
  {
    code: "EPSG:32649",
    name: "UTM Zone 49N (EPSG:32649)",
    description: "Central Indonesia (North)",
  },
  {
    code: "EPSG:32650",
    name: "UTM Zone 50N (EPSG:32650)",
    description: "East Indonesia (North)",
  },
  {
    code: "EPSG:32651",
    name: "UTM Zone 51N (EPSG:32651)",
    description: "East Indonesia (North)",
  },
  {
    code: "EPSG:32652",
    name: "UTM Zone 52N (EPSG:32652)",
    description: "Papua (North)",
  },

  // Southern hemisphere UTM zones - Indonesia
  {
    code: "EPSG:32746",
    name: "UTM Zone 46S (EPSG:32746)",
    description: "West Indonesia (South)",
  },
  {
    code: "EPSG:32747",
    name: "UTM Zone 47S (EPSG:32747)",
    description: "West Indonesia (South)",
  },
  {
    code: "EPSG:32748",
    name: "UTM Zone 48S (EPSG:32748)",
    description: "Central Indonesia (South)",
  },
  {
    code: "EPSG:32749",
    name: "UTM Zone 49S (EPSG:32749)",
    description: "Central Indonesia (South)",
  },
  {
    code: "EPSG:32750",
    name: "UTM Zone 50S (EPSG:32750)",
    description: "East Indonesia (South)",
  },
  {
    code: "EPSG:32751",
    name: "UTM Zone 51S (EPSG:32751)",
    description: "East Indonesia (South)",
  },
  {
    code: "EPSG:32752",
    name: "UTM Zone 52S (EPSG:32752)",
    description: "Papua (South)",
  },
];

export const DEFAULT_PROJECTION = "EPSG:32652"; // Default to UTM Zone 52N
