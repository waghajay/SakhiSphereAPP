import { uploadBase64Image } from "@/services/api/upload";
import { getMyProfile, updateMyProfile } from "@/services/api/user";
import { saveUserData } from "@/services/storage/token";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
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

export default function EditProfileScreen() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarBase64, setAvatarBase64] = useState("");
  const [avatarMimeType, setAvatarMimeType] = useState("image/jpeg");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const profile = await getMyProfile();
        setName(profile.name || "");
        setBio(profile.bio || "");
        setLocation(profile.location || "");
        setOccupation(profile.occupation || "");
        setAvatarUrl(profile.avatar_url || profile.avatarUrl || "");
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load profile details");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photos to upload a profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setAvatarUrl(asset.uri);
      setAvatarBase64(asset.base64 || "");
      setAvatarMimeType(asset.mimeType || "image/jpeg");
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your camera to take a profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setAvatarUrl(asset.uri);
      setAvatarBase64(asset.base64 || "");
      setAvatarMimeType(asset.mimeType || "image/jpeg");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;

      // Upload new photo if selected
      if (avatarBase64) {
        setUploadingPhoto(true);
        try {
          const uploadResult = await uploadBase64Image(
            avatarBase64,
            avatarMimeType,
            "sakhisphere/profile_photos",
          );
          finalAvatarUrl = uploadResult.url;
        } catch (uploadError) {
          console.error("Failed to upload profile photo:", uploadError);
          // Continue with existing avatar if upload fails
        } finally {
          setUploadingPhoto(false);
        }
      }

      const updated = await updateMyProfile({
        name: name.trim(),
        bio: bio.trim(),
        location: location.trim(),
        occupation: occupation.trim(),
        avatar_url: finalAvatarUrl,
      });

      await saveUserData(updated);

      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || uploadingPhoto}
            hitSlop={8}
          >
            <Text
              style={[
                styles.saveText,
                (saving || uploadingPhoto) && styles.saveTextDisabled,
              ]}
            >
              {saving ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {name ? name.charAt(0).toUpperCase() : "🌸"}
                </Text>
              </View>
            )}

            {uploadingPhoto && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            )}

            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Text style={styles.photoButtonIcon}>📁</Text>
                <Text style={styles.photoButtonText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Text style={styles.photoButtonIcon}>📸</Text>
                <Text style={styles.photoButtonText}>Camera</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarHint}>
              Upload a clear photo of yourself
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your Name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Write a few words about yourself..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Location / City</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Pune, India"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Profession / Studies</Text>
              <TextInput
                style={styles.input}
                value={occupation}
                onChangeText={setOccupation}
                placeholder="e.g. Software Engineer / CSE Student"
                placeholderTextColor="#9CA3AF"
              />
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
  saveText: {
    fontSize: 16,
    color: "#7C3AED",
    fontWeight: "700",
  },
  saveTextDisabled: {
    opacity: 0.5,
  },
  content: {
    padding: 24,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3E8FF",
    borderWidth: 2,
    borderColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarPlaceholderText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#7C3AED",
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoButtons: {
    flexDirection: "row",
    gap: 12,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8B4FE",
  },
  photoButtonIcon: {
    fontSize: 14,
  },
  photoButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7C3AED",
  },
  avatarHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
  },
  form: {
    gap: 18,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
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
  bioInput: {
    minHeight: 84,
    textAlignVertical: "top",
  },
});
