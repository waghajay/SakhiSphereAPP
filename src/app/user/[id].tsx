import { PostCard } from "@/components/PostCard";
import {
  checkFollowStatus,
  getFollowCounts,
  getMutualConnections,
  toggleFollow,
} from "@/services/api/follow";
import { toggleLike } from "@/services/api/likes";
import { getUserPosts } from "@/services/api/posts";
import { getPublicProfile } from "@/services/api/user";
import type { Post, UserProfile } from "@/types";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const GRID_SIZE = (width - 32 - 4) / 3;

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = parseInt(id || "0", 10);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState({
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  });
  const [activeTab, setActiveTab] = useState<"posts" | "media" | "about">(
    "posts",
  );
  const [mutualConnections, setMutualConnections] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const followScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadProfile();
    loadPosts(1, true);
    loadFollowStatus();
    loadFollowCounts();
    loadMutualConnections();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const data = await getPublicProfile(userId);
      setProfile(data);
    } catch (error) {
      console.error("Failed to load profile:", error);
      Alert.alert("Error", "Failed to load user profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPosts = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      const data = await getUserPosts(userId, pageNum, 20);

      if (refresh) {
        setPosts(data.posts);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const loadFollowStatus = async () => {
    try {
      const data = await checkFollowStatus(userId);
      setFollowing(data.following);
    } catch (error) {
      console.error("Failed to check follow status:", error);
    }
  };

  const loadFollowCounts = async () => {
    try {
      const data = await getFollowCounts(userId);
      setFollowCounts(data);
    } catch (error) {
      console.error("Failed to load follow counts:", error);
    }
  };

  const loadMutualConnections = async () => {
    try {
      const data = await getMutualConnections(userId);
      setMutualConnections(data);
    } catch (error) {
      console.error("Failed to load mutual connections:", error);
    }
  };

  const handleToggleFollow = async () => {
    try {
      const result = await toggleFollow(userId);
      setFollowing(result.following);
      setFollowCounts((prev) => ({
        ...prev,
        followersCount: result.followersCount,
      }));

      followScale.setValue(0.9);
      Animated.spring(followScale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }).start();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to toggle follow");
    }
  };

  const handleLike = async (postId: number) => {
    try {
      const result = await toggleLike(postId);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likedByMe: result.liked,
                likesCount: result.likesCount,
              }
            : post,
        ),
      );
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
    loadPosts(1, true);
    loadFollowStatus();
    loadFollowCounts();
  };

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      loadPosts(page + 1);
    }
  };

  const handleMessage = () => {
    Alert.alert("Message", "Messaging feature coming in Phase 4!");
  };

  const mediaPosts = posts.filter(
    (post) => post.mediaUrls && post.mediaUrls.length > 0,
  );

  const renderGridItem = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => router.push(`/post/${item.id}` as any)}
      activeOpacity={0.8}
    >
      {item.mediaUrls && item.mediaUrls.length > 0 && (
        <>
          <Image
            source={{ uri: item.mediaUrls[0] }}
            style={styles.gridImage}
            resizeMode="cover"
          />
          {item.mediaUrls.length > 1 && (
            <View style={styles.multipleBadge}>
              <Text style={styles.multipleBadgeText}>📑</Text>
            </View>
          )}
          {item.mediaTypes && item.mediaTypes[0] === "video" && (
            <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeText}>▶</Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );

  const renderPostItem = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onLike={handleLike}
      onAuthorPress={(authorId) => {
        if (authorId !== userId) {
          router.push(`/user/${authorId}` as any);
        }
      }}
    />
  );

  const renderAboutSection = () => (
    <View style={styles.aboutCard}>
      {profile?.bio && (
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Bio</Text>
          <Text style={styles.aboutText}>{profile.bio}</Text>
        </View>
      )}

      {profile?.location && (
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>📍 Location</Text>
          <Text style={styles.aboutText}>{profile.location}</Text>
        </View>
      )}

      {profile?.occupation && (
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>💼 Occupation</Text>
          <Text style={styles.aboutText}>{profile.occupation}</Text>
        </View>
      )}

      {profile?.interests && profile.interests.length > 0 && (
        <View style={styles.aboutItem}>
          <Text style={styles.aboutLabel}>Interests</Text>
          <View style={styles.interestsWrap}>
            {profile.interests.map((interest) => (
              <View key={interest.id} style={styles.interestChip}>
                <Text style={styles.interestIcon}>{interest.icon}</Text>
                <Text style={styles.interestName}>{interest.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.aboutItem}>
        <Text style={styles.aboutLabel}>Member Since</Text>
        <Text style={styles.aboutText}>
          {profile?.createdAt
            ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })
            : "N/A"}
        </Text>
      </View>
    </View>
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
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile?.name || "Profile"}</Text>
        <TouchableOpacity
          hitSlop={8}
          onPress={() => Alert.alert("Options", "More options coming soon!")}
        >
          <Text style={styles.moreIcon}>•••</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={
          activeTab === "posts"
            ? posts
            : activeTab === "media"
              ? mediaPosts
              : []
        }
        renderItem={activeTab === "media" ? renderGridItem : renderPostItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={activeTab === "media" ? 3 : 1}
        key={activeTab === "media" ? "grid" : "list"}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#7C3AED"]}
          />
        }
        onEndReached={activeTab === "posts" ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile?.name ? profile.name.charAt(0).toUpperCase() : "🌸"}
                </Text>
              </View>

              <View style={styles.nameRow}>
                <Text style={styles.userName}>
                  {profile?.name || "Sakhi Member"}
                </Text>
                {profile?.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓</Text>
                  </View>
                )}
              </View>

              {profile?.occupation && (
                <Text style={styles.userOccupation}>
                  💼 {profile.occupation}
                </Text>
              )}

              {profile?.location && (
                <Text style={styles.userLocation}>📍 {profile.location}</Text>
              )}

              {/* Mutual Connections */}
              {mutualConnections.length > 0 && (
                <View style={styles.mutualContainer}>
                  <View style={styles.mutualAvatars}>
                    {mutualConnections.slice(0, 3).map((connection, index) => (
                      <View
                        key={connection.id}
                        style={[
                          styles.mutualAvatar,
                          { marginLeft: index > 0 ? -10 : 0 },
                        ]}
                      >
                        <Text style={styles.mutualAvatarText}>
                          {connection.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.mutualText}>
                    {mutualConnections.length} mutual connection
                    {mutualConnections.length > 1 ? "s" : ""}
                  </Text>
                </View>
              )}

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {followCounts.postsCount}
                  </Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => router.push(`/followers/${userId}` as any)}
                >
                  <Text style={styles.statValue}>
                    {followCounts.followersCount}
                  </Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => router.push(`/following/${userId}` as any)}
                >
                  <Text style={styles.statValue}>
                    {followCounts.followingCount}
                  </Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <Animated.View style={{ transform: [{ scale: followScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      following && styles.followingButton,
                    ]}
                    onPress={handleToggleFollow}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.followButtonText,
                        following && styles.followingButtonText,
                      ]}
                    >
                      {following ? "✓ Following" : "+ Follow"}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={handleMessage}
                  activeOpacity={0.8}
                >
                  <Text style={styles.messageButtonText}>💬 Message</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              {[
                { value: "posts", label: "Posts", icon: "📝" },
                { value: "media", label: "Media", icon: "📷" },
                { value: "about", label: "About", icon: "ℹ️" },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.value}
                  style={[
                    styles.tab,
                    activeTab === tab.value && styles.activeTab,
                  ]}
                  onPress={() => setActiveTab(tab.value as any)}
                >
                  <Text style={styles.tabIcon}>{tab.icon}</Text>
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab.value && styles.activeTabText,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* About Section */}
            {activeTab === "about" && renderAboutSection()}
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color="#7C3AED" style={{ marginVertical: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>
              {activeTab === "media" ? "📷" : "📝"}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === "media" ? "No media posts" : "No posts yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === "media"
                ? "This user has no photos or videos"
                : "This user hasn't shared any posts yet."}
            </Text>
          </View>
        }
      />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backText: {
    fontSize: 22,
    color: "#7C3AED",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  moreIcon: {
    fontSize: 18,
    color: "#6B7280",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F3E8FF",
    borderWidth: 3,
    borderColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#7C3AED",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  verifiedBadge: {
    backgroundColor: "#10B981",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  userOccupation: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
    marginTop: 4,
  },
  userLocation: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },
  mutualContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  mutualAvatars: {
    flexDirection: "row",
  },
  mutualAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DDD6FE",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  mutualAvatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },
  mutualText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 16,
    gap: 20,
  },
  statItem: {
    alignItems: "center",
    minWidth: 60,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  followButton: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 120,
    alignItems: "center",
  },
  followingButton: {
    backgroundColor: "#F3E8FF",
    borderWidth: 1.5,
    borderColor: "#7C3AED",
  },
  followButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  followingButtonText: {
    color: "#7C3AED",
  },
  messageButton: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  messageButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  activeTab: {
    backgroundColor: "#F3E8FF",
    borderBottomWidth: 3,
    borderBottomColor: "#7C3AED",
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#7C3AED",
    fontWeight: "700",
  },
  aboutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  aboutItem: {
    marginBottom: 16,
  },
  aboutLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  aboutText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
  interestsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  interestIcon: {
    fontSize: 14,
  },
  interestName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B21A8",
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    margin: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  multipleBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 4,
    padding: 2,
  },
  multipleBadgeText: {
    fontSize: 10,
  },
  videoBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  videoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
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
