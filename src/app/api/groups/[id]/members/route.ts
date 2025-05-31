import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// Add member to group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.userId!;
    const { id: groupId } = await params;
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Check if user is the owner of the group
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        ownerId: userId
      },
      include: {
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found or you are not the owner' }, { status: 404 });
    }

    // Check member limit (300 as per requirements)
    if (group._count.members >= 300) {
      return NextResponse.json({ error: 'Group has reached maximum capacity of 300 members' }, { status: 400 });
    }

    // Find the user to add
    const userToAdd = await prisma.user.findUnique({
      where: { username: username.trim() },
      select: { id: true, username: true }
    });

    if (!userToAdd) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: userToAdd.id,
          groupId
        }
      }
    });

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this group' }, { status: 400 });
    }

    // Add the user to the group
    const newMember = await prisma.groupMember.create({
      data: {
        userId: userToAdd.id,
        groupId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error) {
    console.error('Error adding group member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove member from group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.userId!;
    const { id: groupId } = await params;
    const { searchParams } = new URL(request.url);
    const targetUsername = searchParams.get('username');

    if (!targetUsername) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Find the user to remove
    const userToRemove = await prisma.user.findUnique({
      where: { username: targetUsername },
      select: { id: true, username: true }
    });

    if (!userToRemove) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is the owner of the group or is removing themselves
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        OR: [
          { ownerId: userId }, // Owner can remove anyone
          { 
            AND: [
              { members: { some: { userId } } }, // User is a member
              { id: groupId } // And we're talking about the right group
            ]
          }
        ]
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found or access denied' }, { status: 404 });
    }

    // If not owner, user can only remove themselves
    if (group.ownerId !== userId && userToRemove.id !== userId) {
      return NextResponse.json({ error: 'Only group owners can remove other members' }, { status: 403 });
    }

    // Cannot remove the owner from the group
    if (userToRemove.id === group.ownerId) {
      return NextResponse.json({ error: 'Cannot remove the group owner' }, { status: 400 });
    }

    // Check if the member exists
    const memberToRemove = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: userToRemove.id,
          groupId
        }
      }
    });

    if (!memberToRemove) {
      return NextResponse.json({ error: 'User is not a member of this group' }, { status: 404 });
    }

    // Remove the member
    await prisma.groupMember.delete({
      where: {
        userId_groupId: {
          userId: userToRemove.id,
          groupId
        }
      }
    });

    return NextResponse.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing group member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 