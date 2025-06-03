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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { MaterialIcons } from "@expo/vector-icons";
import { Input, Button } from "../../components/FormComponents";
import PhoneInput from "../../components/PhoneInput";
import { UpdateProfileData, UpdateProfileOptions } from "@/services/AuthService";

export default function BiodataScreen() {
  const { user, updateUserProfile, loading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+62");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [location, setLocation] = useState("");
  const [password, setPassword] = useState("••••••••");

  // Validation states
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Handle redirect and populate form
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
      return;
    }

    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setLocation(user.location || "");
      setCountryCode(user.country_code || "+62");
      setPhoneNumber(user.phone_number || "");
      setFullPhone(user.phone || "");
    }
  }, [user, loading, router]);

  // Validation functions
  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue.trim()) {
      setEmailError("Email wajib diisi");
      return false;
    }
    if (!emailRegex.test(emailValue)) {
      setEmailError("Format email tidak valid");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (passwordValue: string): boolean => {
    if (
      passwordValue !== "••••••••" &&
      passwordValue.length > 0 &&
      passwordValue.length < 6
    ) {
      setPasswordError("Password minimal 6 karakter");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handlePhoneChange = (
    fullNumber: string,
    code: string,
    numberOnly: string
  ) => {
    setFullPhone(fullNumber);
    setCountryCode(code);
    setPhoneNumber(numberOnly);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    // Validate form first
    if (!name.trim()) {
      Alert.alert("Error", "Nama wajib diisi");
      return;
    }

    // Check what actually changed
    const nameChanged = name.trim() !== user.name;
    const locationChanged = location.trim() !== user.location;
    const phoneChanged =
      phoneNumber !== user.phone_number || countryCode !== user.country_code;
    const emailChanged = email !== user.email;
    const passwordChanged = password !== "••••••••" && password.length > 0;

    console.log("🔄 Changes detected:", {
      nameChanged,
      locationChanged,
      phoneChanged,
      emailChanged,
      passwordChanged,
    });

    // Validate only if fields are changing
    if (emailChanged && !validateEmail(email)) {
      Alert.alert("Error", "Format email tidak valid");
      return;
    }

    if (passwordChanged && !validatePassword(password)) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }

    // Check if anything actually changed
    if (
      !nameChanged &&
      !locationChanged &&
      !phoneChanged &&
      !emailChanged &&
      !passwordChanged
    ) {
      Alert.alert("Info", "Tidak ada perubahan yang perlu disimpan");
      return;
    }

    setIsLoading(true);

    try {
      // Prepare update data using your existing interface
      const updateData: UpdateProfileData = {};

      // Only include changed fields
      if (nameChanged) {
        updateData.name = name.trim();
      }

      if (locationChanged) {
        updateData.location = location.trim();
      }

      if (phoneChanged) {
        updateData.country_code = countryCode;
        updateData.phone_number = phoneNumber;
      }

      // Prepare auth options
      const authOptions: UpdateProfileOptions = {};

      if (emailChanged) {
        authOptions.email = email.trim();
      }

      if (passwordChanged) {
        authOptions.password = password;
      }

      console.log("📝 Calling updateUserProfile with:", {
        updateData,
        authOptions,
      });

      // Call update profile with your existing interface
      const result = await updateUserProfile(updateData, authOptions);

      if (result.success) {
        // Create success message based on what was updated
        let successMessages: string[] = [];

        if (result.updatedFields?.includes("name")) {
          successMessages.push("✅ Nama berhasil diperbarui");
        }
        if (result.updatedFields?.includes("location")) {
          successMessages.push("✅ Lokasi berhasil diperbarui");
        }
        if (
          result.updatedFields?.includes("phone_number") ||
          result.updatedFields?.includes("country_code")
        ) {
          successMessages.push("✅ Nomor telepon berhasil diperbarui");
        }
        if (result.updatedFields?.includes("password")) {
          successMessages.push("✅ Password berhasil diperbarui");
          setPassword("••••••••"); // Reset password field
        }

        let alertMessage =
          successMessages.length > 0
            ? successMessages.join("\n")
            : "✅ Profil berhasil diperbarui";

        if (result.requiresEmailConfirmation) {
          alertMessage +=
            "\n\n📧 Email konfirmasi telah dikirim ke alamat email baru Anda. Silakan cek email untuk mengkonfirmasi perubahan email.";
        }

        Alert.alert("Berhasil! 🎉", alertMessage);
      } else {
        Alert.alert("Error", result.error || "Gagal memperbarui profil");
      }
    } catch (error) {
      console.error("❌ Update profile error:", error);
      Alert.alert("Error", "Terjadi kesalahan saat memperbarui profil");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // Don't render anything if no user (will redirect)
  if (!user) return null;

  // Take first letter of name (or email) for avatar
  const avatarText = (name || email || "U")[0].toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Biodata User</Text>
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
            {fullPhone && <Text style={styles.phoneText}>{fullPhone}</Text>}
          </View>

          <View style={styles.formContainer}>
            <Input
              label="Nama Lengkap"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="Masukkan nama lengkap"
            />

            <View style={styles.inputGroup}>
              <Input
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError("");
                }}
                keyboardType="email-address"
                placeholder="contoh@email.com"
                autoCapitalize="none"
              />
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
              {email !== user.email && (
                <Text style={styles.helpText}>
                  ⚠️ Mengubah email akan mengirim konfirmasi ke email baru
                </Text>
              )}
            </View>

            <PhoneInput
              label="Nomor Telepon"
              value={fullPhone}
              countryCode={countryCode}
              numberOnly={phoneNumber}
              onChangeText={handlePhoneChange}
            />

            <Input
              label="Lokasi"
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
              placeholder="Kota, Provinsi"
            />

            <View style={styles.inputGroup}>
              <Input
                label="Ubah Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError("");
                }}
                secureTextEntry
                style={styles.lastInput}
                placeholder="Masukkan password baru"
              />
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
              <Text style={styles.helpText}>
                Kosongkan jika tidak ingin mengubah password
              </Text>
            </View>

            <Button
              title="Perbarui Profil"
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    fontFamily: "Montserrat_400Regular",
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
    marginBottom: 2,
  },
  phoneText: {
    fontSize: 14,
    color: "#555",
    fontFamily: "Montserrat_400Regular",
  },
  formContainer: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: "#ff4444",
    marginTop: 4,
    fontFamily: "Montserrat_400Regular",
  },
  helpText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontFamily: "Montserrat_400Regular",
  },
  lastInput: {
    marginBottom: 0,
  },
  updateButton: {
    marginTop: 24,
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
