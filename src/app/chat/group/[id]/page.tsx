"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  group?: { id: string; name: string };
  status?: string;
  imageUrl?: string | null;
  imageFilename?: string | null;
  imageMimeType?: string | null;
  imageSize?: number | null;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  groupId?: string;
  senderUsername: string;
  groupName?: string;
  status?: string;
  type: "group";
  imageUrl?: string | null;
  imageFilename?: string | null;
  imageMimeType?: string | null;
  imageSize?: number | null;
}

interface User {
  id: string;
  username: string;
}

interface Group {
  id: string;
  name: string;
  owner: {
    id: string;
    username: string;
  };
  members: {
    id: string;
    user: {
      id: string;
      username: string;
    };
  }[];
  _count: {
    members: number;
    messages: number;
  };
}

interface PendingImage {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

function ChatGroupPageContent() {
  const router = useRouter();
  const [groupId, setGroupId] = useState<string>("");
  const [group, setGroup] = useState<Group | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const pathSegments = window.location.pathname.split("/");
    const id = pathSegments[pathSegments.length - 1];
    console.log("🆔 Setting groupId:", id);
    setGroupId(id);
  }, []);

  // Socket.IO hook with real-time messaging - MOVED AFTER groupId is set
  const {
    isConnected,
    connectionType,
    sendGroupMessage,
    startGroupTyping,
    stopGroupTyping,
    joinGroup,
  } = useSocket({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onNewMessage: (message: any) => {
      console.log("🔔 RECEIVED NEW MESSAGE VIA SOCKET:", message);
      console.log("🆔 Current groupId:", groupId);
      console.log("📊 Message details:", {
        messageType: message.type,
        messageGroupId: message.groupId,
        isGroupMessage: message.type === "group",
        groupIdMatch: message.groupId === groupId,
        shouldProcess: message.type === "group" && message.groupId === groupId,
      });

      if (message.type === "group" && message.groupId === groupId) {
        console.log("✅ Processing group message for UI update");
        const newMsg: Message = {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
          senderId: message.senderId,
          groupId: message.groupId,
          senderUsername: message.senderUsername,
          groupName: message.groupName,
          status: message.status,
          type: "group" as const,
          imageUrl: message.imageUrl,
          imageFilename: message.imageFilename,
          imageMimeType: message.imageMimeType,
          imageSize: message.imageSize,
        };
        console.log("🎯 Adding message to UI:", newMsg);
        setMessages((prev) => {
          console.log("📝 Previous messages count:", prev.length);
          const updated = [...prev, newMsg];
          console.log("📝 Updated messages count:", updated.length);
          return updated;
        });
        scrollToBottom();
      } else {
        console.log(
          "❌ Ignoring message (not for this group or not group message)"
        );
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onGroupTypingIndicator: (data: any) => {
      if (data.groupId === groupId && data.username) {
        setTypingUsers((prev) => {
          if (data.isTyping) {
            if (!prev.includes(data.username)) {
              return [...prev, data.username];
            }
          } else {
            return prev.filter((user) => user !== data.username);
          }
          return prev;
        });
      }
    },
    onMessageDelivered: (messageId: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: "DELIVERED" } : msg
        )
      );
    },
  });

  // Re-establish Socket.IO connection when groupId changes
  useEffect(() => {
    if (groupId) {
      console.log(
        "🔄 GroupId changed, Socket.IO should reconnect for:",
        groupId
      );
    }
  }, [groupId]);

  // Join group room when connected and groupId is available
  useEffect(() => {
    if (isConnected && groupId && joinGroup) {
      console.log(
        "🏠 Joining group room on connection/groupId change:",
        groupId
      );
      joinGroup(groupId);
    }
  }, [isConnected, groupId, joinGroup]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const loadGroupData = useCallback(async () => {
    if (!groupId) return;

    try {
      // Load group details
      const groupResponse = await fetch(`/api/groups/${groupId}`);
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroup(groupData.group);
        console.log("📁 Group loaded:", groupData.group.name);
      } else {
        setError("Failed to load group details");
        return;
      }

      // Load messages
      const messagesResponse = await fetch(`/api/groups/${groupId}/messages`);
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        const formattedMessages: Message[] = messagesData.messages.map(
          (msg: ApiMessage) => ({
            id: msg.id,
            content: msg.content,
            createdAt: msg.createdAt,
            senderId: msg.sender.id,
            groupId: msg.group?.id,
            senderUsername: msg.sender.username,
            groupName: msg.group?.name,
            status: msg.status,
            type: "group" as const,
            imageUrl: msg.imageUrl,
            imageFilename: msg.imageFilename,
            imageMimeType: msg.imageMimeType,
            imageSize: msg.imageSize,
          })
        );
        setMessages(formattedMessages);
        console.log(`💬 ${formattedMessages.length} messages loaded`);
      }
    } catch (error) {
      console.error("Failed to load group data:", error);
      setError("Failed to load group data");
    }
  }, [groupId]);

  const loadCurrentUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData.user);
        console.log("👤 Current user loaded:", userData.user.username);
      } else {
        router.push("/login");
      }
    } catch (error) {
      console.error("Failed to load current user:", error);
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    const initializeChat = async () => {
      setIsLoading(true);
      setError("");

      await loadCurrentUser();
      await loadGroupData();

      setIsLoading(false);
    };

    initializeChat();
  }, [loadCurrentUser, loadGroupData]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingImage) || !groupId || !currentUser)
      return;

    const messageText = newMessage.trim();
    const imageData = pendingImage;
    setNewMessage("");
    setPendingImage(null);

    const messagePayload = {
      content: messageText,
      groupId: groupId,
      ...(imageData && {
        imageUrl: imageData.url,
        imageFilename: imageData.filename,
        imageMimeType: imageData.mimeType,
        imageSize: imageData.size,
      }),
    };

    // Send via Socket.IO if connected, otherwise fall back to HTTP
    if (isConnected && sendGroupMessage) {
      console.log("📤 Sending group message via Socket.IO");
      sendGroupMessage(messagePayload);
    } else {
      // Fallback to HTTP API
      console.log("📤 Sending group message via HTTP API");
      try {
        const response = await fetch(`/api/groups/${groupId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messagePayload),
        });

        if (response.ok) {
          const data = await response.json();
          // Message will be added via polling or socket
          console.log("✅ Group message sent successfully:", data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to send message");
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        setError("Failed to send message. Please try again.");
      }
    }
  };

  const handleImageUploaded = (imageData: PendingImage) => {
    setPendingImage(imageData);
    setError(""); // Clear any previous errors
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setPendingImage(null);
  };

  const handleTyping = () => {
    if (isConnected && startGroupTyping && groupId) {
      startGroupTyping({ groupId });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (stopGroupTyping && groupId) {
          stopGroupTyping({ groupId });
        }
      }, 1000);
    }
  };

  const navigateToGroupProfile = () => {
    router.push(`/g/${encodeURIComponent(groupId)}`);
  };

  const isOwner = group && currentUser && group.owner.id === currentUser.id;

  if (isLoading) {
    return (
      <div className="flex h-screen bg-black text-white">
        <ContactsSidebar currentUser={currentUser} activeGroupId={groupId} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-400 font-light">Loading group...</div>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="flex h-screen bg-black text-white">
        <ContactsSidebar currentUser={currentUser} activeGroupId={groupId} />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="text-red-400 text-center">{error}</div>
          <Link href="/chat" className="btn-primary">
            Back to Chat
          </Link>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex h-screen bg-black text-white">
        <ContactsSidebar currentUser={currentUser} activeGroupId={groupId} />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="text-zinc-400 text-center">Group not found</div>
          <Link href="/chat" className="btn-primary">
            Back to Chat
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white">
      <ContactsSidebar currentUser={currentUser} activeGroupId={groupId} />

      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="chat-header border-b border-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-zinc-300">
                  {group.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-light text-white">{group.name}</h1>
                <p className="text-xs text-zinc-400">
                  {group._count.members} members • Owner: {group.owner.username}
                  {isOwner && <span className="text-zinc-500 ml-1">(you)</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Copy Link Button */}
              <button
                onClick={navigateToGroupProfile}
                className="text-xs text-zinc-500 hover:text-white transition-colors px-2 py-1 border border-zinc-800 rounded"
                title={`View "${group.name}" info`}
              >
                ℹ️ Group Info
              </button>
              
              <div className="flex items-center space-x-1 text-xs text-zinc-500">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-zinc-600"}`}
                ></div>
                <span className="uppercase tracking-wide">
                  {connectionType === "websocket"
                    ? "REALTIME"
                    : connectionType === "polling"
                      ? "POLLING"
                      : "OFFLINE"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 mt-8">
              <p className="text-lg font-light">Welcome to {group.name}!</p>
              <p className="text-sm">
                Start the conversation by sending a message or share an image.
              </p>
              <p className="text-xs mt-2 text-zinc-600">
                Tip: Use **bold**, _italic_, or `code` formatting in your
                messages
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwnMessage = message.senderId === currentUser?.id;
              const showSender =
                index === 0 ||
                messages[index - 1].senderId !== message.senderId;

              return (
                <MessageBubble
                  key={message.id}
                  content={message.content}
                  imageUrl={message.imageUrl}
                  imageFilename={message.imageFilename}
                  isOwnMessage={isOwnMessage}
                  timestamp={message.createdAt}
                  senderUsername={message.senderUsername}
                  showSender={!isOwnMessage && showSender}
                />
              );
            })
          )}

          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="message-bubble received opacity-75">
                <div className="text-sm text-zinc-300">
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} is typing...`
                    : typingUsers.length === 2
                      ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                      : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-zinc-900 p-4">
          {pendingImage && (
            <div className="mb-3 p-3 bg-zinc-900 rounded-lg border border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden">
                    <Image
                      src={pendingImage.url}
                      alt="Preview"
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-sm">
                    <div className="text-white">{pendingImage.filename}</div>
                    <div className="text-zinc-400 text-xs">
                      {(pendingImage.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPendingImage(null)}
                  className="text-zinc-400 hover:text-white transition-colors"
                  title="Remove image"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <ImageUpload
              onImageUploaded={handleImageUploaded}
              onUploadError={handleUploadError}
              disabled={isLoading}
            />
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder={`Message ${group.name}... (use **bold**, _italic_, \`code\`)`}
              className="input-field flex-1"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newMessage.trim() && !pendingImage}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SEND
            </button>
          </form>

          {error && <div className="mt-2 text-red-400 text-sm">{error}</div>}
        </div>
      </div>
    </div>
  );
}

export default function ChatGroupPage() {
  return (
    <ErrorBoundary>
      <ChatGroupPageContent />
    </ErrorBoundary>
  );
}
