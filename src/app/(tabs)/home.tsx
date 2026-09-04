import { toggleLike } from "@/services/api/likes";
import { getFeed } from "@/services/api/posts";
import type { Post } from "@/types";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activePostId, setActivePostId] = useState<number | null>(null);

  const likeAnimation = useRef(new Animated.Value(1)).current;

  const fetchFeed = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      const data = await getFeed(pageNum, 10);

      if (refresh) {
        setPosts(data.posts);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to fetch feed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFeed(1, true);
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      fetchFeed(page + 1);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      const result = await toggleLike(postId);

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                likedByMe: result.liked,
                likesCount: result.likesCount,
              }
            : post,
        ),
      );

      if (result.liked) {
        setActivePostId(postId);
        likeAnimation.setValue(0);
        Animated.spring(likeAnimation, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }).start(() => {
          setActivePostId(null);
        });
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleShare = (post: Post) => {
    Alert.alert("Share", "Share functionality coming soon!");
  };

  const handlePostPress = (postId: number) => {
    if (postId && postId > 0) {
      console.log("Navigating to post with ID:", postId);
      router.push({
        pathname: "/post/[id]",
        params: { id: String(postId) },
      });
    } else {
      console.error("Invalid post ID:", postId);
      Alert.alert("Error", "Invalid post ID");
    }
  };

  const handleAuthorPress = (userId: number) => {
    if (userId && userId > 0) {
      router.push({
        pathname: "/user/[id]",
        params: { id: String(userId) },
      });
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const renderPost = ({ item }: { item: Post }) => {
    if (!item || !item.id) return null;

    const isLiked = item.likedByMe;
    const showLikeAnimation = activePostId === item.id;

    return (
      <View style={styles.postCard}>
        {/* Post Header - Clickable to go to author profile */}
        <TouchableOpacity
          style={styles.postHeader}
          onPress={() => handleAuthorPress(item.author?.id)}
          activeOpacity={0.7}
        >
          <View style={styles.authorInfo}>
            {item.author?.avatarUrl ? (
              <Image
                source={{ uri: item.author.avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.author?.name?.charAt(0)?.toUpperCase() || "🌸"}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {item.author?.name || "Sakhi Member"}
                </Text>
                {item.author?.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={styles.postTime}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Post Content - Clickable to go to post detail */}
        <TouchableOpacity
          onPress={() => handlePostPress(item.id)}
          activeOpacity={0.9}
        >
          {item.content && (
            <Text style={styles.postContent}>{item.content}</Text>
          )}

          {item.mediaUrls && item.mediaUrls.length > 0 && (
            <View style={styles.mediaContainer}>
              {item.mediaUrls.length === 1 ? (
                <Image
                  source={{ uri: item.mediaUrls[0] }}
                  style={styles.singleImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.multiImageContainer}>
                  {item.mediaUrls.slice(0, 4).map((url, index) => (
                    <Image
                      key={index}
                      source={{ uri: url }}
                      style={[
                        styles.multiImage,
                        item.mediaUrls!.length === 3 &&
                          index === 2 &&
                          styles.fullWidthImage,
                      ]}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Post Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
            activeOpacity={0.7}
            hitSlop={8}
          >
            {showLikeAnimation ? (
              <Animated.Text
                style={[
                  styles.actionIcon,
                  styles.likedIcon,
                  { transform: [{ scale: likeAnimation }] },
                ]}
              >
                ❤️
              </Animated.Text>
            ) : (
              <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
                {isLiked ? "❤️" : "🤍"}
              </Text>
            )}
            <Text style={styles.actionText}>{item.likesCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePostPress(item.id)}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Text style={styles.actionIcon}>↗️</Text>
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>🌸</Text>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading your feed...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>🌸</Text>
          <Text style={styles.logoText}>SakhiSphere</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/(tabs)/notifications")}
          >
            <Text style={styles.iconButtonText}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/create-post")}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonText}>+ Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#7C3AED"]}
            tintColor="#7C3AED"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#7C3AED" size="small" />
              <Text style={styles.footerText}>Loading more...</Text>
            </View>
          ) : !hasMore && posts.length > 0 ? (
            <View style={styles.footerLoader}>
              <Text style={styles.footerText}>🌸 You're all caught up!</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>Welcome to SakhiSphere!</Text>
            <Text style={styles.emptySubtext}>
              Create your first post or follow others to see their posts here.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/create-post")}
            >
              <Text style={styles.emptyButtonText}>Create Your First Post</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingLogo: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logo: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#7C3AED",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonText: {
    fontSize: 16,
  },
  createButton: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  feedContent: {
    padding: 12,
    gap: 12,
  },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E9D5FF",
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7C3AED",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 1,
  },
  verifiedBadge: {
    backgroundColor: "#10B981",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  postTime: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  postContent: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    marginBottom: 10,
  },
  mediaContainer: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  singleImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },
  multiImageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  multiImage: {
    width: "49%",
    height: 150,
    borderRadius: 8,
  },
  fullWidthImage: {
    width: "100%",
    height: 180,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionIcon: {
    fontSize: 16,
  },
  likedIcon: {
    color: "#EF4444",
  },
  actionText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  footerLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: "#6B7280",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
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
    borderRadius: 24,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
