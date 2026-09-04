import type { Post } from "@/types";
import { useState } from "react";
import {
    Alert,
    Clipboard,
    Modal,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface ShareModalProps {
  post: Post | null;
  visible: boolean;
  onClose: () => void;
}

export function ShareModal({ post, visible, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleShareExternal = async () => {
    if (!post) return;
    try {
      await Share.share({
        message: `${post.content}\n\nShared from SakhiSphere 🌸`,
        title: "Share Post",
      });
      onClose();
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleCopyLink = async () => {
    if (!post) return;
    const link = `https://sakhisphere.app/post/${post.id}`;
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1500);
  };

  const handleShareToFeed = () => {
    Alert.alert("Repost", "Repost feature coming soon!");
    onClose();
  };

  const handleShareToMessage = () => {
    Alert.alert("Message", "Share to message coming in Phase 4!");
    onClose();
  };

  if (!post || !visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modal}>
          <View style={styles.handle} />
          <Text style={styles.title}>Share Post</Text>

          <TouchableOpacity style={styles.option} onPress={handleShareExternal}>
            <View
              style={[styles.iconContainer, { backgroundColor: "#DBEAFE" }]}
            >
              <Text style={styles.icon}>↗️</Text>
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Share External</Text>
              <Text style={styles.optionDesc}>Share via other apps</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleCopyLink}>
            <View
              style={[styles.iconContainer, { backgroundColor: "#F3E8FF" }]}
            >
              <Text style={styles.icon}>{copied ? "✅" : "🔗"}</Text>
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>
                {copied ? "Link Copied!" : "Copy Link"}
              </Text>
              <Text style={styles.optionDesc}>
                {copied ? "Link copied to clipboard" : "Copy post link"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={handleShareToFeed}>
            <View
              style={[styles.iconContainer, { backgroundColor: "#FEF3C7" }]}
            >
              <Text style={styles.icon}>🔄</Text>
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Repost</Text>
              <Text style={styles.optionDesc}>Share to your feed</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleShareToMessage}
          >
            <View
              style={[styles.iconContainer, { backgroundColor: "#D1FAE5" }]}
            >
              <Text style={styles.icon}>💬</Text>
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Share to Message</Text>
              <Text style={styles.optionDesc}>Send in a chat</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 20,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  optionDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
});
