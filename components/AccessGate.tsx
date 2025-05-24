import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Platform } from "react-native";
import { useAppAccess } from "../services/AppAccessControl";

interface AccessGateProps {
  children: React.ReactNode;
}

export const AccessGate: React.FC<AccessGateProps> = ({ children }) => {
  const { accessStatus, checkingAccess } = useAppAccess();

  // Show normal app while checking (no loading screen)
  if (checkingAccess) {
    return <>{children}</>;
  }

  // Only block when explicitly blocked
  if (accessStatus.isBlocked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.messageContainer}>
          <Text style={styles.message}>{accessStatus.blockMessage}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Normal app
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  messageContainer: {
    backgroundColor: "white",
    padding: 30,
    borderRadius: 12,
    // Use boxShadow for web, shadowColor for native
    ...Platform.select({
      web: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.25)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      },
    }),
  },
  message: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    lineHeight: 24,
  },
});
