import { supabase, testSupabaseConnection } from "../config/supabase";

// Types
export interface User {
  id?: string;
  email: string;
  name?: string;
  phone?: string; // Full phone with country code
  phone_number?: string; // Phone number only
  country_code?: string; // Country code only
  location?: string;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  phone_number?: string;
  country_code?: string;
  location?: string;
  email?: string;
  password?: string;
}

// Enhanced update profile options
export interface UpdateProfileOptions {
  email?: string;
  password?: string;
  sendEmailConfirmation?: boolean; // Control email confirmation
  emailTemplate?: "default" | "custom"; // Choose email template
}

// Result interfaces
export interface UpdateProfileResult {
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
  requiresPasswordReset?: boolean;
  updatedFields?: string[];
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
  PHONE_INVALID = "PHONE_INVALID",
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
          phone:
            profile?.country_code && profile?.phone_number
              ? `${profile.country_code}${profile.phone_number}`
              : profile?.phone,
          phone_number: profile?.phone_number,
          country_code: profile?.country_code || "+62",
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

  // Check if email already exists - FIXED VERSION
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      console.log("🔍 Checking if email exists:", email);

      // Method 1: Use database function (RECOMMENDED)
      try {
        const { data, error } = await supabase.rpc("check_email_exists", {
          email_input: email.toLowerCase().trim(),
        });

        if (!error && typeof data === "boolean") {
          if (data === true) {
            console.log("📧 Email found via RPC:", email);
            return true;
          } else {
            console.log("✅ Email available via RPC:", email);
            return false;
          }
        } else {
          console.warn(
            "⚠️ RPC method failed, falling back to profiles check:",
            error
          );
        }
      } catch (rpcError) {
        console.warn("⚠️ RPC error, using fallback:", rpcError);
      }

      // Method 2: Check di profiles table directly (FALLBACK)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (profileError) {
        console.warn("⚠️ Profile check error:", profileError);
        return false;
      }

      if (profile) {
        console.log("📧 Email found in profiles:", email);
        return true;
      }

      console.log("✅ Email is available:", email);
      return false;
    } catch (error) {
      console.error("❌ Error checking email:", error);
      return false;
    }
  }

  // Signup function dengan better error handling - FIXED VERSION
  static async signup(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    user?: User;
    error?: string;
    errorType?: AuthErrorType;
    needsEmailConfirmation?: boolean;
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
          error:
            "Email sudah terdaftar. Silakan gunakan email lain atau login.",
          errorType: AuthErrorType.USER_EXISTS,
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("❌ Signup error:", error.message);
        console.error("❌ Full error object:", error);
        const authError = this.parseAuthError(error.message);
        return {
          success: false,
          error: authError.message,
          errorType: authError.type,
        };
      }

      if (data.user) {
        console.log("✅ User created, email confirmation required");

        // ✅ FIXED: Jangan return user object sebelum email confirmed
        // Cek apakah user sudah confirmed atau belum
        if (data.user.email_confirmed_at) {
          // Jika sudah confirmed (jarang terjadi di signup)
          const user: User = {
            id: data.user.id,
            email: data.user.email!,
            name: data.user.email?.split("@")[0],
            country_code: "+62",
          };

          console.log(
            "✅ Signup successful and confirmed for:",
            data.user.email
          );
          return { success: true, user };
        } else {
          // ✅ EXPECTED CASE: User perlu konfirmasi email
          console.log("📧 Email confirmation required for:", data.user.email);
          return {
            success: true,
            needsEmailConfirmation: true,
          };
        }
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

  // SIMPLIFIED Update Profile function
  static async updateProfile(
    userId: string,
    currentUser: User,
    profileData: UpdateProfileData,
    authOptions?: UpdateProfileOptions
  ): Promise<UpdateProfileResult> {
    try {
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        return {
          success: false,
          error: `Tidak dapat terhubung ke server: ${connectionTest.error}`,
        };
      }

      console.log("📝 Profile update attempt for user:", userId);
      console.log("📝 Profile data:", profileData);
      console.log("📝 Auth options:", authOptions);

      const updatedFields: string[] = [];
      let requiresEmailConfirmation = false;

      // 1. Handle Email Update FIRST (Supabase Auth)
      if (authOptions?.email && authOptions.email !== currentUser.email) {
        try {
          console.log(
            "📧 Updating email from",
            currentUser.email,
            "to",
            authOptions.email
          );

          const { error: emailError } = await supabase.auth.updateUser({
            email: authOptions.email,
          });

          if (emailError) {
            console.error("❌ Update email error:", emailError.message);
            return {
              success: false,
              error: `Gagal update email: ${emailError.message}`,
            };
          }

          updatedFields.push("email");
          requiresEmailConfirmation = true;
          console.log("✅ Email update initiated, confirmation required");
        } catch (error) {
          console.error("❌ Email update error:", error);
          return {
            success: false,
            error: "Gagal mengupdate email",
          };
        }
      }

      // 2. Handle Password Update (Supabase Auth)
      if (
        authOptions?.password &&
        authOptions.password !== "••••••••" &&
        authOptions.password.length > 0
      ) {
        try {
          console.log("🔐 Updating password");

          if (authOptions.password.length < 6) {
            return {
              success: false,
              error: "Password minimal 6 karakter",
            };
          }

          const { error: passwordError } = await supabase.auth.updateUser({
            password: authOptions.password,
          });

          if (passwordError) {
            console.error("❌ Update password error:", passwordError.message);
            return {
              success: false,
              error: `Gagal update password: ${passwordError.message}`,
            };
          }

          updatedFields.push("password");
          console.log("✅ Password updated successfully");
        } catch (error) {
          console.error("❌ Password update error:", error);
          return {
            success: false,
            error: "Gagal mengupdate password",
          };
        }
      }

      // 3. Check if there are any profile changes
      const hasProfileChanges =
        (profileData.name && profileData.name !== currentUser.name) ||
        (profileData.location &&
          profileData.location !== currentUser.location) ||
        (profileData.country_code &&
          profileData.country_code !== currentUser.country_code) ||
        (profileData.phone_number &&
          profileData.phone_number !== currentUser.phone_number);

      console.log("📝 Has profile changes:", hasProfileChanges);

      // 4. Update Profile Data (Database) - ONLY if there are profile changes
      if (hasProfileChanges) {
        try {
          console.log("📝 Updating profile data in database");

          // Method 1: Try using the database function (if available)
          try {
            const { data: updateResult, error: functionError } =
              await supabase.rpc("update_user_profile_simple", {
                p_user_id: userId,
                p_name: profileData.name || null,
                p_phone_number: profileData.phone_number || null,
                p_country_code: profileData.country_code || null,
                p_location: profileData.location || null,
              });

            if (functionError) {
              throw new Error("Function not available, using direct update");
            }

            console.log("✅ Profile updated using database function");

            // Add profile update success to fields
            if (profileData.name) updatedFields.push("name");
            if (profileData.location) updatedFields.push("location");
            if (profileData.country_code) updatedFields.push("country_code");
            if (profileData.phone_number) updatedFields.push("phone_number");
          } catch (functionError) {
            // Method 2: Fallback to direct table update
            console.log("📝 Using direct table update as fallback");

            const updateData: any = {
              updated_at: new Date().toISOString(),
            };

            // Only add fields that are changing
            if (profileData.name && profileData.name !== currentUser.name) {
              updateData.name = profileData.name;
              updatedFields.push("name");
            }
            if (
              profileData.location &&
              profileData.location !== currentUser.location
            ) {
              updateData.location = profileData.location;
              updatedFields.push("location");
            }
            if (
              profileData.country_code &&
              profileData.country_code !== currentUser.country_code
            ) {
              updateData.country_code = profileData.country_code;
              updatedFields.push("country_code");
            }
            if (
              profileData.phone_number &&
              profileData.phone_number !== currentUser.phone_number
            ) {
              updateData.phone_number = profileData.phone_number;
              updatedFields.push("phone_number");
            }

            const { error: profileError } = await supabase
              .from("profiles")
              .update(updateData)
              .eq("id", userId);

            if (profileError) {
              console.error("❌ Update profile error:", profileError.message);
              return {
                success: false,
                error: `Gagal update profil: ${profileError.message}`,
              };
            }

            console.log("✅ Profile updated using direct table update");
          }
        } catch (error) {
          console.error("❌ Profile database update error:", error);
          return {
            success: false,
            error: "Gagal menyimpan perubahan profil",
          };
        }
      }

      // 5. Check if anything was actually updated
      if (updatedFields.length === 0 && !hasProfileChanges) {
        return {
          success: false,
          error: "Tidak ada perubahan yang perlu disimpan",
        };
      }

      console.log("✅ Update successful, fields updated:", updatedFields);

      return {
        success: true,
        requiresEmailConfirmation,
        updatedFields,
      };
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
          phone:
            profile?.country_code && profile?.phone_number
              ? `${profile.country_code}${profile.phone_number}`
              : profile?.phone,
          phone_number: profile?.phone_number,
          country_code: profile?.country_code || "+62",
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
}
