import { useState, useRef, useCallback, useEffect } from "react";
import { BackHandler } from "react-native";
import { useRouter } from "expo-router";
import { calculateLineDistance } from "../utils/lineDrawerUtils";

interface UseLineDrawingProps {
  fileName: string | string[] | undefined;
  projection: string | string[] | undefined;
}

interface Coordinates {
  lat: number;
  lng: number;
  x: number;
  y: number;
}

export const useLineDrawing = ({
  fileName,
  projection,
}: UseLineDrawingProps) => {
  const router = useRouter();
  const sourceProjection =
    typeof projection === "string"
      ? projection
      : Array.isArray(projection)
      ? projection[0]
      : "EPSG:32652"; // Default if not provided

  // State for create line mode
  const [isCreateLineMode, setIsCreateLineMode] = useState(false);

  // State for selected points
  const [selectedPoints, setSelectedPoints] = useState<any[]>([]);
  const [lineLength, setLineLength] = useState(0);
  const [elevation, setElevation] = useState(110);

  // State for coordinates
  const [coordinates, setCoordinates] = useState<Coordinates>({
    lat: 0,
    lng: 0,
    x: 0,
    y: 0,
  });

  // Function ref for adding points
  const [addPointFunc, setAddPointFunc] = useState<(() => void) | null>(null);

  // Ref for tracking processed messages to avoid duplicates
  const processedMessagesRef = useRef<Set<string>>(new Set());

  // Back button handler
  useEffect(() => {
    // Create handler for back button
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // If in Create Line mode, just go back to Top Down View
        if (isCreateLineMode) {
          setIsCreateLineMode(false);
          setSelectedPoints([]);
          setLineLength(0);
          processedMessagesRef.current.clear();
          return true; // Indicates we've handled the back event
        }

        // If in normal Top Down View, allow default behavior (go back to previous page)
        return false; // Don't handle the event, allow default behavior
      }
    );

    // Cleanup: remove event listener when component unmounts
    return () => backHandler.remove();
  }, [isCreateLineMode]);

  // Handler for coordinate changes
  const handleCoordinateChange = useCallback(
    (coords: { lat: number; lng: number }) => {
      setCoordinates({
        lat: coords.lat || 0,
        lng: coords.lng || 0,
        x: coords.lng || 0,
        y: coords.lat || 0,
      });
    },
    []
  );

  // Handler for adding point from crosshair
  const handleAddPointCallback = useCallback((addPointFunction: () => void) => {
    setAddPointFunc(() => addPointFunction);
  }, []);

  // Handle map press with deduplication
  const handleMapPress = useCallback((point: any) => {
    // Update coordinates
    if (point.lat !== undefined && point.lng !== undefined) {
      setCoordinates({
        lat: point.lat || 0,
        lng: point.lng || 0,
        x: point.lng || 0,
        y: point.lat || 0,
      });
    }

    // Handle point added events with key-based deduplication
    if (point.isFirstPoint && point.point) {
      const pointKey = point.pointKey || JSON.stringify(point.point);

      // Check if we've already processed this point
      if (processedMessagesRef.current.has(pointKey)) {
        return;
      }

      // Mark as processed
      processedMessagesRef.current.add(pointKey);

      // Update state with the new point
      setSelectedPoints([point.point]);
    }

    // Handle completed line with key-based deduplication
    if (point.isLineComplete && point.points) {
      const lineKey = point.lineKey || JSON.stringify(point.points);

      // Check if we've already processed this line
      if (processedMessagesRef.current.has(lineKey)) {
        return;
      }

      // Mark as processed
      processedMessagesRef.current.add(lineKey);

      // Update state with the line points
      setSelectedPoints(point.points);
      const distance = calculateLineDistance(point.points);
      setLineLength(Math.round(distance));
    }
  }, []);

  // Handle undo button
  const handleUndo = useCallback(() => {
    if (selectedPoints.length > 0) {
      const newPoints = selectedPoints.slice(0, -1);
      setSelectedPoints(newPoints);

      if (selectedPoints.length <= 1) {
        setLineLength(0);
      }

      // Clear processed messages to allow re-adding points
      processedMessagesRef.current.clear();
    }
  }, [selectedPoints]);

  // Handle add point button
  const handleAddPoint = useCallback(() => {
    // If we already have 2 points, reset
    if (selectedPoints.length >= 2) {
      setSelectedPoints([]);
      setLineLength(0);
      processedMessagesRef.current.clear();
      return;
    }

    // Use the add point function from LeafletMap
    if (addPointFunc) {
      addPointFunc();
    } else {
      // Fallback if addPointFunc is not available
      const newPoint = [coordinates.lat || 0, coordinates.lng || 0];
      const newPoints = [...selectedPoints, newPoint];
      setSelectedPoints(newPoints);

      // Calculate line length if we now have 2 points
      if (newPoints.length === 2) {
        const distance = calculateLineDistance(newPoints);
        setLineLength(Math.round(distance));
      }
    }
  }, [addPointFunc, coordinates, selectedPoints]);

  // Navigate to cross section view
  const handleCreateCrossSection = useCallback(() => {
    if (selectedPoints.length !== 2) return;

    router.push({
      pathname: "/crossSectionView",
      params: {
        startLat: selectedPoints[0][0].toString(),
        startLng: selectedPoints[0][1].toString(),
        endLat: selectedPoints[1][0].toString(),
        endLng: selectedPoints[1][1].toString(),
        length: lineLength.toString(),
        elevation: elevation.toString(),
        fileName: String(fileName),
        projection: sourceProjection,
      },
    });
  }, [
    selectedPoints,
    lineLength,
    elevation,
    fileName,
    sourceProjection,
    router,
  ]);

  // Toggle ruler mode
  const toggleRulerMode = useCallback(() => {
    setIsCreateLineMode((prev) => !prev);
    setSelectedPoints([]);
    setLineLength(0);
    processedMessagesRef.current.clear();
  }, []);

  // Reset on initialization
  useEffect(() => {
    setSelectedPoints([]);
    setLineLength(0);
    processedMessagesRef.current.clear();
  }, []);

  return {
    isCreateLineMode,
    selectedPoints,
    lineLength,
    elevation,
    coordinates,
    handleCoordinateChange,
    handleAddPointCallback,
    handleMapPress,
    handleUndo,
    handleAddPoint,
    handleCreateCrossSection,
    toggleRulerMode,
  };
};
