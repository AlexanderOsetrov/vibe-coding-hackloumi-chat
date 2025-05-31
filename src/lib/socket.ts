import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { NextApiRequest } from "next";
import { parse } from "cookie";
import { verifyJWT } from "./auth";
import { prisma } from "./db";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

interface MessageData {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  senderUsername: string;
  receiverUsername?: string;
  groupName?: string;
  createdAt: string;
  status: string;
  type: "direct" | "group";
  imageUrl?: string | null;
  imageFilename?: string | null;
  imageMimeType?: string | null;
  imageSize?: number | null;
}

// In-memory store for connected users
const connectedUsers = new Map<string, string>(); // userId -> socketId
const userSockets = new Map<string, AuthenticatedSocket>(); // socketId -> socket

// Message queue for offline users
const messageQueue = new Map<string, MessageData[]>(); // userId -> messages[]

let io: SocketIOServer | null = null;

export function initializeSocket(server: HTTPServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3002"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socketio",
    transports: ["polling", "websocket"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e6,
    connectTimeout: 20000,
    allowRequest: (_req, callback) => {
      // Allow all requests in development
      callback(null, true);
    },
    serveClient: false,
    cookie: {
      name: "io",
      httpOnly: true,
      sameSite: "lax",
    },
    cleanupEmptyChildNamespaces: true,
    // Improved session management
    adapter: undefined, // Use default memory adapter
    connectionStateRecovery: {
      // Reduce disconnection tolerance to improve stability
      maxDisconnectionDuration: 30 * 1000, // 30 seconds
      skipMiddlewares: false,
    },
  });

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const req = socket.request as NextApiRequest;
      const cookies = parse(req.headers.cookie || "");
      const token = cookies["auth-token"];

      if (!token) {
        console.log("Socket connection rejected: No auth token");
        return next(new Error("Authentication required"));
      }

      const payload = await verifyJWT(token);
      if (!payload || !payload.userId) {
        console.log("Socket connection rejected: Invalid token");
        return next(new Error("Invalid token"));
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true },
      });

      if (!user) {
        console.log("Socket connection rejected: User not found");
        return next(new Error("User not found"));
      }

      (socket as AuthenticatedSocket).userId = user.id;
      (socket as AuthenticatedSocket).username = user.username;
      
      console.log(`Socket authentication successful for user: ${user.username}`);
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    console.log(`🔗 User ${authSocket.username} connected with socket ${authSocket.id}`);

    if (authSocket.userId) {
      // Store user connection
      connectedUsers.set(authSocket.userId, authSocket.id);
      userSockets.set(authSocket.id, authSocket);
      
      console.log(`👤 User mapping: ${authSocket.username} (${authSocket.userId}) -> ${authSocket.id}`);
      console.log(`📊 Total connected users: ${connectedUsers.size}`);

      // Join user to their personal room for direct messaging
      authSocket.join(`user:${authSocket.userId}`);
      console.log(`🏠 User ${authSocket.username} joined room: user:${authSocket.userId}`);

      // Join user to all their group rooms
      await joinUserGroups(authSocket);

      // Broadcast to all connected users that this user is now online
      authSocket.broadcast.emit("user_online", {
        userId: authSocket.userId,
        username: authSocket.username,
      });

      // Deliver any queued messages
      deliverQueuedMessages(authSocket.userId);

      // Handle connection test
      authSocket.on("connection_test", (data) => {
        console.log(`🧪 Connection test from ${authSocket.username}:`, data);
        authSocket.emit("connection_test_response", { 
          ...data, 
          serverTime: Date.now(),
          userId: authSocket.userId,
          socketId: authSocket.id 
        });
      });

      // Handle online status check
      authSocket.on("check_user_online", (data: { username: string }) => {
        prisma.user.findUnique({
          where: { username: data.username },
          select: { id: true, username: true },
        }).then((user) => {
          if (user) {
            const isOnline = connectedUsers.has(user.id);
            authSocket.emit("user_online_status", {
              userId: user.id,
              username: user.username,
              isOnline,
            });
          }
        }).catch(console.error);
      });

      // Handle direct message sending
      authSocket.on("send_message", async (data: {
        content: string;
        receiverUsername: string;
      }) => {
        try {
          console.log(`📤 Handling send_message from ${authSocket.username}:`, data);
          await handleSendDirectMessage(authSocket, data);
        } catch (error) {
          console.error("Send message error:", error);
          authSocket.emit("message_error", { error: "Failed to send message" });
        }
      });

      // Handle group message sending
      authSocket.on("send_group_message", async (data: {
        content: string;
        groupId: string;
        imageUrl?: string;
        imageFilename?: string;
        imageMimeType?: string;
        imageSize?: number;
      }) => {
        try {
          console.log(`📤 Handling send_group_message from ${authSocket.username}:`, data);
          await handleSendGroupMessage(authSocket, data);
        } catch (error) {
          console.error("Send group message error:", error);
          authSocket.emit("message_error", { error: "Failed to send group message" });
        }
      });

      // Handle joining a group (when user is added to a group)
      authSocket.on("join_group", async (data: { groupId: string }) => {
        try {
          await handleJoinGroup(authSocket, data.groupId);
        } catch (error) {
          console.error("Join group error:", error);
        }
      });

      // Handle leaving a group
      authSocket.on("leave_group", async (data: { groupId: string }) => {
        try {
          await handleLeaveGroup(authSocket, data.groupId);
        } catch (error) {
          console.error("Leave group error:", error);
        }
      });

      // Handle message acknowledgment
      authSocket.on("message_delivered", async (data: { messageId: string }) => {
        try {
          console.log(`Message delivered ACK from ${authSocket.username}:`, data.messageId);
          await handleMessageDelivered(authSocket, data.messageId);
        } catch (error) {
          console.error("Message delivery ACK error:", error);
        }
      });

      // Handle typing indicators for direct messages
      authSocket.on("typing_start", (data: { receiverUsername: string }) => {
        console.log(`${authSocket.username} started typing to ${data.receiverUsername}`);
        handleTypingIndicator(authSocket, data.receiverUsername, true);
      });

      authSocket.on("typing_stop", (data: { receiverUsername: string }) => {
        console.log(`${authSocket.username} stopped typing to ${data.receiverUsername}`);
        handleTypingIndicator(authSocket, data.receiverUsername, false);
      });

      // Handle typing indicators for group messages
      authSocket.on("group_typing_start", (data: { groupId: string }) => {
        handleGroupTypingIndicator(authSocket, data.groupId, true);
      });

      authSocket.on("group_typing_stop", (data: { groupId: string }) => {
        handleGroupTypingIndicator(authSocket, data.groupId, false);
      });

      authSocket.on("disconnect", (reason) => {
        console.log(`User ${authSocket.username} disconnected: ${reason}`);
        
        // Clean up user connections
        if (authSocket.userId) {
          connectedUsers.delete(authSocket.userId);
          
          // Broadcast to all connected users that this user is now offline
          authSocket.broadcast.emit("user_offline", {
            userId: authSocket.userId,
            username: authSocket.username,
          });
        }
        userSockets.delete(authSocket.id);
        
        // Don't log client-side disconnects as errors
        if (reason !== "client namespace disconnect" && reason !== "transport close") {
          console.log(`Connection cleanup completed for ${authSocket.username}`);
        }
      });

      authSocket.on("error", (error) => {
        console.error(`Socket error for ${authSocket.username}:`, error);
        // Don't force disconnect on errors, let Socket.IO handle it
      });

      // Handle connection errors more gracefully
      authSocket.on("connect_error", (error) => {
        console.error(`Connection error for ${authSocket.username}:`, error);
        // Don't force actions on connection errors
      });

      // Add error handling for the socket itself
      authSocket.on("disconnect", () => {
        // Additional cleanup if needed
        if (authSocket.userId) {
          console.log(`Final cleanup for user ${authSocket.username}`);
        }
      });

    } else {
      console.error("Socket connected without proper authentication");
      authSocket.disconnect(true);
    }
  });

  // Handle server-level errors more gracefully
  io.engine.on("connection_error", (err) => {
    console.error("Socket.IO connection error:", err.message || err);
    // Don't crash the server on connection errors
  });

  // Add engine error handling
  io.engine.on("initial_headers", () => {
    // Add any custom headers if needed
  });

  // Handle upgrade errors
  io.engine.on("upgrade_error", (err) => {
    console.log("Socket.IO upgrade error (non-critical):", err.message || err);
    // These are often non-critical
  });

  return io;
}

// Join user to all their groups
async function joinUserGroups(socket: AuthenticatedSocket) {
  if (!socket.userId) return;

  try {
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: socket.userId },
      include: {
        group: {
          select: { id: true, name: true }
        }
      }
    });

    for (const membership of userGroups) {
      const groupRoom = `group:${membership.group.id}`;
      socket.join(groupRoom);
      console.log(`🏠 User ${socket.username} joined group room: ${groupRoom} (${membership.group.name})`);
    }
  } catch (error) {
    console.error("Error joining user groups:", error);
  }
}

// Handle joining a specific group
async function handleJoinGroup(socket: AuthenticatedSocket, groupId: string) {
  if (!socket.userId) return;

  try {
    // Verify user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: socket.userId,
          groupId
        }
      },
      include: {
        group: {
          select: { id: true, name: true }
        }
      }
    });

    if (membership) {
      const groupRoom = `group:${groupId}`;
      socket.join(groupRoom);
      console.log(`🏠 User ${socket.username} joined group room: ${groupRoom} (${membership.group.name})`);
      
      // Notify group members that user is online
      socket.to(groupRoom).emit("group_user_online", {
        userId: socket.userId,
        username: socket.username,
        groupId
      });
    }
  } catch (error) {
    console.error("Error handling join group:", error);
  }
}

// Handle leaving a specific group
async function handleLeaveGroup(socket: AuthenticatedSocket, groupId: string) {
  if (!socket.userId) return;

  const groupRoom = `group:${groupId}`;
  
  // Notify group members that user is leaving
  socket.to(groupRoom).emit("group_user_offline", {
    userId: socket.userId,
    username: socket.username,
    groupId
  });
  
  socket.leave(groupRoom);
  console.log(`🚪 User ${socket.username} left group room: ${groupRoom}`);
}

async function handleSendDirectMessage(
  socket: AuthenticatedSocket,
  data: { content: string; receiverUsername: string }
) {
  if (!socket.userId || !socket.username) {
    throw new Error("Unauthorized");
  }

  const { content, receiverUsername } = data;

  // Validation
  if (!content || !receiverUsername || content.trim().length === 0) {
    socket.emit("message_error", { error: "Invalid message data" });
    return;
  }

  try {
    // Find receiver
    const receiver = await prisma.user.findUnique({
      where: { username: receiverUsername },
      select: { id: true, username: true },
    });

    if (!receiver) {
      console.log(`❌ Receiver not found: ${receiverUsername}`);
      socket.emit("message_error", { error: "Receiver not found" });
      return;
    }

    console.log(`📝 Creating direct message from ${socket.username} to ${receiver.username}`);

    // Create message in database
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: socket.userId,
        receiverId: receiver.id,
        status: "SENT",
      },
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
    });

    const messageData: MessageData = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId || undefined,
      senderUsername: message.sender.username,
      receiverUsername: message.receiver?.username,
      createdAt: message.createdAt.toISOString(),
      status: message.status,
      type: "direct",
    };

    console.log(`💾 Direct message saved to database:`, {
      id: message.id,
      from: messageData.senderUsername,
      to: messageData.receiverUsername,
      content: messageData.content.substring(0, 50) + "..."
    });

    // Send confirmation to sender
    console.log(`📤 Sending confirmation to sender: ${socket.username}`);
    socket.emit("message_sent", messageData);

    // Try to deliver to receiver immediately
    const receiverSocketId = connectedUsers.get(receiver.id);
    console.log(`🔍 Looking for receiver ${receiver.username} (${receiver.id})`);
    
    if (receiverSocketId) {
      console.log(`🎯 Found receiver socket ID: ${receiverSocketId}`);
      const receiverSocket = userSockets.get(receiverSocketId);
      
      if (receiverSocket) {
        console.log(`📨 Delivering message to ${receiver.username} via socket ${receiverSocketId}`);
        receiverSocket.emit("new_message", messageData);
        
        // Mark as delivered immediately if receiver is online
        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
          },
        });

        console.log(`✅ Message marked as delivered in database`);
        
        // Notify sender of delivery
        socket.emit("message_delivered", { messageId: message.id });
        console.log(`📬 Delivery notification sent to sender`);
      } else {
        console.log(`❌ Receiver socket not found in userSockets map`);
        // Queue message for offline user
        queueMessage(receiver.id, messageData);
        console.log(`📥 Message queued for offline user: ${receiver.username}`);
      }
    } else {
      console.log(`❌ Receiver ${receiver.username} not found in connectedUsers map`);
      // Queue message for offline user
      queueMessage(receiver.id, messageData);
      console.log(`📥 Message queued for offline user: ${receiver.username}`);
    }
  } catch (error) {
    console.error("❌ Database error in handleSendDirectMessage:", error);
    socket.emit("message_error", { error: "Failed to save message" });
  }
}

async function handleSendGroupMessage(
  socket: AuthenticatedSocket,
  data: { 
    content: string; 
    groupId: string;
    imageUrl?: string;
    imageFilename?: string;
    imageMimeType?: string;
    imageSize?: number;
  }
) {
  if (!socket.userId || !socket.username) {
    throw new Error("Unauthorized");
  }

  const { content, groupId, imageUrl, imageFilename, imageMimeType, imageSize } = data;

  // Validation - either content or image is required
  if ((!content || content.trim().length === 0) && !imageUrl) {
    socket.emit("message_error", { error: "Either content or image is required" });
    return;
  }

  if (!groupId) {
    socket.emit("message_error", { error: "Group ID is required" });
    return;
  }

  try {
    // Verify user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: socket.userId,
          groupId
        }
      },
      include: {
        group: {
          select: { id: true, name: true }
        }
      }
    });

    if (!membership) {
      socket.emit("message_error", { error: "You are not a member of this group" });
      return;
    }

    console.log(`📝 Creating group message from ${socket.username} to group ${membership.group.name}`);

    // Create message in database
    const message = await prisma.message.create({
      data: {
        content: content ? content.trim() : "",
        senderId: socket.userId,
        groupId,
        status: "SENT",
        imageUrl,
        imageFilename,
        imageMimeType,
        imageSize,
      },
      include: {
        sender: { select: { id: true, username: true } },
        group: { select: { id: true, name: true } },
      },
    });

    const messageData: MessageData = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      groupId: message.groupId || undefined,
      senderUsername: message.sender.username,
      groupName: message.group?.name,
      createdAt: message.createdAt.toISOString(),
      status: message.status,
      type: "group",
      imageUrl: message.imageUrl,
      imageFilename: message.imageFilename,
      imageMimeType: message.imageMimeType,
      imageSize: message.imageSize,
    };

    console.log(`💾 Group message saved to database:`, {
      id: message.id,
      from: messageData.senderUsername,
      group: messageData.groupName,
      content: messageData.content ? messageData.content.substring(0, 50) + "..." : "[Image]"
    });

    // Send confirmation to sender
    socket.emit("message_sent", messageData);

    // Broadcast to all group members (including sender for consistency)
    const groupRoom = `group:${groupId}`;
    console.log(`📨 Broadcasting group message to room: ${groupRoom}`);
    
    // Get list of sockets in the room for debugging
    const socketsInRoom = await io?.in(groupRoom).fetchSockets();
    console.log(`👥 Sockets in room ${groupRoom}:`, socketsInRoom?.map(s => ({
      id: s.id,
      userId: (s as unknown as AuthenticatedSocket).userId,
      username: (s as unknown as AuthenticatedSocket).username
    })));
    
    // Emit to all group members
    io?.to(groupRoom).emit("new_message", messageData);
    console.log(`📤 Broadcasted message data:`, {
      id: messageData.id,
      from: messageData.senderUsername,
      group: messageData.groupName,
      hasImage: !!messageData.imageUrl,
      content: messageData.content || '[Image]'
    });

    // Mark as delivered immediately for group messages (fan-out delivery)
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
    });

    console.log(`✅ Group message marked as delivered`);
    
    // Notify sender of delivery
    socket.emit("message_delivered", { messageId: message.id });

  } catch (error) {
    console.error("❌ Database error in handleSendGroupMessage:", error);
    socket.emit("message_error", { error: "Failed to save group message" });
  }
}

async function handleMessageDelivered(socket: AuthenticatedSocket, messageId: string) {
  if (!socket.userId) return;

  // Update message status in database
  await prisma.message.update({
    where: { id: messageId },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
    },
  });

  // Find the sender and notify them
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { sender: true },
  });

  if (message) {
    const senderSocketId = connectedUsers.get(message.senderId);
    if (senderSocketId) {
      const senderSocket = userSockets.get(senderSocketId);
      if (senderSocket) {
        senderSocket.emit("message_delivered", { messageId });
      }
    }
  }
}

function handleTypingIndicator(
  socket: AuthenticatedSocket,
  receiverUsername: string,
  isTyping: boolean
) {
  if (!socket.userId || !socket.username) return;

  // Find receiver and send typing indicator
  prisma.user.findUnique({
    where: { username: receiverUsername },
    select: { id: true },
  }).then((receiver) => {
    if (receiver) {
      const receiverSocketId = connectedUsers.get(receiver.id);
      if (receiverSocketId) {
        const receiverSocket = userSockets.get(receiverSocketId);
        if (receiverSocket) {
          receiverSocket.emit("typing_indicator", {
            username: socket.username,
            isTyping,
          });
        }
      }
    }
  });
}

function handleGroupTypingIndicator(
  socket: AuthenticatedSocket,
  groupId: string,
  isTyping: boolean
) {
  if (!socket.userId || !socket.username) return;

  // Emit typing indicator to all group members except sender
  const groupRoom = `group:${groupId}`;
  socket.to(groupRoom).emit("group_typing_indicator", {
    username: socket.username,
    groupId,
    isTyping,
  });
}

function queueMessage(userId: string, message: MessageData) {
  if (!messageQueue.has(userId)) {
    messageQueue.set(userId, []);
  }
  messageQueue.get(userId)!.push(message);
}

async function deliverQueuedMessages(userId: string) {
  const queuedMessages = messageQueue.get(userId);
  if (!queuedMessages || queuedMessages.length === 0) {
    return;
  }

  const socketId = connectedUsers.get(userId);
  if (!socketId) return;

  const socket = userSockets.get(socketId);
  if (!socket) return;

  console.log(`📬 Delivering ${queuedMessages.length} queued messages to ${socket.username}`);

  for (const message of queuedMessages) {
    socket.emit("new_message", message);
    
    // Mark as delivered
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
    });
  }

  // Clear the queue
  messageQueue.delete(userId);
}

export function getIO(): SocketIOServer | null {
  return io;
}

export { connectedUsers, userSockets }; 