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
  View,
} from "react-native";
import { ImageGallery } from "./ImageGallery";
import { ShareModal } from "./ShareModal";
import { VideoPlayer } from "./VideoPlayer";

const { width } = Dimensions.get("window");

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
  const [avatarError, setAvatarError] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const handleLike = () => {
    if (onLike) {
      onLike(post.id);
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
    const validImages = validMediaUrls.filter(
      (url, i) => post.mediaTypes?.[i] !== "video",
    );
    if (validImages.length > 0) {
      const actualIndex = validMediaUrls.indexOf(validImages[0]);
      setInitialImageIndex(actualIndex);
      setPreviewImages(validImages);
    }
  };

  const handleVideoPress = (url: string) => {
    console.log("Playing video:", url);
    setPlayingVideo(url);
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

  // Filter out invalid URLs (local file paths)
  const validMediaUrls = (post.mediaUrls || []).filter((url) => {
    return (
      url &&
      url !== "" &&
      !url.startsWith("file://") &&
      !url.startsWith("/data/") &&
      (url.startsWith("http://") || url.startsWith("https://"))
    );
  });

  const isVideoType = (index: number): boolean => {
    return post.mediaTypes?.[index] === "video";
  };

  const renderMediaItem = (url: string, index: number) => {
    if (isVideoType(index)) {
      // Video - show thumbnail or placeholder
      return (
        <TouchableOpacity
          key={index}
          onPress={() => handleVideoPress(url)}
          activeOpacity={0.9}
          style={
            validMediaUrls.length === 1
              ? styles.singleImageWrapper
              : styles.multiImageWrapper
          }
        >
          <View style={styles.videoContainer}>
            {post.mediaThumbnails?.[index] ? (
              <Image
                source={{ uri: post.mediaThumbnails[index] }}
                style={
                  validMediaUrls.length === 1
                    ? styles.singleImage
                    : styles.multiImage
                }
                resizeMode="cover"
              />
            ) : (
              <View
                style={
                  validMediaUrls.length === 1
                    ? styles.videoPlaceholderLarge
                    : styles.videoPlaceholderSmall
                }
              >
                <Text style={styles.videoPlaceholderText}>🎬</Text>
              </View>
            )}
            <View
              style={
                validMediaUrls.length === 1
                  ? styles.playIconOverlay
                  : styles.playIconOverlaySmall
              }
            >
              <Text
                style={
                  validMediaUrls.length === 1
                    ? styles.playIcon
                    : styles.playIconSmall
                }
              >
                ▶️
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Image
    return (
      <TouchableOpacity
        key={index}
        onPress={() => handleImagePress(index)}
        activeOpacity={0.9}
        style={
          validMediaUrls.length === 1
            ? styles.singleImageWrapper
            : styles.multiImageWrapper
        }
      >
        <Image
          source={{ uri: url }}
          style={
            validMediaUrls.length === 1 ? styles.singleImage : styles.multiImage
          }
          resizeMode="cover"
          onError={(e) =>
            console.error(`Image ${index} load error:`, e.nativeEvent.error)
          }
        />
      </TouchableOpacity>
    );
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
          {post.author.avatarUrl && !avatarError ? (
            <Image
              source={{ uri: post.author.avatarUrl }}
              style={styles.avatar}
              onError={() => setAvatarError(true)}
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
      {post.content ? <Text style={styles.content}>{post.content}</Text> : null}

      {/* Media */}
      {validMediaUrls.length > 0 && (
        <View style={styles.mediaContainer}>
          {validMediaUrls.length === 1 ? (
            renderMediaItem(validMediaUrls[0], 0)
          ) : validMediaUrls.length === 2 ? (
            <View style={styles.twoImageRow}>
              {validMediaUrls.map((url, index) => renderMediaItem(url, index))}
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {validMediaUrls
                .slice(0, 4)
                .map((url, index) => renderMediaItem(url, index))}
              {validMediaUrls.length > 4 && (
                <View style={styles.moreImagesOverlay}>
                  <Text style={styles.moreImagesText}>
                    +{validMediaUrls.length - 4}
                  </Text>
                </View>
              )}
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

      {/* Video Player Modal */}
      <VideoPlayer
        videoUrl={playingVideo || ""}
        visible={playingVideo !== null}
        onClose={() => setPlayingVideo(null)}
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
  header: { marginBottom: 10 },
  authorInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#7C3AED" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  authorName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  verifiedBadge: { color: "#10B981", fontSize: 13, fontWeight: "700" },
  time: { fontSize: 11, color: "#9CA3AF" },
  content: { fontSize: 14, color: "#1F2937", lineHeight: 20, marginBottom: 10 },
  mediaContainer: { marginBottom: 10 },

  // Single media
  singleImageWrapper: { width: "100%" },
  singleImage: { width: "100%", height: 250, borderRadius: 10 },

  // Multiple media
  multiImageWrapper: { flex: 1, position: "relative" },
  multiImage: { width: "100%", height: 150, borderRadius: 8 },

  // Two images
  twoImageRow: { flexDirection: "row", gap: 4 },
  twoImage: { width: "100%", height: 200, borderRadius: 8 },

  // Grid
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    position: "relative",
  },
  gridItem: { width: "49%", height: 150, position: "relative" },
  gridImage: { width: "100%", height: "100%", borderRadius: 8 },

  // Video containers
  videoContainer: { position: "relative" },
  videoPlaceholderLarge: {
    width: "100%",
    height: 250,
    borderRadius: 10,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlaceholderSmall: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlaceholderText: { fontSize: 48 },

  // Play icon overlays
  playIconOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -25,
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { fontSize: 24 },
  playIconOverlaySmall: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  playIconSmall: { fontSize: 20 },

  // More images overlay
  moreImagesOverlay: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  moreImagesText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },

  // Actions
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
  actionIcon: { fontSize: 16 },
  likedIcon: { color: "#EF4444" },
  actionText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
});
