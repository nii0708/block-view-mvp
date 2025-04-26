import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../services/AuthService";
import { MaterialIcons } from "@expo/vector-icons";
import { Input, Button } from "../components/FormComponents";

export default function BiodataScreen() {
  const { user, updateUserProfile } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("••••••••");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setLocation(user.location || "");
    } else {
      // Redirect to login if not logged in
      router.replace("/login");
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    if (!name.trim() || !email.trim()) {
      Alert.alert("Error", "Name and email are required");
      return;
    }

    setIsLoading(true);

    try {
      const success = await updateUserProfile({
        ...user,
        name,
        email,
        phone,
        location,
      });

      if (success) {
        Alert.alert("Success", "Profile updated successfully");
      } else {
        Alert.alert("Error", "Failed to update profile");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while updating profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  // Take first letter of name (or email) for avatar
  const avatarText = (name || email || "U")[0].toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Biodata user</Text>
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
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{avatarText}</Text>
            </View>
            <Text style={styles.nameText}>
              {user.name || user.email.split("@")[0]}
            </Text>
            <Text style={styles.emailText}>{user.email}</Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <View style={styles.phoneContainer}>
              <Text style={styles.label}>Phone number</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.countryCode}>
                  <MaterialIcons name="flag" size={20} color="#555" />
                  <Text style={styles.countryCodeText}>+62</Text>
                  <MaterialIcons
                    name="arrow-drop-down"
                    size={20}
                    color="#555"
                  />
                </View>
                <View style={styles.phoneInput}>
                  <Input
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    style={{ marginBottom: 0 }}
                  />
                </View>
              </View>
            </View>

            <Input
              label="Location"
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
            />

            <Input
              label="Change password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.lastInput}
            />

            <Button
              title="Update profile"
              onPress={handleUpdateProfile}
              isLoading={isLoading}
              style={styles.updateButton}
            />
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
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#333",
    fontFamily: "Montserrat_700Bold",
  },
  nameText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    fontFamily: "Montserrat_600SemiBold",
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: "#555",
    fontFamily: "Montserrat_400Regular",
  },
  formContainer: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  phoneContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: "#000",
    marginBottom: 8,
    fontFamily: "Montserrat_400Regular",
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
  },
  countryCodeText: {
    marginHorizontal: 8,
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
  },
  phoneInput: {
    flex: 1,
  },
  lastInput: {
    marginBottom: 24,
  },
  updateButton: {
    marginTop: 16,
    marginBottom: 30,
  },
  divider: {
    height: 5,
    width: 60,
    backgroundColor: "#ddd",
    alignSelf: "center",
    borderRadius: 5,
    marginTop: 20,
    marginBottom: 30,
  },
});
