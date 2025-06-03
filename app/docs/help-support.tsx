import React from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";

export default function HelpSupportScreen() {
  const handleEmailPress = async () => {
    const email = "softroc@proton.me";
    const subject = "Mine.Lite Support Request";
    const body = "Hello Mine.Lite Support Team,\n\nI need assistance with:\n\n";

    const url = `mailto:${email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Email Not Available",
          `Please send your email to: ${email}`,
          [
            {
              text: "Copy Email",
              onPress: () => {
                /* Copy functionality if needed */
              },
            },
            { text: "OK" },
          ]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Unable to open email app");
    }
  };

  const handlePhonePress = async () => {
    const phoneNumber = "+6281222337568";
    const url = `tel:${phoneNumber}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Phone Not Available", `Please call: ${phoneNumber}`, [
          { text: "OK" },
        ]);
      }
    } catch (error) {
      Alert.alert("Error", "Unable to open phone app");
    }
  };

  const handleWhatsAppPress = async () => {
    const phoneNumber = "6281222337568"; // Without + for WhatsApp
    const message =
      "Hello! I need technical support with Mine.Lite application.";
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(
      message
    )}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "WhatsApp Not Installed",
          "Please install WhatsApp or contact us via email/phone"
        );
      }
    } catch (error) {
      Alert.alert("Error", "Unable to open WhatsApp");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header - Konsisten dengan aplikasi lain */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Contact Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 Technical Support</Text>
            <Text style={styles.paragraph}>
              Our technical support team specializes in mining software
              solutions. Whether you need help with data import, visualization
              issues, or advanced features, we're here to assist you.
            </Text>

            {/* Email Contact */}
            <TouchableOpacity
              style={styles.contactCard}
              onPress={handleEmailPress}
            >
              <View style={styles.contactIcon}>
                <MaterialIcons name="email" size={24} color="#CFE625" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>Email Support</Text>
                <Text style={styles.contactDetail}>softroc@proton.me</Text>
                <Text style={styles.contactDesc}>
                  Detailed technical assistance & file troubleshooting
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#777" />
            </TouchableOpacity>

            {/* Phone Contact */}
            <TouchableOpacity
              style={styles.contactCard}
              onPress={handlePhonePress}
            >
              <View style={styles.contactIcon}>
                <MaterialIcons name="phone" size={24} color="#CFE625" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>Phone Support</Text>
                <Text style={styles.contactDetail}>+62 812-2233-7568</Text>
                <Text style={styles.contactDesc}>
                  Direct consultation for urgent issues
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#777" />
            </TouchableOpacity>

            {/* WhatsApp Contact */}
            <TouchableOpacity
              style={styles.contactCard}
              onPress={handleWhatsAppPress}
            >
              <View style={styles.contactIcon}>
                <Feather name="message-circle" size={24} color="#CFE625" />
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>WhatsApp Support</Text>
                <Text style={styles.contactDetail}>+62 812-2233-7568</Text>
                <Text style={styles.contactDesc}>
                  Quick questions & real-time assistance
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#777" />
            </TouchableOpacity>
          </View>

          {/* FAQ Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ❓ Frequently Asked Questions
            </Text>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>
                How do I import block model data?
              </Text>
              <Text style={styles.faqAnswer}>
                Upload your CSV file in Surpac or Vulcan format. Ensure columns
                include coordinates (X, Y, Z), dimensions, and attribute data.
                The system automatically processes and visualizes your block
                model.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>
                Can I overlay PDF maps like Avenza?
              </Text>
              <Text style={styles.faqAnswer}>
                Yes! Upload your georeferenced PDF maps and they'll overlay on
                the Leaflet map with proper coordinate transformation. The
                system extracts coordinates and scales the overlay
                automatically.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>
                How do cross-sections work?
              </Text>
              <Text style={styles.faqAnswer}>
                Draw a line on the top-down view to create cross-sections. The
                D3.js visualization shows block model intersections, elevation
                profiles, and pit boundaries along your selected line.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>
                What coordinate systems are supported?
              </Text>
              <Text style={styles.faqAnswer}>
                Mine.Lite provides comprehensive coordinate system support for
                Indonesian mining operations:
                {"\n"}• WGS84 (EPSG:4326) for GPS data
                {"\n"}• Complete UTM coverage: Zones 46N-52N and 46S-52S
                {"\n"}• Regional support: West Indonesia (46-47), Central
                (48-49), East (50-51), Papua (52)
                {"\n"}• Automatic coordinate transformation ensures accurate
                visualization regardless of source data projection.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>
                Can I customize attribute colors?
              </Text>
              <Text style={styles.faqAnswer}>
                Absolutely! Use the Color Picker to assign custom colors to
                different rock types, ore grades, or any attribute in your block
                model. Changes apply to both top-down and cross-section views.
              </Text>
            </View>

            <View style={styles.faqCard}>
              <Text style={styles.faqQuestion}>
                How do I export my visualizations?
              </Text>
              <Text style={styles.faqAnswer}>
                Use the Export function to save screenshots, export filtered
                data as JSON, or generate reports. All exports maintain data
                integrity and can be used in other mining software.
              </Text>
            </View>
          </View>

          {/* Data Format Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Supported Data Formats</Text>
            <View style={styles.formatCard}>
              <Text style={styles.formatTitle}>Block Model:</Text>
              <Text style={styles.formatText}>
                CSV (Surpac/Vulcan compatible)
              </Text>
              <Text style={styles.formatTitle}>Elevation Data:</Text>
              <Text style={styles.formatText}>STR, DXF formats</Text>
              <Text style={styles.formatTitle}>Pit Boundary:</Text>
              <Text style={styles.formatText}>STR, DXF formats</Text>
              <Text style={styles.formatTitle}>Geospatial Maps:</Text>
              <Text style={styles.formatText}>Georeferenced PDF files</Text>
            </View>
          </View>

          {/* Support Hours */}
          <View style={styles.supportHoursCard}>
            <Text style={styles.supportHoursTitle}>🕐 Support Hours (WIB)</Text>
            <Text style={styles.supportHoursText}>
              Monday - Friday: 9:00 AM - 6:00 PM
            </Text>
            <Text style={styles.supportHoursText}>
              Saturday: 9:00 AM - 2:00 PM
            </Text>
            <Text style={styles.supportHoursText}>
              Sunday: Emergency support only
            </Text>
            <Text style={styles.supportHoursSubtext}>
              Critical mining operations support available 24/7
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
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    lineHeight: 24,
    marginBottom: 20,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  contactIcon: {
    width: 50,
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  contactContent: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#CFE625",
    marginBottom: 2,
  },
  contactDesc: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#777",
  },
  faqCard: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#CFE625",
  },
  faqQuestion: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    lineHeight: 20,
  },
  formatCard: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#CFE625",
  },
  formatTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    marginTop: 8,
    marginBottom: 4,
  },
  formatText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    marginBottom: 4,
  },
  supportHoursCard: {
    backgroundColor: "#CFE625",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  supportHoursTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    marginBottom: 12,
  },
  supportHoursText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#333",
    marginBottom: 4,
  },
  supportHoursSubtext: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
});
