import { supabase, testSupabaseConnection } from "../config/supabase";

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
  // Test connection dengan retry mechanism
  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    const maxRetries = 3;
    let lastError = "";

    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await testSupabaseConnection();
        if (result.success) {
          return result;
        }
        lastError = result.error || "Unknown error";

        if (i < maxRetries - 1) {
          console.log(
            `🔄 Retry attempt ${i + 1}/${maxRetries} in 2 seconds...`
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Network error";
        if (i < maxRetries - 1) {
          console.log(
            `🔄 Retry attempt ${i + 1}/${maxRetries} in 2 seconds...`
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    return {
      success: false,
      error: `Connection failed after ${maxRetries} attempts: ${lastError}`,
    };
  }

  // Login function dengan better error handling
  static async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Test connection first
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        return {
          success: false,
          error: `Cannot connect to Supabase: ${connectionTest.error}`,
        };
      }

      console.log("🔐 Attempting login for:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("❌ Login error:", error.message);
        return {
          success: false,
          error: this.getFriendlyErrorMessage(error.message),
        };
      }

      if (data.user) {
        // Fetch profile data with timeout
        const { data: profile, error: profileError } = (await Promise.race([
          supabase.from("profiles").select("*").eq("id", data.user.id).single(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Profile fetch timeout")), 10000)
          ),
        ])) as any;

        if (profileError && profileError.code !== "PGRST116") {
          console.warn("⚠️ Profile fetch warning:", profileError.message);
        }

        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          name: profile?.name || data.user.email?.split("@")[0],
          phone: profile?.phone,
          location: profile?.location,
        };

        console.log("✅ Login successful for:", data.user.email);
        return { success: true, user };
      }

      return { success: false, error: "Login failed - no user data received" };
    } catch (error) {
      console.error("❌ Login error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? this.getFriendlyErrorMessage(error.message)
            : "An unexpected error occurred during login",
      };
    }
  }

  // Signup function dengan better error handling
  static async signup(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Test connection first
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        return {
          success: false,
          error: `Cannot connect to Supabase: ${connectionTest.error}`,
        };
      }

      console.log("📝 Attempting signup for:", email);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("❌ Signup error:", error.message);
        return {
          success: false,
          error: this.getFriendlyErrorMessage(error.message),
        };
      }

      if (data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.email?.split("@")[0],
        };

        console.log("✅ Signup successful for:", data.user.email);
        return { success: true, user };
      }

      return { success: false, error: "Signup failed - no user data received" };
    } catch (error) {
      console.error("❌ Signup error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? this.getFriendlyErrorMessage(error.message)
            : "An unexpected error occurred during signup",
      };
    }
  }

  // Logout function
  static async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("❌ Logout error:", error.message);
        return { success: false, error: error.message };
      }

      console.log("✅ Logout successful");
      return { success: true };
    } catch (error) {
      console.error("❌ Logout error:", error);
      return {
        success: false,
        error: "An unexpected error occurred during logout",
      };
    }
  }

  // Update profile function dengan better error handling
  static async updateProfile(
    userId: string,
    userData: User,
    options?: { email?: string; password?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Test connection first
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        return {
          success: false,
          error: `Cannot connect to Supabase: ${connectionTest.error}`,
        };
      }

      // 1. Update email in Supabase Auth (if changed)
      if (options?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: options.email,
        });

        if (emailError) {
          console.error("❌ Update email error:", emailError.message);
          return { success: false, error: emailError.message };
        }
      }

      // 2. Update password in Supabase Auth (if provided)
      if (options?.password && options.password !== "••••••••") {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: options.password,
        });

        if (passwordError) {
          console.error("❌ Update password error:", passwordError.message);
          return { success: false, error: passwordError.message };
        }
      }

      // 3. Update profile in database dengan upsert
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        name: userData.name,
        phone: userData.phone,
        location: userData.location,
        email: options?.email || userData.email,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("❌ Update profile error:", error.message);
        return { success: false, error: error.message };
      }

      console.log("✅ Profile updated successfully");
      return { success: true };
    } catch (error) {
      console.error("❌ Update profile error:", error);
      return {
        success: false,
        error: "An unexpected error occurred while updating profile",
      };
    }
  }

  // Get current session dengan timeout
  static async getCurrentSession(): Promise<{ user?: User; error?: string }> {
    try {
      const {
        data: { session },
        error,
      } = (await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Session timeout")), 10000)
        ),
      ])) as any;

      if (error) {
        console.log("⚠️ Session error:", error.message);
        return { error: error.message };
      }

      if (session?.user) {
        // Fetch profile data dengan timeout
        const { data: profile, error: profileError } = (await Promise.race([
          supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Profile timeout")), 10000)
          ),
        ])) as any;

        if (profileError && profileError.code !== "PGRST116") {
          console.log("⚠️ Profile fetch error:", profileError.message);
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
      console.log("❌ Error getting current session:", error);
      return {
        error: error instanceof Error ? error.message : "Session error",
      };
    }
  }

  // Helper function untuk error messages yang user-friendly
  private static getFriendlyErrorMessage(errorMessage: string): string {
    const errorMap: { [key: string]: string } = {
      "Invalid login credentials": "Email atau password salah",
      "User already registered": "Email sudah terdaftar",
      "Password should be at least 6 characters": "Password minimal 6 karakter",
      "Unable to validate email address: invalid format":
        "Format email tidak valid",
      "Network request failed":
        "Gagal terhubung ke server. Periksa koneksi internet Anda",
      "fetch is not defined": "Masalah jaringan. Coba restart aplikasi",
      timeout: "Koneksi timeout. Coba lagi dalam beberapa saat",
    };

    // Check for partial matches
    for (const [key, value] of Object.entries(errorMap)) {
      if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    return errorMessage;
  }
}
