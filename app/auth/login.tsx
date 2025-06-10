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
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Session } from "@supabase/supabase-js";

// Required for Expo AuthSession
WebBrowser.maybeCompleteAuthSession();

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

  const checkConsentAndNavigate = async () => {
    const consentGiven = await AsyncStorage.getItem("@privacyConsentGiven");

    if (consentGiven === "true") {
      console.log("Consent already given, navigating to home.");
      router.replace("/");
    } else {
      console.log("Consent not given, showing popup.");
      setShowConsentPopup(true);
      setIsLoading(false);
    }
  };

  // Listen for auth state changes
  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.email);

      if (event === "SIGNED_IN" && session) {
        console.log("✅ User signed in automatically via auth listener");
        setIsLoading(false);
        await checkConsentAndNavigate();
      } else if (event === "SIGNED_OUT") {
        console.log("❌ User signed out");
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

      await checkConsentAndNavigate();
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

      await AsyncStorage.setItem("@privacyConsentGiven", "true");
      console.log("Consent status saved to storage.");

      setShowConsentPopup(false);
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log("Navigating to home after consent.");
      router.replace("/");
    } catch (error) {
      console.error("Error saving consent or navigating:", error);
      Alert.alert("Error", "Gagal menyimpan persetujuan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);

    try {
      console.log("🚀 Starting Google OAuth...");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            "https://rtxqxaeehpstfxsiibxc.supabase.co/auth/v1/callback",
        },
      });

      if (error) {
        console.error("❌ Supabase OAuth error:", error);
        Alert.alert("Login Gagal", error.message);
        setIsLoading(false);
        return;
      }

      if (data?.url) {
        console.log("🌐 Opening OAuth URL in browser");

        // Show instruction before opening browser
        Alert.alert(
          "Login Google",
          "Browser akan terbuka. Setelah login berhasil, kembali ke aplikasi ini dan tekan 'Cek Status Login'",
          [
            {
              text: "Batal",
              style: "cancel",
              onPress: () => setIsLoading(false),
            },
            {
              text: "Lanjutkan",
              onPress: async () => {
                await WebBrowser.openBrowserAsync(data.url);
                setIsLoading(false);
              },
            },
          ]
        );
      } else {
        console.error("❌ No OAuth URL received");
        Alert.alert("Login Gagal", "Tidak dapat memulai login Google");
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("❌ Google login error:", error);
      Alert.alert("Login Gagal", "Terjadi kesalahan saat login dengan Google");
      setIsLoading(false);
    }
  };

  const checkLoginStatus = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("❌ Error checking session:", error);
        Alert.alert("Error", "Gagal memeriksa status login");
        setIsLoading(false);
        return;
      }

      if (session) {
        console.log("✅ User is logged in!", session.user.email);
        Alert.alert("Berhasil!", "Login Google berhasil!");
        await checkConsentAndNavigate();
      } else {
        console.log("❌ No session found");
        Alert.alert(
          "Belum Login",
          "Silakan selesaikan login di browser terlebih dahulu"
        );
        setIsLoading(false);
      }
    } catch (error) {
      console.error("❌ Error checking login status:", error);
      Alert.alert("Error", "Terjadi kesalahan saat memeriksa status login");
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    Alert.alert("Info", "Facebook login akan segera tersedia");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
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

          {/* Signup Link */}
          <View style={styles.signupContainer}>
            <TouchableOpacity
              onPress={() => router.push("/auth/signup")}
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

      {/* Privacy Consent Popup */}
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
  instructionText: {
    fontSize: 12,
    fontFamily: "Montserrat_400Regular",
    color: "#888",
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 8,
    lineHeight: 18,
  },
});
