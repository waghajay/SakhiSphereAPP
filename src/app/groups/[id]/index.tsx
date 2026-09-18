import {
  getGroup,
  joinGroup,
  leaveGroup,
  type Group,
} from "@/services/api/groups";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = parseInt(id || "0", 10);

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadGroup = async () => {
    try {
      const data = await getGroup(groupId);
      setGroup(data);
    } catch (error) {
      console.error("Failed to load group:", error);
      Alert.alert("Error", "Failed to load group");
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroup();
    }, [groupId]),
  );

  const handleJoin = async () => {
    if (!group) return;
    setActionLoading(true);
    try {
      await joinGroup(groupId);
      await loadGroup();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to join group");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = () => {
    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await leaveGroup(groupId);
            await loadGroup();
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to leave group");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (!group) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {group.name}
        </Text>
        {group.myRole === "owner" || group.myRole === "admin" ? (
          <TouchableOpacity
            onPress={() => router.push(`/groups/${groupId}/settings` as any)}
            hitSlop={8}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadGroup();
            }}
          />
        }
      >
        {group.coverUrl ? (
          <Image source={{ uri: group.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Text style={styles.coverFallbackText}>
              {group.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Text style={styles.privacyIcon}>
              {group.privacy === "private"
                ? "🔒"
                : group.privacy === "invite_only"
                  ? "✉️"
                  : "🌍"}
            </Text>
          </View>

          {group.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{group.category}</Text>
            </View>
          )}

          {group.description && (
            <Text style={styles.description}>{group.description}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{group.memberCount}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{group.postCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>

          {group.owner && (
            <TouchableOpacity
              style={styles.ownerRow}
              onPress={() => router.push(`/user/${group.owner!.id}` as any)}
            >
              <Text style={styles.ownerLabel}>Created by</Text>
              <View style={styles.ownerInfo}>
                {group.owner.avatarUrl ? (
                  <Image
                    source={{ uri: group.owner.avatarUrl }}
                    style={styles.ownerAvatar}
                  />
                ) : (
                  <View style={styles.ownerAvatarFallback}>
                    <Text style={styles.ownerAvatarText}>
                      {group.owner.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.ownerName}>{group.owner.name}</Text>
                {group.owner.isVerified && (
                  <Text style={styles.verifiedBadge}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          )}

          {!group.isMember ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                actionLoading && styles.actionButtonDisabled,
              ]}
              onPress={handleJoin}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Join Group</Text>
              )}
            </TouchableOpacity>
          ) : group.myRole !== "owner" ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonSecondary,
                actionLoading && styles.actionButtonDisabled,
              ]}
              onPress={handleLeave}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <Text style={styles.actionButtonTextSecondary}>
                  Leave Group
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>👑 You own this group</Text>
            </View>
          )}
        </View>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push(`/groups/${groupId}/members` as any)}
          >
            <Text style={styles.menuIcon}>👥</Text>
            <Text style={styles.menuLabel}>Members</Text>
            <Text style={styles.menuValue}>{group.memberCount}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push(`/groups/${groupId}/discussions` as any)}
          >
            <Text style={styles.menuIcon}>💬</Text>
            <Text style={styles.menuLabel}>Discussions</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {(group.myRole === "owner" || group.myRole === "admin") && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push(`/groups/${groupId}/settings` as any)}
            >
              <Text style={styles.menuIcon}>⚙️</Text>
              <Text style={styles.menuLabel}>Group Settings</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backText: { fontSize: 22, color: "#7C3AED", fontWeight: "600" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  settingsIcon: { fontSize: 20 },
  content: { paddingBottom: 40 },
  cover: { width: "100%", height: 180, backgroundColor: "#E5E7EB" },
  coverFallback: {
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  coverFallbackText: { fontSize: 64, fontWeight: "700", color: "#7C3AED" },
  infoCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  groupName: { fontSize: 22, fontWeight: "800", color: "#111827", flex: 1 },
  privacyIcon: { fontSize: 18 },
  categoryTag: {
    alignSelf: "flex-start",
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryTagText: { fontSize: 11, fontWeight: "700", color: "#7C3AED" },
  description: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 40,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: "#111827" },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 2,
  },
  ownerRow: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginBottom: 16,
  },
  ownerLabel: { fontSize: 12, color: "#6B7280", marginBottom: 8 },
  ownerInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  ownerAvatar: { width: 32, height: 32, borderRadius: 16 },
  ownerAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  ownerAvatarText: { fontSize: 14, fontWeight: "700", color: "#7C3AED" },
  ownerName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  verifiedBadge: { color: "#10B981", fontSize: 13, fontWeight: "700" },
  actionButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonSecondary: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
  },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  actionButtonTextSecondary: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },
  ownerBadge: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  ownerBadgeText: { fontSize: 14, fontWeight: "700", color: "#92400E" },
  menuCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
  menuValue: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  menuArrow: { fontSize: 18, color: "#9CA3AF" },
});
