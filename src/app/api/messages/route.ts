import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      content, 
      receiverUsername, 
      groupId,
      imageUrl,
      imageFilename,
      imageMimeType,
      imageSize
    } = await request.json();

    // Validation - either content or image is required
    if (!content && !imageUrl) {
      return NextResponse.json(
        { error: "Either content or image is required" },
        { status: 400 }
      );
    }

    if (content && content.trim().length === 0 && !imageUrl) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    // Ensure only one recipient type is specified
    if ((!receiverUsername && !groupId) || (receiverUsername && groupId)) {
      return NextResponse.json(
        { error: "Either receiverUsername or groupId must be specified, but not both" },
        { status: 400 }
      );
    }

    let message;

    if (groupId) {
      // Group message
      // Check if user is a member of the group
      const groupMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: authUser.userId,
            groupId
          }
        },
        include: {
          group: {
            select: { id: true, name: true }
          }
        }
      });

      if (!groupMember) {
        return NextResponse.json(
          { error: "You are not a member of this group" },
          { status: 403 }
        );
      }

      // Create group message
      message = await prisma.message.create({
        data: {
          content: content ? content.trim() : "",
          senderId: authUser.userId,
          groupId,
          status: "SENT",
          imageUrl,
          imageFilename,
          imageMimeType,
          imageSize,
        },
        include: {
          sender: {
            select: { id: true, username: true },
          },
          group: {
            select: { id: true, name: true },
          },
        },
      });

      return NextResponse.json(
        {
          message: "Group message sent successfully",
          data: {
            id: message.id,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            senderId: message.senderId,
            senderUsername: message.sender.username,
            groupId: message.groupId,
            groupName: message.group?.name,
            status: message.status,
            type: "group",
            imageUrl: message.imageUrl,
            imageFilename: message.imageFilename,
            imageMimeType: message.imageMimeType,
            imageSize: message.imageSize,
          },
        },
        { status: 201 }
      );
    } else {
      // Direct message
      const receiver = await prisma.user.findUnique({
        where: { username: receiverUsername },
      });

      if (!receiver) {
        return NextResponse.json(
          { error: "Receiver not found" },
          { status: 404 }
        );
      }

      // Create direct message
      message = await prisma.message.create({
        data: {
          content: content ? content.trim() : "",
          senderId: authUser.userId,
          receiverId: receiver.id,
          status: "SENT",
          imageUrl,
          imageFilename,
          imageMimeType,
          imageSize,
        },
        include: {
          sender: {
            select: { id: true, username: true },
          },
          receiver: {
            select: { id: true, username: true },
          },
        },
      });

      return NextResponse.json(
        {
          message: "Message sent successfully",
          data: {
            id: message.id,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            senderId: message.senderId,
            receiverId: message.receiverId,
            senderUsername: message.sender.username,
            receiverUsername: message.receiver?.username,
            status: message.status,
            type: "direct",
            imageUrl: message.imageUrl,
            imageFilename: message.imageFilename,
            imageMimeType: message.imageMimeType,
            imageSize: message.imageSize,
          },
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const peer = searchParams.get("peer");
    const groupId = searchParams.get("groupId");
    const since = searchParams.get("since");

    // Ensure only one recipient type is specified
    if ((!peer && !groupId) || (peer && groupId)) {
      return NextResponse.json(
        { error: "Either peer or groupId must be specified, but not both" },
        { status: 400 }
      );
    }

    let whereConditions: {
      groupId?: string;
      OR?: Array<{ senderId: string; receiverId: string }>;
      createdAt?: { gt: Date };
    };

    if (groupId) {
      // Group messages
      // Check if user is a member of the group
      const groupMember = await prisma.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: authUser.userId,
            groupId
          }
        }
      });

      if (!groupMember) {
        return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
      }

      whereConditions = {
        groupId,
      };
    } else {
      // Direct messages
      // Find peer user
      const peerUser = await prisma.user.findUnique({
        where: { username: peer! },
      });

      if (!peerUser) {
        return NextResponse.json({ error: "Peer not found" }, { status: 404 });
      }

      whereConditions = {
        OR: [
          { senderId: authUser.userId, receiverId: peerUser.id },
          { senderId: peerUser.id, receiverId: authUser.userId },
        ],
      };
    }

    // Add since filter if provided
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        whereConditions.createdAt = { gt: sinceDate };
      }
    }

    const messages = await prisma.message.findMany({
      where: whereConditions,
      include: {
        sender: {
          select: { id: true, username: true },
        },
        receiver: {
          select: { id: true, username: true },
        },
        group: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      messages,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
