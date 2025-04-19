// src/components/FileUploader.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import * as FileSystem from 'expo-file-system';

const PROJECTIONS = [
  // Base coordinate system
  { code: 'EPSG:4326', name: 'WGS84 (EPSG:4326)' },
  
  // Northern hemisphere UTM zones
  { code: 'EPSG:32646', name: 'UTM Zone 46N (EPSG:32646)' },
  { code: 'EPSG:32647', name: 'UTM Zone 47N (EPSG:32647)' },
  { code: 'EPSG:32648', name: 'UTM Zone 48N (EPSG:32648)' },
  { code: 'EPSG:32649', name: 'UTM Zone 49N (EPSG:32649)' },
  { code: 'EPSG:32650', name: 'UTM Zone 50N (EPSG:32650)' },
  { code: 'EPSG:32651', name: 'UTM Zone 51N (EPSG:32651)' },
  { code: 'EPSG:32652', name: 'UTM Zone 52N (EPSG:32652)' },
  { code: 'EPSG:32653', name: 'UTM Zone 53N (EPSG:32653)' },
  { code: 'EPSG:32654', name: 'UTM Zone 54N (EPSG:32654)' },
  { code: 'EPSG:32655', name: 'UTM Zone 55N (EPSG:32655)' },
  { code: 'EPSG:32656', name: 'UTM Zone 56N (EPSG:32656)' },
  { code: 'EPSG:32657', name: 'UTM Zone 57N (EPSG:32657)' },
  
  // Southern hemisphere UTM zones
  { code: 'EPSG:32746', name: 'UTM Zone 46S (EPSG:32746)' },
  { code: 'EPSG:32747', name: 'UTM Zone 47S (EPSG:32747)' },
  { code: 'EPSG:32748', name: 'UTM Zone 48S (EPSG:32748)' },
  { code: 'EPSG:32749', name: 'UTM Zone 49S (EPSG:32749)' },
  { code: 'EPSG:32750', name: 'UTM Zone 50S (EPSG:32750)' },
  { code: 'EPSG:32751', name: 'UTM Zone 51S (EPSG:32751)' },
  { code: 'EPSG:32752', name: 'UTM Zone 52S (EPSG:32752)' },
  { code: 'EPSG:32753', name: 'UTM Zone 53S (EPSG:32753)' },
  { code: 'EPSG:32754', name: 'UTM Zone 54S (EPSG:32754)' },
  { code: 'EPSG:32755', name: 'UTM Zone 55S (EPSG:32755)' },
  { code: 'EPSG:32756', name: 'UTM Zone 56S (EPSG:32756)' },
  { code: 'EPSG:32757', name: 'UTM Zone 57S (EPSG:32757)' }
];

const FileUploader = ({ onBlockModelUpload, onElevationDataUpload, onPitDataUpload }) => {
  const [blockModelFile, setBlockModelFile] = useState(null);
  const [elevationFile, setElevationFile] = useState(null);
  const [pitFile, setPitFile] = useState(null);
  const [projection, setProjection] = useState('EPSG:32652'); // Default to UTM Zone 52
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const pickBlockModelFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true
      });
      
      if (result.canceled === false) {
        // Validasi ekstensi file
        const fileUri = result.assets[0].uri;
        const fileExtension = fileUri.split('.').pop().toLowerCase();
        
        if (fileExtension === 'csv') {
          setBlockModelFile(result.assets[0]);
          setError('');
          setSuccess('');
        } else {
          setError('Please select a CSV file');
        }
      }
    } catch (err) {
      setError('Error picking block model file');
      console.error(err);
    }
  };

  const pickElevationFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true
      });
      
      if (result.canceled === false) {
        setElevationFile(result.assets[0]);
        setError('');
        setSuccess('');
      }
    } catch (err) {
      setError('Error picking elevation file');
      console.error(err);
    }
  };

  const pickPitFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true
      });
      
      if (result.canceled === false) {
        setPitFile(result.assets[0]);
        setError('');
        setSuccess('');
      }
    } catch (err) {
      setError('Error picking pit file');
      console.error(err);
    }
  };

  const processBlockModelFile = async () => {
    if (!blockModelFile) {
      setError('Please select a block model CSV file');
      return;
    }

    setIsLoading(true);
    setSuccess('');

    try {
      const fileContent = await FileSystem.readAsStringAsync(blockModelFile.uri);
      
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          setIsLoading(false);
          
          if (results.errors.length > 0) {
            setError(`Error parsing block model CSV: ${results.errors[0].message}`);
            return;
          }
          
          // Skip the first 3 rows as in the Python code (skiprows=[1,2,3])
          // Note: Papa.parse with header:true already skips the first row (header)
          // So we need to skip 2 more rows (rows at index 0 and 1)
          const dataWithoutHeaders = results.data.slice(2);
          
          // Pass both the data and the projection
          onBlockModelUpload(dataWithoutHeaders, projection);
          setSuccess('Block model data processed successfully!');
        },
        error: (error) => {
          setIsLoading(false);
          setError(`Error reading block model file: ${error.message}`);
        }
      });
    } catch (error) {
      setIsLoading(false);
      setError(`Error reading file: ${error.message}`);
    }
  };

  const processElevationFile = async () => {
    if (!elevationFile) {
      setError('Please select an elevation STR file');
      return;
    }

    setIsLoading(true);
    setSuccess('');

    try {
      const fileContent = await FileSystem.readAsStringAsync(elevationFile.uri);
      
      Papa.parse(fileContent, {
        // Don't use header: true since first row isn't a proper header
        header: false,
        skipEmptyLines: true,
        dynamicTyping: true,
        // Transform function to handle the specific format
        transform: (value) => {
          // Trim whitespace from each value
          return value.trim();
        },
        complete: (results) => {
          setIsLoading(false);
          
          if (results.errors.length > 0) {
            setError(`Error parsing elevation STR: ${results.errors[0].message}`);
            return;
          }

          // Skip the first row which contains "Topo_LiDAR_PL_smooth.dtm"
          const dataRows = results.data.slice(1);
            
          // Process each row into the required format
          const processedData = dataRows
            .filter(row => {
              // Ensure row has enough columns and ID is 1
              return row.length >= 4 && parseInt(row[0]) === 1;
            })
            .map(row => {
              return {
                id: 1, // Always set ID to 1 as requested
                lat: parseFloat(row[1]) || 0,
                lon: parseFloat(row[2]) || 0,
                z: parseFloat(row[3]) || 0,
                desc: row.length >= 5 ? row[4] : ''
              };
            });
            
            onElevationDataUpload(processedData, projection);
            setSuccess('Elevation data processed successfully!');
          },
          error: (error) => {
            setIsLoading(false);
            setError(`Error reading elevation file: ${error.message}`);
          }
      });
    } catch (error) {
      setIsLoading(false);
      setError(`Error reading file: ${error.message}`);
    }
  };

  const processPitFile = async () => {
    if (!pitFile) {
      setError('Please select a pit data STR file');
      return;
    }

    setIsLoading(true);
    setSuccess('');

    try {
      const fileContent = await FileSystem.readAsStringAsync(pitFile.uri);
      
      Papa.parse(fileContent, {
        header: false, // STR files don't have headers
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          setIsLoading(false);
          
          if (results.errors.length > 0) {
            setError(`Error parsing pit data STR: ${results.errors[0].message}`);
            return;
          }
          
          // Transform the raw data into the expected format with column names
          // Based on the Python code: 'interior', 'x', 'y', 'z', 'none', 'type'
          const transformedData = results.data.map(row => {
            // Check if we have the expected number of columns (6)
            if (row.length >= 6) {
              return {
                interior: row[0],
                x: row[1],
                y: row[2],
                z: row[3],
                none: row[4],
                type: row[5]
              };
            }
            // If we don't have enough columns, log a warning and skip this row
            console.warn('Skipping row with insufficient columns:', row);
            return null;
          }).filter(item => item !== null); // Remove null entries
          
          // Pass the transformed data and projection to the parent component
          onPitDataUpload(transformedData, projection);
          setSuccess('Pit data processed successfully!');
        },
        error: (error) => {
          setIsLoading(false);
          setError(`Error reading pit file: ${error.message}`);
        }
      });
    } catch (error) {
      setIsLoading(false);
      setError(`Error reading file: ${error.message}`);
    }
  };

  const processAllFiles = () => {
    let processedAny = false;
    
    if (blockModelFile) {
      processBlockModelFile();
      processedAny = true;
    }
    
    if (elevationFile) {
      processElevationFile();
      processedAny = true;
    }
    
    if (pitFile) {
      processPitFile();
      processedAny = true;
    }
    
    if (!processedAny) {
      setError('Please select at least one file to process');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Upload Data Files</Text>
      
      {/* Block Model File */}
      <View style={styles.fileSection}>
        <Text style={styles.label}>Block Model CSV:</Text>
        <TouchableOpacity style={styles.fileButton} onPress={pickBlockModelFile}>
          <Text style={styles.fileButtonText}>
            {blockModelFile ? blockModelFile.name : 'Select Block Model File'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.helperText}>
          CSV with block model data (required for block visualization)
        </Text>
      </View>
      
      {/* Elevation Data */}
      <View style={styles.fileSection}>
        <Text style={styles.label}>Elevation Data STR:</Text>
        <TouchableOpacity style={styles.fileButton} onPress={pickElevationFile}>
          <Text style={styles.fileButtonText}>
            {elevationFile ? elevationFile.name : 'Select Elevation File'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.helperText}>
          CSV with elevation points (x/y/z or lon/lat/elev columns)
        </Text>
      </View>
      
      {/* Pit Data */}
      <View style={styles.fileSection}>
        <Text style={styles.label}>Pit Data STR:</Text>
        <TouchableOpacity style={styles.fileButton} onPress={pickPitFile}>
          <Text style={styles.fileButtonText}>
            {pitFile ? pitFile.name : 'Select Pit File'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.helperText}>
          STR file with pit boundary data (6 columns format)
        </Text>
      </View>
      
      {/* Projection Picker */}
      <View style={styles.fileSection}>
        <Text style={styles.label}>Coordinate System:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={projection}
            onValueChange={(value) => setProjection(value)}
            style={styles.picker}
          >
            {PROJECTIONS.map(proj => (
              <Picker.Item key={proj.code} label={proj.name} value={proj.code} />
            ))}
          </Picker>
        </View>
        <Text style={styles.helperText}>
          Select the coordinate system of your data
        </Text>
      </View>
      
      {/* Process Button */}
      <TouchableOpacity 
        style={[
          styles.processButton, 
          (!blockModelFile && !elevationFile && !pitFile) || isLoading ? styles.disabledButton : {}
        ]}
        onPress={processAllFiles}
        disabled={(!blockModelFile && !elevationFile && !pitFile) || isLoading}
      >
        <Text style={styles.processButtonText}>Process Data Files</Text>
      </TouchableOpacity>
      
      {/* Status Messages */}
      {isLoading && <Text style={styles.loadingText}>Processing files...</Text>}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>{success}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16
  },
  fileSection: {
    marginBottom: 16
  },
  label: {
    fontWeight: '500',
    marginBottom: 8
  },
  fileButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  fileButtonText: {
    color: '#333'
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  picker: {
    height: 50,
    width: '100%'
  },
  processButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center'
  },
  disabledButton: {
    backgroundColor: '#93c5fd'
  },
  processButtonText: {
    color: 'white',
    fontWeight: '500'
  },
  loadingText: {
    color: '#3b82f6',
    marginTop: 8
  },
  errorText: {
    color: '#ef4444',
    marginTop: 8
  },
  successText: {
    color: '#10b981',
    marginTop: 8
  }
});

export default FileUploader;