import { getConversationMessages, type ChatMessage } from "@/services/api/chat";
import { uploadToCloudinary } from "@/services/api/cloudinary";
import { socketService } from "@/services/socket";
import { chatCache } from "@/services/storage/chatCache";
import { getUserData } from "@/services/storage/token";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 30;
const { width, height } = Dimensions.get("window");

interface SelectedImage {
  uri: string;
  mimeType: string;
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = parseInt(id || "0", 10);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [conversationName, setConversationName] = useState("Chat");
  const [otherUserAvatar, setOtherUserAvatar] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [previewImages, setPreviewImages] = useState<string[] | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(
    null,
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    loadCurrentUser();
    loadInitialMessages();

    const setupSocket = async () => {
      await socketService.connect();
      socketService.joinConversation(conversationId);

      socketService.onNewMessage((message) => {
        if (message.conversationId === conversationId) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === message.id);
            if (exists) return prev;
            const updated = [message, ...prev];
            chatCache.saveMessages(conversationId, [...updated].reverse());
            return updated;
          });
          scrollToBottom();
        }
      });

      socketService.onMessageSent((message) => {
        if (message.conversationId === conversationId) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === message.id);
            if (exists) return prev;
            const updated = [message, ...prev];
            chatCache.saveMessages(conversationId, [...updated].reverse());
            return updated;
          });
          scrollToBottom();
        }
      });

      // Listen for message deletion
      socketService.onMessageDeleted((data) => {
        if (data.conversationId === conversationId) {
          setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
        }
      });

      socketService.onTypingStart((data) => {
        if (data.conversationId === conversationId) setIsTyping(true);
      });

      socketService.onTypingStop((data) => {
        if (data.conversationId === conversationId) setIsTyping(false);
      });

      socketService.onUserOnline((data) => {
        if (otherUserId && data.userId === otherUserId)
          setIsOtherUserOnline(true);
      });

      socketService.onUserOffline((data) => {
        if (otherUserId && data.userId === otherUserId)
          setIsOtherUserOnline(false);
      });
    };

    setupSocket();

    return () => {
      socketService.leaveConversation(conversationId);
    };
  }, [conversationId, otherUserId]);

  const loadCurrentUser = async () => {
    const userData = await getUserData();
    if (userData) setCurrentUserId(userData.id);
  };

  const loadInitialMessages = async () => {
    try {
      const cachedMessages = await chatCache.getMessages(conversationId);

      if (cachedMessages && cachedMessages.length > 0) {
        setMessages([...cachedMessages].reverse());
        setLoading(false);
        setHasMore(cachedMessages.length >= PAGE_SIZE);
        setPage(2);
        fetchLatestMessages();
      } else {
        await fetchLatestMessages();
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      setLoading(false);
    }
  };

  const fetchLatestMessages = async () => {
    try {
      const data = await getConversationMessages(conversationId, 1, PAGE_SIZE);
      setMessages([...data.messages].reverse());
      setHasMore(data.messages.length >= PAGE_SIZE);
      setPage(2);
      await chatCache.saveMessages(conversationId, data.messages);

      if (data.messages.length > 0) {
        const otherMessage = data.messages.find(
          (m: ChatMessage) => m.sender.id !== currentUserId,
        );
        if (otherMessage) {
          setConversationName(otherMessage.sender.name);
          setOtherUserAvatar(otherMessage.sender.avatarUrl);
          setOtherUserId(otherMessage.sender.id);
          socketService.checkUserOnline(otherMessage.sender.id, (isOnline) => {
            setIsOtherUserOnline(isOnline);
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadOlder = async () => {
    if (!hasMore || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const data = await getConversationMessages(
        conversationId,
        page,
        PAGE_SIZE,
      );
      if (data.messages.length > 0) {
        setMessages((prev) => [...prev, ...data.messages.reverse()]);
        setPage(page + 1);
        setHasMore(data.messages.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photos.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 4 - selectedImages.length,
        quality: 0.7,
      });

      if (!result.canceled && result.assets.length > 0) {
        const images = result.assets.map((asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType || "image/jpeg",
        }));
        setSelectedImages((prev) => [...prev, ...images]);
      }
    } catch (error) {
      console.error("Failed to pick images:", error);
      Alert.alert("Error", "Failed to select images. Please try again.");
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    const hasText = newMessage.trim().length > 0;
    const hasImages = selectedImages.length > 0;

    if (!hasText && !hasImages) return;
    if (sending || uploadingImages) return;

    setSending(true);

    try {
      const uploadedUrls: string[] = [];
      if (hasImages) {
        setUploadingImages(true);
        for (const image of selectedImages) {
          const uploadResult = await uploadToCloudinary(
            image.uri,
            "image",
            image.mimeType,
            "sakhisphere/chat",
          );
          if (uploadResult.url) uploadedUrls.push(uploadResult.url);
        }
      }

      socketService.sendMessage({
        conversationId,
        content: hasText ? newMessage.trim() : "",
        messageType: hasImages ? "image" : "text",
        mediaUrls: uploadedUrls,
      });

      setNewMessage("");
      setSelectedImages([]);
      socketService.stopTyping(conversationId);
      scrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setSending(false);
      setUploadingImages(false);
    }
  };

  // Long press to delete message
  const handleLongPressMessage = (message: ChatMessage) => {
    if (message.sender.id === currentUserId) {
      setSelectedMessage(message);
      setShowDeleteModal(true);
    }
  };

  // Confirm delete message
  const handleConfirmDelete = () => {
    if (!selectedMessage) return;

    socketService.deleteMessage(conversationId, selectedMessage.id);
    setMessages((prev) => prev.filter((m) => m.id !== selectedMessage.id));
    setShowDeleteModal(false);
    setSelectedMessage(null);
  };

  const handleTyping = (text: string) => {
    setNewMessage(text);
    if (text.length > 0) {
      socketService.startTyping(conversationId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping(conversationId);
      }, 2000);
    } else {
      socketService.stopTyping(conversationId);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isMyMessage = item.sender.id === currentUserId;
      const mediaUrls = item.mediaUrls || [];
      const hasImages = mediaUrls.length > 0;

      return (
        <TouchableOpacity
          onLongPress={() => handleLongPressMessage(item)}
          delayLongPress={300}
          activeOpacity={0.9}
        >
          <View
            style={[
              styles.messageRow,
              isMyMessage ? styles.myMessageRow : styles.otherMessageRow,
            ]}
          >
            {!isMyMessage &&
              (item.sender.avatarUrl ? (
                <Image
                  source={{ uri: item.sender.avatarUrl }}
                  style={styles.messageAvatar}
                />
              ) : (
                <View style={styles.messageAvatarFallback}>
                  <Text style={styles.messageAvatarText}>
                    {item.sender.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))}

            <View
              style={[
                styles.messageBubble,
                isMyMessage ? styles.myBubble : styles.otherBubble,
              ]}
            >
              {!isMyMessage && (
                <Text style={styles.senderName}>{item.sender.name}</Text>
              )}

              {hasImages && (
                <View style={styles.imageGrid}>
                  {mediaUrls.map((url, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setPreviewImages(mediaUrls)}
                      style={
                        mediaUrls.length === 1
                          ? styles.imageSingleWrapper
                          : styles.imageMultiWrapper
                      }
                    >
                      <Image
                        source={{ uri: url }}
                        style={
                          mediaUrls.length === 1
                            ? styles.imageSingle
                            : styles.imageMulti
                        }
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {item.content ? (
                <Text
                  style={[
                    styles.messageText,
                    isMyMessage
                      ? styles.myMessageText
                      : styles.otherMessageText,
                  ]}
                >
                  {item.content}
                </Text>
              ) : null}

              <Text
                style={[
                  styles.messageTime,
                  isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
                ]}
              >
                {formatTime(item.createdAt)}
                {isMyMessage && item.isRead && " ✓✓"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [currentUserId],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          {otherUserAvatar ? (
            <Image
              source={{ uri: otherUserAvatar }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarText}>
                {conversationName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{conversationName}</Text>
            {isTyping ? (
              <Text style={styles.typingHeader}>typing...</Text>
            ) : isOtherUserOnline ? (
              <Text style={styles.onlineHeader}>● Online</Text>
            ) : (
              <Text style={styles.offlineHeader}>● Offline</Text>
            )}
          </View>

          <TouchableOpacity hitSlop={8}>
            <Text style={styles.moreIcon}>•••</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesContent}
          inverted
          initialNumToRender={PAGE_SIZE}
          maxToRenderPerBatch={PAGE_SIZE}
          windowSize={5}
          onEndReached={handleLoadOlder}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingOlder ? (
              <ActivityIndicator
                color="#7C3AED"
                style={{ marginVertical: 10 }}
              />
            ) : hasMore ? (
              <Text style={styles.loadMoreText}>Scroll for older messages</Text>
            ) : (
              <Text style={styles.loadMoreText}>Beginning of conversation</Text>
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Say hello! 👋</Text>
            </View>
          }
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingBubble}>
            <View style={styles.typingDots}>
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
            </View>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          {selectedImages.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.selectedImagesContainer}
              contentContainerStyle={styles.selectedImagesContent}
            >
              {selectedImages.map((image, index) => (
                <View key={index} style={styles.selectedImageWrapper}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.selectedImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {uploadingImages && (
            <View style={styles.uploadingIndicator}>
              <ActivityIndicator color="#7C3AED" size="small" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={handlePickImages}
              disabled={uploadingImages || selectedImages.length >= 4}
            >
              <Text style={styles.imageButtonText}>📷</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={newMessage}
              onChangeText={handleTyping}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !newMessage.trim() &&
                  selectedImages.length === 0 &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={
                (!newMessage.trim() && selectedImages.length === 0) ||
                sending ||
                uploadingImages
              }
            >
              {sending || uploadingImages ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.sendButtonText}>➤</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Delete Message Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Delete Message?</Text>
            <Text style={styles.deleteModalSubtitle}>
              This will delete the message for everyone.
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteCancelBtn}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={previewImages !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImages(null)}
      >
        <View style={styles.imagePreviewModal}>
          <TouchableOpacity
            style={styles.imagePreviewClose}
            onPress={() => setPreviewImages(null)}
          >
            <Text style={styles.imagePreviewCloseText}>✕</Text>
          </TouchableOpacity>
          {previewImages && previewImages.length > 0 && (
            <Image
              source={{ uri: previewImages[0] }}
              style={styles.imagePreviewFull}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  backText: { fontSize: 22, color: "#7C3AED", fontWeight: "600" },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontSize: 16, fontWeight: "700", color: "#7C3AED" },
  headerInfo: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  typingHeader: { fontSize: 11, color: "#10B981", fontWeight: "500" },
  onlineHeader: { fontSize: 11, color: "#10B981", fontWeight: "600" },
  offlineHeader: { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
  moreIcon: { fontSize: 18, color: "#6B7280" },
  messagesContent: { padding: 16, gap: 12 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  myMessageRow: { justifyContent: "flex-end" },
  otherMessageRow: { justifyContent: "flex-start" },
  messageAvatar: { width: 28, height: 28, borderRadius: 14 },
  messageAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  messageAvatarText: { fontSize: 12, fontWeight: "700", color: "#7C3AED" },
  messageBubble: { maxWidth: "75%", padding: 12, borderRadius: 16 },
  myBubble: { backgroundColor: "#7C3AED", borderBottomRightRadius: 4 },
  otherBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  senderName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7C3AED",
    marginBottom: 2,
  },
  messageText: { fontSize: 14, lineHeight: 20 },
  myMessageText: { color: "#FFFFFF" },
  otherMessageText: { color: "#111827" },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    marginBottom: 4,
  },
  imageSingleWrapper: { width: 200, height: 200 },
  imageSingle: { width: "100%", height: "100%", borderRadius: 8 },
  imageMultiWrapper: { width: 98, height: 98 },
  imageMulti: { width: "100%", height: "100%", borderRadius: 4 },
  messageTime: { fontSize: 10, marginTop: 4, textAlign: "right" },
  myMessageTime: { color: "rgba(255, 255, 255, 0.7)" },
  otherMessageTime: { color: "#9CA3AF" },
  loadMoreText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 8,
  },
  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 10,
    marginLeft: 16,
    marginBottom: 8,
  },
  typingDots: { flexDirection: "row", gap: 4 },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#9CA3AF",
  },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#111827" },
  emptySubtext: { fontSize: 14, color: "#6B7280", marginTop: 8 },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 30 : 12,
  },
  selectedImagesContainer: { marginBottom: 8 },
  selectedImagesContent: { gap: 8 },
  selectedImageWrapper: { position: "relative" },
  selectedImage: { width: 70, height: 70, borderRadius: 10 },
  removeImageBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  removeImageText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  uploadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  uploadingText: { fontSize: 12, color: "#7C3AED", fontWeight: "500" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  imageButtonText: { fontSize: 18 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    maxHeight: 100,
    backgroundColor: "#F9FAFB",
  },
  sendButton: {
    backgroundColor: "#7C3AED",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  // Delete modal
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "80%",
    maxWidth: 320,
    alignItems: "center",
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  deleteModalButtons: { flexDirection: "row", gap: 12, width: "100%" },
  deleteCancelBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteCancelText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  deleteConfirmBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteConfirmText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  // Image preview
  imagePreviewModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewCloseText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  imagePreviewFull: { width: width, height: height * 0.8 },
});
