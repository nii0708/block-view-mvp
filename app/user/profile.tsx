import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { MaterialIcons, Feather } from "@expo/vector-icons";

export default function ProfileScreen() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  // ✅ BENAR: Handle redirect di useEffect
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

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
  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            await logout();
            router.replace("/auth/login");
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Take first letter of email (or name if available) for avatar
  const avatarText = (user.name || user.email || "U")[0].toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Profile</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push("/")}
        >
          <MaterialIcons name="home" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{avatarText}</Text>
        </View>
        <Text style={styles.emailText}>{user.email}</Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/user/biodata")}
        >
          <View style={styles.menuIcon}>
            <MaterialIcons name="person" size={24} color="#333" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>My profile</Text>
            <Text style={styles.menuSubtitle}>update your profile</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#777" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIcon}>
            <MaterialIcons name="card-membership" size={24} color="#333" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Subscribe</Text>
            <Text style={styles.menuSubtitle}>
              get full access with promos!
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#777" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <View style={styles.menuIcon}>
            <MaterialIcons name="logout" size={24} color="#333" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Logout</Text>
            <Text style={styles.menuSubtitle}>are you sure?</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#777" />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionTitle}>
        <Text style={styles.sectionText}>More</Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIcon}>
            <Feather name="help-circle" size={24} color="#333" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Help & Support</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#777" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIcon}>
            <Feather name="info" size={24} color="#333" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>About Us</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#777" />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />
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
  profileSection: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
  emailText: {
    fontSize: 16,
    color: "#333",
    fontFamily: "Montserrat_400Regular",
  },
  menuContainer: {
    marginTop: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  menuIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    color: "#333",
    fontFamily: "Montserrat_600SemiBold",
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#777",
    fontFamily: "Montserrat_400Regular",
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f9f9f9",
  },
  sectionText: {
    fontSize: 16,
    color: "#555",
    fontFamily: "Montserrat_600SemiBold",
  },
  divider: {
    height: 5,
    width: 60,
    backgroundColor: "#ddd",
    alignSelf: "center",
    borderRadius: 5,
    marginTop: 30,
  },
});
