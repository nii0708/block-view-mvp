import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { MiningDataProvider } from "../context/MiningDataContext";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

SplashScreen.preventAutoHideAsync();

// Loading component
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0066CC" />
    </View>
  );
}

// ✨ FIXED: Privacy Consent Hook with Manual Refresh
function usePrivacyConsent() {
  const [hasConsent, setHasConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkConsent = async () => {
    try {
      const consent = await AsyncStorage.getItem("@privacyConsentGiven");
      const consentValue = consent === "true";
      setHasConsent(consentValue);
      console.log("🔍 Privacy consent check:", consentValue);
      return consentValue;
    } catch (error) {
      console.error("❌ Privacy consent check error:", error);
      setHasConsent(false);
      return false;
    }
  };

  useEffect(() => {
    const initialCheck = async () => {
      await checkConsent();
      setIsLoading(false);
    };
    initialCheck();
  }, []);

  // ✨ Return function untuk manual refresh
  return { hasConsent, isLoading, refreshConsent: checkConsent };
}

// Auth Guard Component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const {
    hasConsent,
    isLoading: consentLoading,
    refreshConsent,
  } = usePrivacyConsent(); // ✨ TAMBAH refreshConsent
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Check if we're in auth group
  const inAuthGroup = segments[0] === "auth";

  // ✨ TAMBAH: Listen untuk perubahan di AsyncStorage
  useEffect(() => {
    const checkForConsentChanges = async () => {
      if (!authLoading && !consentLoading && isNavigationReady) {
        // ✨ Refresh consent state sebelum decision
        const currentConsent = await refreshConsent();

        console.log("🔍 AuthGuard decision:", {
          isLoggedIn,
          hasConsent: currentConsent, // ✨ Gunakan current consent
          inAuthGroup,
          currentPath: `/${segments.join("/")}`,
        });

        // If not logged in and not in auth screens, redirect to login
        if (!isLoggedIn && !inAuthGroup) {
          console.log("🔒 Not logged in, redirecting to login");
          router.replace("/auth/login");
        }
        // ✨ MODIFIKASI: Gunakan currentConsent
        else if (isLoggedIn && inAuthGroup) {
          if (currentConsent) {
            console.log("✅ Logged in with consent, redirecting to home");
            router.replace("/");
          } else {
            console.log(
              "📋 Logged in but no consent, staying in login for privacy agreement"
            );
          }
        }
        // ✨ MODIFIKASI: Gunakan currentConsent
        else if (isLoggedIn && !inAuthGroup && !currentConsent) {
          console.log(
            "🔒 No consent, redirecting to login for privacy agreement"
          );
          router.replace("/auth/login");
        }
      }
    };

    checkForConsentChanges();
  }, [
    isLoggedIn,
    authLoading,
    consentLoading,
    hasConsent,
    inAuthGroup,
    isNavigationReady,
    segments, // ✨ TAMBAH segments dependency
  ]);

  // Set navigation ready after a small delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Show loading while checking auth OR consent
  if (authLoading || consentLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

// Main Layout Component
function RootLayoutNav() {
  const router = useRouter();
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);

  // Mark layout as ready after mount
  useEffect(() => {
    setIsLayoutReady(true);
  }, []);

  // Handle deep linking AFTER layout is ready
  useEffect(() => {
    if (!isLayoutReady) return;

    const handleDeepLink = (url: string) => {
      console.log("🔗 Deep link received:", url);

      try {
        const { hostname, path, queryParams } = Linking.parse(url);
        console.log("📋 Parsed URL:", { hostname, path, queryParams });

        // Handle email verification
        if (
          hostname === "auth" &&
          (path === "/confirm" || path === "/callback")
        ) {
          console.log("📧 Email verification detected - routing to confirm");

          const allParams = { ...queryParams };

          // Handle callback parameters
          if (path === "/callback" && url.includes("#")) {
            try {
              const hashPart = url.split("#")[1];
              const hashParams = new URLSearchParams(hashPart);

              const accessToken = hashParams.get("access_token");
              const refreshToken = hashParams.get("refresh_token");
              const tokenType = hashParams.get("token_type");
              const expiresIn = hashParams.get("expires_in");

              if (accessToken) {
                allParams.access_token = accessToken;
                if (refreshToken) allParams.refresh_token = refreshToken;
                if (tokenType) allParams.token_type = tokenType;
                if (expiresIn) allParams.expires_in = expiresIn;
                console.log("✅ Found auth tokens in hash");
              }
            } catch (hashError) {
              console.log("⚠️ Hash parsing error:", hashError);
            }
          }

          router.push({
            pathname: "/auth/confirm",
            params: allParams,
          });
        }
      } catch (error) {
        console.error("❌ Deep link parsing error:", error);
      }
    };

    // Process pending deep link if any
    if (pendingDeepLink) {
      handleDeepLink(pendingDeepLink);
      setPendingDeepLink(null);
    }

    // Handle URL when app is already running
    const subscription = Linking.addEventListener("url", ({ url }) => {
      console.log("📱 App running - URL received:", url);
      handleDeepLink(url);
    });

    // Handle URL when app is launched from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("🚀 App launched - Initial URL:", url);
        if (isLayoutReady) {
          handleDeepLink(url);
        } else {
          setPendingDeepLink(url);
        }
      }
    });

    return () => subscription?.remove();
  }, [router, isLayoutReady, pendingDeepLink]);

  return (
    <AuthGuard>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGuard>
  );
}

// Root Layout with Providers
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <MiningDataProvider>
        <RootLayoutNav />
      </MiningDataProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
