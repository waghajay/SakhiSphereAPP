import { DateTimePickerField } from "@/components/DateTimePicker";
import { uploadToCloudinary } from "@/services/api/cloudinary";
import {
    deleteEvent,
    getEvent,
    updateEvent,
    type AppEvent,
} from "@/services/api/events";
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
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = parseInt(id || "0", 10);

  const [event, setEvent] = useState<AppEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [capacity, setCapacity] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverChanged, setCoverChanged] = useState(false);

  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const data = await getEvent(eventId);

      // Guard: only organizer can edit
      if (!data.isOrganizer) {
        Alert.alert("Access Denied", "Only the organizer can edit this event.");
        router.back();
        return;
      }

      setEvent(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setLocation(data.location || "");
      setIsVirtual(data.isVirtual);
      setMeetingUrl(data.meetingUrl || "");
      setCapacity(data.capacity ? data.capacity.toString() : "");
      setStartAt(new Date(data.startAt));
      setEndAt(data.endAt ? new Date(data.endAt) : null);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load event");
      router.back();
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
    if (!title.trim()) {
      Alert.alert("Validation", "Title is required");
      return;
    }
    if (!startAt) {
      Alert.alert("Validation", "Start date/time is required");
      return;
    }
    if (endAt && endAt < startAt) {
      Alert.alert("Validation", "End time must be after start time");
      return;
    }

    setSaving(true);

    try {
      let coverUrl: string | undefined;
      if (coverChanged && coverUri) {
        const uploadResult = await uploadToCloudinary(
          coverUri,
          "image",
          "image/jpeg",
          "sakhisphere/events",
        );
        coverUrl = uploadResult.url;
      }

      const capNum = capacity.trim() ? parseInt(capacity, 10) : null;

      await updateEvent(eventId, {
        title: title.trim(),
        description: description.trim(),
        startAt: startAt.toISOString(),
        endAt: endAt ? endAt.toISOString() : null,
        location: isVirtual ? undefined : location.trim() || undefined,
        isVirtual,
        meetingUrl: isVirtual ? meetingUrl.trim() || undefined : undefined,
        capacity: capNum,
        ...(coverUrl ? { coverUrl } : {}),
      });

      Alert.alert("Success", "Event updated!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Event",
      "This will permanently delete the event and all RSVPs. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent(eventId);
              Alert.alert("Deleted", "Event deleted", [
                {
                  text: "OK",
                  onPress: () => router.replace("/events" as any),
                },
              ]);
            } catch (error: any) {
              Alert.alert("Error", error.message);
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

  if (!event) return null;

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
          <Text style={styles.headerTitle}>Edit Event</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={8}>
            <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>
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
            ) : event.coverUrl ? (
              <Image
                source={{ uri: event.coverUrl }}
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

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
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
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={2000}
            />
          </View>

          {/* Start / End pickers */}
          <DateTimePickerField
            label="Start Date & Time *"
            value={startAt}
            onChange={setStartAt}
            mode="datetime"
          />
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
              <Text style={styles.switchHint}>Online-only</Text>
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
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="number-pad"
              placeholder="Unlimited"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Danger Zone */}
          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>Danger Zone</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Text style={styles.deleteButtonText}>🗑️ Delete Event</Text>
            </TouchableOpacity>
          </View>
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
  cancelText: { fontSize: 16, color: "#6B7280", fontWeight: "500" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  saveText: { fontSize: 16, color: "#7C3AED", fontWeight: "700" },
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
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  coverEditText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
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
});
