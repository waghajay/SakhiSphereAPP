import type { ChatMessage, Conversation } from "@/services/api/chat";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MESSAGES_PREFIX = "chat_messages_";
const CONVERSATIONS_KEY = "chat_conversations_";
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

class ChatCacheService {
  /**
   * Save messages to cache.
   */
  async saveMessages(
    conversationId: number,
    messages: ChatMessage[],
  ): Promise<void> {
    try {
      const key = `${MESSAGES_PREFIX}${conversationId}`;
      const data = JSON.stringify({
        messages,
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem(key, data);
    } catch (error) {
      console.error("Failed to save messages to cache:", error);
    }
  }

  /**
   * Get messages from cache.
   */
  async getMessages(conversationId: number): Promise<ChatMessage[] | null> {
    try {
      const key = `${MESSAGES_PREFIX}${conversationId}`;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        const parsed = JSON.parse(data);
        // Check if cache is still valid
        if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
          return parsed.messages;
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to get messages from cache:", error);
      return null;
    }
  }

  /**
   * Save conversations list to cache.
   */
  async saveConversations(
    userId: number,
    conversations: Conversation[],
  ): Promise<void> {
    try {
      const key = `${CONVERSATIONS_KEY}${userId}`;
      const data = JSON.stringify({
        conversations,
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem(key, data);
    } catch (error) {
      console.error("Failed to save conversations to cache:", error);
    }
  }

  /**
   * Get conversations from cache.
   */
  async getConversations(userId: number): Promise<Conversation[] | null> {
    try {
      const key = `${CONVERSATIONS_KEY}${userId}`;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        const parsed = JSON.parse(data);
        if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
          return parsed.conversations;
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to get conversations from cache:", error);
      return null;
    }
  }

  /**
   * Update a single message in cache.
   */
  async updateMessage(
    conversationId: number,
    messageId: number,
    updates: Partial<ChatMessage>,
  ): Promise<void> {
    const messages = await this.getMessages(conversationId);
    if (messages) {
      const updatedMessages = messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg,
      );
      await this.saveMessages(conversationId, updatedMessages);
    }
  }

  /**
   * Add new message to cache.
   */
  async addMessage(
    conversationId: number,
    message: ChatMessage,
  ): Promise<void> {
    const messages = await this.getMessages(conversationId);
    if (messages) {
      // Check if message already exists
      const exists = messages.some((m) => m.id === message.id);
      if (!exists) {
        await this.saveMessages(conversationId, [...messages, message]);
      }
    } else {
      await this.saveMessages(conversationId, [message]);
    }
  }

  /**
   * Clear all chat cache.
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(
        (key) =>
          key.startsWith(MESSAGES_PREFIX) || key.startsWith(CONVERSATIONS_KEY),
      );
      await AsyncStorage.multiRemove(chatKeys);
    } catch (error) {
      console.error("Failed to clear chat cache:", error);
    }
  }
}

export const chatCache = new ChatCacheService();
