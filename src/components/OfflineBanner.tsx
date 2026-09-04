import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { StyleSheet, Text, View } from "react-native";

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();

  // Hide banner for now since we don't have reliable network detection
  if (isConnected) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.text}>No Internet Connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F59E0B",
  },
  icon: {
    fontSize: 16,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    color: "#92400E",
  },
});
