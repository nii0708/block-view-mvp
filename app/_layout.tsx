import { Stack } from "expo-router";
import { useEffect } from "react";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { MiningDataProvider } from "../context/MiningDataContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
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

  // Handle deep linking
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      console.log("🔗 Deep link received:", url);

      try {
        const { hostname, path, queryParams } = Linking.parse(url);
        console.log("📋 Parsed URL:", { hostname, path, queryParams });

        // 🔥 FIX: Handle both /confirm and /callback for email verification
        if (
          hostname === "auth" &&
          (path === "/confirm" || path === "/callback")
        ) {
          console.log("📧 Email verification detected - routing to confirm");

          // Extract all possible parameters
          const allParams = { ...queryParams };

          // If this is a callback from Supabase, check for URL fragments
          if (path === "/callback") {
            console.log("🔄 Callback detected, checking for additional params");

            // Sometimes Supabase puts params in URL fragments after verification
            try {
              const fullUrl = url;
              console.log("🔍 Full URL:", fullUrl);

              // Check if there are hash parameters (after #)
              if (fullUrl.includes("#")) {
                const hashPart = fullUrl.split("#")[1];
                const hashParams = new URLSearchParams(hashPart);

                // Extract common auth parameters
                const accessToken = hashParams.get("access_token");
                const refreshToken = hashParams.get("refresh_token");
                const tokenType = hashParams.get("token_type");
                const expiresIn = hashParams.get("expires_in");

                if (accessToken) {
                  allParams.access_token = accessToken;
                  if (refreshToken !== null) {
                    allParams.refresh_token = refreshToken;
                  }
                  if (tokenType !== null) {
                    allParams.token_type = tokenType;
                  }
                  if (expiresIn !== null) {
                    allParams.expires_in = expiresIn;
                  }
                  console.log("✅ Found auth tokens in hash");
                }
              }
            } catch (hashError) {
              console.log("⚠️ Hash parsing error:", hashError);
            }
          }

          console.log("📤 Routing to confirm with params:", allParams);

          router.push({
            pathname: "/auth/confirm",
            params: allParams,
          });
        }
        // Handle other auth routes
        else {
          console.log("🏠 Default routing to login");
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("❌ Deep link parsing error:", error);
        // Fallback to login screen
        router.push("/auth/login");
      }
    };

    // Handle URL when app is already running
    const subscription = Linking.addEventListener("url", ({ url }) => {
      console.log("📱 App running - URL received:", url);
      handleDeepLink(url);
    });

    // Handle URL when app is launched from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("🚀 App launched - Initial URL:", url);
        // Add small delay to ensure app is ready
        setTimeout(() => {
          handleDeepLink(url);
        }, 100);
      }
    });

    return () => subscription?.remove();
  }, [router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <MiningDataProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </MiningDataProvider>
    </AuthProvider>
  );
}
