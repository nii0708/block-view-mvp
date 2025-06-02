import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Environment variables with fallback for debugging
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging untuk development
if (__DEV__) {
  console.log("🔍 Supabase Config Debug:");
  console.log(
    "EXPO_PUBLIC_SUPABASE_URL:",
    supabaseUrl ? "✅ Found" : "❌ Missing"
  );
  console.log(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY:",
    supabaseAnonKey ? "✅ Found" : "❌ Missing"
  );
}

// Validation dengan error yang lebih informatif
if (!supabaseUrl) {
  const error =
    "❌ EXPO_PUBLIC_SUPABASE_URL is missing. Check your .env file and eas.json configuration.";
  console.error(error);
  throw new Error(error);
}

if (!supabaseAnonKey) {
  const error =
    "❌ EXPO_PUBLIC_SUPABASE_ANON_KEY is missing. Check your .env file and eas.json configuration.";
  console.error(error);
  throw new Error(error);
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch {
  const error = `❌ Invalid SUPABASE_URL format: ${supabaseUrl}`;
  console.error(error);
  throw new Error(error);
}

// Create Supabase client with enhanced configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Tambahkan timeout untuk network requests
    storageKey: "mine-lite-auth",
  },
  // Tambahkan global configuration
  global: {
    headers: {
      "X-Client-Info": "mine-lite-expo-app",
    },
  },
  // Realtime configuration (opsional, bisa dimatikan jika tidak digunakan)
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

// Test connection function yang lebih robust
export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    console.log("🔌 Testing Supabase connection...");
    console.log("📍 URL:", supabaseUrl);

    const { data, error } = await supabase
      .from("profiles")
      .select("count")
      .limit(1);

    if (error) {
      console.error("❌ Connection test failed:", error.message);
      return { success: false, error: error.message };
    }

    console.log("✅ Supabase connection successful");
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ Connection test error:", errorMessage);
    return { success: false, error: errorMessage };
  }
};

// Types untuk database
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
