import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// POST /api/groups/[id]/join - Join a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }

    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Check member limit (300 as per requirements)
    if (group._count.members >= 300) {
      return NextResponse.json(
        { error: "Group has reached maximum capacity of 300 members" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: authUser.userId,
          groupId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this group" },
        { status: 400 }
      );
    }

    // Add the user to the group
    const newMember = await prisma.groupMember.create({
      data: {
        userId: authUser.userId,
        groupId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Successfully joined the group",
        member: newMember,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error joining group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 