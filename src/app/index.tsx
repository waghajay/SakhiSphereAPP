import { getMe } from "@/services/api/auth";
import { getAuthToken } from "@/services/storage/token";
import type { User } from "@/types";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getAuthToken();

      if (token) {
        // Token exists, verify it's still valid
        try {
          // Try to fetch user profile with the token
          const user = await getMe(token);

          if (user) {
            // Token is valid, user is authenticated
            setIsAuthenticated(true);
            setUserData(user);
          } else {
            // Token invalid, clear it
            await removeAuthToken();
            setIsAuthenticated(false);
          }
        } catch (error) {
          // Token expired or invalid
          console.error("Token validation failed:", error);
          await removeAuthToken();
          setIsAuthenticated(false);
        }
      } else {
        // No token found
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking auth token:", error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading SakhiSphere...</Text>
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
});

// Import removeAuthToken
import { removeAuthToken } from "@/services/storage/token";
