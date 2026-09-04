// src/app/verification.tsx
import {
  getVerificationStatus,
  submitVerificationRequest,
} from "@/services/api/user";
import type { VerificationStatusResponse } from "@/types";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VerificationScreen() {
  const [statusData, setStatusData] =
    useState<VerificationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<
    "id_proof" | "student_id" | "work_id" | "social_profile"
  >("id_proof");
  const [documentNote, setDocumentNote] = useState("");
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [documentBase64, setDocumentBase64] = useState<string | null>(null);
  const [documentMimeType, setDocumentMimeType] =
    useState<string>("image/jpeg");

  const loadStatus = async () => {
    try {
      const data = await getVerificationStatus();
      setStatusData(data);
    } catch (err: any) {
      console.error("Error loading verification status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const processImage = async (uri: string) => {
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Determine mime type
      const extension = uri.split(".").pop()?.toLowerCase();
      const mimeType =
        extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : "image/jpeg";

      setDocumentImage(uri);
      setDocumentBase64(base64);
      setDocumentMimeType(mimeType);
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert("Error", "Failed to process image");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photos to upload your ID.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setDocumentImage(asset.uri);

      // Use base64 from picker if available, otherwise read from file
      if (asset.base64) {
        setDocumentBase64(asset.base64);
        setDocumentMimeType(asset.mimeType || "image/jpeg");
      } else {
        await processImage(asset.uri);
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your camera to take a photo.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setDocumentImage(asset.uri);

      // Use base64 from picker if available, otherwise read from file
      if (asset.base64) {
        setDocumentBase64(asset.base64);
        setDocumentMimeType(asset.mimeType || "image/jpeg");
      } else {
        await processImage(asset.uri);
      }
    }
  };

  const handleSubmit = async () => {
    if (!documentImage || !documentBase64) {
      Alert.alert(
        "Document Required",
        "Please upload your government ID or proof document.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        verification_type: selectedType,
        document_note: documentNote.trim(),
        document_base64: documentBase64,
        document_mime_type: documentMimeType,
        document_file_name: `verification_${Date.now()}.${documentMimeType.split("/")[1]}`,
      };

      const res = await submitVerificationRequest(payload);

      Alert.alert(
        "Verification Submitted",
        "Your verification request has been submitted. Our admin team will review your documents within 24-48 hours.",
        [{ text: "OK", onPress: () => loadStatus() }],
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit verification");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  const isVerified = statusData?.isVerified;
  const latestRequest = statusData?.latestRequest;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Card */}
        <View
          style={[
            styles.statusCard,
            isVerified
              ? styles.statusCardVerified
              : styles.statusCardUnverified,
          ]}
        >
          <Text style={styles.statusIcon}>{isVerified ? "🛡️" : "⏳"}</Text>
          <Text style={styles.statusTitle}>
            {isVerified
              ? "Verified Sakhi Member"
              : latestRequest?.status === "pending"
                ? "Verification In Progress"
                : "Not Verified"}
          </Text>
          <Text style={styles.statusDesc}>
            {isVerified
              ? "Your identity has been verified. You have full access to all SakhiSphere features."
              : latestRequest?.status === "pending"
                ? "Your documents are under review. This typically takes 24-48 hours."
                : "Submit your government ID for verification to build trust in the community."}
          </Text>
        </View>

        {/* Upload Document Section */}
        {!isVerified &&
          (!latestRequest || latestRequest.status !== "pending") && (
            <View style={styles.formSection}>
              <Text style={styles.sectionHeading}>Verify Your Identity</Text>
              <Text style={styles.formSub}>
                Upload a clear photo of your government-issued ID or proof
                document.
              </Text>

              {/* Document Type Selection */}
              <View style={styles.typeOptions}>
                {[
                  { id: "id_proof", label: "Government ID", icon: "🪪" },
                  { id: "student_id", label: "Student ID", icon: "🎓" },
                  { id: "work_id", label: "Work ID", icon: "💼" },
                  {
                    id: "social_profile",
                    label: "LinkedIn/Profile",
                    icon: "🔗",
                  },
                ].map((item) => {
                  const isSelected = selectedType === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.typeButton,
                        isSelected && styles.typeButtonSelected,
                      ]}
                      onPress={() => setSelectedType(item.id as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.typeIcon}>{item.icon}</Text>
                      <Text
                        style={[
                          styles.typeLabel,
                          isSelected && styles.typeLabelSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Document Upload */}
              <View style={styles.uploadSection}>
                <Text style={styles.inputLabel}>Upload Document Image</Text>

                {documentImage ? (
                  <View style={styles.previewContainer}>
                    <Image
                      source={{ uri: documentImage }}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => {
                        setDocumentImage(null);
                        setDocumentBase64(null);
                      }}
                    >
                      <Text style={styles.removeImageText}>✕ Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Text style={styles.uploadIcon}>📄</Text>
                    <Text style={styles.uploadText}>
                      Upload clear image of your ID
                    </Text>
                    <Text style={styles.uploadHint}>
                      JPG, PNG, or WEBP (Max 5MB)
                    </Text>
                  </View>
                )}

                <View style={styles.uploadButtons}>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={pickImage}
                  >
                    <Text style={styles.uploadBtnText}>
                      📁 Choose from Gallery
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={takePhoto}
                  >
                    <Text style={styles.uploadBtnText}>📸 Take Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Additional Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Additional Notes (Optional)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., ID number, department, etc."
                  placeholderTextColor="#9CA3AF"
                  value={documentNote}
                  onChangeText={setDocumentNote}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit for Review</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                🔒 Your documents are encrypted and securely stored. They will
                only be used for verification purposes.
              </Text>
            </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
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
  backText: {
    fontSize: 16,
    color: "#7C3AED",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  statusCard: {
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1.5,
  },
  statusCardVerified: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  statusCardUnverified: {
    backgroundColor: "#FAF5FF",
    borderColor: "#E9D5FF",
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  statusDesc: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  formSection: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },
  formSub: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 14,
  },
  typeOptions: {
    gap: 10,
    marginBottom: 16,
  },
  typeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  typeButtonSelected: {
    borderColor: "#7C3AED",
    backgroundColor: "#FAF5FF",
  },
  typeIcon: {
    fontSize: 18,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  typeLabelSelected: {
    color: "#7C3AED",
  },
  uploadSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  uploadPlaceholder: {
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  uploadHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  previewContainer: {
    position: "relative",
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeImageText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  uploadButtons: {
    flexDirection: "row",
    gap: 10,
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#D8B4FE",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  uploadBtnText: {
    color: "#7C3AED",
    fontSize: 13,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  disclaimer: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 18,
  },
});
