import type { Post } from "@/types";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { ImageGallery } from "./ImageGallery";
import { ShareModal } from "./ShareModal";

const { width, height } = Dimensions.get("window");

interface PostCardProps {
  post: Post;
  onLike?: (postId: number) => void;
  onComment?: (postId: number) => void;
  onShare?: (post: Post) => void;
  onAuthorPress?: (userId: number) => void;
}

export function PostCard({
  post,
  onLike,
  onComment,
  onShare,
  onAuthorPress,
}: PostCardProps) {
  const likeScale = useRef(new Animated.Value(1)).current;
  const [isAnimating, setIsAnimating] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[] | null>(null);
  const [initialImageIndex, setInitialImageIndex] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleLike = () => {
    if (onLike) {
      onLike(post.id);
      // Animate like
      setIsAnimating(true);
      likeScale.setValue(0.5);
      Animated.spring(likeScale, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }).start(() => setIsAnimating(false));
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(post);
    } else {
      setShowShareModal(true);
    }
  };

  const handleAuthorPress = () => {
    if (onAuthorPress) {
      onAuthorPress(post.author.id);
    } else {
      router.push(`/user/${post.author.id}` as any);
    }
  };

  const handleCommentPress = () => {
    if (onComment) {
      onComment(post.id);
    } else {
      router.push(`/post/${post.id}` as any);
    }
  };

  const handleImagePress = (index: number) => {
    if (post.mediaUrls && post.mediaUrls.length > 0) {
      setInitialImageIndex(index);
      setPreviewImages(post.mediaUrls);
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

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.authorInfo}
          onPress={handleAuthorPress}
          activeOpacity={0.7}
        >
          {post.author.avatarUrl ? (
            <Image
              source={{ uri: post.author.avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>
                {post.author.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.authorName}>{post.author.name}</Text>
              {post.author.isVerified && (
                <Text style={styles.verifiedBadge}>✓</Text>
              )}
            </View>
            <Text style={styles.time}>
              {formatRelativeTime(post.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {post.content && <Text style={styles.content}>{post.content}</Text>}

      {/* Media */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <View style={styles.mediaContainer}>
          {post.mediaUrls.length === 1 ? (
            <TouchableOpacity
              onPress={() => handleImagePress(0)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: post.mediaUrls[0] }}
                style={styles.singleImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.multiImageContainer}>
              {post.mediaUrls.map((url, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleImagePress(index)}
                  activeOpacity={0.9}
                  style={
                    index === 2 && post.mediaUrls!.length === 3
                      ? styles.fullWidthWrapper
                      : undefined
                  }
                >
                  <Image
                    source={{ uri: url }}
                    style={[
                      styles.multiImage,
                      post.mediaUrls!.length === 3 &&
                        index === 2 &&
                        styles.fullWidthImage,
                    ]}
                    resizeMode="cover"
                  />
                  {post.mediaUrls!.length > 2 && index === 1 && (
                    <View style={styles.moreImagesOverlay}>
                      <Text style={styles.moreImagesText}>
                        +{post.mediaUrls!.length - 2}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Animated.Text
            style={[
              styles.actionIcon,
              post.likedByMe && styles.likedIcon,
              isAnimating && { transform: [{ scale: likeScale }] },
            ]}
          >
            {post.likedByMe ? "❤️" : "🤍"}
          </Animated.Text>
          <Text style={styles.actionText}>{post.likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCommentPress}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>{post.commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Text style={styles.actionIcon}>↗️</Text>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Image Gallery Modal */}
      <ImageGallery
        images={previewImages || []}
        visible={previewImages !== null}
        initialIndex={initialImageIndex}
        onClose={() => setPreviewImages(null)}
      />

      {/* Share Modal */}
      <ShareModal
        post={post}
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  header: {
    marginBottom: 10,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "600",
    color: "#111827",
  },
  verifiedBadge: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "700",
  },
  time: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  content: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    marginBottom: 10,
  },
  mediaContainer: {
    marginBottom: 10,
  },
  singleImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
  },
  multiImageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  fullWidthWrapper: {
    width: "100%",
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
  moreImagesOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  moreImagesText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
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
    fontWeight: "500",
  },
});
