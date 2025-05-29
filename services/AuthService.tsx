import { supabase } from "../config/supabase";

// Types
export interface User {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  location?: string;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  location?: string;
  email?: string;
  password?: string;
}

// Authentication Service Functions
export class AuthService {
  // Login function
  static async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Login error:", error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Fetch profile data
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          name: profile?.name || data.user.email?.split("@")[0],
          phone: profile?.phone,
          location: profile?.location,
        };

        console.log("Login successful for:", data.user.email);
        return { success: true, user };
      }

      return { success: false, error: "Login failed" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  // Signup function
  static async signup(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Signup error:", error.message);
        return { success: false, error: error.message };
      }

      if (data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.email?.split("@")[0],
        };

        console.log("Signup successful for:", data.user.email);
        return { success: true, user };
      }

      return { success: false, error: "Signup failed" };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  // Logout function
  static async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error.message);
        return { success: false, error: error.message };
      }

      console.log("Logout successful");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  // Update profile function
  static async updateProfile(
    userId: string,
    userData: User,
    options?: { email?: string; password?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Update email in Supabase Auth (if changed)
      if (options?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: options.email,
        });

        if (emailError) {
          console.error("Update email error:", emailError.message);
          return { success: false, error: emailError.message };
        }
      }

      // 2. Update password in Supabase Auth (if provided)
      if (options?.password && options.password !== "••••••••") {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: options.password,
        });

        if (passwordError) {
          console.error("Update password error:", passwordError.message);
          return { success: false, error: passwordError.message };
        }
      }

      // 3. Update profile in database
      const { error } = await supabase
        .from("profiles")
        .update({
          name: userData.name,
          phone: userData.phone,
          location: userData.location,
          email: options?.email || userData.email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("Update profile error:", error.message);
        return { success: false, error: error.message };
      }

      console.log("Profile updated successfully");
      return { success: true };
    } catch (error) {
      console.error("Update profile error:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  }

  // Get current session
  static async getCurrentSession(): Promise<{ user?: User; error?: string }> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.log("Session error:", error.message);
        return { error: error.message };
      }

      if (session?.user) {
        // Fetch profile data
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.log("Profile fetch error:", profileError.message);
        }

        const user: User = {
          id: session.user.id,
          email: session.user.email!,
          name: profile?.name || session.user.email?.split("@")[0],
          phone: profile?.phone,
          location: profile?.location,
        };

        return { user };
      }

      return {};
    } catch (error) {
      console.log("Error getting current session:", error);
      return { error: "An unexpected error occurred" };
    }
  }

  // Test connection
  static async testConnection(): Promise<void> {
    try {
      console.log("Testing Supabase connection...");
      const { data, error } = await supabase
        .from("profiles")
        .select("count")
        .limit(1);
      console.log("Connection test result:", { data, error });
    } catch (err) {
      console.log("Connection test failed:", err);
    }
  }
}
