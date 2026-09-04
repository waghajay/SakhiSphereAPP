// Update create-post.tsx - Complete fixed version
import { uploadToCloudinary } from "@/services/api/cloudinary";
import { createPost } from "@/services/api/posts";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
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

interface SelectedMedia {
  uri: string;
  type: "image" | "video";
  mimeType: string;
}

export default function CreatePostScreen() {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<
    "public" | "members_only" | "connections_only"
  >("public");
  const [mediaFiles, setMediaFiles] = useState<SelectedMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedImages = result.assets.map((asset) => ({
        uri: asset.uri,
        type: "image" as const,
        mimeType: asset.mimeType || "image/jpeg",
      }));
      setMediaFiles([...mediaFiles, ...selectedImages]);
    }
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your videos.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true, // Allow trimming
        quality: 0.3, // Very low quality for smaller file size
        videoMaxDuration: 15, // Limit to 15 seconds
      });

      if (!result.canceled) {
        const asset = result.assets[0];

        // Check file size if available
        if (asset.fileSize && asset.fileSize > 1024 * 1024 * 1024) {
          Alert.alert("Video Too Large", "Please select a video under 1GB.");
          return;
        }

        console.log("Video selected:", asset.uri, asset.mimeType);

        setMediaFiles([
          ...mediaFiles,
          {
            uri: asset.uri,
            type: "video" as const,
            mimeType: asset.mimeType || "video/mp4",
          },
        ]);
      }
    } catch (error) {
      console.error("Video picker error:", error);
      Alert.alert("Error", "Failed to select video. Please try again.");
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      Alert.alert(
        "Validation Error",
        "Please add some content or media to your post.",
      );
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];
      const uploadedTypes: ("image" | "video")[] = [];

      for (let i = 0; i < mediaFiles.length; i++) {
        const media = mediaFiles[i];
        setUploadProgress(`Uploading ${i + 1}/${mediaFiles.length}...`);

        try {
          const result = await uploadToCloudinary(
            media.uri,
            media.type,
            media.mimeType,
            "sakhisphere/posts",
          );

          if (result.url) {
            uploadedUrls.push(result.url);
            uploadedTypes.push(media.type);
            console.log(`Uploaded ${media.type} ${i + 1}:`, result.url);
          }
        } catch (uploadError) {
          console.error(
            `Failed to upload ${media.type} ${i + 1}:`,
            uploadError,
          );
        }
      }

      if (uploadedUrls.length === 0 && content.trim()) {
        // Text-only post
        const post = await createPost({
          content: content.trim(),
          mediaUrls: [],
          mediaTypes: [],
          visibility,
        });
      } else {
        const post = await createPost({
          content: content.trim(),
          mediaUrls: uploadedUrls,
          mediaTypes: uploadedTypes,
          visibility,
        });
      }

      Alert.alert("Success", "Your post has been created!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create post");
    } finally {
      setSubmitting(false);
      setUploading(false);
      setUploadProgress("");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Post</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || uploading}
            hitSlop={8}
          >
            <Text
              style={[
                styles.postText,
                (submitting || uploading) && styles.postTextDisabled,
              ]}
            >
              {uploading ? "Uploading..." : submitting ? "Posting..." : "Post"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Content Input */}
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
          <Text style={styles.charCount}>{content.length}/5000</Text>

          {/* Upload Progress */}
          {uploadProgress && (
            <View style={styles.progressContainer}>
              <ActivityIndicator color="#7C3AED" size="small" />
              <Text style={styles.progressText}>{uploadProgress}</Text>
            </View>
          )}

          {/* Media Preview */}
          {mediaFiles.length > 0 && (
            <View style={styles.mediaPreviewContainer}>
              {mediaFiles.map((media, index) => (
                <View key={index} style={styles.mediaPreviewWrapper}>
                  <Image
                    source={{ uri: media.uri }}
                    style={styles.mediaPreview}
                  />
                  <TouchableOpacity
                    style={styles.removeMediaBtn}
                    onPress={() => removeMedia(index)}
                  >
                    <Text style={styles.removeMediaText}>✕</Text>
                  </TouchableOpacity>
                  {media.type === "video" && (
                    <View style={styles.videoBadge}>
                      <Text style={styles.videoBadgeText}>▶ VIDEO</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Media Buttons */}
          <View style={styles.mediaButtons}>
            <TouchableOpacity style={styles.mediaButton} onPress={pickImages}>
              <Text style={styles.mediaButtonIcon}>📸</Text>
              <Text style={styles.mediaButtonText}>Add Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaButton} onPress={pickVideo}>
              <Text style={styles.mediaButtonIcon}>🎬</Text>
              <Text style={styles.mediaButtonText}>Add Video</Text>
            </TouchableOpacity>
          </View>

          {/* Visibility Selection */}
          <View style={styles.visibilitySection}>
            <Text style={styles.visibilityTitle}>Who can see this post?</Text>
            <View style={styles.visibilityOptions}>
              {[
                { value: "public", label: "Public", icon: "🌍" },
                { value: "members_only", label: "Members", icon: "👥" },
                { value: "connections_only", label: "Connections", icon: "🔗" },
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
                  >
                    <Text style={styles.visibilityIcon}>{option.icon}</Text>
                    <Text
                      style={[
                        styles.visibilityLabel,
                        isSelected && styles.visibilityLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
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
  postText: {
    fontSize: 16,
    color: "#7C3AED",
    fontWeight: "700",
  },
  postTextDisabled: {
    opacity: 0.5,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  contentInput: {
    minHeight: 120,
    fontSize: 16,
    color: "#111827",
    lineHeight: 24,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 4,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3E8FF",
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  progressText: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "600",
  },
  mediaPreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  mediaPreviewWrapper: {
    position: "relative",
    width: "48%",
  },
  mediaPreview: {
    width: "100%",
    height: 150,
    borderRadius: 12,
  },
  removeMediaBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  removeMediaText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
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
  mediaButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  mediaButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
  },
  mediaButtonIcon: {
    fontSize: 20,
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7C3AED",
  },
  visibilitySection: {
    marginTop: 24,
  },
  visibilityTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  visibilityOptions: {
    flexDirection: "row",
    gap: 8,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  visibilityOptionSelected: {
    backgroundColor: "#F3E8FF",
    borderColor: "#7C3AED",
  },
  visibilityIcon: {
    fontSize: 16,
  },
  visibilityLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  visibilityLabelSelected: {
    color: "#7C3AED",
    fontWeight: "700",
  },
});
