import { useState } from "react";
import { Alert } from "react-native";
import { DEFAULT_PROJECTION } from "../utils/projectionData";

export default function useProjectionSelection() {
  const [selectedProjection, setSelectedProjection] =
    useState<string>(DEFAULT_PROJECTION);

  const handleSelectProjection = (projectionCode: string) => {
    setSelectedProjection(projectionCode);
  };

  const validateSelection = (): boolean => {
    if (!selectedProjection) {
      Alert.alert("Error", "Please select a coordinate system");
      return false;
    }
    return true;
  };

  return {
    selectedProjection,
    handleSelectProjection,
    validateSelection,
  };
}
