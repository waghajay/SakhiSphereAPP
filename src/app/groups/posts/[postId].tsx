import {
    createGroupPostComment,
    deleteGroupComment,
    getGroupCommentReplies,
    getGroupPost,
    getGroupPostComments,
    toggleGroupPostLike,
    updateGroupComment,
    type GroupPost,
    type GroupPostComment,
} from "@/services/api/groups";
import { getUserData } from "@/services/storage/token";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GroupPostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const id = parseInt(postId || "0", 10);

  const [post, setPost] = useState<GroupPost | null>(null);
  const [comments, setComments] = useState<GroupPostComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<GroupPostComment | null>(null);
  const [editingComment, setEditingComment] = useState<GroupPostComment | null>(
    null,
  );
  const [replies, setReplies] = useState<Record<number, GroupPostComment[]>>(
    {},
  );
  const [showRepliesFor, setShowRepliesFor] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [postData, commentsData, userData] = await Promise.all([
        getGroupPost(id),
        getGroupPostComments(id),
        getUserData(),
      ]);
      setPost(postData);
      setComments(commentsData.comments);
      if (userData) setCurrentUserId(userData.id);
    } catch (error) {
      console.error("Failed to load post:", error);
      Alert.alert("Error", "Failed to load post");
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleLike = async () => {
    if (!post) return;
    try {
      const result = await toggleGroupPostLike(post.id);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              likedByMe: result.liked,
              likesCount: result.likesCount,
            }
          : prev,
      );
    } catch (error) {
      console.error("Failed to like:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      if (editingComment) {
        const updated = await updateGroupComment(
          editingComment.id,
          newComment.trim(),
        );
        setComments((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        setEditingComment(null);
      } else {
        const created = await createGroupPostComment(id, {
          content: newComment.trim(),
          parentId: replyingTo?.id,
        });

        if (replyingTo) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === replyingTo.id
                ? { ...c, repliesCount: c.repliesCount + 1 }
                : c,
            ),
          );
          if (showRepliesFor === replyingTo.id) {
            setReplies((prev) => ({
              ...prev,
              [replyingTo.id]: [...(prev[replyingTo.id] || []), created],
            }));
          }
          setReplyingTo(null);
        } else {
          setComments((prev) => [created, ...prev]);
        }
      }

      setNewComment("");
      setPost((prev) =>
        prev
          ? {
              ...prev,
              commentsCount: prev.commentsCount + (editingComment ? 0 : 1),
            }
          : prev,
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (comment: GroupPostComment) => {
    Alert.alert("Delete Comment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGroupComment(comment.id);
            setComments((prev) => prev.filter((c) => c.id !== comment.id));
            setPost((prev) =>
              prev
                ? {
                    ...prev,
                    commentsCount: Math.max(0, prev.commentsCount - 1),
                  }
                : prev,
            );
          } catch (error: any) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };

  const handleToggleReplies = async (comment: GroupPostComment) => {
    if (showRepliesFor === comment.id) {
      setShowRepliesFor(null);
      return;
    }

    setShowRepliesFor(comment.id);

    if (!replies[comment.id]) {
      try {
        const data = await getGroupCommentReplies(comment.id);
        setReplies((prev) => ({ ...prev, [comment.id]: data.comments }));
      } catch (error) {
        console.error("Failed to load replies:", error);
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const renderComment = ({ item }: { item: GroupPostComment }) => {
    const isOwn = item.author?.id === currentUserId;
    const isShowingReplies = showRepliesFor === item.id;
    const commentReplies = replies[item.id] || [];

    return (
      <View style={styles.commentCard}>
        <View style={styles.commentHeader}>
          {item.author?.avatarUrl ? (
            <Image
              source={{ uri: item.author.avatarUrl }}
              style={styles.commentAvatar}
            />
          ) : (
            <View style={styles.commentAvatarFallback}>
              <Text style={styles.commentAvatarText}>
                {item.author?.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.commentAuthorName}>{item.author?.name}</Text>
              {item.author?.isVerified && (
                <Text style={styles.verified}>✓</Text>
              )}
            </View>
            <Text style={styles.commentTime}>{formatTime(item.createdAt)}</Text>
          </View>
          {isOwn && (
            <View style={styles.commentActions}>
              <TouchableOpacity
                onPress={() => {
                  setEditingComment(item);
                  setNewComment(item.content);
                }}
              >
                <Text style={styles.commentAction}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteComment(item)}>
                <Text style={[styles.commentAction, { color: "#EF4444" }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.commentContent}>{item.content}</Text>

        <View style={styles.commentFooter}>
          <TouchableOpacity onPress={() => setReplyingTo(item)}>
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>
          {item.repliesCount > 0 && (
            <TouchableOpacity onPress={() => handleToggleReplies(item)}>
              <Text style={styles.viewRepliesText}>
                {isShowingReplies
                  ? "Hide"
                  : `View ${item.repliesCount} replies`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isShowingReplies && commentReplies.length > 0 && (
          <View style={styles.repliesContainer}>
            {commentReplies.map((reply) => (
              <View key={reply.id} style={styles.replyItem}>
                <Text style={styles.replyAuthorName}>{reply.author?.name}</Text>
                <Text style={styles.replyContent}>{reply.content}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (!post) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
            />
          }
          ListHeaderComponent={
            <View>
              {/* Original post */}
              <View style={styles.postCard}>
                <View style={styles.postHeader}>
                  {post.author?.avatarUrl ? (
                    <Image
                      source={{ uri: post.author.avatarUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>
                        {post.author?.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.authorName}>{post.author?.name}</Text>
                      {post.author?.isVerified && (
                        <Text style={styles.verified}>✓</Text>
                      )}
                    </View>
                    <Text style={styles.time}>
                      {formatTime(post.createdAt)}
                    </Text>
                  </View>
                </View>

                {post.content ? (
                  <Text style={styles.postContent}>{post.content}</Text>
                ) : null}

                {post.mediaUrls.length > 0 && (
                  <View style={styles.mediaGrid}>
                    {post.mediaUrls.map((url, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setPreviewImage(url)}
                      >
                        <Image
                          source={{ uri: url }}
                          style={[
                            styles.postImage,
                            post.mediaUrls.length === 1 &&
                              styles.postImageSingle,
                          ]}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.postActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleLike}
                  >
                    <Text style={styles.actionIcon}>
                      {post.likedByMe ? "❤️" : "🤍"}
                    </Text>
                    <Text style={styles.actionText}>{post.likesCount}</Text>
                  </TouchableOpacity>
                  <View style={styles.actionButton}>
                    <Text style={styles.actionIcon}>💬</Text>
                    <Text style={styles.actionText}>{post.commentsCount}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.commentsHeader}>
                Comments ({post.commentsCount})
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment!</Text>
            </View>
          }
        />

        {/* Comment input */}
        <View style={styles.inputContainer}>
          {(replyingTo || editingComment) && (
            <View style={styles.replyingBanner}>
              <Text style={styles.replyingText}>
                {editingComment
                  ? "Editing comment"
                  : `Replying to ${replyingTo?.author?.name}`}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setReplyingTo(null);
                  setEditingComment(null);
                  setNewComment("");
                }}
              >
                <Text style={styles.cancelReply}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Write a comment..."
              placeholderTextColor="#9CA3AF"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newComment.trim() || submitting) && styles.sendButtonDisabled,
              ]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  listContent: { padding: 16, gap: 12, paddingBottom: 100 },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
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
  verified: { color: "#10B981", fontSize: 13, fontWeight: "700" },
  time: { fontSize: 11, color: "#9CA3AF" },
  postContent: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 22,
    marginBottom: 12,
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 12,
  },
  postImage: { width: 150, height: 150, borderRadius: 8 },
  postImageSingle: { width: "100%", height: 250 },
  postActions: {
    flexDirection: "row",
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionIcon: { fontSize: 18 },
  actionText: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  commentsHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  commentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: { fontSize: 13, fontWeight: "700", color: "#7C3AED" },
  commentAuthorName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  commentTime: { fontSize: 11, color: "#9CA3AF" },
  commentActions: { flexDirection: "row", gap: 12 },
  commentAction: { fontSize: 12, color: "#7C3AED", fontWeight: "600" },
  commentContent: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    marginBottom: 8,
  },
  commentFooter: { flexDirection: "row", gap: 16 },
  replyText: { fontSize: 12, color: "#7C3AED", fontWeight: "600" },
  viewRepliesText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  repliesContainer: {
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#E5E7EB",
    gap: 8,
  },
  replyItem: { backgroundColor: "#F9FAFB", borderRadius: 8, padding: 10 },
  replyAuthorName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  replyContent: { fontSize: 13, color: "#1F2937", lineHeight: 18 },
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#111827" },
  emptySubtext: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 12,
  },
  replyingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingText: { fontSize: 12, color: "#7C3AED", fontWeight: "600", flex: 1 },
  cancelReply: { fontSize: 14, color: "#7C3AED", fontWeight: "700" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    maxHeight: 100,
    backgroundColor: "#F9FAFB",
  },
  sendButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
