import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
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
