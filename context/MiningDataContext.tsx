import React, { createContext, useState, useContext, ReactNode } from "react";

// Define the shape of your context data
interface MiningDataContextType {
  // Top-down view data (dissolved/processed)
  processedBlockModel: any | null;
  processedElevation: any[] | null;
  processedPitData: any | null;

  // Full block model data (all elevations)
  fullBlockModelData: any[] | null;

  // Setters
  setProcessedBlockModel: (data: any) => void;
  setProcessedElevation: (data: any[]) => void;
  setProcessedPitData: (data: any) => void;
  setFullBlockModelData: (data: any[]) => void;

  clearData: () => void;
}

// Create the context with a default value
const MiningDataContext = createContext<MiningDataContextType | undefined>(
  undefined
);

// Provider component
export const MiningDataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Top-down view data (processed/dissolved)
  const [processedBlockModel, setProcessedBlockModel] = useState<any | null>(
    null
  );
  const [processedElevation, setProcessedElevation] = useState<any[] | null>(
    null
  );
  const [processedPitData, setProcessedPitData] = useState<any | null>(null);

  // Full block model data (all elevations)
  const [fullBlockModelData, setFullBlockModelData] = useState<any[] | null>(
    null
  );

  const clearData = () => {
    setProcessedBlockModel(null);
    setProcessedElevation(null);
    setProcessedPitData(null);
    setFullBlockModelData(null);
  };

  return (
    <MiningDataContext.Provider
      value={{
        processedBlockModel,
        processedElevation,
        processedPitData,
        fullBlockModelData,
        setProcessedBlockModel,
        setProcessedElevation,
        setProcessedPitData,
        setFullBlockModelData,
        clearData,
      }}
    >
      {children}
    </MiningDataContext.Provider>
  );
};

export const useMiningData = () => {
  const context = useContext(MiningDataContext);
  if (context === undefined) {
    throw new Error("useMiningData must be used within a MiningDataProvider");
  }
  return context;
};
