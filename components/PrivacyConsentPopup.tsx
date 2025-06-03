import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface PrivacyConsentPopupProps {
  visible: boolean;
  onAgree: () => void; // Fungsi ini akan menangani penyimpanan & navigasi
  onClose: () => void; // Fungsi untuk menutup popup (misal, jika ada tombol close)
  isProcessing?: boolean; // Opsional: Menunjukkan proses sedang berjalan (misal, saat menyimpan persetujuan)
}

const PrivacyConsentPopup: React.FC<PrivacyConsentPopupProps> = ({
  visible,
  onAgree,
  onClose, // Gunakan onClose jika diperlukan
  isProcessing = false, // Default value
}) => {
  // Tidak perlu state 'agreed' internal lagi, logika di handle oleh parent

  const handleAgree = () => {
    if (!isProcessing) {
      onAgree(); // Panggil prop onAgree yang diberikan oleh parent (LoginScreen)
    }
  };

  // Jangan render jika tidak visible
  if (!visible) return null;

  return (
    <Modal
      animationType="fade" // Gunakan fade seperti dialog lain
      transparent={true} // Buat transparan untuk overlay
      visible={visible}
      onRequestClose={!isProcessing ? onClose : undefined} // Tutup modal jika tidak sedang proses
    >
      <View style={styles.centeredView}>
        {" "}
        // Container untuk memusatkan modal
        <View style={styles.modalView}>
          {" "}
          // Container modal dengan style konsisten
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Privacy Policy Agreement</Text>
            {/* Tambahkan tombol close jika diinginkan, panggil onClose */}
            {/* <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isProcessing}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity> */}
          </View>
          {/* Konten Kebijakan Privasi (Scrollable) */}
          <ScrollView style={styles.scrollContainer}>
            <View style={styles.content}>
              {/* Introduction */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  🔒 Your Data, Your Control
                </Text>
                <Text style={styles.paragraph}>
                  At Mine.Lite, we understand that your mining data is highly
                  sensitive and valuable. We've designed our application with
                  privacy-first principles to ensure your geological and mining
                  data remains completely under your control.
                </Text>
              </View>

              {/* Local Storage Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📱 Local Data Storage</Text>
                <Text style={styles.paragraph}>
                  All your mining data is stored exclusively on your device:
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
                  <Text style={styles.dataItem}>
                    • Pit boundary information
                  </Text>
                  <Text style={styles.dataItem}>
                    • Geospatial PDF maps and overlays
                  </Text>
                </View>
              </View>

              {/* Cloud Data Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  ☁️ What We Store in Cloud
                </Text>
                <Text style={styles.paragraph}>
                  Only essential account information is stored securely in our
                  cloud infrastructure:
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
          {/* Tombol Persetujuan (Footer) */}
          <View style={styles.footer}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#198754" />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.agreeButton} // Style tombol konsisten
                onPress={handleAgree}
                disabled={isProcessing}
              >
                {/* Ganti checkbox dengan teks tombol standar */}
                <Text style={styles.agreeButtonText}>Agree and Continue</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles disesuaikan agar mirip ExportDialog/ColorPickerDialog
const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Overlay background
  },
  modalView: {
    width: "90%", // Lebar modal
    maxHeight: "80%", // Batas tinggi modal
    backgroundColor: "white",
    borderRadius: 20,
    padding: 0, // Padding diatur di dalam header, content, footer
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden", // Mencegah konten keluar dari border radius
  },
  header: {
    flexDirection: "row",
    justifyContent: "center", // Pusatkan judul
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    position: "relative",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#212529",
  },
  closeButton: {
    // Style jika tombol close ditambahkan
    position: "absolute",
    right: 15,
    top: 15,
    padding: 5,
  },
  scrollContainer: {
    // flex: 1, // Biarkan ScrollView mengambil sisa ruang
    // Max height bisa diatur di modalView
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17, // Sedikit lebih kecil dari header
    fontFamily: "Montserrat_600SemiBold",
    marginBottom: 10,
    color: "#333",
  },
  paragraph: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
    lineHeight: 22,
    textAlign: "justify",
    color: "#555",
  },
  // Styles untuk dataBox, cloudBox, promiseSection bisa dipertahankan atau disesuaikan
  dataBox: {
    backgroundColor: "#e8f5e8",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#28a745",
  },
  dataTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: "#155724",
    marginBottom: 8,
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
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#007bff",
  },
  cloudTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: "#004085",
    marginBottom: 8,
  },
  cloudItem: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#004085",
    lineHeight: 20,
    marginBottom: 4,
  },
  promiseSection: {
    backgroundColor: "#CFE625", // Warna khas aplikasi
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },
  promiseTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  promiseText: {
    fontSize: 15,
    fontFamily: "Montserrat_400Regular",
    color: "#333",
    textAlign: "center",
    lineHeight: 22,
    fontStyle: "italic",
    marginBottom: 8,
  },
  promiseSubtext: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#555",
    textAlign: "center",
  },
  // Footer dan Tombol
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff", // Pastikan footer punya background
  },
  agreeButton: {
    backgroundColor: "#CFE625", // Warna tombol utama aplikasi
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  agreeButtonText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#000", // Teks hitam di atas tombol kuning
  },
  processingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 50, // Sesuaikan tinggi dengan tombol
  },
  processingText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#495057",
    fontFamily: "Montserrat_400Regular",
  },
});

export default PrivacyConsentPopup;
