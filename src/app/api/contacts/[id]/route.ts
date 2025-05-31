import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// DELETE /api/contacts/[id] - Remove contact
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
    const contactId = params.id;

    // Find the contact relationship
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        owner: true,
        contact: true,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Check if the current user owns this contact relationship
    if (contact.ownerId !== authUser.userId) {
      return NextResponse.json(
        { error: "You can only remove your own contacts" },
        { status: 403 }
      );
    }

    // Remove bidirectional contact relationships
    await prisma.$transaction(async (tx) => {
      // Remove the contact relationship from owner to contact
      await tx.contact.delete({
        where: { id: contactId },
      });

      // Remove the reverse contact relationship from contact to owner
      await tx.contact.deleteMany({
        where: {
          ownerId: contact.contactId,
          contactId: contact.ownerId,
        },
      });
    });

    return NextResponse.json({
      message: "Contact removed successfully",
    });
  } catch (error) {
    console.error("Remove contact error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
