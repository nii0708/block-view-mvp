/**
 * Simple function that extracts only the attribute keys from a block model
 * @param sampleBlock A sample block model record
 * @returns Array of attribute key strings
 */
export function extractBlockModelAttributes(sampleBlock : any) {
  // Coordinates and technical keys to exclude
  const nonAttributeKeys = [
    'centroid_x', 'centroid_y', 'centroid_z', 
    'x', 'y', 'z', 
    'xc', 'yc', 'zc', 
    'dim_x', 'dim_y', 'dim_z', 
    'xinc', 'yinc', 'zinc', 
    'xmorig', 'ymorig', 'zmorig', 
    'x0', 'y0', 'z0', 
    'nx', 'ny', 'nz', 
    'ijk', 'ix', 'iy', 'iz'
  ];

  // Return filtered keys only
  return Object.keys(sampleBlock).filter(key => !nonAttributeKeys.includes(key));
}