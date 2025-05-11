// Process pit data
export function processPitData(pitData: any[]) {
  try {
    //   if (!pitData || pitData.length === 0) {
    //     debug("No pit data available");
    //     return [];
    //   }

    const pitPoints: any[] = [];

    // Process each pit point
    pitData.forEach((point) => {
      pitPoints.push({
        distance: point.distance,
        elevation: point.elevation,
      });
    });

    // Sort by distance
    pitPoints.sort((a, b) => a.distance - b.distance);

    //   // Store count of displayed pit points
    //   displayedPitPointsCount = pitPoints.length;

    //   updateProgress(70, "Pit data processing complete");

    //   // Send updated data stats
    //   sendDataStats();

    return pitPoints;
  } catch (err) {
    console.log("Error processing pit data:", err);
    //   debug("Error processing pit data: " + err.message);
    //   return [];
  }
}
