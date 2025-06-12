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

// Privacy Consent Hook
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

  return { hasConsent, isLoading, refreshConsent: checkConsent };
}

// ✅ NEW APPROACH: AuthRedirect Hook - runs INSIDE navigator
function useAuthRedirect() {
  const router = useRouter();
  const segments = useSegments();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const {
    hasConsent,
    isLoading: consentLoading,
    refreshConsent,
  } = usePrivacyConsent();
  const [hasRedirected, setHasRedirected] = useState(false);

  const inAuthGroup = segments[0] === "auth";

  useEffect(() => {
    const performRedirect = async () => {
      // Don't redirect if still loading or already redirected
      if (authLoading || consentLoading || hasRedirected) {
        return;
      }

      try {
        const currentConsent = await refreshConsent();

        console.log("🔍 Auth redirect check:", {
          isLoggedIn,
          hasConsent: currentConsent,
          inAuthGroup,
          currentPath: `/${segments.join("/")}`,
        });

        // Add delay to ensure navigation is fully ready
        setTimeout(() => {
          let shouldRedirect = false;
          let redirectPath = "";

          if (!isLoggedIn && !inAuthGroup) {
            shouldRedirect = true;
            redirectPath = "/auth/login";
            console.log("🔒 Not logged in, redirecting to login");
          } else if (isLoggedIn && inAuthGroup && currentConsent) {
            shouldRedirect = true;
            redirectPath = "/";
            console.log("✅ Logged in with consent, redirecting to home");
          } else if (isLoggedIn && !inAuthGroup && !currentConsent) {
            shouldRedirect = true;
            redirectPath = "/auth/login";
            console.log(
              "🔒 No consent, redirecting to login for privacy agreement"
            );
          }

          if (shouldRedirect) {
            setHasRedirected(true);
            router.replace({ pathname: redirectPath as typeof router.replace.arguments[0]["pathname"] });
          }
        }, 200); // Increased delay to ensure Stack is fully mounted
      } catch (error) {
        console.error("❌ Auth redirect error:", error);
      }
    };

    performRedirect();
  }, [
    authLoading,
    consentLoading,
    isLoggedIn,
    hasConsent,
    inAuthGroup,
    segments,
  ]);

  // Return loading state
  return authLoading || consentLoading;
}

// Main Layout Component
function RootLayoutNav() {
  const router = useRouter();
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);

  // ✅ Use auth redirect hook INSIDE the navigator
  const isAuthLoading = useAuthRedirect();

  // Mark layout as ready after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLayoutReady(true);
    }, 100);
    return () => clearTimeout(timer);
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

  // ✅ Show loading screen while auth is being processed
  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
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
