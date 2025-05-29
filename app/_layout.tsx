// app/_layout.tsx
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
      console.log("Deep link received:", url);
      const { hostname, path, queryParams } = Linking.parse(url);

      if (hostname === "auth" && path === "/confirm") {
        // Handle email confirmation
        router.push({
          pathname: "/auth/confirm",
          params: queryParams || undefined,
        });
      } else if (hostname === "auth" && path === "/callback") {
        // Handle other auth callbacks
        router.push("/auth/login");
      }
    };

    // Handle URL when app is already running
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    // Handle URL when app is launched from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
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
