import { DateTimePickerField } from "@/components/DateTimePicker";
import { uploadToCloudinary } from "@/services/api/cloudinary";
import { createEvent } from "@/services/api/events";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateEventScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [capacity, setCapacity] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);

  // Native date/time pickers
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);

  const [loading, setLoading] = useState(false);

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
    if (!title.trim()) {
      Alert.alert("Validation", "Event title is required");
      return;
    }

    if (!startAt) {
      Alert.alert("Validation", "Please select a start date and time");
      return;
    }

    if (endAt && endAt < startAt) {
      Alert.alert("Validation", "End time must be after start time");
      return;
    }

    setLoading(true);

    try {
      let coverUrl: string | undefined;
      if (coverUri) {
        const uploadResult = await uploadToCloudinary(
          coverUri,
          "image",
          "image/jpeg",
          "sakhisphere/events",
        );
        coverUrl = uploadResult.url;
      }

      const capNum = capacity.trim() ? parseInt(capacity, 10) : null;
      if (capNum !== null && (isNaN(capNum) || capNum < 1)) {
        Alert.alert("Validation", "Capacity must be a positive number");
        setLoading(false);
        return;
      }

      const event = await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        coverUrl,
        startAt: startAt.toISOString(),
        endAt: endAt ? endAt.toISOString() : null,
        location: isVirtual ? undefined : location.trim() || undefined,
        isVirtual,
        meetingUrl: isVirtual ? meetingUrl.trim() || undefined : undefined,
        capacity: capNum,
      });

      Alert.alert("Success", "Event created!", [
        {
          text: "OK",
          onPress: () => router.replace(`/events/${event.id}` as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create event");
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Event</Text>
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
          <TouchableOpacity style={styles.coverContainer} onPress={pickCover}>
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

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Women in Tech Meetup"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's the event about?"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={2000}
            />
          </View>

          {/* Start Date/Time — NATIVE PICKER */}
          <DateTimePickerField
            label="Start Date & Time *"
            value={startAt}
            onChange={setStartAt}
            mode="datetime"
            minimumDate={new Date()}
          />

          {/* End Date/Time — NATIVE PICKER */}
          <DateTimePickerField
            label="End Date & Time (optional)"
            value={endAt}
            onChange={setEndAt}
            mode="datetime"
            minimumDate={startAt || new Date()}
            optional
          />

          {/* Virtual toggle */}
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Virtual Event</Text>
              <Text style={styles.switchHint}>
                Online-only (no physical location)
              </Text>
            </View>
            <Switch
              value={isVirtual}
              onValueChange={setIsVirtual}
              trackColor={{ false: "#E5E7EB", true: "#C4B5FD" }}
              thumbColor={isVirtual ? "#7C3AED" : "#F3F4F6"}
            />
          </View>

          {/* Location OR Meeting URL */}
          {isVirtual ? (
            <View style={styles.field}>
              <Text style={styles.label}>Meeting URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://meet.example.com/room"
                placeholderTextColor="#9CA3AF"
                value={meetingUrl}
                onChangeText={setMeetingUrl}
                autoCapitalize="none"
              />
            </View>
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Central Park, Mumbai"
                placeholderTextColor="#9CA3AF"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          )}

          {/* Capacity */}
          <View style={styles.field}>
            <Text style={styles.label}>Capacity (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Leave empty for unlimited"
              placeholderTextColor="#9CA3AF"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="number-pad"
            />
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
  content: { padding: 20, paddingBottom: 60 },
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
  field: { marginBottom: 20 },
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  switchLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  switchHint: { fontSize: 12, color: "#6B7280", marginTop: 2 },
});
