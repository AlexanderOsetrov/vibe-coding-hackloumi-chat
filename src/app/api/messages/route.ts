import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, receiverUsername } = await request.json();

    // Validation
    if (!content || !receiverUsername) {
      return NextResponse.json(
        { error: "Content and receiver username are required" },
        { status: 400 }
      );
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content cannot be empty" },
        { status: 400 }
      );
    }

    // Find receiver
    const receiver = await prisma.user.findUnique({
      where: { username: receiverUsername },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "Receiver not found" },
        { status: 404 }
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: authUser.userId,
        receiverId: receiver.id,
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
        data: message,
      },
      { status: 201 }
    );
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
    const since = searchParams.get("since");

    if (!peer) {
      return NextResponse.json(
        { error: "Peer username is required" },
        { status: 400 }
      );
    }

    // Find peer user
    const peerUser = await prisma.user.findUnique({
      where: { username: peer },
    });

    if (!peerUser) {
      return NextResponse.json({ error: "Peer not found" }, { status: 404 });
    }

    // Build query conditions
    const whereConditions = {
      OR: [
        { senderId: authUser.userId, receiverId: peerUser.id },
        { senderId: peerUser.id, receiverId: authUser.userId },
      ],
    };

    // Add since filter if provided
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        Object.assign(whereConditions, {
          createdAt: { gt: sinceDate },
        });
      }
    }

    // Simple polling implementation (not true long-polling yet)
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
