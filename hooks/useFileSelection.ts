import { useState } from "react";
import * as FileService from "../services/FileService";

export default function useFileSelection() {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const handleSelectFile = (file: FileService.MiningDataFile) => {
    setIsSelectionMode(true);
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(file.name)) {
        newSet.delete(file.name);
      } else {
        newSet.add(file.name);
      }
      return newSet;
    });
  };

  const areAllFilesSelected = (filteredFiles: FileService.MiningDataFile[]) => {
    return (
      filteredFiles.length > 0 && selectedFiles.size === filteredFiles.length
    );
  };

  const toggleSelectAll = (filteredFiles: FileService.MiningDataFile[]) => {
    if (areAllFilesSelected(filteredFiles)) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map((file) => file.name)));
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedFiles(new Set());
  };

  const isSelected = (file: FileService.MiningDataFile) => {
    return selectedFiles.has(file.name);
  };

  return {
    isSelectionMode,
    selectedFiles,
    handleSelectFile,
    areAllFilesSelected,
    toggleSelectAll,
    exitSelectionMode,
    isSelected,
  };
}
