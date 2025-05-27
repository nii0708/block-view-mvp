// utils/types.ts

export interface Point {
  x: number;
  y: number;
}

export interface Point3D extends Point {
  z: number;
}

export interface WGS84Point {
  lng: number;
  lat: number;
}

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface BlockModelData {
  centroid_x: number;
  centroid_y: number;
  centroid_z?: number;
  dim_x: number;
  dim_y: number;
  dim_z?: number;
  rock: string;
  [key: string]: any;
}

export interface GeoJsonFeature {
  type: string;
  properties: any;
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

export interface GeoJsonFeatureCollection {
  type: string;
  features: GeoJsonFeature[];
}

export interface BlockModelGeoJSONResult {
  geoJsonData: GeoJsonFeatureCollection | null;
  mapCenter: number[];
  mapZoom: number;
  isExportEnabled: boolean;
  error?: string;
}

export interface PitDataPoint {
  x: number | string;
  y: number | string;
  z: number | string;
  interior?: number | string;
  none?: number | string;
  type?: number | string;
  [key: string]: any;
}
