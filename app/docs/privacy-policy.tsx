import React from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header - Konsisten dengan aplikasi lain */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Introduction */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Your Data, Your Control</Text>
            <Text style={styles.paragraph}>
              At Mine.Lite, we understand that your mining data is highly
              sensitive and valuable. We've designed our application with
              privacy-first principles to ensure your geological and mining data
              remains completely under your control.
            </Text>
          </View>

          {/* Local Storage Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 Local Data Storage</Text>
            <Text style={styles.paragraph}>
              All your mining data is stored exclusively on your device. This
              includes:
            </Text>

            <View style={styles.dataBox}>
              <Text style={styles.dataTitle}>
                ✅ Stored Locally on Your Device:
              </Text>
              <Text style={styles.dataItem}>
                • Block Model data (CSV files)
              </Text>
              <Text style={styles.dataItem}>
                • Elevation and topography data (STR/DXF files)
              </Text>
              <Text style={styles.dataItem}>• Pit boundary information</Text>
              <Text style={styles.dataItem}>
                • Geospatial PDF maps and overlays
              </Text>
              <Text style={styles.dataItem}>
                • All processed visualizations and cross-sections
              </Text>
              <Text style={styles.dataItem}>
                • Custom color mappings and attribute settings
              </Text>
              <Text style={styles.dataItem}>
                • Coordinate system configurations
              </Text>
            </View>

            <Text style={styles.paragraph}>
              <Text style={styles.boldText}>Important:</Text> Your mining data
              never leaves your device. We do not upload, transmit, or store any
              of your geological or mining data on our servers.
            </Text>
          </View>

          {/* Cloud Data Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>☁️ What We Store in Cloud</Text>
            <Text style={styles.paragraph}>
              Only essential account information is stored securely in our cloud
              infrastructure:
            </Text>

            <View style={styles.cloudBox}>
              <Text style={styles.cloudTitle}>
                ☁️ Cloud Storage (Encrypted):
              </Text>
              <Text style={styles.cloudItem}>
                • Email address (for account identification)
              </Text>
              <Text style={styles.cloudItem}>
                • Encrypted password (using industry-standard security)
              </Text>
              <Text style={styles.cloudItem}>
                • Account creation and login timestamps
              </Text>
              <Text style={styles.cloudItem}>
                • Subscription status and billing information
              </Text>
            </View>

            <Text style={styles.paragraph}>
              All cloud data is encrypted and stored using enterprise-grade
              security measures. We use Supabase infrastructure with end-to-end
              encryption for account management.
            </Text>
          </View>

          {/* Data Processing Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ⚙️ How Your Data is Processed
            </Text>
            <Text style={styles.paragraph}>
              All data processing happens directly on your device using advanced
              local algorithms:
            </Text>

            <View style={styles.processBox}>
              <Text style={styles.processTitle}>🖥️ Local Processing:</Text>
              <Text style={styles.processItem}>
                • Block model visualization rendering
              </Text>
              <Text style={styles.processItem}>
                • Coordinate system transformations
              </Text>
              <Text style={styles.processItem}>
                • Cross-section generation using D3.js
              </Text>
              <Text style={styles.processItem}>
                • PDF map coordinate extraction and overlay
              </Text>
              <Text style={styles.processItem}>
                • Attribute color mapping and legend creation
              </Text>
              <Text style={styles.processItem}>
                • Data export and screenshot generation
              </Text>
            </View>
          </View>

          {/* Data Control Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎛️ Your Data Rights</Text>
            <Text style={styles.paragraph}>
              You maintain complete control over your mining data:
            </Text>

            <View style={styles.rightsBox}>
              <Text style={styles.rightsTitle}>Your Rights:</Text>
              <Text style={styles.rightsItem}>
                • <Text style={styles.boldText}>Delete anytime:</Text> Remove
                files directly from the app
              </Text>
              <Text style={styles.rightsItem}>
                • <Text style={styles.boldText}>Export freely:</Text> Export
                your data in standard formats
              </Text>
              <Text style={styles.rightsItem}>
                • <Text style={styles.boldText}>No vendor lock-in:</Text> Use
                your data with other mining software
              </Text>
              <Text style={styles.rightsItem}>
                • <Text style={styles.boldText}>Offline access:</Text> Access
                your data without internet connection
              </Text>
              <Text style={styles.rightsItem}>
                • <Text style={styles.boldText}>Account deletion:</Text> Delete
                your account and all cloud data anytime
              </Text>
            </View>
          </View>

          {/* Security Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛡️ Security Measures</Text>
            <Text style={styles.paragraph}>
              We implement multiple layers of security to protect your
              information:
            </Text>

            <View style={styles.securityBox}>
              <Text style={styles.securityTitle}>Security Features:</Text>
              <Text style={styles.securityItem}>
                • End-to-end encryption for all account data
              </Text>
              <Text style={styles.securityItem}>
                • Local device encryption for mining data
              </Text>
              <Text style={styles.securityItem}>
                • Secure authentication protocols
              </Text>
              <Text style={styles.securityItem}>
                • No third-party data sharing
              </Text>
              <Text style={styles.securityItem}>
                • Regular security audits and updates
              </Text>
            </View>
          </View>

          {/* Contact Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 Privacy Questions</Text>
            <Text style={styles.paragraph}>
              If you have questions about our privacy practices or data
              handling, please contact our privacy team at:
            </Text>

            <View style={styles.contactBox}>
              <Text style={styles.contactText}>
                📧 Email: softroc@proton.me
              </Text>
              <Text style={styles.contactText}>
                📱 WhatsApp: +62 812-2233-7568
              </Text>
              <Text style={styles.contactSubtext}>
                We're committed to transparency and will respond to all privacy
                inquiries promptly.
              </Text>
            </View>
          </View>

          {/* Promise Section */}
          <View style={styles.promiseSection}>
            <Text style={styles.promiseTitle}>🤝 Our Privacy Promise</Text>
            <Text style={styles.promiseText}>
              "Your mining data stays with you, always. We build tools that
              respect your data ownership and privacy."
            </Text>
            <Text style={styles.promiseSubtext}>— Mine.Lite Team</Text>
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
  boldText: {
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
  },
  dataBox: {
    backgroundColor: "#e8f5e8",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#28a745",
  },
  dataTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#155724",
    marginBottom: 12,
  },
  dataItem: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#155724",
    lineHeight: 20,
    marginBottom: 4,
  },
  cloudBox: {
    backgroundColor: "#e7f3ff",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#007bff",
  },
  cloudTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#004085",
    marginBottom: 12,
  },
  cloudItem: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#004085",
    lineHeight: 20,
    marginBottom: 4,
  },
  processBox: {
    backgroundColor: "#fff3cd",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  processTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#856404",
    marginBottom: 12,
  },
  processItem: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#856404",
    lineHeight: 20,
    marginBottom: 4,
  },
  rightsBox: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#6c757d",
  },
  rightsTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#495057",
    marginBottom: 12,
  },
  rightsItem: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#495057",
    lineHeight: 20,
    marginBottom: 6,
  },
  securityBox: {
    backgroundColor: "#f8d7da",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#dc3545",
  },
  securityTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#721c24",
    marginBottom: 12,
  },
  securityItem: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#721c24",
    lineHeight: 20,
    marginBottom: 4,
  },
  contactBox: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: "center",
  },
  contactText: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#333",
    marginBottom: 4,
  },
  contactSubtext: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  promiseSection: {
    backgroundColor: "#CFE625",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 16,
  },
  promiseTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },
  promiseText: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#333",
    textAlign: "center",
    lineHeight: 24,
    fontStyle: "italic",
    marginBottom: 8,
  },
  promiseSubtext: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#555",
    textAlign: "center",
  },
});
