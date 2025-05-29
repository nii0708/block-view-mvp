import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// 🔥 MULTIPLE FALLBACK SOURCES untuk environment variables
const getEnvVar = (key: string): string => {
  // 1. Try process.env first (development)
  let value = process.env[key];

  // 2. Try Constants.expoConfig.extra (production build)
  if (!value && Constants.expoConfig?.extra) {
    const extraKey = key.replace("EXPO_PUBLIC_", "").toLowerCase();
    if (extraKey === "supabase_url") {
      value = Constants.expoConfig.extra.supabaseUrl;
    } else if (extraKey === "supabase_anon_key") {
      value = Constants.expoConfig.extra.supabaseAnonKey;
    }
  }

  // 3. Try Constants.manifest.extra (fallback)
  if (!value && Constants.manifest?.extra) {
    const extraKey = key.replace("EXPO_PUBLIC_", "").toLowerCase();
    if (extraKey === "supabase_url") {
      value = Constants.manifest.extra.supabaseUrl;
    } else if (extraKey === "supabase_anon_key") {
      value = Constants.manifest.extra.supabaseAnonKey;
    }
  }

  return value || "";
};

const supabaseUrl = getEnvVar("EXPO_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnvVar("EXPO_PUBLIC_SUPABASE_ANON_KEY");

// 🚨 DEBUG LOGGING - Hapus di production
console.log("🔧 Supabase Config Debug:");
console.log("URL exists:", !!supabaseUrl);
console.log("Key exists:", !!supabaseAnonKey);
console.log("URL length:", supabaseUrl.length);
console.log("Key length:", supabaseAnonKey.length);
console.log("Constants.expoConfig:", !!Constants.expoConfig);
console.log("Constants.manifest:", !!Constants.manifest);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing Supabase environment variables:");
  console.error("URL:", supabaseUrl ? "✅" : "❌");
  console.error("Key:", supabaseAnonKey ? "✅" : "❌");
  throw new Error(
    `Missing Supabase environment variables: URL=${!!supabaseUrl}, KEY=${!!supabaseAnonKey}`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
