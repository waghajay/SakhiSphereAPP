import { getFollowCounts } from "@/services/api/follow";
import { getUserPosts } from "@/services/api/posts";
import { getMyProfile } from "@/services/api/user";
import { getUserData } from "@/services/storage/token";
import type { Post, UserProfile } from "@/types";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const GRID_SIZE = (width - 32 - 4) / 3; // Account for padding and gaps

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followCounts, setFollowCounts] = useState({
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  });

  const fetchProfile = async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSocialStats = async () => {
    try {
      const userData = await getUserData();
      if (userData) {
        const counts = await getFollowCounts(userData.id);
        setFollowCounts(counts);
      }
    } catch (error) {
      console.error("Failed to fetch social stats:", error);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const userData = await getUserData();
      if (userData) {
        const data = await getUserPosts(userData.id, 1, 20);
        setPosts(data.posts);
      }
    } catch (error) {
      console.error("Failed to fetch user posts:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchSocialStats();
      fetchUserPosts();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    fetchSocialStats();
    fetchUserPosts();
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  const isVerified = Boolean(profile?.is_verified);
  const interests = profile?.interests || [];
  const mediaPosts = posts.filter(
    (post) => post.mediaUrls && post.mediaUrls.length > 0,
  );

  const renderGridItem = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => router.push(`/post/${item.id}` as any)}
      activeOpacity={0.8}
    >
      {item.mediaUrls && item.mediaUrls.length > 0 && (
        <>
          <Image
            source={{ uri: item.mediaUrls[0] }}
            style={styles.gridImage}
            resizeMode="cover"
          />
          {item.mediaUrls.length > 1 && (
            <View style={styles.multipleBadge}>
              <Text style={styles.multipleBadgeText}>📑</Text>
            </View>
          )}
          {item.mediaTypes && item.mediaTypes[0] === "video" && (
            <View style={styles.videoBadge}>
              <Text style={styles.videoBadgeText}>▶</Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.settingsIconBtn}
          onPress={() => router.push("/settings" as any)}
          hitSlop={8}
        >
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#7C3AED"]}
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.name ? profile.name.charAt(0).toUpperCase() : "🌸"}
              </Text>
            </View>
            {isVerified && (
              <View style={styles.verifiedBadgeIcon}>
                <Text style={{ fontSize: 13 }}>✓</Text>
              </View>
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.userName}>
              {profile?.name || "Sakhi Member"}
            </Text>
            {isVerified && (
              <View style={styles.verifiedTag}>
                <Text style={styles.verifiedTagText}>Verified</Text>
              </View>
            )}
          </View>

          <Text style={styles.userEmail}>{profile?.email}</Text>

          {profile?.occupation ? (
            <Text style={styles.userOccupation}>💼 {profile.occupation}</Text>
          ) : null}

          {profile?.location ? (
            <Text style={styles.userLocation}>📍 {profile.location}</Text>
          ) : null}

          {profile?.bio ? (
            <Text style={styles.userBio}>{profile.bio}</Text>
          ) : null}

          {/* Social Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{followCounts.postsCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/followers/${profile?.id}` as any)}
            >
              <Text style={styles.statValue}>
                {followCounts.followersCount}
              </Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/following/${profile?.id}` as any)}
            >
              <Text style={styles.statValue}>
                {followCounts.followingCount}
              </Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => router.push("/edit-profile" as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.editProfileBtnText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Media Grid */}
        {mediaPosts.length > 0 && (
          <View style={styles.gridSection}>
            <Text style={styles.gridSectionTitle}>My Posts</Text>
            <FlatList
              data={mediaPosts}
              renderItem={renderGridItem}
              keyExtractor={(item) => item.id.toString()}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.gridContainer}
            />
          </View>
        )}

        {/* Verification Status Banner */}
        <TouchableOpacity
          style={[
            styles.bannerCard,
            isVerified ? styles.bannerVerified : styles.bannerUnverified,
          ]}
          onPress={() => router.push("/verification" as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.bannerIcon}>{isVerified ? "🛡️" : "✨"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              {isVerified ? "Verified Sakhi Member" : "Get Verified Badge"}
            </Text>
            <Text style={styles.bannerDesc}>
              {isVerified
                ? "Identity verified. Your badge increases trust in the community."
                : "Confirm your profile to earn the trusted women community badge."}
            </Text>
          </View>
          <Text style={styles.bannerArrow}>→</Text>
        </TouchableOpacity>

        {/* Interests Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={styles.sectionTitle}>Interests & Passions</Text>
              <Text style={styles.interestsCount}>({interests.length})</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/interests" as any)}
              hitSlop={8}
            >
              <Text style={styles.sectionActionText}>Manage</Text>
            </TouchableOpacity>
          </View>

          {interests.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyInterestsBox}
              onPress={() => router.push("/interests" as any)}
            >
              <Text style={styles.emptyInterestsText}>
                + Add your passions & interests to meet like-minded women
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.interestsWrap}>
              {interests.map((item) => (
                <View key={item.id} style={styles.interestChip}>
                  <Text style={styles.interestIcon}>{item.icon}</Text>
                  <Text style={styles.interestName}>{item.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Liked Posts Section */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => router.push("/liked-posts" as any)}
          activeOpacity={0.8}
        >
          <View style={styles.menuItem}>
            <Text style={styles.menuItemIcon}>❤️</Text>
            <Text style={styles.menuItemText}>Liked Posts</Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Account & Safety Navigation Menu */}
        <View style={styles.menuCard}>
          <Text style={styles.menuHeading}>Account & Preferences</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/interests" as any)}
          >
            <Text style={styles.menuItemIcon}>🎨</Text>
            <Text style={styles.menuItemText}>My Interests & Topics</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/verification" as any)}
          >
            <Text style={styles.menuItemIcon}>🛡️</Text>
            <Text style={styles.menuItemText}>Profile Verification</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/settings" as any)}
          >
            <Text style={styles.menuItemIcon}>🔒</Text>
            <Text style={styles.menuItemText}>
              Privacy & Notification Settings
            </Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  settingsIconBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  profileHeaderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F3E8FF",
    borderWidth: 2.5,
    borderColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 38,
    fontWeight: "700",
    color: "#7C3AED",
  },
  verifiedBadgeIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#10B981",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  verifiedTag: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedTagText: {
    color: "#047857",
    fontSize: 11,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  userOccupation: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
    marginTop: 6,
  },
  userLocation: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },
  userBio: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 30,
    marginTop: 20,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    width: "100%",
  },
  statItem: {
    alignItems: "center",
    minWidth: 60,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 2,
  },
  editProfileBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#D8B4FE",
  },
  editProfileBtnText: {
    color: "#7C3AED",
    fontSize: 14,
    fontWeight: "700",
  },
  gridSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  gridSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  gridContainer: {
    gap: 2,
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    margin: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  multipleBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 4,
    padding: 2,
  },
  multipleBadgeText: {
    fontSize: 10,
  },
  videoBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  videoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  bannerVerified: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  bannerUnverified: {
    backgroundColor: "#FAF5FF",
    borderColor: "#E9D5FF",
  },
  bannerIcon: {
    fontSize: 24,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  bannerDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 16,
  },
  bannerArrow: {
    fontSize: 18,
    color: "#7C3AED",
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  interestsCount: {
    fontSize: 13,
    color: "#7C3AED",
    fontWeight: "600",
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7C3AED",
  },
  emptyInterestsBox: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  emptyInterestsText: {
    fontSize: 13,
    color: "#7C3AED",
    fontWeight: "500",
    textAlign: "center",
  },
  interestsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  interestIcon: {
    fontSize: 15,
  },
  interestName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B21A8",
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  menuHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuItemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  menuArrow: {
    fontSize: 18,
    color: "#9CA3AF",
  },
});
