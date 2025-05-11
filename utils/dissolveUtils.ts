// /**
//  * Simplified solution for dissolving blocks without polygon-clipping
//  * This approach merges blocks by creating MultiPolygon features based on rock type
//  */

// interface GeoJSONFeature {
//   type: string;
//   properties: {
//     [key: string]: any;
//   };
//   geometry: {
//     type: string;
//     coordinates: number[][][] | number[][][][];
//   };
// }

// /**
//  * Groups GeoJSON features by a specific property value
//  * @param features Array of GeoJSON features
//  * @param property Property name to group by (e.g. 'rock')
//  * @returns Object with property values as keys and arrays of features as values
//  */
// function groupFeaturesByProperty(features: any[], property: string) {
//   const groups: { [key: string]: any[] } = {};

//   features.forEach((feature) => {
//     const value = feature.properties[property] || "unknown";
//     if (!groups[value]) {
//       groups[value] = [];
//     }
//     groups[value].push(feature);
//   });

//   return groups;
// }

// /**
//  * Simplified dissolve for block models
//  * This creates MultiPolygon features out of blocks with the same rock type
//  * With performance optimizations for large datasets
//  */
// export function dissolveBlockModel(
//   geoJsonData: any,
//   options: { maxFeaturesToProcess?: number } = {}
// ): any {
//   if (
//     !geoJsonData ||
//     !geoJsonData.features ||
//     geoJsonData.features.length === 0
//   ) {
//     return geoJsonData;
//   }

//   const maxFeaturesToProcess = options.maxFeaturesToProcess || 10000;
//   const startTime = Date.now();

//   console.log(`Starting dissolve with ${geoJsonData.features.length} features`);

//   // For very large datasets, skip the expensive dissolve process
//   if (geoJsonData.features.length > maxFeaturesToProcess) {
//     console.log(
//       `Feature count (${geoJsonData.features.length}) exceeds threshold (${maxFeaturesToProcess}), skipping dissolution`
//     );
//     // Just add colors to features instead of dissolving
//     const coloredFeatures = addColorsToFeatures(geoJsonData.features);
//     return {
//       type: "FeatureCollection",
//       features: coloredFeatures,
//     };
//   }

//   try {
//     // Group features by rock type
//     const rockGroups = groupFeaturesByProperty(geoJsonData.features, "rock");
//     console.log(`Grouped into ${Object.keys(rockGroups).length} rock types`);

//     // Result features
//     const resultFeatures: any[] = [];

//     // For each rock type group, create a representative feature
//     Object.entries(rockGroups).forEach(([rockType, features]) => {
//       // Get properties from the first feature to use as a template
//       const templateFeature = features[0];
//       const color = templateFeature.properties.color || "#aaaaaa";

//       // For very large groups, sample instead of including all features
//       let representativeFeatures = features;
//       if (features.length > 1000) {
//         const sampleRate = Math.ceil(features.length / 1000);
//         representativeFeatures = features.filter(
//           (_, i) => i % sampleRate === 0
//         );
//         console.log(
//           `Sampled ${representativeFeatures.length} features from ${features.length} for rock type ${rockType}`
//         );
//       }

//       // Extract polygon coordinates from each feature
//       const polygonCoordinates = representativeFeatures.map(
//         (feature) => feature.geometry.coordinates[0]
//       );

//       // Create a MultiPolygon feature
//       resultFeatures.push({
//         type: "Feature",
//         properties: {
//           ...templateFeature.properties,
//           rock: rockType,
//           color: color,
//           dissolved: true,
//           featureCount: features.length,
//         },
//         geometry: {
//           type: "MultiPolygon",
//           coordinates: polygonCoordinates.map((coords) => [coords]),
//         },
//       });
//     });

//     const endTime = Date.now();
//     console.log(
//       `Reduced to ${resultFeatures.length} features (${Math.round(
//         (resultFeatures.length / geoJsonData.features.length) * 100
//       )}% of original) in ${(endTime - startTime) / 1000}s`
//     );

//     // Return new FeatureCollection with dissolved features
//     return {
//       type: "FeatureCollection",
//       features: resultFeatures,
//     };
//   } catch (error) {
//     console.error("Error in dissolveBlockModel:", error);
//     // Return original data on error, but with colors
//     const coloredFeatures = addColorsToFeatures(geoJsonData.features);
//     return {
//       type: "FeatureCollection",
//       features: coloredFeatures,
//     };
//   }
// }

// /**
//  * Adds colors to features based on rock type without dissolving
//  * Used as a fallback when dissolution is skipped
//  */
// function addColorsToFeatures(features: any[]): any[] {
//   // Your provided hex colors
//   const hexColors = [
//     "#75499c",
//     "#b40c0d",
//     "#045993",
//     "#db6000",
//     "#118011",
//     "#6d392e",
//     "#c059a1",
//     "#606060",
//     "#9b9c07",
//     "#009dad",
//     "#8ea6c5",
//     "#db9a5a",
//     "#78bd6b",
//     "#db7876",
//     "#a48fb3",
//     "#a37c75",
//     "#d495b0",
//     "#a6a6a6",
//     "#b9b96e",
//     "#7eb8c2",
//   ];

//   // Create mapping from rock types to colors
//   const rockTypes = Array.from(
//     new Set(features.map((f) => f.properties.rock || "unknown"))
//   );
//   const rockColorMap: Record<string, string> = {};

//   rockTypes.forEach((rockType, index) => {
//     rockColorMap[String(rockType)] = hexColors[index % hexColors.length];
//   });

//   // Apply colors to features
//   return features
//     .map((feature) => {
//       const rockType = feature.properties.rock || "unknown";
//       const color = rockColorMap[rockType];

//       return {
//         ...feature,
//         properties: {
//           ...feature.properties,
//           color: color,
//         },
//       };
//     })
//     .slice(0, 2000); // Limit to 2000 features max for performance
// }
