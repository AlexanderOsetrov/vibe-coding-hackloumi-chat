import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  senderUsername: string;
  receiverUsername?: string;
  groupName?: string;
  status: string;
  type?: "direct" | "group";
  imageUrl?: string | null;
  imageFilename?: string | null;
  imageMimeType?: string | null;
  imageSize?: number | null;
}

interface UseSocketOptions {
  onNewMessage?: (message: Message) => void;
  onMessageSent?: (message: Message) => void;
  onMessageDelivered?: (messageId: string) => void;
  onTypingIndicator?: (data: { username: string; isTyping: boolean }) => void;
  onGroupTypingIndicator?: (data: {
    username: string;
    groupId: string;
    isTyping: boolean;
  }) => void;
  onUserOnline?: (data: { userId: string; username: string }) => void;
  onUserOffline?: (data: { userId: string; username: string }) => void;
  onError?: (error: string) => void;
}

interface UseSocketReturn {
  isConnected: boolean;
  sendMessage: (
    content: string,
    receiverUsername: string,
    imageData?: {
      imageUrl?: string;
      imageFilename?: string;
      imageMimeType?: string;
      imageSize?: number;
    }
  ) => void;
  sendGroupMessage?: (data: {
    content: string;
    groupId: string;
    imageUrl?: string;
    imageFilename?: string;
    imageMimeType?: string;
    imageSize?: number;
  }) => void;
  startTyping: (receiverUsername: string) => void;
  stopTyping: (receiverUsername: string) => void;
  startGroupTyping?: (data: { groupId: string }) => void;
  stopGroupTyping?: (data: { groupId: string }) => void;
  joinGroup?: (groupId: string) => void;
  checkUserOnline: (username: string) => void;
  connectionType: "websocket" | "polling" | "disconnected";
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<
    "websocket" | "polling" | "disconnected"
  >("disconnected");
  const socketRef = useRef<Socket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimestamp = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationPromiseRef = useRef<Promise<void> | null>(null);

  // Memoize callback functions to prevent unnecessary re-renders
  const memoizedCallbacks = useRef(options);
  memoizedCallbacks.current = options;

  // Note: These are commented out to avoid linter errors since they're accessed via memoizedCallbacks.current
  // const {
  //   onNewMessage,
  //   onMessageSent,
  //   onMessageDelivered,
  //   onTypingIndicator,
  //   onUserOnline,
  //   onUserOffline,
  //   onError,
  // } = memoizedCallbacks.current;

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear all timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Disconnect socket gracefully
    if (socketRef.current) {
      try {
        // Check if removeAllListeners exists and is a function
        if (
          socketRef.current.removeAllListeners &&
          typeof socketRef.current.removeAllListeners === "function"
        ) {
          socketRef.current.removeAllListeners();
        }
        socketRef.current.disconnect();
      } catch (error) {
        console.error("Error during socket cleanup:", error);
      }
      socketRef.current = null;
    }

    setIsConnected(false);
    setConnectionType("disconnected");
  }, []);

  // Polling fallback for when WebSocket is not available
  const startPollingFallback = useCallback(() => {
    if (!isMountedRef.current || pollingRef.current) return;

    console.log("Starting polling fallback");
    setConnectionType("polling");

    pollingRef.current = setInterval(async () => {
      if (!isMountedRef.current) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        return;
      }

      try {
        const url = lastMessageTimestamp.current
          ? `/api/messages/poll?since=${encodeURIComponent(lastMessageTimestamp.current)}`
          : `/api/messages/poll`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            data.messages.forEach((message: Message) => {
              if (isMountedRef.current) {
                memoizedCallbacks.current.onNewMessage?.(message);
              }
            });
            lastMessageTimestamp.current =
              data.messages[data.messages.length - 1].createdAt;
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        // Don't spam logs on polling errors
      }
    }, 3000);
  }, []);

  // Initialize Socket.IO connection with improved error handling
  const initializeSocket = useCallback(async () => {
    if (isInitializedRef.current || !isMountedRef.current) return;

    // Prevent multiple concurrent initializations
    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }

    isInitializedRef.current = true;

    initializationPromiseRef.current = (async () => {
      try {
        // Ensure the Socket.IO server is ready
        await fetch("/api/socketio");

        if (!isMountedRef.current) return;

        const socket = io({
          path: "/api/socketio",
          transports: ["polling", "websocket"],
          upgrade: true,
          rememberUpgrade: false,
          timeout: 20000, // Reduced timeout to prevent long hangs
          forceNew: false, // Critical: prevents probe errors
          autoConnect: true,
          withCredentials: true,
          reconnection: true,
          reconnectionAttempts: 3, // Reduced to prevent spam
          reconnectionDelay: 2000, // Increased delay between attempts
          reconnectionDelayMax: 10000, // Reasonable max delay
          closeOnBeforeunload: false, // Prevent premature closure
          multiplex: false, // Disable multiplexing for stability
          forceBase64: false,
          query: {
            t: Date.now(), // Cache buster
          },
        });

        if (!isMountedRef.current) {
          socket.disconnect();
          return;
        }

        socketRef.current = socket;

        // Connection event handlers
        socket.on("connect", () => {
          if (!isMountedRef.current) return;

          console.log("Socket.IO connected with ID:", socket.id);
          console.log("Socket transport:", socket.io.engine.transport.name);
          setIsConnected(true);

          // Stop polling fallback
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          // Update connection type
          const transportName = socket.io.engine.transport.name;
          setConnectionType(
            transportName === "websocket" ? "websocket" : "polling"
          );

          // Test the connection by emitting a test event
          console.log("Testing socket connection...");
          socket.emit("connection_test", { timestamp: Date.now() });
        });

        socket.on("disconnect", (reason) => {
          if (!isMountedRef.current) return;

          console.log("Socket.IO disconnected:", reason);
          setIsConnected(false);
          setConnectionType("disconnected");

          // Only start polling fallback for specific disconnect reasons
          const shouldPoll =
            reason !== "io client disconnect" && reason !== "transport close";

          if (shouldPoll && isMountedRef.current) {
            // Delay before starting polling to avoid immediate conflicts
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current && !socketRef.current?.connected) {
                startPollingFallback();
              }
            }, 3000);
          }
        });

        socket.on("connect_error", (error) => {
          if (!isMountedRef.current) return;

          console.error(
            "Socket.IO connection error:",
            typeof error === "string" ? error : error.message
          );
          setIsConnected(false);
          setConnectionType("disconnected");

          // Start polling fallback after connection errors
          if (isMountedRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current && !socketRef.current?.connected) {
                startPollingFallback();
              }
            }, 5000); // Longer delay after connection errors
          }
        });

        // Handle general socket errors gracefully
        socket.on("error", (error) => {
          if (!isMountedRef.current) return;
          console.error("Socket.IO general error:", error);
          // Don't disconnect on general errors, just log them
        });

        // Engine error handlers
        socket.io.engine.on("error", (error) => {
          if (!isMountedRef.current) return;
          console.error(
            "Socket.IO engine error:",
            typeof error === "string" ? error : error.message
          );
          // Don't take action on engine errors, they're often temporary
        });

        // Transport upgrade handlers
        socket.io.engine.on("upgrade", () => {
          if (!isMountedRef.current) return;
          const transportName = socket.io.engine.transport.name;
          setConnectionType(
            transportName === "websocket" ? "websocket" : "polling"
          );
        });

        socket.io.engine.on("upgradeError", (error) => {
          if (!isMountedRef.current) return;
          console.log(
            "Socket.IO upgrade error (non-critical):",
            typeof error === "string" ? error : error.message
          );
          // Don't change connection state on upgrade errors
        });

        // Message event listeners
        socket.on("new_message", (message: Message) => {
          if (!isMountedRef.current) return;
          console.log("🔥 RECEIVED NEW MESSAGE VIA SOCKET:", message);
          console.log("Socket ID:", socket.id);

          // Log different details based on message type
          if (message.type === "group") {
            console.log("📱 Group message details:", {
              id: message.id,
              from: message.senderUsername,
              group: message.groupName,
              groupId: message.groupId,
              content: message.content,
              type: message.type,
            });
          } else {
            console.log("💬 Direct message details:", {
              id: message.id,
              from: message.senderUsername,
              to: message.receiverUsername,
              content: message.content,
              type: message.type || "direct",
            });
          }

          memoizedCallbacks.current.onNewMessage?.(message);
          // Send delivery acknowledgment
          console.log("Sending delivery ACK for message:", message.id);
          socket.emit("message_delivered", { messageId: message.id });
        });

        socket.on("message_sent", (message: Message) => {
          if (!isMountedRef.current) return;
          console.log("✅ MESSAGE SENT CONFIRMATION:", message);
          memoizedCallbacks.current.onMessageSent?.(message);
        });

        socket.on("message_delivered", (data: { messageId: string }) => {
          if (!isMountedRef.current) return;
          console.log("📨 MESSAGE DELIVERED:", data.messageId);
          memoizedCallbacks.current.onMessageDelivered?.(data.messageId);
        });

        socket.on(
          "typing_indicator",
          (data: { username: string; isTyping: boolean }) => {
            if (!isMountedRef.current) return;
            console.log("⌨️ TYPING INDICATOR:", data);
            memoizedCallbacks.current.onTypingIndicator?.(data);
          }
        );

        socket.on("message_error", (data: { error: string }) => {
          if (!isMountedRef.current) return;
          console.error("❌ MESSAGE ERROR:", data.error);
          memoizedCallbacks.current.onError?.(data.error);
        });

        // Group message event listeners
        socket.on(
          "group_typing_indicator",
          (data: { username: string; groupId: string; isTyping: boolean }) => {
            if (!isMountedRef.current) return;
            console.log("⌨️ GROUP TYPING INDICATOR:", data);
            memoizedCallbacks.current.onGroupTypingIndicator?.(data);
          }
        );

        // Online/offline status listeners
        socket.on(
          "user_online",
          (data: { userId: string; username: string }) => {
            if (!isMountedRef.current) return;
            console.log("🟢 USER CAME ONLINE:", data.username);
            memoizedCallbacks.current.onUserOnline?.(data);
          }
        );

        socket.on(
          "user_offline",
          (data: { userId: string; username: string }) => {
            if (!isMountedRef.current) return;
            console.log("🔴 USER WENT OFFLINE:", data.username);
            memoizedCallbacks.current.onUserOffline?.(data);
          }
        );

        socket.on(
          "user_online_status",
          (data: { userId: string; username: string; isOnline: boolean }) => {
            if (!isMountedRef.current) return;
            console.log("📍 USER STATUS CHECK:", data);
            // We can use the existing callbacks for this
            if (data.isOnline) {
              memoizedCallbacks.current.onUserOnline?.(data);
            } else {
              memoizedCallbacks.current.onUserOffline?.(data);
            }
          }
        );

        // Add connection test response handler
        socket.on("connection_test_response", (data) => {
          console.log("✅ Connection test successful:", data);
        });
      } catch (error) {
        console.error("Failed to initialize Socket.IO:", error);
        if (isMountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              startPollingFallback();
            }
          }, 5000);
        }
      } finally {
        initializationPromiseRef.current = null;
      }
    })();

    return initializationPromiseRef.current;
  }, [startPollingFallback]);

  // Send message function with improved error handling
  const sendMessage = useCallback(
    (
      content: string,
      receiverUsername: string,
      imageData?: {
        imageUrl?: string;
        imageFilename?: string;
        imageMimeType?: string;
        imageSize?: number;
      }
    ) => {
      // Create optimistic message for immediate UI update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}-${Math.random()}`,
        content,
        createdAt: new Date().toISOString(),
        senderId: "current-user",
        receiverId: "receiver",
        senderUsername: "current-user",
        receiverUsername,
        status: "SENDING",
        imageUrl: imageData?.imageUrl,
        imageFilename: imageData?.imageFilename,
        imageMimeType: imageData?.imageMimeType,
        imageSize: imageData?.imageSize,
      };

      // Immediately show the message in the UI
      if (isMountedRef.current) {
        console.log("Adding optimistic message to UI:", optimisticMessage);
        memoizedCallbacks.current.onMessageSent?.(optimisticMessage);
      }

      const sendViaHTTP = async () => {
        try {
          const response = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content,
              receiverUsername,
              imageUrl: imageData?.imageUrl,
              imageFilename: imageData?.imageFilename,
              imageMimeType: imageData?.imageMimeType,
              imageSize: imageData?.imageSize,
            }),
          });

          const data = await response.json();

          if (data.data && isMountedRef.current) {
            console.log("HTTP message sent successfully:", data.data);
            memoizedCallbacks.current.onMessageSent?.(data.data);
          } else if (data.error) {
            console.error("HTTP message error:", data.error);
            if (isMountedRef.current) {
              memoizedCallbacks.current.onError?.(data.error);
            }
          }
        } catch (error) {
          console.error("Send message error:", error);
          if (isMountedRef.current) {
            memoizedCallbacks.current.onError?.("Failed to send message");
          }
        }
      };

      if (socketRef.current?.connected && isConnected) {
        // Send via WebSocket
        console.log("Sending message via WebSocket:", {
          content,
          receiverUsername,
          ...imageData,
        });
        socketRef.current.emit("send_message", {
          content,
          receiverUsername,
          imageUrl: imageData?.imageUrl,
          imageFilename: imageData?.imageFilename,
          imageMimeType: imageData?.imageMimeType,
          imageSize: imageData?.imageSize,
        });

        // Fallback to HTTP if no confirmation in reasonable time
        const fallbackTimeout = setTimeout(() => {
          if (isMountedRef.current) {
            console.log("WebSocket timeout, trying HTTP fallback");
            sendViaHTTP();
          }
        }, 5000); // 5 second timeout

        // Clear timeout if we get a response
        const cleanup = () => clearTimeout(fallbackTimeout);
        socketRef.current.once("message_sent", cleanup);
        socketRef.current.once("message_error", cleanup);
      } else {
        // Use HTTP immediately if no socket connection
        console.log("No WebSocket connection, using HTTP");
        sendViaHTTP();
      }
    },
    [isConnected]
  );

  // Typing indicators
  const startTyping = useCallback(
    (receiverUsername: string) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("typing_start", { receiverUsername });
      }
    },
    [isConnected]
  );

  const stopTyping = useCallback(
    (receiverUsername: string) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("typing_stop", { receiverUsername });
      }
    },
    [isConnected]
  );

  // Check if a user is online
  const checkUserOnline = useCallback(
    (username: string) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("check_user_online", { username });
      }
    },
    [isConnected]
  );

  // Group messaging functions
  const sendGroupMessage = useCallback(
    (data: {
      content: string;
      groupId: string;
      imageUrl?: string;
      imageFilename?: string;
      imageMimeType?: string;
      imageSize?: number;
    }) => {
      // Create optimistic message for immediate UI update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}-${Math.random()}`,
        content: data.content,
        createdAt: new Date().toISOString(),
        senderId: "current-user",
        groupId: data.groupId,
        senderUsername: "current-user",
        status: "SENDING",
        type: "group",
        imageUrl: data.imageUrl,
        imageFilename: data.imageFilename,
        imageMimeType: data.imageMimeType,
        imageSize: data.imageSize,
      };

      // Immediately show the message in the UI
      if (isMountedRef.current) {
        console.log(
          "Adding optimistic group message to UI:",
          optimisticMessage
        );
        memoizedCallbacks.current.onMessageSent?.(optimisticMessage);
      }

      const sendViaHTTP = async () => {
        try {
          const response = await fetch(`/api/groups/${data.groupId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: data.content,
              imageUrl: data.imageUrl,
              imageFilename: data.imageFilename,
              imageMimeType: data.imageMimeType,
              imageSize: data.imageSize,
            }),
          });

          const responseData = await response.json();

          if (responseData.data && isMountedRef.current) {
            console.log(
              "HTTP group message sent successfully:",
              responseData.data
            );
            memoizedCallbacks.current.onMessageSent?.(responseData.data);
          } else if (responseData.error) {
            console.error("HTTP group message error:", responseData.error);
            if (isMountedRef.current) {
              memoizedCallbacks.current.onError?.(responseData.error);
            }
          }
        } catch (error) {
          console.error("Send group message error:", error);
          if (isMountedRef.current) {
            memoizedCallbacks.current.onError?.("Failed to send group message");
          }
        }
      };

      if (socketRef.current?.connected && isConnected) {
        // Send via WebSocket
        console.log("Sending group message via WebSocket:", data);
        socketRef.current.emit("send_group_message", data);

        // Fallback to HTTP if no confirmation in reasonable time
        const fallbackTimeout = setTimeout(() => {
          if (isMountedRef.current) {
            console.log(
              "WebSocket timeout, trying HTTP fallback for group message"
            );
            sendViaHTTP();
          }
        }, 5000);

        // Clear timeout if we get a response
        const cleanup = () => clearTimeout(fallbackTimeout);
        socketRef.current.once("message_sent", cleanup);
        socketRef.current.once("message_error", cleanup);
      } else {
        // Use HTTP immediately if no socket connection
        console.log("No WebSocket connection, using HTTP for group message");
        sendViaHTTP();
      }
    },
    [isConnected]
  );

  // Group typing indicators
  const startGroupTyping = useCallback(
    (data: { groupId: string }) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("group_typing_start", data);
      }
    },
    [isConnected]
  );

  const stopGroupTyping = useCallback(
    (data: { groupId: string }) => {
      if (socketRef.current?.connected && isConnected) {
        socketRef.current.emit("group_typing_stop", data);
      }
    },
    [isConnected]
  );

  // Explicitly join a group room
  const joinGroup = useCallback(
    (groupId: string) => {
      if (socketRef.current?.connected && isConnected && groupId) {
        console.log("🏠 Explicitly joining group room:", groupId);
        socketRef.current.emit("join_group", { groupId });
      }
    },
    [isConnected]
  );

  // Initialize on mount and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    initializeSocket();

    return () => {
      isMountedRef.current = false;
      isInitializedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - initialization happens only once

  return {
    isConnected,
    sendMessage,
    sendGroupMessage,
    startTyping,
    stopTyping,
    startGroupTyping,
    stopGroupTyping,
    joinGroup,
    checkUserOnline,
    connectionType,
  };
}
