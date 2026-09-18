import { uploadToCloudinary } from "@/services/api/cloudinary";
import {
    deleteGroup,
    getCategories,
    getGroup,
    updateGroup,
    type Group,
} from "@/services/api/groups";
import * as ImagePicker from "expo-image-picker";
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

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = parseInt(id || "0", 10);

  const [group, setGroup] = useState<Group | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private" | "invite_only">(
    "public",
  );
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverChanged, setCoverChanged] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    try {
      const [groupData, cats] = await Promise.all([
        getGroup(groupId),
        getCategories(),
      ]);
      setGroup(groupData);
      setName(groupData.name);
      setDescription(groupData.description || "");
      setCategory(groupData.category || "");
      setPrivacy(groupData.privacy);
      setCategories(cats);
    } catch (error) {
      console.error("Failed to load group:", error);
      Alert.alert("Error", "Failed to load group settings");
    } finally {
      setLoading(false);
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
      setCoverChanged(true);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Group name is required");
      return;
    }

    setSaving(true);

    try {
      let coverUrl: string | undefined;

      // Upload new cover if changed
      if (coverChanged && coverUri) {
        const uploadResult = await uploadToCloudinary(
          coverUri,
          "image",
          "image/jpeg",
          "sakhisphere/groups",
        );
        coverUrl = uploadResult.url;
      }

      const updated = await updateGroup(groupId, {
        name: name.trim(),
        description: description.trim(),
        category: category || undefined,
        privacy,
        ...(coverUrl ? { coverUrl } : {}),
      });

      setGroup(updated);
      setCoverChanged(false);
      Alert.alert("Success", "Group updated successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Group",
      "This will permanently delete the group, all its posts, and remove all members. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGroup(groupId);
              Alert.alert("Success", "Group deleted successfully", [
                {
                  text: "OK",
                  onPress: () => router.replace("/groups" as any),
                },
              ]);
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete group");
            }
          },
        },
      ],
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

  const isOwner = group.myRole === "owner";
  const canEdit = isOwner || group.myRole === "admin";

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.deniedContainer}>
          <Text style={styles.deniedIcon}>🔒</Text>
          <Text style={styles.deniedTitle}>Access Denied</Text>
          <Text style={styles.deniedText}>
            Only the group owner or admins can access settings.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Settings</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={8}>
            <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover */}
          <TouchableOpacity style={styles.coverContainer} onPress={pickCover}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : group.coverUrl ? (
              <Image
                source={{ uri: group.coverUrl }}
                style={styles.coverImage}
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Text style={styles.coverIcon}>📷</Text>
                <Text style={styles.coverText}>Change Cover</Text>
              </View>
            )}
            <View style={styles.coverEditBadge}>
              <Text style={styles.coverEditText}>✏️ Edit</Text>
            </View>
          </TouchableOpacity>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Group Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              maxLength={100}
              placeholder="Group name"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.charCount}>{name.length}/100</Text>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
              placeholder="What is this group about?"
              placeholderTextColor="#9CA3AF"
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

          {/* Danger Zone */}
          {isOwner && (
            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>🗑️ Delete Group</Text>
              </TouchableOpacity>
              <Text style={styles.dangerHint}>
                Once deleted, the group cannot be recovered.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backText: { fontSize: 22, color: "#7C3AED", fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  saveText: { fontSize: 16, color: "#7C3AED", fontWeight: "700" },
  saveTextDisabled: { opacity: 0.5 },
  content: { padding: 20, paddingBottom: 60 },
  coverContainer: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    backgroundColor: "#F9FAFB",
  },
  coverImage: { width: "100%", height: "100%" },
  coverPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 16,
  },
  coverIcon: { fontSize: 32, marginBottom: 8 },
  coverText: { fontSize: 14, fontWeight: "600", color: "#7C3AED" },
  coverEditBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  coverEditText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
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
  dangerZone: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  dangerHint: {
    fontSize: 11,
    color: "#991B1B",
    textAlign: "center",
    marginTop: 8,
  },
  deniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  deniedIcon: { fontSize: 64, marginBottom: 16 },
  deniedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  deniedText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
