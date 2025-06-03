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

// Error types untuk kategorisasi error
export enum AuthErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_EXISTS = "USER_EXISTS",
  WEAK_PASSWORD = "WEAK_PASSWORD",
  INVALID_EMAIL = "INVALID_EMAIL",
  EMAIL_NOT_CONFIRMED = "EMAIL_NOT_CONFIRMED",
  CONNECTION_ERROR = "CONNECTION_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  originalError?: string;
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
  ): Promise<{
    success: boolean;
    user?: User;
    error?: string;
    errorType?: AuthErrorType;
  }> {
    try {
      // Test connection first
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        return {
          success: false,
          error: `Tidak dapat terhubung ke server: ${connectionTest.error}`,
          errorType: AuthErrorType.CONNECTION_ERROR,
        };
      }

      console.log("🔐 Attempting login for:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("❌ Login error:", error.message);
        const authError = this.parseAuthError(error.message);
        return {
          success: false,
          error: authError.message,
          errorType: authError.type,
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

      return {
        success: false,
        error: "Login gagal - tidak ada data user yang diterima",
        errorType: AuthErrorType.UNKNOWN_ERROR,
      };
    } catch (error) {
      console.error("❌ Login error:", error);
      const authError = this.parseAuthError(
        error instanceof Error ? error.message : "Unknown error"
      );
      return {
        success: false,
        error: authError.message,
        errorType: authError.type,
      };
    }
  }

  // Check if email already exists
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      console.log("🔍 Checking if email exists:", email);
      
      // Method 1: Use database function (lebih efisien)
      const { data, error } = await supabase
        .rpc('check_email_exists', { check_email: email.toLowerCase() });
      
      if (error) {
        console.error("❌ Error calling check_email_exists:", error);
        // Fallback to method 2
      } else if (data === true) {
        console.log("📧 Email found via RPC:", email);
        return true;
      }

      // Method 2: Check di profiles table directly
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      
      if (profile) {
        console.log("📧 Email found in profiles:", email);
        return true;
      }

      // Method 3: Try to sign in with a dummy password to check if user exists
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: 'dummy_password_to_check_existence_12345'
      });

      // Jika error adalah "Invalid login credentials" berarti user ada
      if (signInError && signInError.message.toLowerCase().includes('invalid login credentials')) {
        console.log("📧 Email exists (confirmed via auth):", email);
        return true;
      }

      console.log("✅ Email is available:", email);
      return false;
    } catch (error) {
      console.error("❌ Error checking email:", error);
      return false;
    }
  }

  // Signup function dengan better error handling
  static async signup(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    user?: User;
    error?: string;
    errorType?: AuthErrorType;
  }> {
    try {
      // Test connection first
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        return {
          success: false,
          error: `Tidak dapat terhubung ke server: ${connectionTest.error}`,
          errorType: AuthErrorType.CONNECTION_ERROR,
        };
      }

      console.log("📝 Attempting signup for:", email);

      // Check if email already exists first
      const emailExists = await this.checkEmailExists(email);
      if (emailExists) {
        console.log("❌ Email already registered:", email);
        return {
          success: false,
          error: "Email sudah terdaftar. Silakan gunakan email lain atau login.",
          errorType: AuthErrorType.USER_EXISTS,
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("❌ Signup error:", error.message);
        console.error("❌ Full error object:", error); // Log full error untuk debugging
        const authError = this.parseAuthError(error.message);
        return {
          success: false,
          error: authError.message,
          errorType: authError.type,
        };
      }

      if (data.user) {
        // Profile akan dibuat otomatis oleh trigger, tidak perlu insert manual
        console.log("✅ User created, profile will be created by trigger");
        
        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.email?.split("@")[0],
        };

        console.log("✅ Signup successful for:", data.user.email);
        return { success: true, user };
      }

      return {
        success: false,
        error: "Pendaftaran gagal - tidak ada data user yang diterima",
        errorType: AuthErrorType.UNKNOWN_ERROR,
      };
    } catch (error) {
      console.error("❌ Signup error:", error);
      const authError = this.parseAuthError(
        error instanceof Error ? error.message : "Unknown error"
      );
      return {
        success: false,
        error: authError.message,
        errorType: authError.type,
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
        error: "Terjadi kesalahan saat logout",
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
          error: `Tidak dapat terhubung ke server: ${connectionTest.error}`,
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
        error: "Terjadi kesalahan saat memperbarui profil",
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

  // Enhanced error parsing dengan kategori yang lebih spesifik
  private static parseAuthError(errorMessage: string): AuthError {
    const lowerMessage = errorMessage.toLowerCase();

    // Network dan connection errors
    if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
      return {
        type: AuthErrorType.NETWORK_ERROR,
        message:
          "Masalah koneksi internet. Periksa koneksi Anda dan coba lagi.",
        originalError: errorMessage,
      };
    }

    if (lowerMessage.includes("timeout")) {
      return {
        type: AuthErrorType.TIMEOUT_ERROR,
        message: "Koneksi timeout. Silakan coba lagi.",
        originalError: errorMessage,
      };
    }

    // Auth specific errors
    if (
      lowerMessage.includes("invalid login credentials") ||
      lowerMessage.includes("invalid email or password")
    ) {
      return {
        type: AuthErrorType.INVALID_CREDENTIALS,
        message: "Email atau password salah. Silakan periksa kembali.",
        originalError: errorMessage,
      };
    }

    // UPDATED: Menambahkan lebih banyak variasi pesan error untuk email yang sudah terdaftar
    if (
      lowerMessage.includes("user already registered") ||
      lowerMessage.includes("email address is already registered") ||
      lowerMessage.includes("duplicate key value") ||
      lowerMessage.includes("already been registered") ||
      lowerMessage.includes("email already exists") ||
      lowerMessage.includes("user with this email") ||
      lowerMessage.includes("already exists")
    ) {
      return {
        type: AuthErrorType.USER_EXISTS,
        message:
          "Email sudah terdaftar. Silakan gunakan email lain atau login.",
        originalError: errorMessage,
      };
    }

    if (lowerMessage.includes("password should be at least")) {
      return {
        type: AuthErrorType.WEAK_PASSWORD,
        message: "Password minimal 6 karakter.",
        originalError: errorMessage,
      };
    }

    if (
      lowerMessage.includes("invalid email") ||
      lowerMessage.includes("unable to validate email")
    ) {
      return {
        type: AuthErrorType.INVALID_EMAIL,
        message: "Format email tidak valid.",
        originalError: errorMessage,
      };
    }

    if (
      lowerMessage.includes("email not confirmed") ||
      lowerMessage.includes("please confirm your email")
    ) {
      return {
        type: AuthErrorType.EMAIL_NOT_CONFIRMED,
        message:
          "Email belum dikonfirmasi. Periksa email Anda untuk link konfirmasi.",
        originalError: errorMessage,
      };
    }

    // Default error - tampilkan pesan asli untuk debugging
    console.log("⚠️ Unhandled error message:", errorMessage);
    return {
      type: AuthErrorType.UNKNOWN_ERROR,
      message: errorMessage,
      originalError: errorMessage,
    };
  }

  // Helper function untuk error messages yang user-friendly (deprecated, gunakan parseAuthError)
  private static getFriendlyErrorMessage(errorMessage: string): string {
    const authError = this.parseAuthError(errorMessage);
    return authError.message;
  }
}