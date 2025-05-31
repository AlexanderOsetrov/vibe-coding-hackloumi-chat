import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// Get messages for a specific group
export async function GET(
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
    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Build query conditions
    const whereConditions: {
      groupId: string;
      createdAt?: { gt: Date };
    } = {
      groupId,
    };

    // Add since filter if provided
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        whereConditions.createdAt = { gt: sinceDate };
      }
    }

    // Fetch group messages with image fields
    const messages = await prisma.message.findMany({
      where: whereConditions,
      select: {
        id: true,
        content: true,
        createdAt: true,
        status: true,
        imageUrl: true,
        imageFilename: true,
        imageMimeType: true,
        imageSize: true,
        sender: {
          select: { id: true, username: true }
        },
        group: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: limit
    });

    return NextResponse.json({
      messages,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching group messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Send a message to a group
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
    const { 
      content, 
      imageUrl, 
      imageFilename, 
      imageMimeType, 
      imageSize 
    } = await request.json();

    // Validation - either content or image is required
    if ((!content || content.trim().length === 0) && !imageUrl) {
      return NextResponse.json({ error: 'Either content or image is required' }, { status: 400 });
    }

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      },
      include: {
        group: {
          select: { id: true, name: true }
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Create group message
    const message = await prisma.message.create({
      data: {
        content: content ? content.trim() : "",
        senderId: userId,
        groupId,
        status: 'SENT',
        imageUrl,
        imageFilename,
        imageMimeType,
        imageSize,
      },
      include: {
        sender: {
          select: { id: true, username: true }
        },
        group: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({
      message: 'Group message sent successfully',
      data: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        senderId: message.senderId,
        senderUsername: message.sender.username,
        groupId: message.groupId,
        groupName: message.group?.name,
        status: message.status,
        type: 'group',
        imageUrl: message.imageUrl,
        imageFilename: message.imageFilename,
        imageMimeType: message.imageMimeType,
        imageSize: message.imageSize,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending group message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 