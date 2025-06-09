import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface PrivacyConsentPopupProps {
  visible: boolean;
  onAgree: () => void;
  onClose: () => void;
  isProcessing?: boolean;
}

const PrivacyConsentPopup: React.FC<PrivacyConsentPopupProps> = ({
  visible,
  onAgree,
  onClose,
  isProcessing = false,
}) => {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);

  // Reset checkboxes when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setHasAcceptedTerms(false);
      setHasAcceptedPrivacy(false);
    }
  }, [visible]);

  const handleAgree = () => {
    if (!isProcessing && hasAcceptedTerms && hasAcceptedPrivacy) {
      onAgree();
    }
  };

  const isAgreementComplete = hasAcceptedTerms && hasAcceptedPrivacy;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={!isProcessing ? onClose : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Terms & Privacy Agreement</Text>
            <Text style={styles.headerSubtitle}>
              Please review and accept our terms to continue
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* App Introduction */}
              <View style={styles.introSection}>
                <Image
                  source={require("../assets/images/logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.appDescription}>
                  Professional Mining Data Visualization & Analysis Tool
                </Text>
              </View>

              {/* Key Privacy Points */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  🔒 Data Privacy & Security
                </Text>

                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <Text style={styles.bulletIcon}>✅</Text>
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Local Storage:</Text> All
                      your mining data (CSV, DXF, PDF files) stays on your
                      device
                    </Text>
                  </View>

                  <View style={styles.bulletPoint}>
                    <Text style={styles.bulletIcon}>☁️</Text>
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Cloud Data:</Text> Only
                      account info (email, encrypted password) stored securely
                    </Text>
                  </View>

                  <View style={styles.bulletPoint}>
                    <Text style={styles.bulletIcon}>🚫</Text>
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>No Data Mining:</Text> We
                      never access, view, or sell your data
                    </Text>
                  </View>

                  <View style={styles.bulletPoint}>
                    <Text style={styles.bulletIcon}>🔐</Text>
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Enterprise Security:</Text>{" "}
                      End-to-end encryption for all communications
                    </Text>
                  </View>
                </View>
              </View>

              {/* Usage Terms */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📋 Terms of Service</Text>

                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <Text style={styles.bulletIcon}>💼</Text>
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Professional Use:</Text>{" "}
                      Licensed for commercial mining operations and analysis
                    </Text>
                  </View>

                  <View style={styles.bulletPoint}>
                    <Text style={styles.bulletIcon}>🔄</Text>
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Data Export:</Text> Full
                      export capabilities - no vendor lock-in
                    </Text>
                  </View>

                  <View style={styles.bulletPoint}>
                    <Text style={styles.bulletIcon}>⚖️</Text>
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Compliance:</Text> User
                      responsible for industry regulations and data governance
                    </Text>
                  </View>

                  <View style={styles.bulletPoint}>
                    <Text style={styles.bulletIcon}>🛡️</Text>
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Liability:</Text> Software
                      provided "as-is" for analytical purposes
                    </Text>
                  </View>
                </View>
              </View>

              {/* User Rights */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  🎛️ Your Rights & Control
                </Text>

                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <Text style={styles.bulletIcon}>🗑️</Text>
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Data Deletion:</Text> Delete
                      files and account data anytime
                    </Text>
                  </View>

                  <View style={styles.bulletPoint}>
                    <Text style={styles.bulletIcon}>📤</Text>
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Data Portability:</Text>{" "}
                      Export your data in standard formats
                    </Text>
                  </View>

                  <View style={styles.bulletPoint}>
                    <Text style={styles.bulletIcon}>📞</Text>
                    <Text style={styles.bulletText}>
                      <Text style={styles.boldText}>Support:</Text> Contact
                      softroc@proton.me for privacy questions
                    </Text>
                  </View>
                </View>
              </View>

              {/* Legal Notice */}
              <View style={styles.legalNotice}>
                <Text style={styles.legalText}>
                  By using Mine.Lite, you acknowledge that you have read,
                  understood, and agree to be bound by these terms and our
                  privacy policy. This agreement is governed by Indonesian law.
                </Text>
                <Text style={styles.legalSubtext}>
                  Last updated: June 2025 • Version 1.0
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Agreement Checkboxes */}
          <View style={styles.agreementSection}>
            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setHasAcceptedTerms(!hasAcceptedTerms)}
              disabled={isProcessing}
            >
              <View
                style={[
                  styles.checkbox,
                  hasAcceptedTerms && styles.checkboxChecked,
                ]}
              >
                {hasAcceptedTerms && (
                  <MaterialIcons name="check" size={16} color="#000" />
                )}
              </View>
              <Text style={styles.checkboxText}>
                I agree to the{" "}
                <Text style={styles.linkText}>Terms of Service</Text> and
                acknowledge that I have read the terms above
              </Text>
            </TouchableOpacity>

            {/* Privacy Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setHasAcceptedPrivacy(!hasAcceptedPrivacy)}
              disabled={isProcessing}
            >
              <View
                style={[
                  styles.checkbox,
                  hasAcceptedPrivacy && styles.checkboxChecked,
                ]}
              >
                {hasAcceptedPrivacy && (
                  <MaterialIcons name="check" size={16} color="#000" />
                )}
              </View>
              <Text style={styles.checkboxText}>
                I consent to the{" "}
                <Text style={styles.linkText}>Privacy Policy</Text> and
                understand how my data is handled
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#CFE625" />
                <Text style={styles.processingText}>
                  Setting up your account...
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.agreeButton,
                    !isAgreementComplete && styles.agreeButtonDisabled,
                  ]}
                  onPress={handleAgree}
                  disabled={!isAgreementComplete}
                >
                  <Text
                    style={[
                      styles.agreeButtonText,
                      !isAgreementComplete && styles.agreeButtonTextDisabled,
                    ]}
                  >
                    Accept & Continue
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "100%",
    maxHeight: "90%",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    textAlign: "center",
  },
  contentContainer: {
    maxHeight: 300,
  },
  content: {
    padding: 20,
  },
  introSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  logo: {
    width: 200,
    height: 40,
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  bulletContainer: {
    gap: 8,
  },
  bulletPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#444",
    lineHeight: 18,
  },
  boldText: {
    fontFamily: "Montserrat_600SemiBold",
    color: "#1a1a1a",
  },
  legalNotice: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#CFE625",
  },
  legalText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#555",
    lineHeight: 16,
    textAlign: "justify",
    marginBottom: 8,
  },
  legalSubtext: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: "#888",
    textAlign: "center",
  },
  agreementSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 12,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#CFE625",
    borderColor: "#CFE625",
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#333",
    lineHeight: 20,
  },
  linkText: {
    color: "#007bff",
    fontFamily: "Montserrat_500Medium",
  },
  buttonContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#666",
  },
  agreeButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#CFE625",
    alignItems: "center",
  },
  agreeButtonDisabled: {
    backgroundColor: "#f0f0f0",
  },
  agreeButtonText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#000",
  },
  agreeButtonTextDisabled: {
    color: "#999",
  },
  processingContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  processingText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
  },
});

export default PrivacyConsentPopup;
