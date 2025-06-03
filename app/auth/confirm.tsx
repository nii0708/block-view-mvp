import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../config/supabase";
import { Button } from "../../components/FormComponents";
import { MaterialIcons } from "@expo/vector-icons";

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        console.log("🔍 Confirmation params:", params);

        // Extract parameters from different possible sources
        const token_hash =
          params.token_hash || params.token || params.access_token;
        const type = params.type || "signup";

        // For deep links, parameters come directly from params
        const accessToken = Array.isArray(params.access_token)
          ? params.access_token[0]
          : params.access_token;
        const refreshToken = Array.isArray(params.refresh_token)
          ? params.refresh_token[0]
          : params.refresh_token;

        console.log("🔑 Extracted tokens:", { token_hash, type, accessToken });

        if (!token_hash && !accessToken) {
          setError("Link konfirmasi tidak valid atau sudah kedaluwarsa");
          setIsLoading(false);
          return;
        }

        // Method 1: Try with token_hash (traditional method)
        if (token_hash) {
          console.log("📧 Confirming with token_hash...");

          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token_hash as string,
            type: type as any,
          });

          if (error) {
            console.error("❌ OTP verification error:", error);

            // Try alternative method if OTP fails
            if (accessToken && refreshToken) {
              console.log("🔄 Trying session method...");
              await trySessionMethod(accessToken, refreshToken);
            } else {
              throw error;
            }
          } else {
            console.log("✅ OTP verification successful:", data);
            setIsSuccess(true);
          }
        }
        // Method 2: Try with access token (alternative method)
        else if (accessToken && refreshToken) {
          console.log("🔑 Confirming with access token...");
          await trySessionMethod(accessToken, refreshToken);
        }
      } catch (err: any) {
        console.error("❌ Confirmation error:", err);

        // Provide user-friendly error messages
        if (err.message?.includes("expired")) {
          setError(
            "Link konfirmasi sudah kedaluwarsa. Silakan minta link baru."
          );
        } else if (err.message?.includes("invalid")) {
          setError(
            "Link konfirmasi tidak valid. Periksa email Anda atau minta link baru."
          );
        } else if (err.message?.includes("already")) {
          setError("Email sudah dikonfirmasi sebelumnya. Silakan login.");
        } else {
          setError(`Gagal mengkonfirmasi email: ${err.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    const trySessionMethod = async (
      accessToken: string,
      refreshToken: string
    ) => {
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          throw error;
        }

        console.log("✅ Session confirmation successful:", data);
        setIsSuccess(true);
      } catch (err) {
        console.error("❌ Session method failed:", err);
        throw err;
      }
    };

    handleEmailConfirmation();
  }, [params]);

  // Countdown for auto redirect
  useEffect(() => {
    if (isSuccess && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (isSuccess && countdown === 0) {
      router.replace("/auth/login");
    }
  }, [isSuccess, countdown, router]);

  const handleContinue = () => {
    if (isSuccess) {
      router.replace("/auth/login");
    } else {
      router.replace("/auth/signup");
    }
  };

  const handleResendEmail = () => {
    router.push("/auth/signup");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        {/* Logo */}
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

        {/* Loading State */}
        {isLoading && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#CFE625" />
            <Text style={styles.statusTitle}>Mengkonfirmasi email...</Text>
            <Text style={styles.statusText}>Mohon tunggu sebentar</Text>
          </View>
        )}

        {/* Success State */}
        {!isLoading && isSuccess && (
          <View style={styles.statusContainer}>
            <View style={styles.successIcon}>
              <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
            </View>
            <Text style={styles.statusTitle}>Email Terkonfirmasi! 🎉</Text>
            <Text style={styles.statusText}>
              Akun Anda telah berhasil diverifikasi.{"\n"}
              Sekarang Anda dapat masuk ke akun Mine.Lite Anda.
            </Text>
            <Text style={styles.redirectText}>
              Mengarahkan ke login dalam {countdown} detik...
            </Text>
          </View>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <View style={styles.statusContainer}>
            <View style={styles.errorIcon}>
              <MaterialIcons name="error-outline" size={64} color="#f44336" />
            </View>
            <Text style={styles.statusTitle}>Konfirmasi Gagal</Text>
            <Text style={styles.statusText}>{error}</Text>

            {error.includes("kedaluwarsa") || error.includes("expired") ? (
              <Text style={styles.helpText}>
                Link mungkin sudah kedaluwarsa.{"\n"}
                Silakan daftar ulang untuk mendapat link baru.
              </Text>
            ) : error.includes("sudah dikonfirmasi") ||
              error.includes("already") ? (
              <Text style={styles.helpText}>
                Email Anda sudah dikonfirmasi sebelumnya.{"\n"}
                Silakan langsung login ke akun Anda.
              </Text>
            ) : (
              <Text style={styles.helpText}>
                Periksa kembali link dari email Anda{"\n"}
                atau minta link konfirmasi baru.
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {!isLoading && (
          <View style={styles.buttonContainer}>
            <Button
              title={isSuccess ? "Lanjut ke Login" : "Kembali ke Pendaftaran"}
              onPress={handleContinue}
              style={[
                styles.actionButton,
                isSuccess ? styles.successButton : styles.primaryButton,
              ]}
            />

            {/* Additional button for error cases */}
            {error && (
              <Button
                title={
                  error.includes("sudah dikonfirmasi")
                    ? "Login Sekarang"
                    : "Daftar Ulang"
                }
                onPress={() =>
                  router.replace(
                    error.includes("sudah dikonfirmasi")
                      ? "/auth/login"
                      : "/auth/signup"
                  )
                }
                style={[styles.actionButton, styles.secondaryButton]}
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 300,
    height: 60,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  successIcon: {
    marginBottom: 20,
  },
  errorIcon: {
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 24,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  statusText: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 12,
  },
  redirectText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#CFE625",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "600",
  },
  helpText: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  buttonContainer: {
    width: "100%",
  },
  actionButton: {
    width: "100%",
    marginBottom: 12,
  },
  successButton: {
    backgroundColor: "#4CAF50",
  },
  primaryButton: {
    backgroundColor: "#CFE625",
  },
  secondaryButton: {
    backgroundColor: "#667eea",
  },
});
