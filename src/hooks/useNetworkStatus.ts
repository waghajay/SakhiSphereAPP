import { useEffect, useState } from "react";

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);

  useEffect(() => {
    // Simple check - can be enhanced with actual API calls
    const checkConnection = async () => {
      try {
        // Try to fetch a small resource to check connectivity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("https://www.google.com/favicon.ico", {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        setIsConnected(true);
        setIsInternetReachable(response.ok);
      } catch (error) {
        setIsConnected(false);
        setIsInternetReachable(false);
      }
    };

    // Check immediately
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    isInternetReachable,
  };
}
