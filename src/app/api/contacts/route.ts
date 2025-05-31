import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// GET /api/contacts - Get user's contacts
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all contacts for the current user
    const contacts = await prisma.contact.findMany({
      where: {
        ownerId: authUser.userId,
      },
      include: {
        contact: {
          select: {
            id: true,
            username: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        contact: {
          username: "asc",
        },
      },
    });

    return NextResponse.json({
      contacts: contacts.map((contact) => ({
        id: contact.id,
        user: contact.contact,
        createdAt: contact.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/contacts - Send contact invitation
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await request.json();

    // Validation
    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    if (username.trim().length === 0) {
      return NextResponse.json(
        { error: "Username cannot be empty" },
        { status: 400 }
      );
    }

    // Can't invite yourself
    if (username.toLowerCase() === authUser.username.toLowerCase()) {
      return NextResponse.json(
        { error: "Cannot add yourself as a contact" },
        { status: 400 }
      );
    }

    // Find the user to invite
    const targetUser = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if they're already contacts
    const existingContact = await prisma.contact.findUnique({
      where: {
        ownerId_contactId: {
          ownerId: authUser.userId,
          contactId: targetUser.id,
        },
      },
    });

    if (existingContact) {
      return NextResponse.json(
        { error: "User is already in your contacts" },
        { status: 409 }
      );
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.contactInvitation.findUnique({
      where: {
        senderId_receiverId: {
          senderId: authUser.userId,
          receiverId: targetUser.id,
        },
      },
    });

    if (existingInvitation) {
      if (existingInvitation.status === "PENDING") {
        return NextResponse.json(
          { error: "Invitation already sent to this user" },
          { status: 409 }
        );
      } else if (existingInvitation.status === "REJECTED") {
        // Update existing rejected invitation to pending
        await prisma.contactInvitation.update({
          where: { id: existingInvitation.id },
          data: {
            status: "PENDING",
            updatedAt: new Date(),
          },
        });
      }
    } else {
      // Create new invitation
      await prisma.contactInvitation.create({
        data: {
          senderId: authUser.userId,
          receiverId: targetUser.id,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json(
      {
        message: "Contact invitation sent successfully",
        targetUser: {
          id: targetUser.id,
          username: targetUser.username,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Send contact invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
