import { Stack } from "expo-router";
import { useEffect } from "react";
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "../services/AuthService";
import { MiningDataProvider } from "../context/MiningDataContext";
import { AppAccessProvider } from "../services/AppAccessControl";
import { AccessGate } from "../components/AccessGate";

SplashScreen.preventAutoHideAsync();

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
    <AppAccessProvider>
      <AccessGate>
        <AuthProvider>
          <MiningDataProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </MiningDataProvider>
        </AuthProvider>
      </AccessGate>
    </AppAccessProvider>
  );
}
