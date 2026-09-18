import { uploadToCloudinary } from "@/services/api/cloudinary";
import {
  createGroupPost,
  deleteGroupPost,
  getGroup,
  getGroupPosts,
  toggleGroupPostLike,
  updateGroupPost,
  type Group,
  type GroupPost,
} from "@/services/api/groups";
import { getUserData } from "@/services/storage/token";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SelectedImage {
  uri: string;
  mimeType: string;
}

export default function GroupDiscussionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = parseInt(id || "0", 10);

  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Create post state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [posting, setPosting] = useState(false);

  // Edit post state
  const [editingPost, setEditingPost] = useState<GroupPost | null>(null);
  const [editContent, setEditContent] = useState("");

  const loadData = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      const [groupData, userData] = await Promise.all([
        getGroup(groupId),
        getUserData(),
      ]);
      setGroup(groupData);
      if (userData) setCurrentUserId(userData.id);

      if (groupData.isMember) {
        const postsData = await getGroupPosts(groupId, pageNum, 10);
        if (refresh) {
          setPosts(postsData.posts);
        } else {
          setPosts((prev) => [...prev, ...postsData.posts]);
        }
        setHasMore(postsData.pagination.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Failed to load discussions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData(1, true);
    }, [groupId]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      loadData(page + 1);
    }
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4 - selectedImages.length,
      quality: 0.7,
    });

    if (!result.canceled) {
      const images = result.assets.map((a) => ({
        uri: a.uri,
        mimeType: a.mimeType || "image/jpeg",
      }));
      setSelectedImages((prev) => [...prev, ...images]);
    }
  };

  const handleCreatePost = async () => {
    if (!newContent.trim() && selectedImages.length === 0) {
      Alert.alert("Validation Error", "Please add some content or media");
      return;
    }

    setPosting(true);

    try {
      // Upload images first
      const uploadedUrls: string[] = [];
      const uploadedTypes: ("image" | "video")[] = [];

      for (const image of selectedImages) {
        const result = await uploadToCloudinary(
          image.uri,
          "image",
          image.mimeType,
          "sakhisphere/groups",
        );
        if (result.url) {
          uploadedUrls.push(result.url);
          uploadedTypes.push("image");
        }
      }

      const post = await createGroupPost(groupId, {
        content: newContent.trim(),
        mediaUrls: uploadedUrls,
        mediaTypes: uploadedTypes,
      });

      setPosts((prev) => [post, ...prev]);
      setNewContent("");
      setSelectedImages([]);
      setShowCreateModal(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = (post: GroupPost) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGroupPost(post.id);
            setPosts((prev) => prev.filter((p) => p.id !== post.id));
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to delete post");
          }
        },
      },
    ]);
  };

  const handleEditPost = async () => {
    if (!editingPost || !editContent.trim()) return;

    try {
      const updated = await updateGroupPost(editingPost.id, {
        content: editContent.trim(),
      });
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingPost(null);
      setEditContent("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update post");
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const isGroupAdmin = group?.myRole === "owner" || group?.myRole === "admin";

  const renderPost = ({ item }: { item: GroupPost }) => {
    const isMyPost = item.author?.id === currentUserId;
    const canDelete = isMyPost || isGroupAdmin;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={() =>
              item.author && router.push(`/user/${item.author.id}` as any)
            }
          >
            {item.author?.avatarUrl ? (
              <Image
                source={{ uri: item.author.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {item.author?.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.authorName}>{item.author?.name}</Text>
                {item.author?.isVerified && (
                  <Text style={styles.verified}>✓</Text>
                )}
              </View>
              <Text style={styles.time}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>

          {(isMyPost || canDelete) && (
            <TouchableOpacity
              onPress={() => {
                const options: any[] = [];
                if (isMyPost) {
                  options.push({
                    text: "Edit",
                    onPress: () => {
                      setEditingPost(item);
                      setEditContent(item.content);
                    },
                  });
                }
                if (canDelete) {
                  options.push({
                    text: "Delete",
                    style: "destructive",
                    onPress: () => handleDeletePost(item),
                  });
                }
                options.push({ text: "Cancel", style: "cancel" });
                Alert.alert("Post Options", "", options);
              }}
              style={styles.moreButton}
            >
              <Text style={styles.moreIcon}>•••</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Click post content to open detail */}
        <TouchableOpacity
          onPress={() => router.push(`/groups/posts/${item.id}` as any)}
          activeOpacity={0.7}
        >
          {item.content ? (
            <Text style={styles.postContent}>{item.content}</Text>
          ) : null}

          {item.mediaUrls.length > 0 && (
            <View style={styles.mediaGrid}>
              {item.mediaUrls.map((url, index) => (
                <Image
                  key={index}
                  source={{ uri: url }}
                  style={[
                    styles.postImage,
                    item.mediaUrls.length === 1 && styles.postImageSingle,
                  ]}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={async () => {
              try {
                const result = await toggleGroupPostLike(item.id);
                setPosts((prev) =>
                  prev.map((p) =>
                    p.id === item.id
                      ? {
                          ...p,
                          likedByMe: result.liked,
                          likesCount: result.likesCount,
                        }
                      : p,
                  ),
                );
              } catch (error) {
                console.error("Failed to like:", error);
              }
            }}
          >
            <Text style={styles.actionIcon}>
              {item.likedByMe ? "❤️" : "🤍"}
            </Text>
            <Text style={styles.actionText}>{item.likesCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/groups/posts/${item.id}` as any)}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>{item.commentsCount}</Text>
          </TouchableOpacity>
        </View>
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

  if (!group) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {group.name} Discussions
        </Text>
        {group.isMember ? (
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={styles.createButton}
            hitSlop={8}
          >
            <Text style={styles.createButtonText}>+ Post</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {!group.isMember ? (
        <View style={styles.notMemberContainer}>
          <Text style={styles.notMemberIcon}>🔒</Text>
          <Text style={styles.notMemberTitle}>Join to see discussions</Text>
          <Text style={styles.notMemberText}>
            You need to be a member of this group to view and participate in
            discussions.
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
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
              <ActivityIndicator
                color="#7C3AED"
                style={{ marginVertical: 20 }}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No discussions yet</Text>
              <Text style={styles.emptySubtext}>
                Be the first to start a discussion!
              </Text>
            </View>
          }
        />
      )}

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Post</Text>
              <TouchableOpacity onPress={handleCreatePost} disabled={posting}>
                <Text style={[styles.modalPost, posting && { opacity: 0.5 }]}>
                  {posting ? "Posting..." : "Post"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              <TextInput
                style={styles.postInput}
                placeholder="What's on your mind?"
                placeholderTextColor="#9CA3AF"
                value={newContent}
                onChangeText={setNewContent}
                multiline
                maxLength={5000}
                autoFocus
              />

              {selectedImages.length > 0 && (
                <ScrollView
                  horizontal
                  contentContainerStyle={{
                    gap: 8,
                    paddingHorizontal: 16,
                    paddingBottom: 12,
                  }}
                >
                  {selectedImages.map((img, index) => (
                    <View key={index} style={styles.selectedImageWrapper}>
                      <Image
                        source={{ uri: img.uri }}
                        style={styles.selectedImage}
                      />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() =>
                          setSelectedImages((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Text style={styles.removeImageText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              <TouchableOpacity
                style={styles.addImageButton}
                onPress={pickImages}
              >
                <Text style={styles.addImageIcon}>📷</Text>
                <Text style={styles.addImageText}>
                  Add Photos ({4 - selectedImages.length} left)
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={editingPost !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingPost(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditingPost(null)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Post</Text>
              <TouchableOpacity onPress={handleEditPost}>
                <Text style={styles.modalPost}>Save</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.postInput}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              maxLength={5000}
              autoFocus
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  createButton: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  createButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  listContent: { padding: 16, gap: 12 },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  authorInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
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
  moreButton: { padding: 4 },
  moreIcon: { fontSize: 18, color: "#6B7280" },
  postContent: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    marginBottom: 10,
  },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  postImage: { width: "49%", height: 140, borderRadius: 8 },
  postImageSingle: { width: "100%", height: 220 },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#111827" },
  emptySubtext: { fontSize: 14, color: "#6B7280", marginTop: 8 },
  notMemberContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  notMemberIcon: { fontSize: 64, marginBottom: 16 },
  notMemberTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  notMemberText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "75%",
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalCancel: { fontSize: 15, color: "#6B7280", fontWeight: "500" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  modalPost: { fontSize: 15, color: "#7C3AED", fontWeight: "700" },
  postInput: {
    minHeight: 120,
    fontSize: 15,
    color: "#111827",
    lineHeight: 22,
    padding: 16,
    textAlignVertical: "top",
  },
  selectedImageWrapper: { position: "relative" },
  selectedImage: { width: 90, height: 90, borderRadius: 10 },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  removeImageText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    borderWidth: 1.5,
    borderColor: "#D8B4FE",
  },
  addImageIcon: { fontSize: 18 },
  addImageText: { fontSize: 13, fontWeight: "600", color: "#7C3AED" },

  postActions: {
    flexDirection: "row",
    gap: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginTop: 8,
  },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionIcon: { fontSize: 16 },
  actionText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
});
