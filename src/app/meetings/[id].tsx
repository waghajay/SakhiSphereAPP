import {
    endMeeting,
    getMeeting,
    getParticipants,
    startMeeting,
    type AppMeeting,
    type MeetingParticipant
} from "@/services/api/meetings";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meetingId = parseInt(id || "0", 10);

  const [meeting, setMeeting] = useState<AppMeeting | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const [m, p] = await Promise.all([
        getMeeting(meetingId),
        getParticipants(meetingId),
      ]);
      setMeeting(m);
      setParticipants(p.participants);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load meeting");
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [meetingId]),
  );

  const handleJoin = () => {
    if (!meeting) return;
    router.push(`/meetings/${meeting.id}/room` as any);
  };

  const handleStart = async () => {
    if (!meeting) return;
    setActionLoading(true);
    try {
      await startMeeting(meeting.id);
      router.push(`/meetings/${meeting.id}/room` as any);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnd = () => {
    if (!meeting) return;
    Alert.alert("End Meeting", "End the meeting for everyone?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        style: "destructive",
        onPress: async () => {
          try {
            await endMeeting(meeting.id);
            await loadData();
          } catch (error: any) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Not scheduled";
    const d = new Date(dateString);
    return (
      d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }) +
      " at " +
      d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (!meeting) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Meeting
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
          />
        }
      >
        <View style={styles.infoCard}>
          <View style={styles.badgeRow}>
            {meeting.isLive && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>● LIVE NOW</Text>
              </View>
            )}
            {meeting.status === "ended" && (
              <View style={styles.endedBadge}>
                <Text style={styles.endedBadgeText}>ENDED</Text>
              </View>
            )}
            {meeting.isLiveStream && (
              <View style={styles.streamBadge}>
                <Text style={styles.streamBadgeText}>LIVE STREAM</Text>
              </View>
            )}
            {meeting.isInstant && (
              <View style={styles.instantBadge}>
                <Text style={styles.instantBadgeText}>INSTANT</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{meeting.title}</Text>

          {meeting.description && (
            <Text style={styles.description}>{meeting.description}</Text>
          )}

          <View style={styles.detailsBox}>
            {meeting.scheduledAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Scheduled</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(meeting.scheduledAt)}
                  </Text>
                </View>
              </View>
            )}

            {meeting.startedAt && (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>▶️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Started</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(meeting.startedAt)}
                  </Text>
                </View>
              </View>
            )}

            {meeting.host && (
              <TouchableOpacity
                style={styles.detailRow}
                onPress={() => router.push(`/user/${meeting.host!.id}` as any)}
              >
                <Text style={styles.detailIcon}>👤</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Host</Text>
                  <View style={styles.hostRow}>
                    {meeting.host.avatarUrl ? (
                      <Image
                        source={{ uri: meeting.host.avatarUrl }}
                        style={styles.hostAvatarSmall}
                      />
                    ) : (
                      <View style={styles.hostAvatarSmallFallback}>
                        <Text style={styles.hostAvatarSmallText}>
                          {meeting.host.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.detailValue}>{meeting.host.name}</Text>
                    {meeting.host.isVerified && (
                      <Text style={styles.verified}>✓</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>👥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Participants</Text>
                <Text style={styles.detailValue}>
                  {meeting.participantCount}
                  {meeting.maxParticipants
                    ? ` / ${meeting.maxParticipants}`
                    : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* Action button */}
          {meeting.status === "ended" ? (
            <View style={styles.endedBox}>
              <Text style={styles.endedText}>This meeting has ended</Text>
              {meeting.recordingUrl && (
                <TouchableOpacity style={styles.recordingButton}>
                  <Text style={styles.recordingButtonText}>
                    ▶ View Recording
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : meeting.isHost ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handleStart}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {meeting.isLive ? "▶ Join as Host" : "▶ Start Meeting"}
                  </Text>
                )}
              </TouchableOpacity>
              {meeting.isLive && (
                <TouchableOpacity style={styles.endButton} onPress={handleEnd}>
                  <Text style={styles.endButtonText}>End</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryButton,
                !meeting.canJoin && styles.disabledButton,
              ]}
              onPress={handleJoin}
              disabled={!meeting.canJoin}
            >
              <Text style={styles.primaryButtonText}>
                {meeting.canJoin ? "▶ Join Meeting" : "Not Invited"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Participants */}
        <View style={styles.participantsCard}>
          <Text style={styles.participantsTitle}>
            Participants ({participants.length})
          </Text>
          {participants.length === 0 ? (
            <Text style={styles.noParticipants}>No participants yet</Text>
          ) : (
            participants.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.participantItem}
                onPress={() => router.push(`/user/${p.id}` as any)}
              >
                {p.avatarUrl ? (
                  <Image
                    source={{ uri: p.avatarUrl }}
                    style={styles.participantAvatar}
                  />
                ) : (
                  <View style={styles.participantAvatarFallback}>
                    <Text style={styles.participantAvatarText}>
                      {p.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.participantName}>{p.name}</Text>
                  <Text style={styles.participantRole}>
                    {p.role === "host"
                      ? "👑 Host"
                      : p.role === "speaker"
                        ? "🎤 Speaker"
                        : "👁️ Audience"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  content: { padding: 16, gap: 12 },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  liveBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  endedBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  endedBadgeText: { color: "#6B7280", fontSize: 11, fontWeight: "800" },
  streamBadge: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  streamBadgeText: { color: "#7C3AED", fontSize: 11, fontWeight: "800" },
  instantBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  instantBadgeText: { color: "#10B981", fontSize: 11, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8 },
  description: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsBox: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 16,
  },
  detailRow: { flexDirection: "row", gap: 12 },
  detailIcon: { fontSize: 22, marginTop: 2 },
  detailLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailValue: { fontSize: 15, fontWeight: "600", color: "#111827" },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  hostAvatarSmall: { width: 24, height: 24, borderRadius: 12 },
  hostAvatarSmallFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  hostAvatarSmallText: { fontSize: 11, fontWeight: "700", color: "#7C3AED" },
  verified: { color: "#10B981", fontSize: 12, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 20 },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  primaryButton: { backgroundColor: "#7C3AED", flex: 1 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  endButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  endButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  disabledButton: { opacity: 0.5 },
  endedBox: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
  },
  endedText: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  recordingButton: {
    marginTop: 10,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  recordingButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  participantsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  participantsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  noParticipants: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 12,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  participantAvatar: { width: 40, height: 40, borderRadius: 20 },
  participantAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  participantAvatarText: { fontSize: 16, fontWeight: "700", color: "#7C3AED" },
  participantName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  participantRole: { fontSize: 12, color: "#6B7280", marginTop: 2 },
});
