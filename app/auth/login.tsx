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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { Input, Button } from "../../components/FormComponents";
import { supabase } from "../../config/supabase";
import { useFonts } from "expo-font";
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
} from "@expo-google-fonts/montserrat";
import PrivacyConsentPopup from "@/components/PrivacyConsentPopup";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConsentPopup, setShowConsentPopup] = useState(false);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Silakan isi semua field");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert("Login Gagal", error.message);
        setIsLoading(false);
        return;
      }

      console.log("Login berhasil:", data);

      const consentGiven = await AsyncStorage.getItem("@privacyConsentGiven");
      console.log("Consent Status from Storage:", consentGiven);

      if (consentGiven === "true") {
        console.log("Consent already given, navigating to home.");
        router.replace("/"); // Langsung ke halaman utama (index)
      } else {
        console.log("Consent not given, showing popup.");
        setShowConsentPopup(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Terjadi kesalahan saat login");
      setIsLoading(false);
    }
  };

  const handleAgreeToPrivacy = async () => {
    console.log("Agree button pressed in popup.");
    try {
      setIsLoading(true);

      // ✅ STEP 1: Simpan consent ke AsyncStorage
      await AsyncStorage.setItem("@privacyConsentGiven", "true");
      console.log("Consent status saved to storage.");

      // ✅ STEP 2: Tutup popup dulu
      setShowConsentPopup(false);

      // ✅ STEP 3: Tunggu sebentar untuk memastikan state update
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log("Navigating to home after consent.");

      // ✅ STEP 4: Navigate ke home
      router.replace("/");
    } catch (error) {
      console.error("Error saving consent or navigating:", error);
      Alert.alert("Error", "Gagal menyimpan persetujuan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    Alert.alert("Info", "Google login akan segera tersedia");
  };

  const handleFacebookLogin = async () => {
    Alert.alert("Info", "Facebook login akan segera tersedia");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header - Style dikembalikan ke semula */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Login User</Text>
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
              source={require("../../assets/images/logo.png")} // Pastikan path ini benar
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
              editable={!(isLoading || showConsentPopup)}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Password"
              editable={!(isLoading || showConsentPopup)}
            />

            <Button
              title="Login"
              onPress={handleLogin}
              isLoading={isLoading}
              style={styles.loginButton}
              disabled={isLoading || showConsentPopup}
            />
          </View>

          {/* Social Login Section */}
          <View style={styles.socialSection}>
            <Text style={styles.orText}>atau lanjutkan dengan</Text>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleLogin}
                disabled={isLoading || showConsentPopup}
              >
                <FontAwesome name="google" size={22} color="#DB4437" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleFacebookLogin}
                disabled={isLoading || showConsentPopup}
              >
                <FontAwesome name="facebook" size={22} color="#1877F2" />
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Signup Link */}
          <View style={styles.signupContainer}>
            <TouchableOpacity
              onPress={() => router.push("/auth/signup")} // Pastikan path ini benar
              disabled={isLoading || showConsentPopup}
            >
              <Text style={styles.signupText}>
                Belum punya akun?{" "}
                <Text style={styles.signupLink}>Daftar di sini</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Render Popup Consent di sini */}
      <PrivacyConsentPopup
        visible={showConsentPopup}
        onAgree={handleAgreeToPrivacy}
        onClose={() => {
          setShowConsentPopup(false);
        }}
        isProcessing={isLoading}
      />
    </SafeAreaView>
  );
}

// Styles dikembalikan untuk header
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between", // Kembali ke space-between jika ada ikon lain
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    // borderBottomWidth: 1, // Hapus garis bawah
    // borderBottomColor: "#eee", // Hapus garis bawah
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    flex: 1, // Biarkan flex agar rata kiri jika hanya ada judul
    // textAlign: "center", // Hapus rata tengah
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
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: "#CFE625",
    marginTop: 24,
  },
  socialSection: {
    marginBottom: 30,
  },
  orText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  socialButtonsContainer: {
    gap: 12,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  socialButtonText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#333",
    marginLeft: 12,
  },
  signupContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  signupText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Montserrat_400Regular",
    textAlign: "center",
  },
  signupLink: {
    color: "#CFE625",
    fontFamily: "Montserrat_600SemiBold",
  },
});
