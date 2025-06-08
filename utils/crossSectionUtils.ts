import { convertCoordinates } from "./projectionUtils";

/**
 * Filter block model data untuk cross-section view
 * @param blockModelData Data block model 3D lengkap
 * @param startPoint Titik awal garis cross section (lat, lng)
 * @param endPoint Titik akhir garis cross section (lat, lng)
 * @param corridorWidth Lebar koridor pencarian (meter)
 */
export function filterBlocksForCrossSection(
  blockModelData: any[],
  startPoint: { lat: number; lng: number },
  endPoint: { lat: number; lng: number },
  corridorWidth = 100
) {

  if (blockModelData.length === 0) return [];

  const firstBlock = blockModelData[0];
  const isUTM =
    Math.abs(parseFloat(firstBlock.centroid_x || firstBlock.x || 0)) > 180 ||
    Math.abs(parseFloat(firstBlock.centroid_y || firstBlock.y || 0)) > 90;

  console.log(
    `Block coordinates appear to be in ${isUTM ? "UTM" : "WGS84"} format`
  );
  console.log(
    `Sample block: x=${parseFloat(
      firstBlock.centroid_x || firstBlock.x || 0
    )}, y=${parseFloat(firstBlock.centroid_y || firstBlock.y || 0)}`
  );
  console.log(
    `Line points: start=(${startPoint.lat},${startPoint.lng}), end=(${endPoint.lat},${endPoint.lng})`
  );

  // For debugging - check for valid Z values
  const zValues = blockModelData
    .slice(0, 1000)
    .map((b) => parseFloat(b.centroid_z || b.z || 0))
    .filter((z) => !isNaN(z));

  if (zValues.length > 0) {
    console.log(
      `Z value range: ${Math.min(...zValues)} to ${Math.max(...zValues)}`
    );
    console.log(`${new Set(zValues.map(Math.round)).size} unique Z values`);
  }

  // Use MUCH wider corridor for initial testing
  const WIDE_CORRIDOR = 1000; // 1km wide corridor

  // Filter blocks based on coordinates
  const filteredBlocks = blockModelData.filter((block) => {
    const blockX = parseFloat(block.centroid_x || block.x || 0);
    const blockY = parseFloat(block.centroid_y || block.y || 0);

    if (isNaN(blockX) || isNaN(blockY)) return false;

    // Simple bounding box check for speed
    const minX =
      Math.min(startPoint.lng, endPoint.lng) - WIDE_CORRIDOR / 111000;
    const maxX =
      Math.max(startPoint.lng, endPoint.lng) + WIDE_CORRIDOR / 111000;
    const minY =
      Math.min(startPoint.lat, endPoint.lat) - WIDE_CORRIDOR / 111000;
    const maxY =
      Math.max(startPoint.lat, endPoint.lat) + WIDE_CORRIDOR / 111000;

    return blockX >= minX && blockX <= maxX && blockY >= minY && blockY <= maxY;
  });

  console.log(`Filtered to ${filteredBlocks.length} blocks for cross-section`);
  return filteredBlocks;
}

/**
 * Filter elevation data untuk cross-section view
 */
export function filterElevationForCrossSection(
  elevationData: any[],
  startPoint: { lat: number; lng: number },
  endPoint: { lat: number; lng: number },
  corridorWidth = 100
) {
  if (!elevationData || elevationData.length === 0) return [];

  console.log(
    `Filtering ${elevationData.length} elevation points for cross-section`
  );

  // Logika yang sama seperti blocks, tapi disesuaikan untuk struktur data elevasi
  const dx = endPoint.lng - startPoint.lng;
  const dy = endPoint.lat - startPoint.lat;
  const lineLength = Math.sqrt(dx * dx + dy * dy);

  const dirX = dx / lineLength;
  const dirY = dy / lineLength;

  const scaleFactor = 111000;

  // Filter titik elevasi dekat garis
  const filteredElevation = elevationData.filter((point) => {
    const pointX = parseFloat(point.x || point.lon || point.original?.x || 0);
    const pointY = parseFloat(point.y || point.lat || point.original?.y || 0);

    if (isNaN(pointX) || isNaN(pointY)) return false;

    const vx = pointX - startPoint.lng;
    const vy = pointY - startPoint.lat;

    const dot = vx * dirX + vy * dirY;
    const t = dot / lineLength;

    if (t < -0.1 || t > 1.1) return false;

    const projX = startPoint.lng + t * dx;
    const projY = startPoint.lat + t * dy;
    const distX = pointX - projX;
    const distY = pointY - projY;
    const distance = Math.sqrt(distX * distX + distY * distY) * scaleFactor;

    return distance <= corridorWidth;
  });

  return filteredElevation;
}

/**
 * Filter pit boundary data untuk cross-section view
 */
export function filterPitForCrossSection(
  pitFeatures: any[],
  startPoint: { lat: number; lng: number },
  endPoint: { lat: number; lng: number },
  corridorWidth = 150
) {
  if (!pitFeatures || !Array.isArray(pitFeatures) || pitFeatures.length === 0)
    return [];

  console.log(`Filtering ${pitFeatures.length} pit features for cross-section`);

  // Untuk fitur GeoJSON, kita perlu cek koordinat dari feature
  const filteredPit = pitFeatures.filter((feature) => {
    if (
      !feature.geometry ||
      !feature.geometry.coordinates ||
      !Array.isArray(feature.geometry.coordinates) ||
      feature.geometry.coordinates.length === 0
    ) {
      return false;
    }

    // Ambil titik pertama untuk mewakili posisi fitur
    const coords = feature.geometry.coordinates[0];
    if (!Array.isArray(coords)) return false;

    const pointX = coords[0];
    const pointY = coords[1];

    // Lakukan filter seperti di atas
    // Implementasi sama dengan elevation dan blocks
    const dx = endPoint.lng - startPoint.lng;
    const dy = endPoint.lat - startPoint.lat;
    const lineLength = Math.sqrt(dx * dx + dy * dy);

    const dirX = dx / lineLength;
    const dirY = dy / lineLength;

    const vx = pointX - startPoint.lng;
    const vy = pointY - startPoint.lat;

    const dot = vx * dirX + vy * dirY;
    const t = dot / lineLength;

    //JANGAN FILTER BY LENGTH
    // if (t < -0.2 || t > 1.2) return false;

    const projX = startPoint.lng + t * dx;
    const projY = startPoint.lat + t * dy;
    const distX = pointX - projX;
    const distY = pointY - projY;
    const distance = Math.sqrt(distX * distX + distY * distY) * 111000;

    return distance <= corridorWidth;
  });

  console.log(`Filtered to ${filteredPit.length} pit features`);
  return filteredPit;
}
