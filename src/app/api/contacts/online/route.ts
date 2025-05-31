import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { connectedUsers } from "@/lib/socket";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Verify authentication
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's contacts
    const contacts = await prisma.contact.findMany({
      where: { ownerId: authUser.userId },
      include: { contact: { select: { id: true, username: true } } },
    });

    // Check which contacts are online
    const onlineStatus = contacts.map((contact) => ({
      userId: contact.contact.id,
      username: contact.contact.username,
      isOnline: connectedUsers.has(contact.contact.id),
    }));

    return NextResponse.json({ onlineStatus });
  } catch (error) {
    console.error("Get online status error:", error);
    return NextResponse.json(
      { error: "Failed to get online status" },
      { status: 500 }
    );
  }
} 