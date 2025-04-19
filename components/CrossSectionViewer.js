// src/components/CrossSectionViewer.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import * as turf from '@turf/turf';

const CrossSectionViewer = ({ geoJsonData, linePoints, onClose }) => {
  const [htmlContent, setHtmlContent] = useState('');
  
  useEffect(() => {
    if (geoJsonData && linePoints.length === 2) {
      generateCrossSectionHtml();
    }
  }, [geoJsonData, linePoints]);
  
  const generateCrossSectionHtml = () => {
    // Convert Leaflet points [lat, lng] to GeoJSON format [lng, lat]
    const startPoint = turf.point([linePoints[0][1], linePoints[0][0]]);
    const endPoint = turf.point([linePoints[1][1], linePoints[1][0]]);
    
    // Create a line between the points
    const line = turf.lineString([
      [linePoints[0][1], linePoints[0][0]],
      [linePoints[1][1], linePoints[1][0]]
    ]);
    
    // Calculate the total distance of the line in meters
    const totalDistance = turf.length(line, { units: 'meters' });
    
    // Sample points along the line
    const samplingDistance = 5; // meters between sample points
    const numSamples = Math.max(20, Math.ceil(totalDistance / samplingDistance));
    
    // Generate points along the line
    const points = Array.from({ length: numSamples }, (_, i) => {
      const fraction = i / (numSamples - 1);
      const point = turf.along(line, totalDistance * fraction, { units: 'meters' });
      return point;
    });
    
    // For each point, find the nearest block and get its height (centroid_z)
    const profileData = points.map((point, index) => {
      // Convert point to [lat, lng] for distance calculations
      const pointCoords = [point.geometry.coordinates[1], point.geometry.coordinates[0]];
      
      // Find the nearest block by checking which polygon contains the point
      // or is closest to the point
      let nearestBlock = null;
      let minDistance = Infinity;
      
      geoJsonData.features.forEach(feature => {
        // Convert Turf.js polygon coordinates from [lng, lat] to [lat, lng] for contains check
        const leafletPolygon = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
        
        // Calculate distance to this feature
        const featureCenter = [
          feature.properties.centroid_y,
          feature.properties.centroid_x
        ];
        
        const distance = turf.distance(
          turf.point([pointCoords[1], pointCoords[0]]),
          turf.point([featureCenter[1], featureCenter[0]]),
          { units: 'meters' }
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestBlock = feature;
        }
      });
      
      // Get distance from start point
      const distanceFromStart = turf.distance(
        startPoint,
        point,
        { units: 'meters' }
      );
      
      // Get height from the nearest block
      const height = nearestBlock ? nearestBlock.properties.centroid_z : 0;
      const rockType = nearestBlock ? nearestBlock.properties.rock : 'UNKNOWN';
      
      return {
        distance: distanceFromStart,
        height,
        rockType,
        point: [point.geometry.coordinates[1], point.geometry.coordinates[0]]
      };
    });
    
    // Create HTML content with embedded D3
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
          svg { width: 100%; height: 100%; }
          .tooltip text { font-size: 12px; }
          .legend text { font-size: 12px; }
        </style>
        <script src="https://d3js.org/d3.v7.min.js"></script>
      </head>
      <body>
        <svg id="visualization" width="800" height="400"></svg>
        <script>
          // The profile data from React Native
          const profileData = ${JSON.stringify(profileData)};
          
          // Set up D3 visualization
          const svg = d3.select("#visualization");
          const width = svg.attr("width");
          const height = svg.attr("height");
          const margin = { top: 40, right: 70, bottom: 60, left: 60 };
          
          // Create scales
          const xScale = d3.scaleLinear()
            .domain([0, d3.max(profileData, d => d.distance)])
            .range([margin.left, width - margin.right]);
          
          // Find the min and max heights
          const minHeight = d3.min(profileData, d => d.height);
          const maxHeight = d3.max(profileData, d => d.height);
          const heightPadding = (maxHeight - minHeight) * 0.1;
          
          const yScale = d3.scaleLinear()
            .domain([minHeight - heightPadding, maxHeight + heightPadding])
            .range([height - margin.bottom, margin.top]);
          
          // Create a color scale for rock types
          const rockTypes = [...new Set(profileData.map(d => d.rockType))];
          const colorScale = d3.scaleOrdinal()
            .domain(rockTypes)
            .range(d3.schemeCategory10);
          
          // Add X and Y axes
          const xAxis = d3.axisBottom(xScale)
            .tickFormat(d => \`\${d.toFixed(0)}m\`);
          
          svg.append('g')
            .attr('transform', \`translate(0, \${height - margin.bottom})\`)
            .call(xAxis);
          
          const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => \`\${d.toFixed(1)}m\`);
          
          svg.append('g')
            .attr('transform', \`translate(\${margin.left}, 0)\`)
            .call(yAxis);
          
          // Add axis labels
          svg.append('text')
            .attr('x', width / 2)
            .attr('y', height - 10)
            .attr('text-anchor', 'middle')
            .text('Distance Along Line (meters)');
          
          svg.append('text')
            .attr('x', -height / 2)
            .attr('y', 15)
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .text('Elevation (meters)');
          
          // Add title
          svg.append('text')
            .attr('x', width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-weight', 'bold')
            .text('Vertical Profile Along Line');
          
          // Create the line generator
          const line1 = d3.line()
            .x(d => xScale(d.distance))
            .y(d => yScale(d.height))
            .curve(d3.curveMonotoneX);
          
          // Draw the line
          svg.append('path')
            .datum(profileData)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 2)
            .attr('d', line1);
          
          // Add dots for each sample point
          svg.selectAll('.dot')
            .data(profileData)
            .enter()
            .append('circle')
            .attr('cx', d => xScale(d.distance))
            .attr('cy', d => yScale(d.height))
            .attr('r', 4)
            .attr('fill', d => colorScale(d.rockType))
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);
          
          // Add a legend
          const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', \`translate(\${width - margin.right + 10}, \${margin.top})\`);
          
          rockTypes.forEach((rockType, i) => {
            const legendRow = legend.append('g')
              .attr('transform', \`translate(0, \${i * 20})\`);
            
            legendRow.append('rect')
              .attr('width', 10)
              .attr('height', 10)
              .attr('fill', colorScale(rockType));
            
            legendRow.append('text')
              .attr('x', 15)
              .attr('y', 10)
              .text(rockType);
          });
          
          // Make SVG responsive
          function resizeSVG() {
            const containerWidth = window.innerWidth;
            const containerHeight = window.innerHeight;
            svg.attr('width', containerWidth)
               .attr('height', containerHeight);
          }
          
          window.addEventListener('resize', resizeSVG);
          resizeSVG();
        </script>
      </body>
    </html>
    `;
    
    setHtmlContent(html);
  };
  
  const { width } = Dimensions.get('window');
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cross-Section View</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.webViewContainer}>
        {htmlContent ? (
          <WebView
            source={{ html: htmlContent }}
            style={styles.webView}
            originWhitelist={['*']}
            scrollEnabled={false}
            bounces={false}
          />
        ) : (
          <View style={styles.loadingView}>
            <Text>Loading visualization...</Text>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Showing elevation profile along the line ({linePoints.length} points).
        </Text>
        <Text style={styles.footerText}>
          First point: {linePoints[0][0].toFixed(6)}, {linePoints[0][1].toFixed(6)}
        </Text>
        <Text style={styles.footerText}>
          Second point: {linePoints[1][0].toFixed(6)}, {linePoints[1][1].toFixed(6)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  closeButton: {
    backgroundColor: '#e5e5e5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4
  },
  webViewContainer: {
    height: 400,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 4,
    overflow: 'hidden'
  },
  webView: {
    flex: 1
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9'
  },
  footer: {
    marginTop: 8
  },
  footerText: {
    fontSize: 12,
    color: '#666'
  }
});

export default CrossSectionViewer;