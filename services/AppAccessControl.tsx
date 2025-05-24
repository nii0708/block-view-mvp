import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import * as FileSystem from "expo-file-system";
import { AppState, Platform } from "react-native";

interface AccessStatus {
  isBlocked: boolean;
  blockMessage: string;
}

interface AppAccessContextType {
  accessStatus: AccessStatus;
  checkingAccess: boolean;
}

const AppAccessContext = createContext<AppAccessContextType | undefined>(
  undefined,
);

export const useAppAccess = () => {
  const context = useContext(AppAccessContext);
  if (!context) {
    throw new Error("useAppAccess must be used within AppAccessProvider");
  }
  return context;
};

// Change this to your backend URL
const ACCESS_CHECK_URL =
  "https://api.allorigins.win/get?url=https://fawwazanvilen.github.io/minelite-viz-test-api/2025-05-25-test.json";

// 24 hours in milliseconds
const GRACE_PERIOD = 24 * 60 * 60 * 1000;
// const GRACE_PERIOD = 10;

// File to store last successful check
const ACCESS_CHECK_FILE = "last_access_check.json";

export const AppAccessProvider = ({ children }: { children: ReactNode }) => {
  const [accessStatus, setAccessStatus] = useState<AccessStatus>({
    isBlocked: false,
    blockMessage: "",
  });
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Skip access control on web - only works on mobile
  const isWebPlatform = Platform.OS === "web";

  const checkAccess = async () => {
    // if (isWebPlatform) {
    //   // On web, always allow access
    //   setAccessStatus({ isBlocked: false, blockMessage: "" });
    //   return;
    // }

    try {
      // Try to contact backend
      const response = await fetch(ACCESS_CHECK_URL, {
        method: "GET",
        // mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        const proxyData = await response.json();
        const data = JSON.parse(proxyData.contents); // Parse the contents from the proxy
        console.log(data);

        if (data.allowed) {
          // Backend says OK - save current time and allow access
          await saveLastSuccessfulCheck();
          setAccessStatus({ isBlocked: false, blockMessage: "" });
        } else {
          // Backend says no - block immediately with their message
          setAccessStatus({
            isBlocked: true,
            blockMessage: data.message || "Access has been revoked.",
          });
        }
      } else {
        // Backend error - check grace period
        await handleBackendError();
      }
    } catch (error) {
      console.log("Access check failed:", error);
      // Network error - check grace period
      await handleBackendError();
    }
  };

  const saveLastSuccessfulCheck = async () => {
    try {
      if (Platform.OS === "web") {
        // Use localStorage on web
        localStorage.setItem(
          ACCESS_CHECK_FILE,
          JSON.stringify({ timestamp: Date.now() }),
        );
      } else {
        // Use FileSystem on mobile
        const filePath = FileSystem.documentDirectory + ACCESS_CHECK_FILE;
        await FileSystem.writeAsStringAsync(
          filePath,
          JSON.stringify({ timestamp: Date.now() }),
        );
      }
    } catch (error) {
      console.warn("Failed to save access check:", error);
    }
  };

  const getLastSuccessfulCheck = async (): Promise<number | null> => {
    try {
      if (Platform.OS === "web") {
        // Use localStorage on web
        const data = localStorage.getItem(ACCESS_CHECK_FILE);
        if (data) {
          const parsed = JSON.parse(data);
          return parsed.timestamp || null;
        }
        return null;
      } else {
        // Use FileSystem on mobile
        const filePath = FileSystem.documentDirectory + ACCESS_CHECK_FILE;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(filePath);
          const data = JSON.parse(content);
          return data.timestamp || null;
        }
        return null;
      }
    } catch (error) {
      console.warn("Failed to read access check:", error);
      return null;
    }
  };

  const handleBackendError = async () => {
    const lastSuccessfulCheck = await getLastSuccessfulCheck();

    if (!lastSuccessfulCheck) {
      // Never had a successful check - but allow access anyway (optimistic approach)
      // Start the grace period from now
      await saveLastSuccessfulCheck();
      setAccessStatus({ isBlocked: false, blockMessage: "" });
      return;
    }

    const timeSinceLastCheck = Date.now() - lastSuccessfulCheck;

    if (timeSinceLastCheck > GRACE_PERIOD) {
      // Grace period expired
      setAccessStatus({
        isBlocked: true,
        blockMessage:
          "Access verification required. Please connect to internet and restart the app.",
      });
    } else {
      // Still within grace period - allow silently
      setAccessStatus({ isBlocked: false, blockMessage: "" });
    }
  };

  useEffect(() => {
    const performCheck = async () => {
      setCheckingAccess(true);
      await checkAccess();
      setCheckingAccess(false);
    };

    // Check on app start
    performCheck();

    // Check when app comes to foreground (when user switches back to app)
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active") {
        performCheck();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <AppAccessContext.Provider value={{ accessStatus, checkingAccess }}>
      {children}
    </AppAccessContext.Provider>
  );
};
