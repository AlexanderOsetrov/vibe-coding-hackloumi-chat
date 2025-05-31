"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ContactsSidebar from "@/components/ContactsSidebar";
import ErrorBoundary from "@/components/ErrorBoundary";
import MessageBubble from "@/components/MessageBubble";
import ImageUpload from "@/components/ImageUpload";
import { useSocket } from "@/hooks/useSocket";

interface ApiMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; username: string };
  receiver: { id: string; username: string };
  status?: string;
  imageUrl?: string | null;
  imageFilename?: string | null;
  imageMimeType?: string | null;
  imageSize?: number | null;
}

interface DirectMessage {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  receiverId?: string;
  senderUsername: string;
  receiverUsername?: string;
  status?: string;
  imageUrl?: string | null;
  imageFilename?: string | null;
  imageMimeType?: string | null;
  imageSize?: number | null;
}

interface User {
  id: string;
  username: string;
}

interface PendingImage {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

function ChatUserPageContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [lastMessageCheck, setLastMessageCheck] = useState<Date>(new Date());
  const [isPeerOnline, setIsPeerOnline] = useState<boolean>(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const router = useRouter();
  const params = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagePollingRef = useRef<NodeJS.Timeout | null>(null);

  const peerUsername = params?.user as string;

  // Socket.IO hook with real-time messaging
  const {
    sendMessage: sendSocketMessage,
    startTyping,
    stopTyping,
    connectionType,
    isConnected,
    checkUserOnline,
  } = useSocket({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onNewMessage: (message: any) => {
      console.log("🎯 onNewMessage callback triggered:", message);
      console.log("Current user:", currentUser?.username);
      console.log("Peer username:", peerUsername);
      console.log("Message sender:", message.senderUsername);
      console.log("Message receiver:", message.receiverUsername);

      // Only add messages for this conversation
      const isMessageForThisConversation =
        (message.senderUsername === peerUsername &&
          message.receiverUsername === currentUser?.username) ||
        (message.senderUsername === currentUser?.username &&
          message.receiverUsername === peerUsername);

      console.log(
        "Is message for this conversation?",
        isMessageForThisConversation
      );

      if (isMessageForThisConversation) {
        console.log("✅ Adding new message to UI:", message);
        setMessages((prev) => {
          // Avoid duplicates
          const existingIds = new Set(prev.map((m) => m.id));
          if (existingIds.has(message.id)) {
            console.log("⚠️ New message already exists, skipping:", message.id);
            return prev;
          }
          console.log("📥 Adding new received message to state:", message.id);
          const newMsg: DirectMessage = {
            id: message.id,
            content: message.content,
            createdAt: message.createdAt,
            senderId: message.senderId,
            receiverId: message.receiverId,
            senderUsername: message.senderUsername,
            receiverUsername: message.receiverUsername,
            status: message.status,
            imageUrl: message.imageUrl,
            imageFilename: message.imageFilename,
            imageMimeType: message.imageMimeType,
            imageSize: message.imageSize,
          };
          const newMessages = [...prev, newMsg];
          console.log("📊 Total messages after adding:", newMessages.length);
          return newMessages;
        });
      } else {
        console.log("❌ New message not for this conversation, ignoring:", {
          messageFrom: message.senderUsername,
          messageTo: message.receiverUsername,
          currentUser: currentUser?.username,
          peerUser: peerUsername,
        });
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMessageSent: (message: any) => {
      // Add sent message to the conversation - ensure it's for this conversation
      if (
        (message.senderUsername === currentUser?.username &&
          message.receiverUsername === peerUsername) ||
        (message.senderUsername === peerUsername &&
          message.receiverUsername === currentUser?.username) ||
        (message.senderUsername === "current-user" &&
          message.receiverUsername === peerUsername) // Handle optimistic messages
      ) {
        console.log("Adding sent message to UI:", message);
        setMessages((prev) => {
          // If this is a real message replacing an optimistic one
          if (!message.id.startsWith("temp-")) {
            // Remove any temporary messages for this content and receiver
            const filteredMessages = prev.filter(
              (m) =>
                !(
                  m.id.startsWith("temp-") &&
                  m.content === message.content &&
                  m.receiverUsername === message.receiverUsername
                )
            );

            // Check if the real message already exists
            const existingIds = new Set(filteredMessages.map((m) => m.id));
            if (existingIds.has(message.id)) {
              console.log("Real message already exists, skipping:", message.id);
              return prev;
            }

            console.log(
              "Replacing optimistic message with real message:",
              message.id
            );
            const newMsg: DirectMessage = {
              id: message.id,
              content: message.content,
              createdAt: message.createdAt,
              senderId: message.senderId,
              receiverId: message.receiverId,
              senderUsername: message.senderUsername,
              receiverUsername: message.receiverUsername,
              status: message.status,
              imageUrl: message.imageUrl,
              imageFilename: message.imageFilename,
              imageMimeType: message.imageMimeType,
              imageSize: message.imageSize,
            };
            return [...filteredMessages, newMsg];
          } else {
            // This is an optimistic message
            const existingIds = new Set(prev.map((m) => m.id));
            if (existingIds.has(message.id)) {
              console.log(
                "Optimistic message already exists, skipping:",
                message.id
              );
              return prev;
            }

            // Update the optimistic message with current user info if available
            const updatedMessage: DirectMessage = {
              id: message.id,
              content: message.content,
              createdAt: message.createdAt,
              senderId: currentUser?.id || message.senderId,
              receiverId: message.receiverId,
              senderUsername: currentUser?.username || message.senderUsername,
              receiverUsername: message.receiverUsername,
              status: message.status,
              imageUrl: message.imageUrl,
              imageFilename: message.imageFilename,
              imageMimeType: message.imageMimeType,
              imageSize: message.imageSize,
            };

            console.log("Adding new optimistic message:", message.id);
            return [...prev, updatedMessage];
          }
        });
      } else {
        console.log(
          "Sent message not for this conversation, ignoring:",
          message
        );
      }
    },
    onMessageDelivered: () => {
      // Handle delivery acknowledgment if needed
      // Could update message status in the UI here
    },
    onTypingIndicator: (data) => {
      if (data.username === peerUsername) {
        setTypingUser(data.isTyping ? data.username : null);

        // Clear typing indicator after 3 seconds
        if (data.isTyping) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUser(null);
          }, 3000);
        }
      }
    },
    onUserOnline: (data) => {
      console.log("🟢 User came online:", data.username);
      if (data.username === peerUsername) {
        setIsPeerOnline(true);
      }
    },
    onUserOffline: (data) => {
      console.log("🔴 User went offline:", data.username);
      if (data.username === peerUsername) {
        setIsPeerOnline(false);
      }
    },
    onError: (errorMessage) => {
      setError(errorMessage);
    },
  });

  const scrollToBottom = () => {
    if (
      messagesEndRef.current &&
      typeof messagesEndRef.current.scrollIntoView === "function"
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = useCallback(async () => {
    if (!peerUsername) return;

    try {
      console.log("🔄 Loading messages for peer:", peerUsername);
      const response = await fetch(
        `/api/messages?peer=${encodeURIComponent(peerUsername)}`
      );
      if (response.ok) {
        const data = await response.json();
        console.log("📬 Loaded messages from API:", data.messages.length);
        // Convert old message format to new format
        const formattedMessages = data.messages.map((msg: ApiMessage) => ({
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt,
          senderId: msg.sender.id,
          receiverId: msg.receiver.id,
          senderUsername: msg.sender.username,
          receiverUsername: msg.receiver.username,
          status: msg.status || "DELIVERED",
          imageUrl: msg.imageUrl,
          imageFilename: msg.imageFilename,
          imageMimeType: msg.imageMimeType,
          imageSize: msg.imageSize,
        }));
        setMessages(formattedMessages);
        setLastMessageCheck(new Date());
      } else if (response.status === 404) {
        setError(`User "${peerUsername}" not found`);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  }, [peerUsername]);

  // Periodic message checking as fallback
  const checkForNewMessages = useCallback(async () => {
    if (!peerUsername || !currentUser) return;

    try {
      const since = lastMessageCheck.toISOString();
      console.log("🔍 Checking for new messages since:", since);

      const response = await fetch(
        `/api/messages?peer=${encodeURIComponent(peerUsername)}&since=${encodeURIComponent(since)}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          console.log(
            "📨 Found new messages via polling:",
            data.messages.length
          );

          const formattedMessages = data.messages.map((msg: ApiMessage) => ({
            id: msg.id,
            content: msg.content,
            createdAt: msg.createdAt,
            senderId: msg.sender.id,
            receiverId: msg.receiver.id,
            senderUsername: msg.sender.username,
            receiverUsername: msg.receiver.username,
            status: msg.status || "DELIVERED",
            imageUrl: msg.imageUrl,
            imageFilename: msg.imageFilename,
            imageMimeType: msg.imageMimeType,
            imageSize: msg.imageSize,
          }));

          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMessages = formattedMessages.filter(
              (msg: DirectMessage) => !existingIds.has(msg.id)
            );

            if (newMessages.length > 0) {
              console.log(
                "📥 Adding new messages from polling:",
                newMessages.length
              );
              return [...prev, ...newMessages];
            }
            return prev;
          });

          setLastMessageCheck(new Date());
        }
      }
    } catch (error) {
      console.error("Failed to check for new messages:", error);
    }
  }, [peerUsername, currentUser, lastMessageCheck]);

  // Start periodic message checking
  useEffect(() => {
    if (currentUser && peerUsername) {
      // Check every 5 seconds as fallback
      messagePollingRef.current = setInterval(checkForNewMessages, 5000);

      return () => {
        if (messagePollingRef.current) {
          clearInterval(messagePollingRef.current);
          messagePollingRef.current = null;
        }
      };
    }
  }, [currentUser, peerUsername, checkForNewMessages]);

  // Check peer's online status when the chat loads
  useEffect(() => {
    if (peerUsername && isConnected) {
      // Check online status via socket
      checkUserOnline(peerUsername);

      // Also check via HTTP API as backup
      const checkPeerStatus = async () => {
        try {
          const response = await fetch(
            `/api/users/${encodeURIComponent(peerUsername)}/online`
          );
          if (response.ok) {
            const data = await response.json();
            setIsPeerOnline(data.isOnline);
          }
        } catch (error) {
          console.error("Failed to check peer online status:", error);
        }
      };

      checkPeerStatus();
    }
  }, [peerUsername, isConnected, checkUserOnline]);

  useEffect(() => {
    if (!peerUsername) return;

    // Check authentication and load initial messages
    const initializeChat = async () => {
      try {
        const authResponse = await fetch("/api/auth/me");
        if (!authResponse.ok) {
          router.push("/login");
          return;
        }

        const authData = await authResponse.json();
        setCurrentUser(authData.user);

        // Load initial messages
        await loadMessages();
      } catch {
        console.error("Chat initialization failed");
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [peerUsername, router, loadMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingImage) || !peerUsername) return;

    const messageContent = newMessage.trim();
    const imageData = pendingImage;

    setNewMessage("");
    setPendingImage(null);
    setError("");

    // Send via enhanced sendMessage function that supports images
    sendSocketMessage(
      messageContent || "",
      peerUsername,
      imageData
        ? {
            imageUrl: imageData.url,
            imageFilename: imageData.filename,
            imageMimeType: imageData.mimeType,
            imageSize: imageData.size,
          }
        : undefined
    );
  };

  const handleImageUploaded = (imageData: PendingImage) => {
    setPendingImage(imageData);
  };

  const handleUploadError = (error: string) => {
    setError(error);
  };

  const handleRemoveImage = () => {
    setPendingImage(null);
  };

  const handleTyping = () => {
    if (!currentUser || !peerUsername) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    startTyping(peerUsername);

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(peerUsername);
    }, 1000);
  };

  const navigateToUserProfile = () => {
    router.push(`/u/${encodeURIComponent(peerUsername)}`);
  };

  // Early return after all hooks are called
  if (!peerUsername) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-zinc-500 font-light">Invalid chat URL</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-zinc-500 font-light">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Contacts Sidebar */}
      <ContactsSidebar
        currentUser={currentUser}
        activeContactUsername={peerUsername}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/chat"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              ←
            </Link>
            <h1 className="text-lg font-light text-white tracking-wide">
              {peerUsername}
            </h1>
            {/* Peer Online Status */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${isPeerOnline ? "bg-green-500" : "bg-zinc-500"}`}
              ></div>
              <span className="text-xs text-zinc-500">
                {isPeerOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Copy Link Button */}
            <button
              onClick={navigateToUserProfile}
              className="text-xs text-zinc-500 hover:text-white transition-colors px-2 py-1 border border-zinc-800 rounded"
              title={`View @${peerUsername}'s profile`}
            >
              👤 View Profile
            </button>
            
            {/* Debug buttons in development */}
            {process.env.NODE_ENV === "development" && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    console.log("🔄 Manual message refresh triggered");
                    loadMessages();
                  }}
                  className="text-xs text-zinc-500 hover:text-white transition-colors px-2 py-1 border border-zinc-800 rounded"
                >
                  Refresh
                </button>
                <button
                  onClick={() => {
                    console.log("🔍 Manual message check triggered");
                    checkForNewMessages();
                  }}
                  className="text-xs text-zinc-500 hover:text-white transition-colors px-2 py-1 border border-zinc-800 rounded"
                >
                  Check New
                </button>
              </div>
            )}

            {/* Socket Connection Status Indicator */}
            <div className="flex items-center space-x-2 text-xs">
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionType === "websocket"
                    ? "bg-green-500"
                    : connectionType === "polling"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              ></div>
              <span className="text-zinc-500">
                {connectionType === "websocket"
                  ? "Real-time"
                  : connectionType === "polling"
                    ? "Polling"
                    : "Connecting..."}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {error && (
                <div className="bg-red-950 border border-red-900 text-red-300 px-4 py-3 rounded-sm text-sm font-light">
                  {error}
                </div>
              )}

              {messages.length === 0 ? (
                <div className="text-center text-zinc-500 py-16 font-light">
                  <div className="w-16 h-16 border border-zinc-800 mx-auto mb-4 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-zinc-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.985-.504L10 16H6c-1.105 0-2-.895-2-2V6c0-1.105.895-2 2-2h12c1.105 0 2 .895 2 2v6z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm uppercase tracking-wider">
                    No messages yet
                  </p>
                  <p className="text-xs text-zinc-600 mt-2 uppercase tracking-wider">
                    Start the conversation
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    content={message.content}
                    imageUrl={message.imageUrl}
                    imageFilename={message.imageFilename}
                    isOwnMessage={
                      message.senderUsername === currentUser?.username
                    }
                    timestamp={message.createdAt}
                    senderUsername={message.senderUsername}
                    showSender={
                      message.senderUsername !== currentUser?.username
                    }
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-zinc-900 bg-zinc-950 p-6">
              {/* Typing Indicator */}
              {typingUser && (
                <div className="mb-4 text-xs text-zinc-500 font-light uppercase tracking-wider">
                  {typingUser} is typing...
                </div>
              )}

              {/* Pending Image Preview */}
              {pendingImage && (
                <div className="mb-4 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Image
                        src={pendingImage.url}
                        alt="Upload preview"
                        width={80}
                        height={80}
                        className="rounded-lg object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 font-medium">
                        {pendingImage.filename}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {(pendingImage.size / 1024 / 1024).toFixed(1)} MB •{" "}
                        {pendingImage.mimeType}
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveImage}
                      className="flex-shrink-0 text-zinc-400 hover:text-white"
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    📎 Image attached and ready to send
                  </p>
                </div>
              )}

              <form
                onSubmit={handleSendMessage}
                className="flex items-end space-x-4"
              >
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder="Type your message... (supports **bold**, _italic_, `code`)"
                    className="w-full input-field resize-none font-light"
                    rows={2}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>

                {/* Image Upload Button */}
                <div className="flex-shrink-0">
                  <ImageUpload
                    onImageUploaded={handleImageUploaded}
                    onUploadError={handleUploadError}
                    disabled={false}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!newMessage.trim() && !pendingImage}
                  className="flex-shrink-0 btn-primary text-sm font-medium uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SEND
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatUserPage() {
  return (
    <ErrorBoundary>
      <ChatUserPageContent />
    </ErrorBoundary>
  );
}
