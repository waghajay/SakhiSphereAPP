import { getGroups, type Group } from "@/services/api/groups";
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
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterType = "all" | "my" | "joined";

export default function GroupsTabScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadGroups = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      const data = await getGroups({
        page: pageNum,
        limit: 20,
        search: search.trim() || undefined,
        filter,
      });

      if (refresh) {
        setGroups(data.groups);
      } else {
        setGroups((prev) => [...prev, ...data.groups]);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load groups:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroups(1, true);
    }, [filter]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadGroups(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      loadGroups(page + 1);
    }
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    setLoading(true);
    setGroups([]);
    loadGroups(1, true);
  };

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={() => router.push(`/groups/${item.id}` as any)}
      activeOpacity={0.7}
    >
      {item.coverUrl ? (
        <Image source={{ uri: item.coverUrl }} style={styles.groupCover} />
      ) : (
        <View style={[styles.groupCover, styles.groupCoverFallback]}>
          <Text style={styles.groupCoverText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.privacy === "private" && (
            <Text style={styles.privacyIcon}>🔒</Text>
          )}
          {item.privacy === "invite_only" && (
            <Text style={styles.privacyIcon}>✉️</Text>
          )}
        </View>

        {item.description ? (
          <Text style={styles.groupDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.groupMeta}>
          <Text style={styles.groupMetaText}>
            👥 {item.memberCount} members
          </Text>
          {item.category && (
            <Text style={styles.groupMetaText}>• {item.category}</Text>
          )}
        </View>

        {item.isMember && (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>
              {item.myRole === "owner"
                ? "👑 Owner"
                : item.myRole === "admin"
                  ? "🛡️ Admin"
                  : "✓ Member"}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && groups.length === 0) {
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
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity
          onPress={() => router.push("/groups/create" as any)}
          style={styles.createButton}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {[
          { value: "all", label: "All Groups", icon: "🌍" },
          { value: "joined", label: "Joined", icon: "✓" },
          { value: "my", label: "My Groups", icon: "👑" },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterChip,
              filter === option.value && styles.filterChipActive,
            ]}
            onPress={() => {
              setFilter(option.value as FilterType);
              setLoading(true);
              setGroups([]);
            }}
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

      {/* Groups List */}
      <FlatList
        data={groups}
        renderItem={renderGroup}
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
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No groups found</Text>
            <Text style={styles.emptySubtext}>
              {filter === "my"
                ? "You haven't created any groups yet"
                : filter === "joined"
                  ? "You haven't joined any groups yet"
                  : "Try a different search or create a new group"}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/groups/create" as any)}
            >
              <Text style={styles.emptyButtonText}>+ Create Group</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  createButton: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
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
    maxHeight: 60,
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
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  groupCover: { width: "100%", height: 120, backgroundColor: "#E5E7EB" },
  groupCoverFallback: {
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  groupCoverText: { fontSize: 48, fontWeight: "700", color: "#7C3AED" },
  groupContent: { padding: 14 },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  groupName: { flex: 1, fontSize: 16, fontWeight: "700", color: "#111827" },
  privacyIcon: { fontSize: 14 },
  groupDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 8,
  },
  groupMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  groupMetaText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  memberBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberBadgeText: { fontSize: 11, fontWeight: "700", color: "#7C3AED" },
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
