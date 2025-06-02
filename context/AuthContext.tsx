import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "../config/supabase";
import { AuthService, User } from "../services/AuthService";

// Context interface
interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserProfile: (
    userData: User,
    options?: { email?: string; password?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
  connectionStatus: "connecting" | "connected" | "error";
  lastError: string | null;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "error"
  >("connecting");
  const [lastError, setLastError] = useState<string | null>(null);

  // Initialize and check login status
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setConnectionStatus("connecting");
        setLastError(null);

        console.log("🚀 Initializing auth...");

        // Test connection first dengan retry
        const connectionTest = await AuthService.testConnection();

        if (!connectionTest.success) {
          console.error(
            "❌ Failed to connect to Supabase:",
            connectionTest.error
          );
          setConnectionStatus("error");
          setLastError(connectionTest.error || "Connection failed");
          setLoading(false);
          return;
        }

        setConnectionStatus("connected");
        console.log("✅ Supabase connection established");

        // Check current session
        const { user: currentUser, error } =
          await AuthService.getCurrentSession();

        if (error) {
          console.warn("⚠️ Session check warning:", error);
          setLastError(error);
        }

        if (currentUser) {
          console.log("✅ Found existing session for:", currentUser.email);
          setUser(currentUser);
        } else {
          console.log("ℹ️ No existing session found");
        }
      } catch (error) {
        console.error("❌ Auth initialization error:", error);
        setConnectionStatus("error");
        setLastError(
          error instanceof Error ? error.message : "Initialization failed"
        );
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state changed:", event);

      try {
        if (event === "SIGNED_IN" && session?.user) {
          const { user: updatedUser, error } =
            await AuthService.getCurrentSession();
          if (updatedUser) {
            setUser(updatedUser);
            setLastError(null);
          } else if (error) {
            setLastError(error);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setLastError(null);
        } else if (event === "TOKEN_REFRESHED") {
          console.log("🔄 Token refreshed successfully");
        }
      } catch (error) {
        console.error("❌ Auth state change error:", error);
        setLastError(
          error instanceof Error ? error.message : "Auth state error"
        );
      }
    });

    return () => {
      console.log("🧹 Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, []);

  // Login wrapper dengan enhanced error handling
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setLastError(null);

    try {
      console.log("🔐 Login attempt for:", email);

      const result = await AuthService.login(email, password);

      if (result.success && result.user) {
        setUser(result.user);
        console.log("✅ Login successful");
        return { success: true };
      } else {
        const error = result.error || "Login failed";
        setLastError(error);
        console.error("❌ Login failed:", error);
        return { success: false, error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Login error";
      setLastError(errorMessage);
      console.error("❌ Login wrapper error:", error);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Signup wrapper dengan enhanced error handling
  const signup = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setLastError(null);

    try {
      console.log("📝 Signup attempt for:", email);

      const result = await AuthService.signup(email, password);

      if (result.success && result.user) {
        setUser(result.user);
        console.log("✅ Signup successful");
        return { success: true };
      } else {
        const error = result.error || "Signup failed";
        setLastError(error);
        console.error("❌ Signup failed:", error);
        return { success: false, error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Signup error";
      setLastError(errorMessage);
      console.error("❌ Signup wrapper error:", error);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout wrapper
  const logout = async (): Promise<void> => {
    setLoading(true);
    setLastError(null);

    try {
      console.log("🚪 Logout attempt");

      const { success, error } = await AuthService.logout();

      if (success) {
        setUser(null);
        console.log("✅ Logout successful");
      } else {
        setLastError(error || "Logout failed");
        console.error("❌ Logout failed:", error);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Logout error";
      setLastError(errorMessage);
      console.error("❌ Logout wrapper error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update profile wrapper
  const updateUserProfile = async (
    userData: User,
    options?: { email?: string; password?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      const error = "No user ID found";
      console.error("❌", error);
      setLastError(error);
      return { success: false, error };
    }

    setLoading(true);
    setLastError(null);

    try {
      console.log("📝 Profile update attempt");

      const result = await AuthService.updateProfile(
        user.id,
        userData,
        options
      );

      if (result.success) {
        // Update local state
        setUser({
          ...user,
          ...userData,
          email: options?.email || userData.email,
        });
        console.log("✅ Profile update successful");
        return { success: true };
      } else {
        const error = result.error || "Profile update failed";
        setLastError(error);
        console.error("❌ Profile update failed:", error);
        return { success: false, error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Profile update error";
      setLastError(errorMessage);
      console.error("❌ Update profile wrapper error:", error);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    isLoggedIn: !!user,
    login,
    signup,
    logout,
    updateUserProfile,
    loading,
    connectionStatus,
    lastError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
