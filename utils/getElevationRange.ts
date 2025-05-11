// Define interfaces for the data structures
interface Block {
    elevation: number;
    height: number;
  }
  
  interface ElevationPoint {
    elevation: number | null;
  }
  
  interface PitPoint {
    elevation: number;
  }
  
  // Get elevation range for Y-axis scaling
  export function getElevationRange(
    blocks: Block[], 
    elevationPoints: ElevationPoint[] | undefined, 
    pitPoints: PitPoint[] | undefined
  ): { min: number, max: number } {
      try {
        const allElevations: number[] = [];
        
        // Add block elevations
        blocks.forEach(block => {
          allElevations.push(block.elevation + block.height/2);
          allElevations.push(block.elevation - block.height/2);
        });
        
        // Add elevation profile points
        if (elevationPoints && elevationPoints.length > 0) {
          elevationPoints.forEach(point => {
            if (point.elevation !== null && !isNaN(point.elevation)) {
              allElevations.push(point.elevation);
            }
          });
        }
        
        // Add pit points
        if (pitPoints && pitPoints.length > 0) {
          pitPoints.forEach(point => {
            if (!isNaN(point.elevation)) {
              allElevations.push(point.elevation);
            }
          });
        }
        
        // Filter out invalid values
        const validElevations = allElevations.filter(e => !isNaN(e));
        
        if (validElevations.length === 0) {
          return { min: 0, max: 100 };
        }
        
        // Find min and max with padding
        const min = Math.min(...validElevations) - 20;
        const max = Math.max(...validElevations) + 20;
        
        return { min, max };
      } catch (err) {
        return { min: 0, max: 100 };
      }
  }