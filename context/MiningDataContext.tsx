import React, { createContext, useState, useContext, ReactNode } from "react";

// Define the type for pickedAttribute
type PickedAttributeType = {
  [key: string]: string[];
};

// Define the shape of your context data
interface MiningDataContextType {
  // Top-down view data (dissolved/processed)
  processedBlockModel: any | null;
  processedElevation: any[] | null;
  processedPitData: any | null;
  processedAttributeViewing: any | null;

  // Full block model data (all elevations)
  fullBlockModelData: any[] | null;
  
  // Picked attributes data
  pickedAttribute: PickedAttributeType | null;

  // Setters
  setProcessedBlockModel: (data: any) => void;
  setProcessedElevation: (data: any[]) => void;
  setProcessedPitData: (data: any) => void;
  setFullBlockModelData: (data: any[]) => void;
  setProcessedAttributeViewing: (data: any) => void;
  setPickedAttributesViewing: (data: any) => void;
  setPickedAttribute: (data: PickedAttributeType | null | undefined) => void;

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

  // attribute viewing
  const [processedAttributeViewing, setProcessedAttributeViewing] = useState<any | null>(
    null
  );

  const [pickedAttributesViewing, setPickedAttributesViewing] = useState<any | null>(
    null
  );
  
  // Picked attributes
  const [pickedAttribute, setPickedAttribute] = useState<PickedAttributeType | null>(
    null
  );

  const clearData = () => {
    setProcessedBlockModel(null);
    setProcessedElevation(null);
    setProcessedPitData(null);
    setFullBlockModelData(null);
    setProcessedAttributeViewing(null);
    setPickedAttributesViewing(null);
    setPickedAttribute(null);
  };

  // Update the setter to handle nullable/undefined inputs
  const handleSetPickedAttribute = (data: PickedAttributeType | null | undefined) => {
    // If data is undefined, store null or an empty object based on your preference
    setPickedAttribute(data || null);
  };

  return (
    <MiningDataContext.Provider
      value={{
        processedBlockModel,
        processedElevation,
        processedPitData,
        fullBlockModelData,
        processedAttributeViewing,
        pickedAttribute,
        setProcessedBlockModel,
        setProcessedElevation,
        setProcessedPitData,
        setFullBlockModelData,
        setProcessedAttributeViewing,
        setPickedAttributesViewing,
        setPickedAttribute: handleSetPickedAttribute,
        clearData
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