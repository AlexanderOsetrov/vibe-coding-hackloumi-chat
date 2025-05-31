"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface User {
  id: string;
  username: string;
  createdAt: string;
}

export default function UserDeepLinkPage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [isContact, setIsContact] = useState(false);
  const [isInvitationSent, setIsInvitationSent] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  
  const username = params?.username as string;

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Verify authentication first
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

        // Check if this is the current user's own profile
        if (username.toLowerCase() === authData.user.username.toLowerCase()) {
          setError("This is your own profile. Redirecting to chat...");
          setTimeout(() => router.push("/chat"), 2000);
          return;
        }

        // Fetch target user info
        const userResponse = await fetch(`/api/users/${encodeURIComponent(username)}`);
        
        if (!userResponse.ok) {
          if (userResponse.status === 404) {
            setError(`User "@${username}" not found`);
            return;
          } else {
            throw new Error(`Failed to fetch user: ${userResponse.statusText}`);
          }
        }

        const userData = await userResponse.json();
        setTargetUser(userData.user);

        // Check if the target user is in current user's contacts
        const contactsResponse = await fetch("/api/contacts");
        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json();
          const isUserContact = contactsData.contacts.some(
            (contact: { user: { username: string } }) => 
              contact.user.username.toLowerCase() === userData.user.username.toLowerCase()
          );
          setIsContact(isUserContact);
        }

        // Check if there's a pending invitation
        const invitationsResponse = await fetch("/api/contacts/invitations");
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json();
          const hasPendingInvite = invitationsData.sent.some(
            (invitation: { receiver: { username: string } }) => 
              invitation.receiver.username.toLowerCase() === userData.user.username.toLowerCase()
          );
          setIsInvitationSent(hasPendingInvite);
        }
        
      } catch (err) {
        console.error("Error loading user info:", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (username) {
      loadUserInfo();
    }
  }, [username, router]);

  const handleStartChat = () => {
    if (targetUser) {
      router.push(`/chat/${encodeURIComponent(targetUser.username)}`);
    }
  };

  const handleSendInvitation = async () => {
    if (!targetUser || isSendingInvite) return;

    setIsSendingInvite(true);
    setActionMessage(null);

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: targetUser.username,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setActionMessage(`Invitation sent to @${targetUser.username}`);
        setIsInvitationSent(true);
      } else {
        setActionMessage(data.error || "Failed to send invitation");
      }
    } catch {
      setActionMessage("Network error. Please try again.");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const copyUserLink = async () => {
    try {
      const link = `${window.location.origin}/u/${encodeURIComponent(username)}`;
      await navigator.clipboard.writeText(link);
      setActionMessage("Link copied to clipboard!");
      setTimeout(() => setActionMessage(null), 3000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      setActionMessage("Failed to copy link");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-6xl mb-6">👤</div>
          <h1 className="text-2xl font-light text-white mb-4">User Not Found</h1>
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

  if (!targetUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-zinc-900 p-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={copyUserLink}
            className="text-xs text-zinc-500 hover:text-white transition-colors px-3 py-1 border border-zinc-800 rounded"
          >
            → Copy Link
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          {/* Avatar */}
          <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl font-light text-zinc-300">
              {targetUser.username.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Username */}
          <h1 className="text-3xl font-light text-white mb-2">
            @{targetUser.username}
          </h1>

          {/* Join Date */}
          <p className="text-zinc-400 text-sm">
            Member since {formatDate(targetUser.createdAt)}
          </p>

          {/* Contact Status */}
          <div className="mt-4">
            {isContact && (
              <div className="inline-flex items-center space-x-2 bg-green-900/20 border border-green-800 text-green-300 px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>In your contacts</span>
              </div>
            )}
            {!isContact && isInvitationSent && (
              <div className="inline-flex items-center space-x-2 bg-yellow-900/20 border border-yellow-800 text-yellow-300 px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Invitation pending</span>
              </div>
            )}
            {!isContact && !isInvitationSent && (
              <div className="inline-flex items-center space-x-2 bg-zinc-800 border border-zinc-700 text-zinc-400 px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-zinc-500 rounded-full"></div>
                <span>Not in your contacts</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Messages */}
        {actionMessage && (
          <div className="mb-6 p-4 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-lg text-center text-sm">
            {actionMessage}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {isContact && (
            <button
              onClick={handleStartChat}
              className="w-full bg-white text-black font-medium py-4 px-6 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              💬 Start Chat
            </button>
          )}
          
          {!isContact && !isInvitationSent && (
            <button
              onClick={handleSendInvitation}
              disabled={isSendingInvite}
              className="w-full bg-white text-black font-medium py-4 px-6 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingInvite ? "Sending..." : "➕ Add to Contacts"}
            </button>
          )}

          {!isContact && isInvitationSent && (
            <div className="w-full bg-zinc-900 text-zinc-400 font-medium py-4 px-6 rounded-lg border border-zinc-800 text-center">
              ⏳ Invitation sent - waiting for response
            </div>
          )}

          <button
            onClick={() => router.push("/chat")}
            className="w-full bg-zinc-900 text-white font-medium py-3 px-6 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors"
          >
            Back to Chat
          </button>
        </div>

        {/* User Stats */}
        <div className="mt-12 pt-8 border-t border-zinc-900">
          <h3 className="text-lg font-light text-white mb-4 text-center">User Information</h3>
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Username:</span>
                <span className="text-white">@{targetUser.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">User ID:</span>
                <span className="text-zinc-300 font-mono text-xs">{targetUser.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Joined:</span>
                <span className="text-white">{formatDate(targetUser.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Contact Status:</span>
                <span className={`${isContact ? 'text-green-400' : 'text-zinc-400'}`}>
                  {isContact ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 