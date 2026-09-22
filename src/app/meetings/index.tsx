import { getMeetings, type AppMeeting } from "@/services/api/meetings";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterType = "upcoming" | "hosted" | "invited" | "past";

export default function MeetingsScreen() {
  const [meetings, setMeetings] = useState<AppMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("upcoming");

  const loadMeetings = async () => {
    try {
      const data = await getMeetings({ filter, limit: 50 });
      setMeetings(data.meetings);
    } catch (error) {
      console.error("Failed to load meetings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setMeetings([]);
      loadMeetings();
    }, [filter]),
  );

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Not scheduled";
    const d = new Date(dateString);
    return (
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }) +
      " · " +
      d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    );
  };

  const renderMeeting = ({ item }: { item: AppMeeting }) => (
    <TouchableOpacity
      style={styles.meetingCard}
      onPress={() => router.push(`/meetings/${item.id}` as any)}
      activeOpacity={0.7}
    >
      {item.host?.avatarUrl ? (
        <Image
          source={{ uri: item.host.avatarUrl }}
          style={styles.hostAvatar}
        />
      ) : (
        <View style={styles.hostAvatarFallback}>
          <Text style={styles.hostAvatarText}>
            {item.host?.name.charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
      )}

      <View style={styles.meetingContent}>
        <View style={styles.titleRow}>
          <Text style={styles.meetingTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.isLive && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>● LIVE</Text>
            </View>
          )}
          {item.isLiveStream && (
            <View style={styles.streamBadge}>
              <Text style={styles.streamBadgeText}>LIVE STREAM</Text>
            </View>
          )}
        </View>

        <Text style={styles.meetingMeta}>
          {item.isInstant
            ? "Instant meeting"
            : formatDateTime(item.scheduledAt)}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            👤 Host: {item.host?.name || "Unknown"}
          </Text>
          <Text style={styles.footerText}>👥 {item.participantCount}</Text>
        </View>

        {item.myRole && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {item.myRole === "host"
                ? "👑 Host"
                : item.myRole === "speaker"
                  ? "🎤 Speaker"
                  : "👁️ Audience"}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && meetings.length === 0) {
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
        <Text style={styles.headerTitle}>Virtual Meetups</Text>
        <TouchableOpacity
          onPress={() => router.push("/meetings/create" as any)}
          style={styles.createButton}
        >
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {[
          { value: "upcoming", label: "Upcoming", icon: "📅" },
          { value: "hosted", label: "Hosted", icon: "👑" },
          { value: "invited", label: "Invited", icon: "✉️" },
          { value: "past", label: "Past", icon: "🕐" },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterChip,
              filter === option.value && styles.filterChipActive,
            ]}
            onPress={() => setFilter(option.value as FilterType)}
          >
            <Text style={styles.filterIcon}>{option.icon}</Text>
            <Text
              style={[
                styles.filterLabel,
                filter === option.value && styles.filterLabelActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={meetings}
        renderItem={renderMeeting}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadMeetings();
            }}
            colors={["#7C3AED"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📹</Text>
            <Text style={styles.emptyText}>No meetings yet</Text>
            <Text style={styles.emptySubtext}>
              {filter === "hosted"
                ? "You haven't hosted any meetings"
                : filter === "invited"
                  ? "You haven't been invited to any meetings"
                  : filter === "past"
                    ? "No past meetings to show"
                    : "Create your first meeting to get started"}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/meetings/create" as any)}
            >
              <Text style={styles.emptyButtonText}>New Meeting</Text>
            </TouchableOpacity>
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  createButton: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  createButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    maxHeight: 56,
  },
  filtersContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: { backgroundColor: "#F3E8FF", borderColor: "#7C3AED" },
  filterIcon: { fontSize: 14 },
  filterLabel: { fontSize: 12, fontWeight: "600", color: "#374151" },
  filterLabelActive: { color: "#7C3AED", fontWeight: "700" },
  listContent: { padding: 16, gap: 12 },
  meetingCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  hostAvatar: { width: 52, height: 52, borderRadius: 26 },
  hostAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  hostAvatarText: { fontSize: 20, fontWeight: "700", color: "#7C3AED" },
  meetingContent: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  meetingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  liveBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  streamBadge: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  streamBadgeText: { color: "#7C3AED", fontSize: 10, fontWeight: "800" },
  meetingMeta: { fontSize: 12, color: "#6B7280", marginBottom: 6 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
  roleBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleBadgeText: { fontSize: 10, fontWeight: "700", color: "#7C3AED" },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#111827" },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
