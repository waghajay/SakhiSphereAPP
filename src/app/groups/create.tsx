import { uploadToCloudinary } from "@/services/api/cloudinary";
import { createGroup, getCategories } from "@/services/api/groups";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateGroupScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private" | "invite_only">(
    "public",
  );
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const pickCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Group name is required");
      return;
    }

    setLoading(true);

    try {
      let coverUrl: string | undefined;

      // Upload cover if selected
      if (coverUri) {
        setUploadingCover(true);
        try {
          const uploadResult = await uploadToCloudinary(
            coverUri,
            "image",
            "image/jpeg",
            "sakhisphere/groups",
          );
          coverUrl = uploadResult.url;
        } catch (error) {
          console.error("Failed to upload cover:", error);
          Alert.alert(
            "Notice",
            "Failed to upload cover image. Creating group without cover.",
          );
        } finally {
          setUploadingCover(false);
        }
      }

      const group = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        privacy,
        coverUrl,
      });

      Alert.alert("Success", "Group created successfully!", [
        {
          text: "OK",
          onPress: () => router.replace(`/groups/${group.id}` as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create group");
    } finally {
      setLoading(false);
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
          <Text style={styles.headerTitle}>Create Group</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={loading}
            hitSlop={8}
          >
            <Text
              style={[styles.createText, loading && styles.createTextDisabled]}
            >
              {loading ? "Creating..." : "Create"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover */}
          <TouchableOpacity
            style={styles.coverContainer}
            onPress={pickCover}
            disabled={uploadingCover}
          >
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Text style={styles.coverIcon}>📷</Text>
                <Text style={styles.coverText}>Add Cover Image</Text>
                <Text style={styles.coverHint}>Optional</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Group Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Women in Tech"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              maxLength={100}
            />
            <Text style={styles.charCount}>{name.length}/100</Text>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What is this group about?"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat === category ? "" : cat)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      category === cat && styles.categoryTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Privacy */}
          <View style={styles.field}>
            <Text style={styles.label}>Privacy</Text>
            <View style={styles.privacyOptions}>
              {[
                {
                  value: "public",
                  label: "Public",
                  icon: "🌍",
                  desc: "Anyone can join",
                },
                {
                  value: "private",
                  label: "Private",
                  icon: "🔒",
                  desc: "Anyone can see, only members can post",
                },
                {
                  value: "invite_only",
                  label: "Invite Only",
                  icon: "✉️",
                  desc: "Only invited members",
                },
              ].map((opt) => {
                const isSelected = privacy === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.privacyOption,
                      isSelected && styles.privacyOptionActive,
                    ]}
                    onPress={() => setPrivacy(opt.value as any)}
                  >
                    <Text style={styles.privacyIcon}>{opt.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.privacyLabel,
                          isSelected && styles.privacyLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.privacyDesc}>{opt.desc}</Text>
                    </View>
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
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
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cancelText: { fontSize: 16, color: "#6B7280", fontWeight: "500" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  createText: { fontSize: 16, color: "#7C3AED", fontWeight: "700" },
  createTextDisabled: { opacity: 0.5 },
  content: { padding: 20, paddingBottom: 40 },
  coverContainer: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  coverImage: { width: "100%", height: "100%" },
  coverPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  coverIcon: { fontSize: 32, marginBottom: 8 },
  coverText: { fontSize: 14, fontWeight: "600", color: "#7C3AED" },
  coverHint: { fontSize: 12, color: "#9CA3AF" },
  field: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  charCount: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 4,
  },
  categoriesScroll: { gap: 8, paddingRight: 16 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: { backgroundColor: "#F3E8FF", borderColor: "#7C3AED" },
  categoryText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  categoryTextActive: { color: "#7C3AED", fontWeight: "700" },
  privacyOptions: { gap: 10 },
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  privacyOptionActive: { backgroundColor: "#F3E8FF", borderColor: "#7C3AED" },
  privacyIcon: { fontSize: 22 },
  privacyLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  privacyLabelActive: { color: "#7C3AED", fontWeight: "700" },
  privacyDesc: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  checkIcon: { fontSize: 18, color: "#7C3AED", fontWeight: "700" },
});
