import { getEvents, type AppEvent } from "@/services/api/events";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabType = "organized" | "going";

export default function MyEventsScreen() {
  const [tab, setTab] = useState<TabType>("organized");
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = async () => {
    try {
      const data = await getEvents({
        filter: tab === "organized" ? "my" : "going",
        limit: 50,
      });
      setEvents(data.events);
    } catch (error) {
      console.error("Failed to load my events:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setEvents([]);
      loadEvents();
    }, [tab]),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderEvent = ({ item }: { item: AppEvent }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => router.push(`/events/${item.id}` as any)}
      activeOpacity={0.7}
    >
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.eventCover} />
      ) : (
        <View style={[styles.eventCover, styles.eventCoverFallback]}>
          <Text style={styles.eventCoverText}>
            {item.title.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.eventContent}>
        <Text style={styles.eventDate}>{formatDate(item.startAt)}</Text>
        <Text style={styles.eventTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.eventMeta}>
          👥 {item.goingCount} going
          {item.myRsvp ? ` · You: ${item.myRsvp.replace("_", " ")}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Events</Text>
        <TouchableOpacity
          onPress={() => router.push("/events/create" as any)}
          style={styles.createButton}
        >
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === "organized" && styles.tabActive]}
          onPress={() => setTab("organized")}
        >
          <Text
            style={[
              styles.tabText,
              tab === "organized" && styles.tabTextActive,
            ]}
          >
            Organizing
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "going" && styles.tabActive]}
          onPress={() => setTab("going")}
        >
          <Text
            style={[styles.tabText, tab === "going" && styles.tabTextActive]}
          >
            Attending
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadEvents();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>
                {tab === "organized"
                  ? "You haven't organized any events"
                  : "You haven't RSVP'd to any events"}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push("/events/create" as any)}
              >
                <Text style={styles.emptyButtonText}>Create Event</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
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
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#7C3AED" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#7C3AED", fontWeight: "700" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, gap: 12 },
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  eventCover: { width: 100, height: 100, backgroundColor: "#E5E7EB" },
  eventCoverFallback: {
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  eventCoverText: { fontSize: 32, fontWeight: "700", color: "#7C3AED" },
  eventContent: { flex: 1, padding: 12, justifyContent: "center" },
  eventDate: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    lineHeight: 18,
  },
  eventMeta: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
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
