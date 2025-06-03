import React from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";

export default function AboutUsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header - Konsisten dengan aplikasi lain */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>About Us</Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Company Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏢 Our Company</Text>
            <Text style={styles.paragraph}>
              We are a specialized software startup developing cutting-edge
              solutions for the mining industry. Our focus is on creating
              intuitive, powerful tools that transform complex geological and
              mining data into actionable insights for mining professionals
              worldwide.
            </Text>
          </View>

          {/* Product Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⛏️ Mine.Lite Application</Text>
            <Text style={styles.paragraph}>
              Mine.Lite is our flagship mining visualization platform that
              revolutionizes how mining engineers and geologists interact with
              their data. Built specifically for the mining industry, it
              provides comprehensive tools for spatial data analysis and
              visualization.
            </Text>

            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>🗺️ Core Capabilities:</Text>
              <Text style={styles.featureItem}>
                • Block Model Processing & Visualization (CSV format compatible
                with Surpac/Vulcan)
              </Text>
              <Text style={styles.featureItem}>
                • Interactive 2D Top-Down Mapping using Leaflet technology
              </Text>
              <Text style={styles.featureItem}>
                • Cross-Section Generation with D3.js-powered visualization
              </Text>
              <Text style={styles.featureItem}>
                • Elevation Data Integration (STR/DXF format support)
              </Text>
              <Text style={styles.featureItem}>
                • Pit Boundary Analysis and Display
              </Text>
              <Text style={styles.featureItem}>
                • Geospatial PDF Map Overlay (Avenza-style functionality)
              </Text>
              <Text style={styles.featureItem}>
                • Real-time Attribute Color Mapping and Legend Management
              </Text>
              <Text style={styles.featureItem}>
                • Coordinate System Transformation and Projection Support
              </Text>
              <Text style={styles.featureItem}>
                • Data Export Capabilities (JSON, Screenshots)
              </Text>
            </View>
          </View>

          {/* Technical Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ Technical Innovation</Text>
            <Text style={styles.paragraph}>
              Mine.Lite leverages modern web technologies including Leaflet for
              mapping, D3.js for advanced visualizations, and React Native for
              cross-platform compatibility. Our application handles complex
              coordinate transformations, large dataset processing, and
              real-time rendering to deliver professional-grade mining
              visualization tools.
            </Text>

            <View style={styles.featureBox}>
              <Text style={styles.featureTitle}>
                🗺️ Comprehensive Coordinate System Support:
              </Text>
              <Text style={styles.featureItem}>
                • WGS84 (EPSG:4326) - Standard GPS coordinates
              </Text>
              <Text style={styles.featureItem}>
                • Complete UTM Zone coverage for Indonesia (Zones 46N-52N &
                46S-52S)
              </Text>
              <Text style={styles.featureItem}>
                • West Indonesia: UTM Zones 46-47 (North & South hemispheres)
              </Text>
              <Text style={styles.featureItem}>
                • Central Indonesia: UTM Zones 48-49 (North & South hemispheres)
              </Text>
              <Text style={styles.featureItem}>
                • East Indonesia: UTM Zones 50-51 (North & South hemispheres)
              </Text>
              <Text style={styles.featureItem}>
                • Papua Region: UTM Zone 52 (North & South hemispheres)
              </Text>
              <Text style={styles.featureItem}>
                • Automatic coordinate transformation and projection handling
              </Text>
            </View>
          </View>

          {/* Vision Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚀 Our Vision</Text>
            <Text style={styles.paragraph}>
              To democratize access to sophisticated mining visualization tools,
              enabling mining professionals to make data-driven decisions with
              confidence. We envision a future where complex geological analysis
              is accessible to every mining operation, regardless of size.
            </Text>
          </View>

          {/* Business Model Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💼 Subscription Model</Text>
            <Text style={styles.paragraph}>
              Mine.Lite operates on a Software-as-a-Service (SaaS) subscription
              model, providing scalable solutions for mining operations from
              exploration to production. Our flexible pricing ensures
              accessibility for junior miners while offering advanced features
              for large-scale operations.
            </Text>
          </View>

          {/* Tagline Section */}
          <View style={styles.taglineSection}>
            <Text style={styles.tagline}>
              "Beyond the ground in the palm of your hand"
            </Text>
            <Text style={styles.taglineDesc}>
              Professional mining visualization made accessible, powerful, and
              intuitive
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    lineHeight: 24,
    textAlign: "justify",
  },
  featureBox: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#CFE625",
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    lineHeight: 20,
    marginBottom: 4,
  },
  taglineSection: {
    backgroundColor: "#CFE625",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },
  tagline: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  taglineDesc: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    textAlign: "center",
  },
});
