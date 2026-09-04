import type { FollowUser } from "@/services/api/follow";
import { getSuggestedUsers } from "@/services/api/follow";
import { searchUsers } from "@/services/api/search";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "search">("discover");

  const loadSuggestions = async () => {
    try {
      const suggestions = await getSuggestedUsers(10);
      setSuggestedUsers(suggestions);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSuggestions();
    }, []),
  );

  const handleSearch = async (text: string) => {
    setSearchQuery(text);

    if (text.trim().length < 2) {
      setUsers([]);
      setActiveTab("discover");
      return;
    }

    setSearching(true);
    setActiveTab("search");
    try {
      const result = await searchUsers(text);
      setUsers(result.users);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  const renderUserCard = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => router.push(`/user/${item.id}` as any)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.userName}>{item.name}</Text>
          {item.isVerified && <Text style={styles.verifiedBadge}>✓</Text>}
        </View>

        {item.bio && (
          <Text style={styles.userBio} numberOfLines={1}>
            {item.bio}
          </Text>
        )}

        {item.location && (
          <Text style={styles.userMeta}>📍 {item.location}</Text>
        )}

        {item.occupation && (
          <Text style={styles.userMeta}>💼 {item.occupation}</Text>
        )}

        {item.interests && item.interests.length > 0 && (
          <View style={styles.interestsRow}>
            {item.interests.slice(0, 3).map((interest: any) => (
              <View key={interest.id} style={styles.interestChip}>
                <Text style={styles.interestIcon}>{interest.icon}</Text>
                <Text style={styles.interestName}>{interest.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {item.followersCount !== undefined && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>{item.followersCount} followers</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
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
        <Text style={styles.title}>Discover</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, location, interests..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searching && (
          <ActivityIndicator color="#7C3AED" style={styles.searchLoader} />
        )}
      </View>

      {/* Content */}
      {activeTab === "discover" ? (
        <FlatList
          data={suggestedUsers}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Suggested for You ✨</Text>
              <Text style={styles.sectionSub}>
                Connect with like-minded women
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No suggestions yet</Text>
              <Text style={styles.emptySubtext}>
                Follow more people to get better suggestions!
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>
                Try different keywords or check spelling
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  searchLoader: {
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  sectionSub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  userCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7C3AED",
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  verifiedBadge: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "700",
  },
  userBio: {
    fontSize: 13,
    color: "#4B5563",
  },
  userMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  interestsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  interestIcon: {
    fontSize: 12,
  },
  interestName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7C3AED",
  },
  statsContainer: {
    justifyContent: "center",
  },
  statsText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
});
