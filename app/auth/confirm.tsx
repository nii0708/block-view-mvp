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
  const { token_hash, type } = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        if (!token_hash || !type) {
          setError("Invalid confirmation link");
          setIsLoading(false);
          return;
        }

        console.log("Confirming email with:", { token_hash, type });

        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token_hash as string,
          type: type as any,
        });

        if (error) {
          console.error("Confirmation error:", error);
          setError(error.message);
        } else {
          console.log("Email confirmed successfully:", data);
          setIsSuccess(true);

          // Auto redirect to login after 3 seconds
          setTimeout(() => {
            router.replace("/auth/login");
          }, 3000);
        }
      } catch (err) {
        console.error("Confirmation catch error:", err);
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [token_hash, type, router]);

  const handleContinue = () => {
    if (isSuccess) {
      router.replace("/auth/login");
    } else {
      router.replace("/auth/signup");
    }
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
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.statusTitle}>Confirming your email...</Text>
            <Text style={styles.statusText}>Please wait a moment</Text>
          </View>
        )}

        {/* Success State */}
        {!isLoading && isSuccess && (
          <View style={styles.statusContainer}>
            <View style={styles.successIcon}>
              <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
            </View>
            <Text style={styles.statusTitle}>Email Confirmed! 🎉</Text>
            <Text style={styles.statusText}>
              Your account has been successfully verified.{"\n"}
              You can now sign in to your account.
            </Text>
            <Text style={styles.redirectText}>
              Redirecting to login in 3 seconds...
            </Text>
          </View>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <View style={styles.statusContainer}>
            <View style={styles.errorIcon}>
              <MaterialIcons name="error-outline" size={64} color="#f44336" />
            </View>
            <Text style={styles.statusTitle}>Confirmation Failed</Text>
            <Text style={styles.statusText}>{error}</Text>
            <Text style={styles.helpText}>
              The link may have expired or already been used.{"\n"}
              Please try signing up again.
            </Text>
          </View>
        )}

        {/* Action Button */}
        {!isLoading && (
          <View style={styles.buttonContainer}>
            <Button
              title={isSuccess ? "Continue to Login" : "Back to Signup"}
              onPress={handleContinue}
              style={[
                styles.actionButton,
                isSuccess ? styles.successButton : styles.errorButton,
              ]}
            />
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
    color: "#84fab0",
    textAlign: "center",
    marginTop: 8,
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
  },
  successButton: {
    backgroundColor: "#4CAF50",
  },
  errorButton: {
    backgroundColor: "#667eea",
  },
});
