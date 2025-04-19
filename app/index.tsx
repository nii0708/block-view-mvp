// App.tsx
import React, { useState } from 'react';
import { StyleSheet, SafeAreaView, View, Text, ScrollView, StatusBar, Platform } from 'react-native';
import FileUploader from '../components/FileUploader.js';
import BlockModelViewer from '../components/BlockModelViewer.js';
import CrossSection from '../components/CrossSection.js';
import { processElevationData } from '../utils/elevationUtils.js';

export default function App() {
  const [blockModelData, setBlockModelData] = useState(null);
  const [dataProjection, setDataProjection] = useState('EPSG:4326');
  const [lineGeoJson, setLineGeoJson] = useState(null);
  const [elevationData, setElevationData] = useState(null);
  const [pitData, setPitData] = useState(null);

  const handleBlockModelUpload = (data, projection) => {
    setBlockModelData(data);
    setDataProjection(projection);
  };

  const handleElevationDataUpload = (data, projection) => {
    // Process the elevation data to convert coordinates and prepare for visualization
    const processedElevationData = processElevationData(
      data, 
      projection, 
      'lon',   // Longitude/Easting field name
      'lat',   // Latitude/Northing field name
      'z'      // Elevation field name
    );
    
    console.log(`Processed ${processedElevationData.length} elevation points`);
    setElevationData(processedElevationData);
  };

  const handlePitDataUpload = (data, projection) => {
    // Store the pit data
    console.log(`Processed ${data.length} pit boundary points`);
    setPitData(data);
  };

  const handleLineCreated = (lineData) => {
    setLineGeoJson(lineData);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Block Model Visualizer</Text>
          <Text style={styles.headerSubtitle}>Upload block model, elevation, and pit data to visualize and interact</Text>
        </View>

        {/* File Uploader and Instructions */}
        <View style={styles.row}>
          <View style={styles.column}>
            <FileUploader 
              onBlockModelUpload={handleBlockModelUpload}
              onElevationDataUpload={handleElevationDataUpload}
              onPitDataUpload={handlePitDataUpload}
            />
          </View>
          
          <View style={styles.column}>
            <View style={styles.instructionsContainer}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <View style={styles.instructionsList}>
                <Text style={styles.instructionItem}>1. Upload a block model CSV file</Text>
                <Text style={styles.instructionItem}>2. Optionally upload an elevation CSV file</Text>
                <Text style={styles.instructionItem}>3. Optionally upload a pit boundary CSV file</Text>
                <Text style={styles.instructionItem}>4. Select the coordinate system of your data</Text>
                <Text style={styles.instructionItem}>5. View the top-down rendering of the block model</Text>
                <Text style={styles.instructionItem}>6. Interact with the model to create lines</Text>
                <Text style={styles.instructionItem}>7. Generate cross-sections with terrain elevation</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Block Model Viewer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Block Model Top-Down View</Text>
          {dataProjection && (
            <View style={styles.projectionInfo}>
              <Text style={styles.projectionText}>Data projection: {dataProjection}</Text>
            </View>
          )}
          <View style={styles.mapContainer}>
            <BlockModelViewer 
              blockModelData={blockModelData}
              pitData={pitData}
              sourceProjection={dataProjection}
              onLineCreated={handleLineCreated}
            />
          </View>
        </View>
        
        {/* Cross-Section Viewer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cross-Section View</Text>
          <CrossSection 
            blockModelData={blockModelData}
            lineGeoJson={lineGeoJson}
            sourceProjection={dataProjection}
            elevationData={elevationData}
            pitData={pitData}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 8,
  },
  column: {
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  instructionsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionsList: {
    marginTop: 8,
  },
  instructionItem: {
    marginBottom: 8,
    fontSize: 14,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  projectionInfo: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  projectionText: {
    fontSize: 12,
    color: '#666666',
  },
  mapContainer: {
    height: 500, // Fixed height for map
  },
});