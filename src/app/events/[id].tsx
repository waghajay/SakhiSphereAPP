import {
    cancelRsvp,
    getEvent,
    getEventAttendees,
    rsvpEvent,
    type AppEvent,
    type EventAttendee,
    type EventRsvpStatus,
} from "@/services/api/events";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = parseInt(id || "0", 10);

  const [event, setEvent] = useState<AppEvent | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const loadEvent = async () => {
    try {
      const [eventData, attendeesData] = await Promise.all([
        getEvent(eventId),
        getEventAttendees(eventId, "going", 1, 20),
      ]);
      setEvent(eventData);
      setAttendees(attendeesData.attendees);
    } catch (error: any) {
      console.error("Failed to load event:", error);
      Alert.alert("Error", error.message || "Failed to load event");
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [eventId]),
  );

  const handleRsvp = async (status: EventRsvpStatus) => {
    if (!event) return;
    setRsvpLoading(true);
    try {
      const result = await rsvpEvent(event.id, status);
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              myRsvp: result.status,
              goingCount: result.goingCount,
            }
          : prev,
      );
      // Refresh attendees if going
      if (status === "going") {
        const data = await getEventAttendees(event.id, "going", 1, 20);
        setAttendees(data.attendees);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to RSVP");
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleCancelRsvp = async () => {
    if (!event) return;
    setRsvpLoading(true);
    try {
      const result = await cancelRsvp(event.id);
      setEvent((prev) =>
        prev ? { ...prev, myRsvp: null, goingCount: result.goingCount } : prev,
      );
      const data = await getEventAttendees(event.id, "going", 1, 20);
      setAttendees(data.attendees);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to cancel RSVP");
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleOpenMeeting = () => {
    if (event?.meetingUrl) {
      Linking.openURL(event.meetingUrl).catch(() => {
        Alert.alert("Error", "Could not open meeting URL");
      });
    }
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (!event) return null;

  const isPast = new Date(event.startAt) < new Date();
  const isFull = event.capacity !== null && event.goingCount >= event.capacity;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Event
        </Text>
        {event.isOrganizer ? (
          <TouchableOpacity
            onPress={() => router.push(`/events/edit/${event.id}` as any)}
            hitSlop={8}
          >
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadEvent();
            }}
          />
        }
      >
        {event.coverUrl ? (
          <Image source={{ uri: event.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Text style={styles.coverFallbackText}>
              {event.title.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          {isPast && (
            <View style={styles.pastBadge}>
              <Text style={styles.pastBadgeText}>PAST EVENT</Text>
            </View>
          )}
          {!isPast && isFull && (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>FULL</Text>
            </View>
          )}

          <Text style={styles.title}>{event.title}</Text>

          {event.group && (
            <TouchableOpacity
              style={styles.groupChip}
              onPress={() => router.push(`/groups/${event.group!.id}` as any)}
            >
              <Text style={styles.groupChipText}>👥 {event.group.name}</Text>
            </TouchableOpacity>
          )}

          {event.description && (
            <Text style={styles.description}>{event.description}</Text>
          )}

          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {formatFullDate(event.startAt)}
                </Text>
                <Text style={styles.detailSubvalue}>
                  {formatTime(event.startAt)}
                  {event.endAt ? ` – ${formatTime(event.endAt)}` : ""}
                </Text>
              </View>
            </View>

            {event.isVirtual ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🌐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Virtual Event</Text>
                  {event.meetingUrl && event.myRsvp === "going" ? (
                    <TouchableOpacity onPress={handleOpenMeeting}>
                      <Text style={[styles.detailValue, styles.linkText]}>
                        Join Meeting →
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.detailSubvalue}>
                      RSVP "Going" to see meeting link
                    </Text>
                  )}
                </View>
              </View>
            ) : event.location ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{event.location}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>👥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Attendees</Text>
                <Text style={styles.detailValue}>
                  {event.goingCount} going
                  {event.capacity ? ` · ${event.capacity} max` : ""}
                </Text>
              </View>
            </View>

            {event.organizer && (
              <TouchableOpacity
                style={styles.detailRow}
                onPress={() =>
                  router.push(`/user/${event.organizer!.id}` as any)
                }
              >
                <Text style={styles.detailIcon}>👤</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Organizer</Text>
                  <View style={styles.organizerRow}>
                    {event.organizer.avatarUrl ? (
                      <Image
                        source={{ uri: event.organizer.avatarUrl }}
                        style={styles.organizerAvatar}
                      />
                    ) : (
                      <View style={styles.organizerAvatarFallback}>
                        <Text style={styles.organizerAvatarText}>
                          {event.organizer.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.detailValue}>
                      {event.organizer.name}
                    </Text>
                    {event.organizer.isVerified && (
                      <Text style={styles.verified}>✓</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* RSVP Buttons */}
          {isPast ? (
            <View style={styles.pastRsvpBox}>
              <Text style={styles.pastRsvpTitle}>This event has ended</Text>
              <Text style={styles.pastRsvpSub}>
                {event.myRsvp === "going"
                  ? "You attended this event"
                  : event.myRsvp === "maybe"
                    ? "You marked Maybe"
                    : event.myRsvp === "not_going"
                      ? "You marked Not going"
                      : "You didn't RSVP"}
              </Text>
            </View>
          ) : (
            <View style={styles.rsvpSection}>
              <Text style={styles.rsvpSectionLabel}>Your RSVP</Text>
              <Text style={styles.rsvpHint}>
                This is your response — only you can change it
              </Text>
              <View style={styles.rsvpButtons}>
                {(
                  [
                    { value: "going", label: "Going", icon: "✓" },
                    { value: "maybe", label: "Maybe", icon: "?" },
                    { value: "not_going", label: "Not going", icon: "✕" },
                  ] as const
                ).map((opt) => {
                  const isSelected = event.myRsvp === opt.value;
                  const isDisabled =
                    rsvpLoading ||
                    (opt.value === "going" && isFull && !isSelected);

                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.rsvpButton,
                        isSelected && styles.rsvpButtonActive,
                        isDisabled && styles.rsvpButtonDisabled,
                      ]}
                      onPress={() => {
                        if (isSelected) {
                          handleCancelRsvp();
                        } else {
                          handleRsvp(opt.value);
                        }
                      }}
                      disabled={isDisabled}
                    >
                      <Text
                        style={[
                          styles.rsvpButtonIcon,
                          isSelected && styles.rsvpButtonIconActive,
                        ]}
                      >
                        {opt.icon}
                      </Text>
                      <Text
                        style={[
                          styles.rsvpButtonText,
                          isSelected && styles.rsvpButtonTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedPill}>
                          <Text style={styles.selectedPillText}>
                            YOUR CHOICE
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Attendees */}
        {attendees.length > 0 && (
          <View style={styles.attendeesCard}>
            <Text style={styles.attendeesTitle}>
              Going ({event.goingCount})
            </Text>
            <View style={styles.attendeesList}>
              {attendees.slice(0, 8).map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.attendeeItem}
                  onPress={() => router.push(`/user/${a.id}` as any)}
                >
                  {a.avatarUrl ? (
                    <Image
                      source={{ uri: a.avatarUrl }}
                      style={styles.attendeeAvatar}
                    />
                  ) : (
                    <View style={styles.attendeeAvatarFallback}>
                      <Text style={styles.attendeeAvatarText}>
                        {a.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.attendeeName} numberOfLines={1}>
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
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
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  editText: { fontSize: 14, color: "#7C3AED", fontWeight: "700" },
  content: { paddingBottom: 40 },
  cover: { width: "100%", height: 200, backgroundColor: "#E5E7EB" },
  coverFallback: {
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  coverFallbackText: { fontSize: 64, fontWeight: "700", color: "#7C3AED" },
  infoCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pastBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  pastBadgeText: { fontSize: 11, fontWeight: "800", color: "#6B7280" },
  fullBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  fullBadgeText: { fontSize: 11, fontWeight: "800", color: "#991B1B" },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    lineHeight: 28,
  },
  groupChip: {
    alignSelf: "flex-start",
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
  },
  groupChipText: { fontSize: 12, fontWeight: "700", color: "#7C3AED" },
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
  detailSubvalue: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  linkText: { color: "#7C3AED", textDecorationLine: "underline" },
  organizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  organizerAvatar: { width: 24, height: 24, borderRadius: 12 },
  organizerAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  organizerAvatarText: { fontSize: 11, fontWeight: "700", color: "#7C3AED" },
  verified: { color: "#10B981", fontSize: 12, fontWeight: "700" },
  rsvpSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  rsvpSectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  rsvpButtons: { flexDirection: "row", gap: 8 },
  rsvpButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  rsvpButtonActive: {
    backgroundColor: "#F3E8FF",
    borderColor: "#7C3AED",
  },
  rsvpButtonDisabled: { opacity: 0.4 },
  rsvpButtonIcon: { fontSize: 14, color: "#6B7280", fontWeight: "700" },
  rsvpButtonIconActive: { color: "#7C3AED" },
  rsvpButtonText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  rsvpButtonTextActive: { color: "#7C3AED" },
  attendeesCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  attendeesTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  attendeesList: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  attendeeItem: { alignItems: "center", width: 60 },
  attendeeAvatar: { width: 48, height: 48, borderRadius: 24 },
  attendeeAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  attendeeAvatarText: { fontSize: 18, fontWeight: "700", color: "#7C3AED" },
  attendeeName: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },
  rsvpHint: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
    fontStyle: "italic",
  },
  selectedPill: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  selectedPillText: {
    fontSize: 8,
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  pastRsvpBox: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    alignItems: "center",
    paddingVertical: 20,
  },
  pastRsvpTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },
  pastRsvpSub: { fontSize: 13, color: "#9CA3AF" },
});
