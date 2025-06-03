import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Button } from "../../components/FormComponents";
import { supabase } from "../../config/supabase";

export default function CheckEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    if (!email) {
      Alert.alert("Error", "Email tidak ditemukan");
      return;
    }

    setIsResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email as string,
      });

      if (error) {
        Alert.alert("Error", "Gagal mengirim ulang email: " + error.message);
      } else {
        Alert.alert(
          "Email Terkirim! ✅",
          "Email konfirmasi baru telah dikirim. Silakan periksa inbox Anda."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Terjadi kesalahan saat mengirim email");
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenEmailApp = () => {
    // Deteksi email provider berdasarkan domain
    const emailDomain = (email as string)?.split("@")[1]?.toLowerCase();

    let emailUrl = "mailto:";

    if (emailDomain?.includes("gmail")) {
      emailUrl = "https://mail.google.com";
    } else if (emailDomain?.includes("yahoo")) {
      emailUrl = "https://mail.yahoo.com";
    } else if (
      emailDomain?.includes("outlook") ||
      emailDomain?.includes("hotmail")
    ) {
      emailUrl = "https://outlook.live.com";
    }

    Linking.openURL(emailUrl).catch(() => {
      Alert.alert("Info", "Silakan buka aplikasi email Anda secara manual");
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header - Consistent with Login */}
      {/* <View style={styles.header}>
        <Text style={styles.headerTitle}>Periksa Email</Text>
      </View> */}

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Email Icon */}
        <View style={styles.emailIconContainer}>
          <View style={styles.emailIcon}>
            <MaterialIcons name="mark-email-unread" size={48} color="#CFE625" />
          </View>
        </View>

        {/* Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Email Konfirmasi Terkirim! 📧</Text>

          <Text style={styles.description}>
            Kami telah mengirim link konfirmasi ke:
          </Text>

          <View style={styles.emailBox}>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <Text style={styles.instruction}>
            Silakan buka email Anda dan klik link konfirmasi untuk mengaktifkan
            akun Mine.Lite.
          </Text>

          <View style={styles.tipContainer}>
            <MaterialIcons name="info-outline" size={20} color="#CFE625" />
            <Text style={styles.tipText}>
              Tidak menemukan email? Periksa folder spam atau promosi
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="📧 Buka Email"
            onPress={handleOpenEmailApp}
            style={styles.primaryButton}
          />

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendEmail}
            disabled={isResending}
          >
            <MaterialIcons
              name="refresh"
              size={20}
              color="#CFE625"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.resendText}>
              {isResending ? "Mengirim..." : "Kirim Ulang"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.loginText}>
              Sudah konfirmasi?{" "}
              <Text style={styles.loginLink}>Login di sini</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <MaterialIcons name="schedule" size={16} color="#999" />
          <Text style={styles.noteText}>
            Link akan kedaluwarsa dalam 24 jam
          </Text>
        </View>
      </View>
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
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 300,
    height: 60,
  },
  emailIconContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  emailIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f8fffe",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#CFE625",
    shadowColor: "#CFE625",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
  },
  emailBox: {
    backgroundColor: "#f8fffe",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFE625",
    marginBottom: 20,
  },
  emailText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    textAlign: "center",
  },
  instruction: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffef8",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFE625",
    marginTop: 8,
  },
  tipText: {
    fontSize: 13,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  buttonContainer: {
    width: "100%",
  },
  primaryButton: {
    marginBottom: 16,
    backgroundColor: "#CFE625",
  },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginBottom: 20,
    backgroundColor: "#f8fffe",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFE625",
  },
  resendText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#CFE625",
  },
  loginButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  loginText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    textAlign: "center",
  },
  loginLink: {
    color: "#CFE625",
    fontFamily: "Montserrat_600SemiBold",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  noteText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#999",
    marginLeft: 6,
  },
});
