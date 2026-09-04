import { StyleSheet, Text, View } from "react-native";

interface NotificationBadgeProps {
  count: number;
  size?: number;
}

export function NotificationBadge({
  count,
  size = 16,
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <View
      style={[
        styles.badge,
        {
          minWidth: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.6 }]}>
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
