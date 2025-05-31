import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        results: [],
        message: "Please provide a search query",
      });
    }

    const searchQuery = query.trim();

    // Sanitize the search query for PostgreSQL full-text search
    const sanitizedQuery = searchQuery
      .replace(/[^\w\s]/g, " ") // Remove special characters
      .split(/\s+/)
      .filter((word) => word.length > 0)
      .join(" & "); // Join with AND operator

    if (sanitizedQuery.length === 0) {
      return NextResponse.json({
        results: [],
        message: "Invalid search query",
      });
    }

    // Search direct messages where the user is either sender or receiver
    const directMessagesResults = await prisma.$queryRaw<
      Array<{
        id: string;
        content: string;
        createdAt: Date;
        senderId: string;
        senderUsername: string;
        receiverId: string;
        receiverUsername: string;
        rank: number;
        type: string;
      }>
    >`
      SELECT 
        m.id,
        m.content,
        m."createdAt",
        sender.id as "senderId",
        sender.username as "senderUsername",
        receiver.id as "receiverId", 
        receiver.username as "receiverUsername",
        ts_rank(m.fts, plainto_tsquery('english', ${searchQuery})) as rank,
        'direct' as type
      FROM messages m
      JOIN users sender ON m."senderId" = sender.id
      JOIN users receiver ON m."receiverId" = receiver.id
      WHERE 
        (m."senderId" = ${authUser.userId} OR m."receiverId" = ${authUser.userId})
        AND m."receiverId" IS NOT NULL
        AND m.fts @@ plainto_tsquery('english', ${searchQuery})
      ORDER BY rank DESC, m."createdAt" DESC
      LIMIT 25
    `;

    // Search group messages where the user is a member
    const groupMessagesResults = await prisma.$queryRaw<
      Array<{
        id: string;
        content: string;
        createdAt: Date;
        senderId: string;
        senderUsername: string;
        groupId: string;
        groupName: string;
        rank: number;
        type: string;
      }>
    >`
      SELECT 
        m.id,
        m.content,
        m."createdAt",
        sender.id as "senderId",
        sender.username as "senderUsername",
        g.id as "groupId",
        g.name as "groupName",
        ts_rank(m.fts, plainto_tsquery('english', ${searchQuery})) as rank,
        'group' as type
      FROM messages m
      JOIN users sender ON m."senderId" = sender.id
      JOIN groups g ON m."groupId" = g.id
      JOIN group_members gm ON g.id = gm."groupId"
      WHERE 
        gm."userId" = ${authUser.userId}
        AND m."groupId" IS NOT NULL
        AND m.fts @@ plainto_tsquery('english', ${searchQuery})
      ORDER BY rank DESC, m."createdAt" DESC
      LIMIT 25
    `;

    // Combine and sort results by rank
    const allResults = [
      ...directMessagesResults.map((result) => ({
        id: result.id,
        content: result.content,
        createdAt: result.createdAt,
        rank: parseFloat(result.rank.toString()),
        type: "direct" as const,
        sender: {
          id: result.senderId,
          username: result.senderUsername,
        },
        receiver: {
          id: result.receiverId,
          username: result.receiverUsername,
        },
        // Determine the conversation partner
        conversationWith:
          result.senderId === authUser.userId
            ? result.receiverUsername
            : result.senderUsername,
      })),
      ...groupMessagesResults.map((result) => ({
        id: result.id,
        content: result.content,
        createdAt: result.createdAt,
        rank: parseFloat(result.rank.toString()),
        type: "group" as const,
        sender: {
          id: result.senderId,
          username: result.senderUsername,
        },
        group: {
          id: result.groupId,
          name: result.groupName,
        },
        conversationWith: result.groupName,
      })),
    ];

    // Sort by rank (highest first) and then by date (newest first)
    const sortedResults = allResults
      .sort((a, b) => {
        if (b.rank !== a.rank) {
          return b.rank - a.rank;
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
      .slice(0, 50); // Limit total results

    return NextResponse.json({
      results: sortedResults,
      query: searchQuery,
      count: sortedResults.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search messages" },
      { status: 500 }
    );
  }
}
