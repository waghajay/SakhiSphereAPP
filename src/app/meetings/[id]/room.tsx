import { AgoraRoom } from "@/components/AgoraRoom";
import {
  endMeeting,
  getAgoraToken,
  getMeeting,
  joinMeetingApi,
  leaveMeetingApi,
  type AgoraTokenResponse,
  type AppMeeting,
} from "@/services/api/meetings";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MeetingRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const meetingId = parseInt(id || "0", 10);

  const [meeting, setMeeting] = useState<AppMeeting | null>(null);
  const [tokenData, setTokenData] = useState<AgoraTokenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NEW: pre-join state — starts false, so Agora is NOT connected yet
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    initRoom();
  }, [meetingId]);

  useEffect(() => {
    if (!isLive) return;
    const timer = setTimeout(
      () => {
        Alert.alert(
          "Still there?",
          "This meeting has been running for 30 min. Auto-end if you don't respond in 60 sec.",
          [
            { text: "Still here", style: "default" },
            {
              text: "End now",
              style: "destructive",
              onPress: handleLeave,
            },
          ],
        );
      },
      30 * 60 * 1000,
    ); // 30 min
    return () => clearTimeout(timer);
  }, [isLive]);

  const initRoom = async () => {
    try {
      const [m, token] = await Promise.all([
        getMeeting(meetingId),
        getAgoraToken(meetingId),
      ]);
      setMeeting(m);
      setTokenData(token);
    } catch (err: any) {
      setError(err.message || "Failed to load meeting");
    } finally {
      setLoading(false);
    }
  };

  const handleGoLive = async () => {
    // Only NOW do we tell backend we've joined and mount the WebView
    await joinMeetingApi(meetingId).catch(() => {});
    setIsLive(true);
  };

  const handleLeave = async () => {
    Alert.alert("Leave Meeting", "Are you sure you want to leave?", [
      { text: "Stay", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          if (meeting?.isHost) {
            try {
              await endMeeting(meetingId);
            } catch {}
          } else {
            await leaveMeetingApi(meetingId).catch(() => {});
          }
          router.back();
        },
      },
    ]);
  };

  const handleLeft = async () => {
    if (!meeting?.isHost) {
      await leaveMeetingApi(meetingId).catch(() => {});
    }
    router.back();
  };

  // Loading
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Preparing…</Text>
      </SafeAreaView>
    );
  }

  // Error
  if (error || !tokenData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Could not join</Text>
        <Text style={styles.errorText}>{error || "Unknown error"}</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => router.back()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Pre-join lobby — Agora NOT connected yet
  if (!isLive) {
    return (
      <SafeAreaView style={styles.lobbyContainer}>
        <View style={styles.lobbyContent}>
          <Text style={styles.lobbyIcon}>📹</Text>
          <Text style={styles.lobbyTitle}>{meeting?.title}</Text>
          {meeting?.description ? (
            <Text style={styles.lobbyDescription}>{meeting.description}</Text>
          ) : null}

          <View style={styles.lobbyInfoBox}>
            <Text style={styles.lobbyInfoText}>
              👤 You'll join as{" "}
              <Text style={{ fontWeight: "700" }}>
                {meeting?.isHost ? "Host" : "Participant"}
              </Text>
            </Text>
            <Text style={styles.lobbyInfoText}>
              👥 {meeting?.participantCount || 0} participant
              {(meeting?.participantCount || 0) === 1 ? "" : "s"}
            </Text>
            <Text style={styles.lobbyInfoText}>
              {meeting?.isLiveStream
                ? "🎬 Live stream mode"
                : "🎥 Interactive mode"}
            </Text>
          </View>

          <View style={styles.lobbyWarning}>
            <Text style={styles.lobbyWarningText}>
              ⏱️ Timer starts when you tap "Go Live". Don't leave it running
              unattended.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.goLiveButton}
            onPress={handleGoLive}
            activeOpacity={0.85}
          >
            <Text style={styles.goLiveButtonText}>🎬 Go Live</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Live — agora is connected
  return (
    <View style={styles.container}>
      <AgoraRoom
        appId={tokenData.appId}
        channelName={tokenData.channelName}
        token={tokenData.token}
        uid={tokenData.uid}
        onJoined={() => console.log("Joined Agora channel")}
        onLeft={handleLeft}
        onError={(msg) => setError(msg)}
      />

      <SafeAreaView style={styles.floatingHeader} edges={["top"]}>
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {meeting?.title || "Meeting"}
            </Text>
            <Text style={styles.headerSub}>
              {meeting?.isHost ? "👑 You're hosting" : "👁️ Participant"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerCloseButton}
            onPress={handleLeave}
          >
            <Text style={styles.headerCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: { color: "#6B7280", marginTop: 12, fontSize: 15 },

  // Lobby
  lobbyContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
  },
  lobbyContent: {
    paddingHorizontal: 28,
    alignItems: "center",
  },
  lobbyIcon: { fontSize: 64, marginBottom: 12 },
  lobbyTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  lobbyDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  lobbyInfoBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    gap: 8,
    marginBottom: 16,
  },
  lobbyInfoText: { fontSize: 13, color: "#374151" },
  lobbyWarning: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    width: "100%",
    marginBottom: 24,
  },
  lobbyWarningText: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
    textAlign: "center",
    fontWeight: "500",
  },
  goLiveButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 999,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  goLiveButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  cancelButtonText: { color: "#6B7280", fontSize: 15, fontWeight: "600" },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: "#FFFFFF",
  },
  errorIcon: { fontSize: 64, marginBottom: 16 },
  errorTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  errorButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },

  // Floating header (in-call)
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 16,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  headerTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  headerSub: { color: "#D1D5DB", fontSize: 11, marginTop: 2 },
  headerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239,68,68,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCloseText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});


