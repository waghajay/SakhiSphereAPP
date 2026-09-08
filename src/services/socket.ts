import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";
import { io, Socket } from "socket.io-client";

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;
  private listenerCallbacks: Record<string, Array<(data: any) => void>> = {
    "message:new": [],
    "message:sent": [],
    "typing:start": [],
    "typing:stop": [],
    "messages:read": [],
    new_message_notification: [],
    "user:online": [],
    "user:offline": [],
    "message:deleted": [],
  };

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    const token = await getAuthToken();
    if (!token) {
      console.error("No auth token for socket connection");
      return;
    }

    const baseUrl = API_BASE_URL.replace("/api", "");
    console.log("Connecting to socket at:", baseUrl);

    this.socket = io(baseUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("🔌 Socket connected with ID:", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    this.setupDefaultListeners();
  }

  private setupDefaultListeners() {
    if (!this.socket) return;

    this.socket.off("message:new");
    this.socket.off("message:sent");
    this.socket.off("typing:start");
    this.socket.off("typing:stop");
    this.socket.off("messages:read");
    this.socket.off("new_message_notification");
    this.socket.off("user:online");
    this.socket.off("user:offline");
    this.socket.off("message:deleted");

    this.socket.on("message:new", (message) => {
      this.listenerCallbacks["message:new"].forEach((listener) =>
        listener(message),
      );
    });

    this.socket.on("message:sent", (message) => {
      this.listenerCallbacks["message:sent"].forEach((listener) =>
        listener(message),
      );
    });

    this.socket.on("typing:start", (data) => {
      this.listenerCallbacks["typing:start"].forEach((listener) =>
        listener(data),
      );
    });

    this.socket.on("typing:stop", (data) => {
      this.listenerCallbacks["typing:stop"].forEach((listener) =>
        listener(data),
      );
    });

    this.socket.on("messages:read", (data) => {
      this.listenerCallbacks["messages:read"].forEach((listener) =>
        listener(data),
      );
    });

    this.socket.on("new_message_notification", (data) => {
      this.listenerCallbacks["new_message_notification"].forEach((listener) =>
        listener(data),
      );
    });

    this.socket.on("user:online", (data) => {
      console.log(`✅ User ${data.userId} is online`);
      this.listenerCallbacks["user:online"].forEach((listener) =>
        listener(data),
      );
    });

    this.socket.on("user:offline", (data) => {
      console.log(`❌ User ${data.userId} is offline`);
      this.listenerCallbacks["user:offline"].forEach((listener) =>
        listener(data),
      );
    });

    this.socket.on("message:deleted", (data) => {
      console.log(
        `🗑️ Message ${data.messageId} deleted from conversation ${data.conversationId}`,
      );
      this.listenerCallbacks["message:deleted"].forEach((listener) =>
        listener(data),
      );
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinConversation(conversationId: number): void {
    this.socket?.emit("conversation:join", conversationId);
  }

  leaveConversation(conversationId: number): void {
    this.socket?.emit("conversation:leave", conversationId);
  }

  sendMessage(data: {
    conversationId: number;
    content: string;
    messageType?: string;
    mediaUrls?: string[];
  }): void {
    this.socket?.emit("message:send", data);
  }

  deleteMessage(conversationId: number, messageId: number): void {
    console.log(
      `Deleting message ${messageId} from conversation ${conversationId}`,
    );
    this.socket?.emit("message:delete", { conversationId, messageId });
  }

  startTyping(conversationId: number): void {
    this.socket?.emit("typing:start", { conversationId });
  }

  stopTyping(conversationId: number): void {
    this.socket?.emit("typing:stop", { conversationId });
  }

  markAsRead(conversationId: number): void {
    this.socket?.emit("message:read", { conversationId });
  }

  checkUserOnline(userId: number, callback: (isOnline: boolean) => void): void {
    this.socket?.emit("user:check_online", { userId }, (response: any) => {
      callback(response?.isOnline || false);
    });
  }

  // Listener registration methods
  onNewMessage(callback: (message: any) => void): void {
    this.listenerCallbacks["message:new"].push(callback);
  }

  onMessageSent(callback: (message: any) => void): void {
    this.listenerCallbacks["message:sent"].push(callback);
  }

  onTypingStart(callback: (data: any) => void): void {
    this.listenerCallbacks["typing:start"].push(callback);
  }

  onTypingStop(callback: (data: any) => void): void {
    this.listenerCallbacks["typing:stop"].push(callback);
  }

  onMessagesRead(callback: (data: any) => void): void {
    this.listenerCallbacks["messages:read"].push(callback);
  }

  onNewMessageNotification(callback: (data: any) => void): void {
    this.listenerCallbacks["new_message_notification"].push(callback);
  }

  onUserOnline(callback: (data: any) => void): void {
    this.listenerCallbacks["user:online"].push(callback);
  }

  onUserOffline(callback: (data: any) => void): void {
    this.listenerCallbacks["user:offline"].push(callback);
  }

  onMessageDeleted(callback: (data: any) => void): void {
    this.listenerCallbacks["message:deleted"].push(callback);
  }

  // Remove specific listeners
  removeNewMessageListener(callback: (message: any) => void): void {
    this.listenerCallbacks["message:new"] = this.listenerCallbacks[
      "message:new"
    ].filter((cb) => cb !== callback);
  }

  removeMessageSentListener(callback: (message: any) => void): void {
    this.listenerCallbacks["message:sent"] = this.listenerCallbacks[
      "message:sent"
    ].filter((cb) => cb !== callback);
  }

  removeAllListeners(): void {
    this.listenerCallbacks = {
      "message:new": [],
      "message:sent": [],
      "typing:start": [],
      "typing:stop": [],
      "messages:read": [],
      new_message_notification: [],
      "user:online": [],
      "user:offline": [],
      "message:deleted": [],
    };
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = SocketService.getInstance();
