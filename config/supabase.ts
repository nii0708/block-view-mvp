import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Safe environment variable access with multiple fallbacks
const getEnvVar = (key: string): string => {
  try {
    // 1. Try process.env first (development)
    if (process.env[key]) {
      return process.env[key];
    }

    // 2. Try Constants (only if available)
    try {
      const Constants = require("expo-constants");
      if (Constants?.expoConfig?.extra) {
        const extraKey = key.replace("EXPO_PUBLIC_", "").toLowerCase();
        if (
          extraKey === "supabase_url" &&
          Constants.expoConfig.extra.supabaseUrl
        ) {
          return Constants.expoConfig.extra.supabaseUrl;
        }
        if (
          extraKey === "supabase_anon_key" &&
          Constants.expoConfig.extra.supabaseAnonKey
        ) {
          return Constants.expoConfig.extra.supabaseAnonKey;
        }
      }
    } catch (constantsError) {
      console.warn("Constants not available:", (constantsError as Error).message);
    }

    return "";
  } catch (error) {
    console.warn(`Error accessing ${key}:`, error);
    return "";
  }
};

// Get environment variables with safe fallbacks
let supabaseUrl = "";
let supabaseAnonKey = "";

try {
  supabaseUrl = getEnvVar("EXPO_PUBLIC_SUPABASE_URL");
  supabaseAnonKey = getEnvVar("EXPO_PUBLIC_SUPABASE_ANON_KEY");
} catch (error) {
  console.error("Error loading environment variables:", error);
}

// 🚨 TEMPORARY FALLBACK - HAPUS SETELAH TESTING!
// Uncomment jika masih crash, ganti dengan values asli Anda:
// if (!supabaseUrl) {
//   supabaseUrl = 'YOUR_ACTUAL_SUPABASE_URL_HERE';
// }
// if (!supabaseAnonKey) {
//   supabaseAnonKey = 'YOUR_ACTUAL_SUPABASE_ANON_KEY_HERE';
// }

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase configuration missing:");
  console.error("URL:", supabaseUrl ? "✅ Found" : "❌ Missing");
  console.error("Key:", supabaseAnonKey ? "✅ Found" : "❌ Missing");

  // Don't throw error - let app start but log warning
  console.warn(
    "⚠️  Supabase will not work until environment variables are properly configured"
  );
}

// Create supabase client with safe configuration
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", // Safe fallback
  supabaseAnonKey || "placeholder-key", // Safe fallback
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Export helper function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "https://placeholder.supabase.co" &&
    supabaseAnonKey !== "placeholder-key"
  );
};

// Types for our database
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          phone: string | null;
          location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string;
          phone?: string;
          location?: string;
        };
        Update: {
          name?: string;
          phone?: string;
          location?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: string;
          payment_method: string | null;
          payment_id: string | null;
          status: string;
          subscription_type: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          amount: number;
          currency?: string;
          payment_method?: string;
          payment_id?: string;
          status?: string;
          subscription_type?: string;
          expires_at?: string;
        };
      };
      app_access: {
        Row: {
          id: string;
          is_allowed: boolean;
          message: string;
          created_at: string;
        };
      };
    };
  };
}
