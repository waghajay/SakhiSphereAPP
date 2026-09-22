import { DateTimePickerField } from "@/components/DateTimePicker";
import { createMeeting } from "@/services/api/meetings";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
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

export default function CreateMeetingScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isInstant, setIsInstant] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [maxParticipants, setMaxParticipants] = useState("");
  const [isLiveStream, setIsLiveStream] = useState(false);
  const [loading, setLoading] = useState(false);

  const params = useLocalSearchParams<{
    groupId?: string;
    groupName?: string;
    eventId?: string;
    eventTitle?: string;
  }>();

  const prefilledGroupId = params.groupId
    ? parseInt(params.groupId, 10)
    : undefined;
  const prefilledEventId = params.eventId
    ? parseInt(params.eventId, 10)
    : undefined;

  useEffect(() => {
    if (params.groupName && !title) {
      setTitle(`${params.groupName} Meeting`);
    }
    if (params.eventTitle && !title) {
      setTitle(`${params.eventTitle} Meeting`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Meeting title is required");
      return;
    }

    if (!isInstant && !scheduledAt) {
      Alert.alert(
        "Validation",
        "Please select a scheduled date & time, or toggle Instant",
      );
      return;
    }

    const capNum = maxParticipants.trim()
      ? parseInt(maxParticipants, 10)
      : null;

    if (capNum !== null && (isNaN(capNum) || capNum < 2 || capNum > 100)) {
      Alert.alert("Validation", "Max participants must be between 2 and 100");
      return;
    }

    setLoading(true);

    try {
      const meeting = await createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        isInstant,
        scheduledAt: isInstant ? null : scheduledAt?.toISOString() || null,
        maxParticipants: capNum,
        isLiveStream,
        groupId: prefilledGroupId ?? null,
        eventId: prefilledEventId ?? null,
      });

      Alert.alert("Success", "Meeting created!", [
        {
          text: "OK",
          onPress: () => router.replace(`/meetings/${meeting.id}` as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create meeting");
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
          <Text style={styles.headerTitle}>New Meeting</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={loading}
            hitSlop={8}
          >
            <Text style={[styles.createText, loading && { opacity: 0.5 }]}>
              {loading ? "Creating..." : "Create"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {(prefilledGroupId || prefilledEventId) && (
            <View style={styles.contextBanner}>
              <Text style={styles.contextBannerText}>
                📎 Linked to{" "}
                {params.groupName
                  ? `group "${params.groupName}"`
                  : `event "${params.eventTitle || ""}"`}
              </Text>
            </View>
          )}

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Instant Meeting</Text>
              <Text style={styles.switchHint}>
                Start immediately, invite people later
              </Text>
            </View>
            <Switch
              value={isInstant}
              onValueChange={setIsInstant}
              trackColor={{ false: "#E5E7EB", true: "#C4B5FD" }}
              thumbColor={isInstant ? "#7C3AED" : "#F3F4F6"}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Weekly Check-in"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Agenda, topics, etc."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={1000}
            />
          </View>

          {!isInstant && (
            <DateTimePickerField
              label="Scheduled Date & Time *"
              value={scheduledAt}
              onChange={setScheduledAt}
              mode="datetime"
              minimumDate={new Date()}
            />
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Max Participants (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="2–100 (leave empty for default)"
              placeholderTextColor="#9CA3AF"
              value={maxParticipants}
              onChangeText={setMaxParticipants}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Live Stream Mode</Text>
              <Text style={styles.switchHint}>
                Audience can only view (no camera/mic for them)
              </Text>
            </View>
            <Switch
              value={isLiveStream}
              onValueChange={setIsLiveStream}
              trackColor={{ false: "#E5E7EB", true: "#C4B5FD" }}
              thumbColor={isLiveStream ? "#7C3AED" : "#F3F4F6"}
            />
          </View>

          <Text style={styles.note}>
            💡 You'll be the host. Other members can be invited after creating
            the meeting.
          </Text>
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
  content: { padding: 20, paddingBottom: 60 },
  contextBanner: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  contextBannerText: { fontSize: 13, color: "#7C3AED", fontWeight: "600" },
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
  textArea: { minHeight: 80, textAlignVertical: "top" },
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
  note: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
  },
});
