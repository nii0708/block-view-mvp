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
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (
    userData: User,
    options?: { email?: string; password?: string }
  ) => Promise<boolean>;
  loading: boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check login status
  useEffect(() => {
    const initializeAuth = async () => {
      // Test connection first
      await AuthService.testConnection();

      // Check current session
      const { user: currentUser } = await AuthService.getCurrentSession();
      if (currentUser) {
        setUser(currentUser);
      }

      setLoading(false);
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      if (event === "SIGNED_IN" && session?.user) {
        const { user: updatedUser } = await AuthService.getCurrentSession();
        if (updatedUser) {
          setUser(updatedUser);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Login wrapper
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { success, user: loggedInUser } = await AuthService.login(
        email,
        password
      );
      if (success && loggedInUser) {
        setUser(loggedInUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login wrapper error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Signup wrapper
  const signup = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { success, user: newUser } = await AuthService.signup(
        email,
        password
      );
      if (success && newUser) {
        setUser(newUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Signup wrapper error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout wrapper
  const logout = async () => {
    setLoading(true);
    try {
      const { success } = await AuthService.logout();
      if (success) {
        setUser(null);
      }
    } catch (error) {
      console.error("Logout wrapper error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update profile wrapper
  const updateUserProfile = async (
    userData: User,
    options?: { email?: string; password?: string }
  ): Promise<boolean> => {
    if (!user?.id) {
      console.error("No user ID found");
      return false;
    }

    setLoading(true);
    try {
      const { success } = await AuthService.updateProfile(
        user.id,
        userData,
        options
      );
      if (success) {
        // Update local state
        setUser({
          ...user,
          ...userData,
          email: options?.email || userData.email,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Update profile wrapper error:", error);
      return false;
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
