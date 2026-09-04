import { deletePost, getPost, updatePost } from "@/services/api/posts";
import type { Post } from "@/types";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = parseInt(id || "0", 10);

  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<
    "public" | "members_only" | "connections_only"
  >("public");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    try {
      const data = await getPost(postId);
      setPost(data);
      setContent(data.content);
      setVisibility(data.visibility);
    } catch (error) {
      console.error("Failed to load post:", error);
      Alert.alert("Error", "Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert("Validation Error", "Post content cannot be empty");
      return;
    }

    if (content.length > 5000) {
      Alert.alert(
        "Validation Error",
        "Post content must be less than 5000 characters",
      );
      return;
    }

    setSaving(true);
    try {
      await updatePost(postId, {
        content: content.trim(),
        visibility,
      });

      Alert.alert("Success", "Post updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update post");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setShowDeleteConfirm(false);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading post...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Post</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={8}>
            <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Content Input Card */}
          <View style={styles.inputCard}>
            <TextInput
              style={styles.contentInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
              maxLength={5000}
            />
            <View style={styles.charCountRow}>
              <Text style={styles.charCount}>
                {content.length}/5000 characters
              </Text>
            </View>
          </View>

          {/* Existing Media */}
          {post?.mediaUrls && post.mediaUrls.length > 0 && (
            <View style={styles.mediaSection}>
              <Text style={styles.sectionTitle}>Post Media</Text>
              <View style={styles.mediaContainer}>
                {post.mediaUrls.map((url, index) => (
                  <View key={index} style={styles.mediaWrapper}>
                    <Image source={{ uri: url }} style={styles.mediaImage} />
                    {post.mediaTypes && post.mediaTypes[index] === "video" && (
                      <View style={styles.videoBadge}>
                        <Text style={styles.videoBadgeText}>▶ VIDEO</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              <Text style={styles.mediaNote}>
                💡 Media cannot be changed in edit mode. Delete and recreate the
                post to change media.
              </Text>
            </View>
          )}

          {/* Visibility Selection */}
          <View style={styles.visibilitySection}>
            <Text style={styles.sectionTitle}>Who can see this post?</Text>
            <Text style={styles.sectionSubtitle}>
              Control who has access to view this post
            </Text>
            <View style={styles.visibilityOptions}>
              {[
                {
                  value: "public",
                  label: "Public",
                  icon: "🌍",
                  desc: "Everyone",
                },
                {
                  value: "members_only",
                  label: "Members",
                  icon: "👥",
                  desc: "Members only",
                },
                {
                  value: "connections_only",
                  label: "Connections",
                  icon: "🔗",
                  desc: "Your connections",
                },
              ].map((option) => {
                const isSelected = visibility === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.visibilityOption,
                      isSelected && styles.visibilityOptionSelected,
                    ]}
                    onPress={() => setVisibility(option.value as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.visibilityOptionHeader}>
                      <Text style={styles.visibilityIcon}>{option.icon}</Text>
                      <Text
                        style={[
                          styles.visibilityLabel,
                          isSelected && styles.visibilityLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.checkmarkBadge}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.visibilityDesc}>{option.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsSection}>
            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving || deleting}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.saveButtonIcon}>💾</Text>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              style={[styles.deleteButton, deleting && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={saving || deleting}
              activeOpacity={0.8}
            >
              {deleting ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <>
                  <Text style={styles.deleteButtonIcon}>🗑️</Text>
                  <Text style={styles.deleteButtonText}>Delete Post</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Warning Note */}
          <View style={styles.warningNote}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Deleting a post is permanent and cannot be undone. All likes and
              comments will also be removed.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>🗑️</Text>
            </View>
            <Text style={styles.modalTitle}>Delete Post?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={confirmDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
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
  cancelText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  saveText: {
    fontSize: 16,
    color: "#7C3AED",
    fontWeight: "700",
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  contentInput: {
    minHeight: 120,
    fontSize: 16,
    color: "#111827",
    lineHeight: 24,
    textAlignVertical: "top",
  },
  charCountRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  mediaSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  mediaContainer: {
    gap: 8,
  },
  mediaWrapper: {
    position: "relative",
  },
  mediaImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  videoBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  videoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  mediaNote: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 16,
  },
  visibilitySection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  visibilityOptions: {
    gap: 10,
  },
  visibilityOption: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  visibilityOptionSelected: {
    backgroundColor: "#F3E8FF",
    borderColor: "#7C3AED",
  },
  visibilityOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  visibilityIcon: {
    fontSize: 18,
  },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  visibilityLabelSelected: {
    color: "#7C3AED",
    fontWeight: "700",
  },
  checkmarkBadge: {
    backgroundColor: "#7C3AED",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  visibilityDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    marginLeft: 26,
  },
  actionButtonsSection: {
    gap: 12,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveButtonIcon: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    paddingVertical: 16,
  },
  deleteButtonIcon: {
    fontSize: 18,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EF4444",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  warningNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  warningIcon: {
    fontSize: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalIcon: {
    fontSize: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
