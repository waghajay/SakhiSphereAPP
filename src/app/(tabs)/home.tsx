import { OfflineBanner } from "@/components/OfflineBanner";
import { PostCard } from "@/components/PostCard";
import { toggleLike } from "@/services/api/likes";
import { getFeed } from "@/services/api/posts";
import type { Post } from "@/types";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

type SortOption = "recent" | "popular" | "following" | "interests";

export default function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [feedExplanation, setFeedExplanation] = useState("");

  const likeAnimation = useRef(new Animated.Value(1)).current;

  const fetchFeed = async (
    pageNum: number = 1,
    refresh: boolean = false,
    currentSort: SortOption = sortBy,
  ) => {
    try {
      const data = await getFeed(pageNum, 10, currentSort);

      if (refresh) {
        setPosts(data.posts);
        if (data.feedExplanation) {
          setFeedExplanation(data.feedExplanation);
        }
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
      fetchFeed(1, true, sortBy);
    }, [sortBy]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed(1, true, sortBy);
  };

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      fetchFeed(page + 1, false, sortBy);
    }
  };

  const handleSortChange = (newSort: SortOption) => {
    if (newSort !== sortBy) {
      setSortBy(newSort);
      setLoading(true);
      setPosts([]);
      setPage(1);
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

  const handleShare = async (post: Post) => {
    try {
      await Share.share({
        message: `${post.content}\n\nShared from SakhiSphere 🌸`,
        title: "Share Post",
      });
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onLike={handleLike}
      onShare={handleShare}
      onAuthorPress={(userId) => router.push(`/user/${userId}` as any)}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading your feed...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>🌸</Text>
          <Text style={styles.logoText}>SakhiSphere</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push("/(tabs)/notifications")}
          >
            <Text style={styles.notificationIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/create-post" as any)}
          >
            <Text style={styles.createButtonText}>+ Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort Options - Horizontally Scrollable */}
      <ScrollableSortOptions sortBy={sortBy} onSortChange={handleSortChange} />

      {/* Feed Explanation Banner */}
      {feedExplanation && (
        <View style={styles.explanationBanner}>
          <Text style={styles.explanationIcon}>💡</Text>
          <Text style={styles.explanationText}>{feedExplanation}</Text>
        </View>
      )}

      {/* Feed */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.feedContent}
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
              <ActivityIndicator color="#7C3AED" />
              <Text style={styles.footerText}>Loading more posts...</Text>
            </View>
          ) : !hasMore && posts.length > 0 ? (
            <View style={styles.footerLoader}>
              <Text style={styles.footerText}>You're all caught up! 🌸</Text>
            </View>
          ) : null
        }
        // Update the ListEmptyComponent in home.tsx

        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🌸</Text>
            <Text style={styles.emptyText}>Welcome to SakhiSphere!</Text>
            <Text style={styles.emptySubtext}>
              Start by creating your first post or discover people to follow.
            </Text>
            <View style={styles.emptyButtons}>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push("/create-post" as any)}
              >
                <Text style={styles.emptyButtonText}>📝 Create Post</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emptyButton, styles.emptyButtonSecondary]}
                onPress={() => router.push("/(tabs)/discover")}
              >
                <Text style={styles.emptyButtonTextSecondary}>
                  🔍 Discover People
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// Horizontally Scrollable Sort Options Component
function ScrollableSortOptions({
  sortBy,
  onSortChange,
}: {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}) {
  const options: { value: SortOption; label: string; icon: string }[] = [
    { value: "recent", label: "Recent", icon: "🕐" },
    { value: "popular", label: "Popular", icon: "🔥" },
    { value: "following", label: "Following", icon: "👥" },
    { value: "interests", label: "For You", icon: "✨" },
  ];

  return (
    <View style={sortStyles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sortStyles.container}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              sortStyles.option,
              sortBy === option.value && sortStyles.optionActive,
            ]}
            onPress={() => onSortChange(option.value)}
            activeOpacity={0.7}
          >
            <Text style={sortStyles.optionIcon}>{option.icon}</Text>
            <Text
              style={[
                sortStyles.optionText,
                sortBy === option.value && sortStyles.optionTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const sortStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionActive: {
    backgroundColor: "#F3E8FF",
    borderColor: "#7C3AED",
  },
  optionIcon: {
    fontSize: 14,
  },
  optionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  optionTextActive: {
    color: "#7C3AED",
    fontWeight: "700",
  },
});

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
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    gap: 12,
  },
  notificationButton: {
    padding: 4,
  },
  notificationIcon: {
    fontSize: 20,
  },
  createButton: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  explanationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FAF5FF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9D5FF",
  },
  explanationIcon: {
    fontSize: 14,
  },
  explanationText: {
    flex: 1,
    fontSize: 12,
    color: "#6B21A8",
    fontWeight: "500",
  },
  feedContent: {
    padding: 12,
    gap: 12,
  },
  footerLoader: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
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
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Add to styles in home.tsx

  emptyButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  emptyButtonSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#7C3AED",
  },
  emptyButtonTextSecondary: {
    color: "#7C3AED",
    fontSize: 14,
    fontWeight: "600",
  },
});
