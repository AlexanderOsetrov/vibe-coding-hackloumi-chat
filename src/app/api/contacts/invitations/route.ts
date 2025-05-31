import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// GET /api/contacts/invitations - Get pending contact invitations
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pending invitations received by the current user
    const receivedInvitations = await prisma.contactInvitation.findMany({
      where: {
        receiverId: authUser.userId,
        status: "PENDING",
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get pending invitations sent by the current user
    const sentInvitations = await prisma.contactInvitation.findMany({
      where: {
        senderId: authUser.userId,
        status: "PENDING",
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      received: receivedInvitations.map((invitation) => ({
        id: invitation.id,
        sender: invitation.sender,
        createdAt: invitation.createdAt,
      })),
      sent: sentInvitations.map((invitation) => ({
        id: invitation.id,
        receiver: invitation.receiver,
        createdAt: invitation.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get contact invitations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
