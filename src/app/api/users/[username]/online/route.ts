import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { connectedUsers } from "@/lib/socket";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    // Verify authentication
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await params;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is online
    const isOnline = connectedUsers.has(user.id);

    return NextResponse.json({
      userId: user.id,
      username: user.username,
      isOnline,
    });
  } catch (error) {
    console.error("Get user online status error:", error);
    return NextResponse.json(
      { error: "Failed to get user online status" },
      { status: 500 }
    );
  }
}
