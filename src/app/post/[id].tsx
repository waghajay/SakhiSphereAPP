import {
  createComment,
  deleteComment,
  getCommentReplies,
  getPostComments,
  updateComment,
} from "@/services/api/comments";
import { toggleLike } from "@/services/api/likes";
import { deletePost, getPost } from "@/services/api/posts";
import { getUserData } from "@/services/storage/token";
import type { Comment, Post } from "@/types";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = parseInt(id || "0", 10);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showRepliesFor, setShowRepliesFor] = useState<number | null>(null);
  const [replies, setReplies] = useState<Record<number, Comment[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const likeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadPost();
    loadComments();
    loadCurrentUser();
  }, [postId]);

  const loadCurrentUser = async () => {
    const userData = await getUserData();
    if (userData) {
      setCurrentUserId(userData.id);
    }
  };

  const loadPost = async () => {
    try {
      const data = await getPost(postId);
      setPost(data);
    } catch (error) {
      console.error("Failed to load post:", error);
      Alert.alert("Error", "Failed to load post");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadComments = async () => {
    try {
      const data = await getPostComments(postId);
      setComments(data.comments);
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  };

  const handleLike = async () => {
    if (!post) return;
    try {
      const result = await toggleLike(post.id);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              likedByMe: result.liked,
              likesCount: result.likesCount,
            }
          : prev,
      );

      if (result.liked) {
        likeScale.setValue(0.5);
        Animated.spring(likeScale, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      await Share.share({
        message: `${post.content}\n\nShared from SakhiSphere 🌸`,
        title: "Share Post",
      });
      setShowOptionsModal(false);
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const handleDeletePost = () => {
    setShowDeleteModal(true);
    setShowOptionsModal(false);
  };

  const confirmDeletePost = async () => {
    setDeleting(true);
    setShowDeleteModal(false);
    try {
      await deletePost(postId);
      Alert.alert("Success", "Post deleted successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to delete post");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      if (editingComment) {
        const updated = await updateComment(
          editingComment.id,
          newComment.trim(),
        );
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === updated.id ? updated : comment,
          ),
        );
        setEditingComment(null);
      } else {
        const payload: any = { content: newComment.trim() };
        if (replyingTo) {
          payload.parentId = replyingTo.id;
        }

        const created = await createComment(postId, payload);

        if (replyingTo) {
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === replyingTo.id
                ? { ...comment, repliesCount: comment.repliesCount + 1 }
                : comment,
            ),
          );
          setReplyingTo(null);
          if (showRepliesFor === replyingTo.id) {
            setReplies((prev) => ({
              ...prev,
              [replyingTo.id]: [...(prev[replyingTo.id] || []), created],
            }));
          }
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
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = (comment: Comment) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment(comment.id);
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
              Alert.alert("Error", error.message || "Failed to delete comment");
            }
          },
        },
      ],
    );
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setReplyingTo(null);
    setNewComment(comment.content);
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    setEditingComment(null);
    setNewComment("");
  };

  const handleToggleReplies = async (comment: Comment) => {
    if (showRepliesFor === comment.id) {
      setShowRepliesFor(null);
      return;
    }

    setShowRepliesFor(comment.id);

    if (!replies[comment.id]) {
      setLoadingReplies(comment.id);
      try {
        const data = await getCommentReplies(comment.id);
        setReplies((prev) => ({ ...prev, [comment.id]: data.comments }));
      } catch (error) {
        console.error("Failed to load replies:", error);
      } finally {
        setLoadingReplies(null);
      }
    }
  };

  const cancelReplyOrEdit = () => {
    setReplyingTo(null);
    setEditingComment(null);
    setNewComment("");
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

  const renderComment = ({ item }: { item: Comment }) => {
    const isOwnComment = currentUserId === item.author.id;
    const isShowingReplies = showRepliesFor === item.id;
    const commentReplies = replies[item.id] || [];
    const isLoadingReplies = loadingReplies === item.id;

    return (
      <View style={styles.commentCard}>
        <View style={styles.commentHeader}>
          <View style={styles.commentAvatar}>
            <Text style={styles.commentAvatarText}>
              {item.author.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.commentNameRow}>
              <Text style={styles.commentAuthorName}>{item.author.name}</Text>
              {item.author.isVerified && (
                <Text style={styles.verifiedBadge}>✓</Text>
              )}
            </View>
            <Text style={styles.commentTime}>
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>
          {isOwnComment && (
            <View style={styles.commentActions}>
              <TouchableOpacity
                onPress={() => handleEditComment(item)}
                style={styles.commentActionBtn}
              >
                <Text style={styles.commentActionText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteComment(item)}
                style={styles.commentActionBtn}
              >
                <Text style={styles.commentActionText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.commentContent}>{item.content}</Text>

        {item.parentId === null && (
          <View style={styles.commentFooter}>
            <TouchableOpacity onPress={() => handleReply(item)}>
              <Text style={styles.replyText}>Reply</Text>
            </TouchableOpacity>
            {item.repliesCount > 0 && (
              <TouchableOpacity onPress={() => handleToggleReplies(item)}>
                <Text style={styles.viewRepliesText}>
                  {isShowingReplies
                    ? "Hide replies"
                    : `View ${item.repliesCount} replies`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isShowingReplies && (
          <View style={styles.repliesContainer}>
            {isLoadingReplies ? (
              <ActivityIndicator
                color="#7C3AED"
                style={{ marginVertical: 10 }}
              />
            ) : commentReplies.length > 0 ? (
              commentReplies.map((reply) => (
                <View key={reply.id} style={styles.replyCard}>
                  <View style={styles.replyHeader}>
                    <View style={styles.replyAvatar}>
                      <Text style={styles.replyAvatarText}>
                        {reply.author.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.replyAuthorName}>
                        {reply.author.name}
                      </Text>
                      <Text style={styles.replyTime}>
                        {formatRelativeTime(reply.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.replyContent}>{reply.content}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noRepliesText}>No replies yet</Text>
            )}
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

  if (!post) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Post not found</Text>
      </SafeAreaView>
    );
  }

  const isOwnPost = currentUserId === post.author.id;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.headerBtn}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          {isOwnPost ? (
            <TouchableOpacity
              onPress={() => setShowOptionsModal(true)}
              hitSlop={8}
              style={styles.headerBtn}
            >
              <Text style={styles.moreIcon}>•••</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadPost();
                loadComments();
              }}
              colors={["#7C3AED"]}
            />
          }
          ListHeaderComponent={
            <View>
              {/* Post Card */}
              <View style={styles.postCard}>
                <View style={styles.postHeader}>
                  <TouchableOpacity
                    style={styles.authorInfo}
                    onPress={() =>
                      router.push(`/user/${post.author.id}` as any)
                    }
                  >
                    {post.author.avatarUrl ? (
                      <Image
                        source={{ uri: post.author.avatarUrl }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {post.author.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View>
                      <View style={styles.nameRow}>
                        <Text style={styles.authorName}>
                          {post.author.name}
                        </Text>
                        {post.author.isVerified && (
                          <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedBadgeText}>✓</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.postTime}>
                        {new Date(post.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <Text style={styles.postContent}>{post.content}</Text>

                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <View style={styles.mediaContainer}>
                    {post.mediaUrls.map((url, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setPreviewImage(url)}
                        activeOpacity={0.9}
                      >
                        <Image
                          source={{ uri: url }}
                          style={[
                            styles.postImage,
                            post.mediaUrls!.length > 1 && styles.multiImage,
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
                    <Animated.Text
                      style={[
                        styles.actionIcon,
                        post.likedByMe && styles.likedIcon,
                        { transform: [{ scale: likeScale }] },
                      ]}
                    >
                      {post.likedByMe ? "❤️" : "🤍"}
                    </Animated.Text>
                    <Text style={styles.actionText}>{post.likesCount}</Text>
                  </TouchableOpacity>

                  <View style={styles.actionButton}>
                    <Text style={styles.actionIcon}>💬</Text>
                    <Text style={styles.actionText}>{post.commentsCount}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleShare}
                  >
                    <Text style={styles.actionIcon}>↗️</Text>
                    <Text style={styles.actionText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Comments Header */}
              <Text style={styles.commentsHeader}>
                Comments ({post.commentsCount})
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>
                Be the first to comment on this post!
              </Text>
            </View>
          }
        />

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          {(replyingTo || editingComment) && (
            <View style={styles.replyingBanner}>
              <Text style={styles.replyingText}>
                {editingComment
                  ? "Editing comment"
                  : `Replying to ${replyingTo?.author.name}`}
              </Text>
              <TouchableOpacity onPress={cancelReplyOrEdit}>
                <Text style={styles.cancelReplyText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder={
                editingComment
                  ? "Edit your comment..."
                  : replyingTo
                    ? `Reply to ${replyingTo.author.name}...`
                    : "Write a comment..."
              }
              placeholderTextColor="#9CA3AF"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newComment.trim() || submittingComment) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.optionsModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Post Options</Text>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setShowOptionsModal(false);
                router.push(`/edit-post/${post.id}` as any);
              }}
            >
              <View style={[styles.optionIcon, { backgroundColor: "#F3E8FF" }]}>
                <Text style={styles.optionIconText}>✏️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>Edit Post</Text>
                <Text style={styles.optionDesc}>
                  Update content or visibility
                </Text>
              </View>
              <Text style={styles.optionArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={handleShare}>
              <View style={[styles.optionIcon, { backgroundColor: "#DBEAFE" }]}>
                <Text style={styles.optionIconText}>↗️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionLabel}>Share Post</Text>
                <Text style={styles.optionDesc}>Share with others</Text>
              </View>
              <Text style={styles.optionArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.deleteOption]}
              onPress={handleDeletePost}
            >
              <View style={[styles.optionIcon, { backgroundColor: "#FEE2E2" }]}>
                <Text style={styles.optionIconText}>🗑️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, styles.deleteLabel]}>
                  Delete Post
                </Text>
                <Text style={styles.optionDesc}>
                  Permanently remove this post
                </Text>
              </View>
              <Text style={styles.optionArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalIcon}>
              <Text style={styles.deleteModalIconText}>🗑️</Text>
            </View>
            <Text style={styles.deleteModalTitle}>Delete Post?</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelBtn}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={confirmDeletePost}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={previewImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.previewModal}>
          <TouchableOpacity
            style={styles.previewCloseButton}
            onPress={() => setPreviewImage(null)}
          >
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
  errorText: {
    fontSize: 16,
    color: "#6B7280",
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
  headerBtn: {
    width: 40,
    alignItems: "center",
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
    fontSize: 20,
    color: "#111827",
    fontWeight: "700",
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  postHeader: {
    marginBottom: 12,
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
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
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
    fontSize: 12,
    color: "#6B7280",
  },
  postContent: {
    fontSize: 15,
    color: "#1F2937",
    lineHeight: 22,
    marginBottom: 12,
  },
  mediaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 12,
  },
  postImage: {
    width: "100%",
    height: 250,
    borderRadius: 12,
  },
  multiImage: {
    width: "49%",
    height: 150,
    borderRadius: 8,
  },
  postActions: {
    flexDirection: "row",
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionIcon: {
    fontSize: 18,
  },
  likedIcon: {
    color: "#EF4444",
  },
  actionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
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
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7C3AED",
  },
  commentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  commentTime: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  commentActions: {
    flexDirection: "row",
    gap: 8,
  },
  commentActionBtn: {
    padding: 4,
  },
  commentActionText: {
    fontSize: 14,
  },
  commentContent: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    marginBottom: 8,
  },
  commentFooter: {
    flexDirection: "row",
    gap: 16,
  },
  replyText: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "600",
  },
  viewRepliesText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  repliesContainer: {
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#E5E7EB",
    gap: 8,
  },
  replyCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  replyAvatarText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7C3AED",
  },
  replyAuthorName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  replyTime: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  replyContent: {
    fontSize: 13,
    color: "#1F2937",
    lineHeight: 18,
  },
  noRepliesText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  commentInputContainer: {
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
  replyingText: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "600",
    flex: 1,
  },
  cancelReplyText: {
    fontSize: 14,
    color: "#7C3AED",
    fontWeight: "700",
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  commentInput: {
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
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  optionsModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconText: {
    fontSize: 18,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  optionDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  optionArrow: {
    fontSize: 18,
    color: "#9CA3AF",
  },
  deleteOption: {
    borderBottomWidth: 0,
  },
  deleteLabel: {
    color: "#EF4444",
  },
  deleteModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "90%",
    maxWidth: 400,
    alignSelf: "center",
    marginTop: "50%",
  },
  deleteModalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  deleteModalIconText: {
    fontSize: 28,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  deleteModalMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  deleteCancelBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  deleteConfirmBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  previewModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCloseText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  previewImage: {
    width: width,
    height: height * 0.8,
  },
});
