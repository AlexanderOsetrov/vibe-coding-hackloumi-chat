import { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Auth function for Pages API routes
async function getAuthUserFromRequest(req: NextApiRequest) {
  try {
    const token = req.cookies["auth-token"];
    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) return null;

    return {
      userId: payload.userId,
      username: payload.username,
    };
  } catch (error) {
    console.error("Auth error in Pages API:", error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authUser = await getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { since } = req.query;

    // Build query conditions for messages where user is receiver
    const whereConditions: {
      receiverId: string;
      createdAt?: { gt: Date };
    } = {
      receiverId: authUser.userId,
    };

    // Add since filter if provided
    if (since && typeof since === "string") {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        whereConditions.createdAt = { gt: sinceDate };
      }
    }

    // Get new messages for this user
    const messages = await prisma.message.findMany({
      where: whereConditions,
      include: {
        sender: {
          select: { id: true, username: true },
        },
        receiver: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 50, // Limit to prevent overwhelming the client
    });

    // Mark messages as delivered
    if (messages.length > 0) {
      const messageIds = messages.map((m) => m.id);
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          status: "SENT",
        },
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
        },
      });
    }

    // Format messages for client
    const formattedMessages = messages.map((message) => ({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      senderId: message.senderId,
      receiverId: message.receiverId,
      senderUsername: message.sender.username,
      receiverUsername: message.receiver.username,
      status: "DELIVERED", // Mark as delivered since we're delivering now
    }));

    return res.status(200).json({
      messages: formattedMessages,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Polling error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
