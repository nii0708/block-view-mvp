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
import { useAuth } from "../services/AuthService";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { Input, Button } from "../components/FormComponents";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email, password);

      if (success) {
        router.replace("/profile");
      } else {
        Alert.alert("Login Failed", "Invalid email or password");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Mock Google login for demo
    login("nadhif@gmail.com", "password123").then((success) => {
      if (success) {
        router.replace("/profile");
      }
    });
  };

  const handleFacebookLogin = () => {
    // Mock Facebook login for demo
    login("nadhif@gmail.com", "password123").then((success) => {
      if (success) {
        router.replace("/profile");
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Login User</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push("/")}
        >
          <MaterialIcons name="home" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>
              Beyond the ground in{"\n"}the palm of your hand
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Password"
            />

            <Button
              title="Login"
              onPress={handleLogin}
              isLoading={isLoading}
              style={styles.loginButton}
            />
          </View>

          <Text style={styles.orText}>or continue with</Text>

          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleGoogleLogin}
            >
              <FontAwesome name="google" size={22} color="#DB4437" />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={handleFacebookLogin}
            >
              <FontAwesome name="facebook" size={22} color="#1877F2" />
              <Text style={styles.socialButtonText}>Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signupContainer}>
            <TouchableOpacity onPress={() => router.push("/signup")}>
              <Text style={styles.signupText}>
                Don't have an account? Sign up
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />
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
  },
  homeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  logo: {
    width: 300,
    height: 60,
  },
  tagline: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginTop: 8,
    fontFamily: "Montserrat_400Regular",
  },
  formContainer: {
    marginVertical: 20,
  },
  loginButton: {
    marginTop: 24,
  },
  orText: {
    textAlign: "center",
    color: "#555",
    marginVertical: 20,
    fontFamily: "Montserrat_400Regular",
  },
  socialButtonsContainer: {
    flexDirection: "column",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 10,
  },
  socialButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  signupContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  signupText: {
    fontSize: 16,
    color: "#0066CC",
    fontFamily: "Montserrat_400Regular",
  },
  divider: {
    height: 5,
    width: 60,
    backgroundColor: "#ddd",
    alignSelf: "center",
    borderRadius: 5,
  },
});
