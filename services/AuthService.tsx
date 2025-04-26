import * as FileSystem from "expo-file-system";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// Tipe data untuk user
export interface User {
  email: string;
  name?: string;
  phone?: string;
  location?: string;
}

// Interface untuk context auth
interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (userData: User) => Promise<boolean>;
  loading: boolean;
}

// Nama file untuk menyimpan data user
const USER_STORAGE_KEY = "user_data.json";
const AUTH_STORAGE_KEY = "auth_data.json";

// Membuat context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook untuk menggunakan auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Cek status login saat aplikasi dimulai
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const authFilePath = FileSystem.documentDirectory + AUTH_STORAGE_KEY;
        const userFilePath = FileSystem.documentDirectory + USER_STORAGE_KEY;

        // Cek jika file auth ada
        const authInfo = await FileSystem.getInfoAsync(authFilePath);

        if (authInfo.exists) {
          // Baca data user jika sudah login
          try {
            const userData = await FileSystem.readAsStringAsync(userFilePath);
            setUser(JSON.parse(userData));
          } catch (error) {
            console.log("Error reading user data:", error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.log("Error checking login status:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  // Fungsi login
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);

      // Mock authentication - dalam aplikasi nyata harus validasi dengan server
      // Untuk demo, kita anggap password apapun benar selama email tidak kosong
      if (!email) {
        return false;
      }

      // Simulasi delay network
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Simpan status login
      const authFilePath = FileSystem.documentDirectory + AUTH_STORAGE_KEY;
      await FileSystem.writeAsStringAsync(
        authFilePath,
        JSON.stringify({ isLoggedIn: true })
      );

      // Buat data user mock
      const userData: User = {
        email: email,
        name: email.split("@")[0],
      };

      // Simpan data user
      const userFilePath = FileSystem.documentDirectory + USER_STORAGE_KEY;
      await FileSystem.writeAsStringAsync(
        userFilePath,
        JSON.stringify(userData)
      );

      setUser(userData);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fungsi signup
  const signup = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);

      // Mock signup - di aplikasi nyata harus registrasi dengan server
      if (!email) {
        return false;
      }

      // Simulasi delay network
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Simpan status login
      const authFilePath = FileSystem.documentDirectory + AUTH_STORAGE_KEY;
      await FileSystem.writeAsStringAsync(
        authFilePath,
        JSON.stringify({ isLoggedIn: true })
      );

      // Buat data user mock
      const userData: User = {
        email: email,
        name: email.split("@")[0],
      };

      // Simpan data user
      const userFilePath = FileSystem.documentDirectory + USER_STORAGE_KEY;
      await FileSystem.writeAsStringAsync(
        userFilePath,
        JSON.stringify(userData)
      );

      setUser(userData);
      return true;
    } catch (error) {
      console.error("Signup error:", error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Fungsi logout
  const logout = async () => {
    try {
      setLoading(true);

      // Hapus data auth
      const authFilePath = FileSystem.documentDirectory + AUTH_STORAGE_KEY;
      const authInfo = await FileSystem.getInfoAsync(authFilePath);

      if (authInfo.exists) {
        await FileSystem.deleteAsync(authFilePath);
      }

      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi update profil
  const updateUserProfile = async (userData: User): Promise<boolean> => {
    try {
      setLoading(true);

      if (!user) {
        return false;
      }

      // Update user data
      const updatedUser = { ...user, ...userData };

      // Simpan data user yang diupdate
      const userFilePath = FileSystem.documentDirectory + USER_STORAGE_KEY;
      await FileSystem.writeAsStringAsync(
        userFilePath,
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);
      return true;
    } catch (error) {
      console.error("Update profile error:", error);
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
