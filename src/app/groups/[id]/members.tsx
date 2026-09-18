import {
    getGroup,
    getGroupMembers,
    promoteMember,
    removeMember,
    type Group,
    type GroupMember,
} from "@/services/api/groups";
import { getUserData } from "@/services/storage/token";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GroupMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = parseInt(id || "0", 10);

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    try {
      const [membersData, groupData, userData] = await Promise.all([
        getGroupMembers(groupId, 1, 100),
        getGroup(groupId),
        getUserData(),
      ]);
      setMembers(membersData.members);
      setGroup(groupData);
      if (userData) setCurrentUserId(userData.id);
    } catch (error) {
      console.error("Failed to load members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (member: GroupMember) => {
    Alert.alert("Remove Member", `Remove ${member.name} from this group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeMember(groupId, member.id);
            setMembers((prev) => prev.filter((m) => m.id !== member.id));
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to remove member");
          }
        },
      },
    ]);
  };

  const handlePromote = (member: GroupMember) => {
    Alert.alert(
      "Promote to Admin",
      `Make ${member.name} an admin of this group?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Promote",
          onPress: async () => {
            try {
              await promoteMember(groupId, member.id);
              await loadData();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to promote member");
            }
          },
        },
      ],
    );
  };

  const isAdmin = group?.myRole === "owner" || group?.myRole === "admin";
  const isOwner = group?.myRole === "owner";

  const renderMember = ({ item }: { item: GroupMember }) => {
    const isMe = item.id === currentUserId;
    const canManage = isAdmin && !isMe && item.role !== "owner";

    return (
      <View style={styles.memberCard}>
        <TouchableOpacity
          style={styles.memberInfo}
          onPress={() => router.push(`/user/${item.id}` as any)}
        >
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName}>{item.name}</Text>
              {item.isVerified && <Text style={styles.verified}>✓</Text>}
              {item.role === "owner" && (
                <Text style={styles.roleBadge}>👑 Owner</Text>
              )}
              {item.role === "admin" && (
                <Text style={styles.adminBadge}>🛡️ Admin</Text>
              )}
            </View>
            {item.bio && (
              <Text style={styles.memberBio} numberOfLines={1}>
                {item.bio}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {canManage && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => {
              const options = [
                {
                  text: "Promote to Admin",
                  onPress: () => handlePromote(item),
                },
                {
                  text: "Remove from Group",
                  style: "destructive" as const,
                  onPress: () => handleRemove(item),
                },
                { text: "Cancel", style: "cancel" as const },
              ];
              if (!isOwner) {
                options.splice(0, 1);
              }
              Alert.alert(item.name, "Choose an action", options);
            }}
          >
            <Text style={styles.moreIcon}>•••</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Members ({members.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No members yet</Text>
          </View>
        }
      />
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
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  listContent: { padding: 12, gap: 8 },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  memberInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#7C3AED" },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  memberName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  verified: { color: "#10B981", fontSize: 13, fontWeight: "700" },
  roleBadge: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "700",
    marginLeft: 4,
  },
  adminBadge: {
    fontSize: 11,
    color: "#7C3AED",
    fontWeight: "700",
    marginLeft: 4,
  },
  memberBio: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  moreButton: { padding: 8 },
  moreIcon: { fontSize: 18, color: "#6B7280" },
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, color: "#6B7280" },
});
