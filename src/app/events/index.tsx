import { getEvents, type AppEvent } from "@/services/api/events";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterType = "upcoming" | "going" | "my" | "past";

export default function EventsScreen() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("upcoming");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce search input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Reload when debounced search changes
  useEffect(() => {
    setLoading(true);
    setEvents([]);
    loadEvents(1, true);
  }, [debouncedSearch]);

  const loadEvents = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      const data = await getEvents({
        page: pageNum,
        limit: 20,
        search: debouncedSearch.trim() || undefined,
        filter,
      });

      if (refresh) {
        setEvents(data.events);
      } else {
        setEvents((prev) => [...prev, ...data.events]);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setEvents([]);
      loadEvents(1, true);
    }, [filter]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      loadEvents(page + 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isUpcoming = (dateString: string) => new Date(dateString) > new Date();

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
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>{formatDate(item.startAt)}</Text>
          {isUpcoming(item.startAt) ? (
            <Text style={styles.upcomingPill}>UPCOMING</Text>
          ) : (
            <Text style={styles.pastPill}>PAST</Text>
          )}
        </View>
        <Text style={styles.eventTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.eventMeta}>
          <Text style={styles.eventMetaText}>
            🕐 {formatTime(item.startAt)}
          </Text>
          {item.isVirtual ? (
            <Text style={styles.eventMetaText}>🌐 Virtual</Text>
          ) : item.location ? (
            <Text style={styles.eventMetaText} numberOfLines={1}>
              📍 {item.location}
            </Text>
          ) : null}
        </View>

        <View style={styles.eventFooter}>
          <Text style={styles.goingCount}>👥 {item.goingCount} going</Text>
          {item.myRsvp && (
            <View
              style={[
                styles.rsvpPill,
                item.myRsvp === "going" && styles.rsvpPillGoing,
                item.myRsvp === "maybe" && styles.rsvpPillMaybe,
                item.myRsvp === "not_going" && styles.rsvpPillNotGoing,
              ]}
            >
              <Text style={styles.rsvpPillText}>
                {item.myRsvp === "going"
                  ? "✓ Going"
                  : item.myRsvp === "maybe"
                    ? "? Maybe"
                    : "✕ Not going"}
              </Text>
            </View>
          )}
        </View>

        {item.isOrganizer && (
          <View style={styles.organizerBadge}>
            <Text style={styles.organizerBadgeText}>👑 You organize this</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && events.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity
          onPress={() => router.push("/events/create" as any)}
          hitSlop={8}
          style={styles.createButton}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {[
          { value: "upcoming", label: "Upcoming", icon: "📅" },
          { value: "going", label: "Going", icon: "✓" },
          { value: "my", label: "My Events", icon: "👑" },
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

      {/* List */}
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#7C3AED"]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color="#7C3AED" style={{ marginVertical: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={styles.emptySubtext}>
              {filter === "my"
                ? "You haven't created any events yet"
                : filter === "going"
                  ? "You haven't RSVP'd to any events yet"
                  : filter === "past"
                    ? "No past events to show"
                    : "Create your first event or check back later"}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  searchInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
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
  filterChipActive: {
    backgroundColor: "#F3E8FF",
    borderColor: "#7C3AED",
  },
  filterIcon: { fontSize: 14 },
  filterLabel: { fontSize: 12, fontWeight: "600", color: "#374151" },
  filterLabelActive: { color: "#7C3AED", fontWeight: "700" },
  listContent: { padding: 16, gap: 12 },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  eventCover: { width: "100%", height: 140, backgroundColor: "#E5E7EB" },
  eventCoverFallback: {
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  eventCoverText: { fontSize: 56, fontWeight: "700", color: "#7C3AED" },
  eventContent: { padding: 14 },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
    letterSpacing: 0.5,
  },
  upcomingPill: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10B981",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    lineHeight: 22,
  },
  eventMeta: { gap: 4, marginBottom: 10 },
  eventMetaText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  eventFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  goingCount: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  rsvpPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rsvpPillGoing: { backgroundColor: "#ECFDF5" },
  rsvpPillMaybe: { backgroundColor: "#FEF3C7" },
  rsvpPillNotGoing: { backgroundColor: "#FEE2E2" },
  rsvpPillText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  organizerBadge: {
    marginTop: 8,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  organizerBadgeText: { fontSize: 11, fontWeight: "700", color: "#92400E" },
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
  pastPill: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
});
