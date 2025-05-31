"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface Group {
  id: string;
  name: string;
  owner: {
    id: string;
    username: string;
  };
  members: {
    id: string;
    user: {
      id: string;
      username: string;
    };
  }[];
  _count: {
    members: number;
    messages: number;
  };
}

export default function GroupDeepLinkPage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  
  const groupId = params?.id as string;

  useEffect(() => {
    const handleDeepLink = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Verify authentication first using the API endpoint
        const authResponse = await fetch("/api/auth/me");
        if (!authResponse.ok) {
          router.push("/login");
          return;
        }

        const authData = await authResponse.json();
        if (!authData.user) {
          router.push("/login");
          return;
        }

        // Check if the group exists
        const response = await fetch(`/api/groups/${encodeURIComponent(groupId)}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError(`Group not found`);
            return;
          } else {
            throw new Error(`Failed to fetch group: ${response.statusText}`);
          }
        }

        const groupData = await response.json();
        const targetGroup: Group = groupData.group;
        setGroup(targetGroup);

        // Check if the current user is already a member
        const isMember = targetGroup.members.some(
          (member) => member.user.id === authData.user.id
        );

        if (isMember) {
          // User is already a member, redirect to group chat
          router.replace(`/chat/group/${encodeURIComponent(groupId)}`);
          return;
        }

        // User is not a member, show join prompt
        setShowJoinPrompt(true);
        
      } catch (err) {
        console.error("Error in group deep link:", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (groupId) {
      handleDeepLink();
    }
  }, [groupId, router]);

  const handleJoinGroup = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to join group");
        return;
      }

      // Successfully joined, redirect to group chat
      router.replace(`/chat/group/${encodeURIComponent(groupId)}`);
      
    } catch (err) {
      console.error("Error joining group:", err);
      setError("Failed to join group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-zinc-400">
            {showJoinPrompt ? "Joining group..." : "Loading group..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-6xl mb-6">👥</div>
          <h1 className="text-2xl font-light text-white mb-4">Group Not Available</h1>
          <p className="text-zinc-400 mb-8 leading-relaxed">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/chat")}
              className="w-full bg-white text-black font-medium py-3 px-6 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Go to Chat
            </button>
            <button
              onClick={() => router.back()}
              className="w-full bg-zinc-900 text-white font-medium py-3 px-6 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showJoinPrompt && group) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-6xl mb-6">👥</div>
          <h1 className="text-2xl font-light text-white mb-4">Join Group Chat</h1>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-medium text-white mb-2">{group.name}</h2>
            <p className="text-zinc-400 mb-4">
              {group._count.members} member{group._count.members !== 1 ? "s" : ""}
            </p>
            <p className="text-zinc-500 text-sm">
              Owner: <span className="text-zinc-300">@{group.owner.username}</span>
            </p>
          </div>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            You&apos;re not a member of this group. Would you like to join?
          </p>
          <div className="space-y-3">
            <button
              onClick={handleJoinGroup}
              className="w-full bg-white text-black font-medium py-3 px-6 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Join Group
            </button>
            <button
              onClick={() => router.push("/chat")}
              className="w-full bg-zinc-900 text-white font-medium py-3 px-6 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors"
            >
              Go to Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // This shouldn't be reached, but just in case
  return null;
} 