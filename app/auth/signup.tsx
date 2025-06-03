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
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { Input, Button } from "../../components/FormComponents";
import { AuthErrorType } from "@/services/AuthService";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signup, lastError } = useAuth();
  const router = useRouter();

  const handleSignup = async () => {
    // Validasi input
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Mohon masukkan email dan password");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Format email tidak valid");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      Alert.alert("Error", "Konfirmasi password tidak cocok");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signup(email.trim().toLowerCase(), password);

      if (result.success) {
        if (result.needsEmailConfirmation) {
          // ✅ EXPECTED CASE: Perlu konfirmasi email
          Alert.alert(
            "Pendaftaran Berhasil! 🎉",
            `Kami telah mengirim email konfirmasi ke:\n${email}\n\nSilakan periksa inbox Anda dan klik link konfirmasi untuk mengaktifkan akun.`,
            [
              {
                text: "Mengerti",
                onPress: () => {
                  // ✅ FIXED: Arahkan ke check-email screen
                  router.push({
                    pathname: "/auth/check-email",
                    params: {
                      email: email.trim().toLowerCase(),
                    },
                  });
                },
              },
            ]
          );
        } else {
          // Rare case: User sudah confirmed langsung
          Alert.alert(
            "Pendaftaran Berhasil! 🎉",
            "Akun Anda berhasil dibuat dan langsung aktif!",
            [
              {
                text: "Lanjut",
                onPress: () => router.replace("/"),
              },
            ]
          );
        }
      } else {
        // ❌ GAGAL - Show error message based on error type
        const errorMessage = result.error || lastError || "Gagal membuat akun";

        // Cek jika email sudah terdaftar berdasarkan error message
        if (
          errorMessage.toLowerCase().includes("sudah terdaftar") ||
          errorMessage.toLowerCase().includes("already") ||
          errorMessage.toLowerCase().includes("duplicate") ||
          errorMessage.toLowerCase().includes("exists")
        ) {
          Alert.alert(
            "Email Sudah Terdaftar",
            `Email ${email} sudah digunakan. Silakan login atau gunakan email lain.`,
            [
              {
                text: "Login",
                onPress: () =>
                  router.push({
                    pathname: "/auth/login",
                    params: { email: email.trim().toLowerCase() },
                  }),
              },
              { text: "Coba Email Lain", style: "cancel" },
            ]
          );
        } else if (errorMessage.toLowerCase().includes("password minimal")) {
          Alert.alert("Password Terlalu Lemah", errorMessage);
        } else if (errorMessage.toLowerCase().includes("format email")) {
          Alert.alert("Email Tidak Valid", errorMessage);
        } else if (errorMessage.toLowerCase().includes("koneksi")) {
          Alert.alert("Masalah Koneksi", errorMessage, [
            { text: "Coba Lagi", onPress: handleSignup },
            { text: "Batal", style: "cancel" },
          ]);
        } else {
          Alert.alert("Pendaftaran Gagal", errorMessage);
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      Alert.alert(
        "Error",
        "Terjadi kesalahan saat pendaftaran. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    Alert.alert("Info", "Daftar dengan Google akan segera tersedia!");
  };

  const handleFacebookSignup = () => {
    Alert.alert("Info", "Daftar dengan Facebook akan segera tersedia!");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header - Consistent with Login */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daftar User</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>
              Beyond the ground in{"\n"}the palm of your hand
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Minimal 6 karakter"
            />

            {/* Konfirmasi password - hanya muncul jika user mulai ketik */}
            {password.length > 0 && (
              <Input
                label="Konfirmasi Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Ulangi password"
              />
            )}

            <Button
              title="Daftar"
              onPress={handleSignup}
              isLoading={isLoading}
              style={styles.signupButton}
            />
          </View>

          {/* Social Login Section */}
          <View style={styles.socialSection}>
            <Text style={styles.orText}>atau daftar dengan</Text>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignup}
                disabled={isLoading}
              >
                <FontAwesome name="google" size={22} color="#DB4437" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleFacebookSignup}
                disabled={isLoading}
              >
                <FontAwesome name="facebook" size={22} color="#1877F2" />
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <TouchableOpacity
              onPress={() => router.push("/auth/login")}
              disabled={isLoading}
            >
              <Text style={styles.loginText}>
                Sudah punya akun?{" "}
                <Text style={styles.loginLink}>Login di sini</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 40,
  },
  logo: {
    width: 300,
    height: 60,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    fontFamily: "Montserrat_400Regular",
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 30,
  },
  signupButton: {
    marginTop: 24,
    backgroundColor: "#CFE625",
  },
  socialSection: {
    marginBottom: 30,
  },
  orText: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
    fontFamily: "Montserrat_400Regular",
    fontSize: 14,
  },
  socialButtonsContainer: {
    gap: 12,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#333",
  },
  loginContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
  },
  loginLink: {
    color: "#CFE625",
    fontFamily: "Montserrat_600SemiBold",
  },
});