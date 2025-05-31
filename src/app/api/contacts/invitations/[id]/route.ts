import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// PATCH /api/contacts/invitations/[id] - Accept or reject contact invitation
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();
    const params = await context.params;
    const invitationId = params.id;

    // Validation
    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "reject"' },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await prisma.contactInvitation.findUnique({
      where: { id: invitationId },
      include: {
        sender: true,
        receiver: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if the current user is the receiver
    if (invitation.receiverId !== authUser.userId) {
      return NextResponse.json(
        { error: "You can only respond to invitations sent to you" },
        { status: 403 }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Invitation has already been responded to" },
        { status: 409 }
      );
    }

    if (action === "accept") {
      // Use a transaction to ensure both operations succeed
      await prisma.$transaction(async (tx) => {
        // Update invitation status
        await tx.contactInvitation.update({
          where: { id: invitationId },
          data: { status: "ACCEPTED" },
        });

        // Create bidirectional contact relationships
        await tx.contact.createMany({
          data: [
            {
              ownerId: invitation.senderId,
              contactId: invitation.receiverId,
            },
            {
              ownerId: invitation.receiverId,
              contactId: invitation.senderId,
            },
          ],
        });
      });

      return NextResponse.json({
        message: "Contact invitation accepted",
        contact: {
          id: invitation.sender.id,
          username: invitation.sender.username,
        },
      });
    } else {
      // Reject invitation
      await prisma.contactInvitation.update({
        where: { id: invitationId },
        data: { status: "REJECTED" },
      });

      return NextResponse.json({
        message: "Contact invitation rejected",
      });
    }
  } catch (error) {
    console.error("Handle contact invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/invitations/[id] - Cancel sent invitation
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const invitationId = params.id;

    // Find the invitation
    const invitation = await prisma.contactInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if the current user is the sender
    if (invitation.senderId !== authUser.userId) {
      return NextResponse.json(
        { error: "You can only cancel invitations you sent" },
        { status: 403 }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        {
          error: "Cannot cancel invitation that has already been responded to",
        },
        { status: 409 }
      );
    }

    // Delete the invitation
    await prisma.contactInvitation.delete({
      where: { id: invitationId },
    });

    return NextResponse.json({
      message: "Contact invitation cancelled",
    });
  } catch (error) {
    console.error("Cancel contact invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
