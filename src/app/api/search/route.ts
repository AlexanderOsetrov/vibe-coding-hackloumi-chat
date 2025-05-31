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
        message: "Please provide a search query" 
      });
    }

    const searchQuery = query.trim();
    
    // Sanitize the search query for PostgreSQL full-text search
    const sanitizedQuery = searchQuery
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .split(/\s+/)
      .filter(word => word.length > 0)
      .join(' & '); // Join with AND operator

    if (sanitizedQuery.length === 0) {
      return NextResponse.json({ 
        results: [],
        message: "Invalid search query" 
      });
    }

    // Search messages where the user is either sender or receiver
    // Using PostgreSQL full-text search with ranking
    const results = await prisma.$queryRaw<Array<{
      id: string;
      content: string;
      createdAt: Date;
      senderId: string;
      senderUsername: string;
      receiverId: string;
      receiverUsername: string;
      rank: number;
    }>>`
      SELECT 
        m.id,
        m.content,
        m."createdAt",
        sender.id as "senderId",
        sender.username as "senderUsername",
        receiver.id as "receiverId", 
        receiver.username as "receiverUsername",
        ts_rank(m.fts, plainto_tsquery('english', ${searchQuery})) as rank
      FROM messages m
      JOIN users sender ON m."senderId" = sender.id
      JOIN users receiver ON m."receiverId" = receiver.id
      WHERE 
        (m."senderId" = ${authUser.userId} OR m."receiverId" = ${authUser.userId})
        AND m.fts @@ plainto_tsquery('english', ${searchQuery})
      ORDER BY rank DESC, m."createdAt" DESC
      LIMIT 50
    `;

    // Format the results
    const formattedResults = results.map((result) => ({
      id: result.id,
      content: result.content,
      createdAt: result.createdAt,
      rank: parseFloat(result.rank.toString()),
      sender: {
        id: result.senderId,
        username: result.senderUsername,
      },
      receiver: {
        id: result.receiverId,
        username: result.receiverUsername,
      },
      // Determine the conversation partner
      conversationWith: result.senderId === authUser.userId 
        ? result.receiverUsername 
        : result.senderUsername,
    }));

    return NextResponse.json({
      results: formattedResults,
      query: searchQuery,
      count: formattedResults.length,
    });

  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search messages" },
      { status: 500 }
    );
  }
} 