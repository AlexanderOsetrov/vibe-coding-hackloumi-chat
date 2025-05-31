"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SearchBar from "./SearchBar";

interface Contact {
  id: string;
  user: {
    id: string;
    username: string;
    createdAt: string;
  };
  createdAt: string;
}

interface Invitation {
  id: string;
  sender?: {
    id: string;
    username: string;
    createdAt: string;
  };
  receiver?: {
    id: string;
    username: string;
    createdAt: string;
  };
  createdAt: string;
}

interface ContactsSidebarProps {
  currentUser: {
    id: string;
    username: string;
  } | null;
  activeContactUsername?: string;
}

export default function ContactsSidebar({
  currentUser,
  activeContactUsername,
}: ContactsSidebarProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<Invitation[]>(
    []
  );
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);
  const [newContactUsername, setNewContactUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const loadData = async () => {
    try {
      const [contactsRes, invitationsRes, onlineRes] = await Promise.all([
        fetch("/api/contacts"),
        fetch("/api/contacts/invitations"),
        fetch("/api/contacts/online"),
      ]);

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData.contacts || []);
      }

      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json();
        setReceivedInvitations(invitationsData.received || []);
        setSentInvitations(invitationsData.sent || []);
      }

      if (onlineRes.ok) {
        const onlineData = await onlineRes.json();
        const statusMap: Record<string, boolean> = {};
        onlineData.onlineStatus?.forEach((status: { username: string; isOnline: boolean }) => {
          statusMap[status.username] = status.isOnline;
        });
        setOnlineStatus(statusMap);
      }
    } catch (error) {
      console.error("Failed to load contacts/invitations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
      
      // Refresh online status every 30 seconds
      const interval = setInterval(async () => {
        try {
          const response = await fetch("/api/contacts/online");
          if (response.ok) {
            const data = await response.json();
            const statusMap: Record<string, boolean> = {};
            data.onlineStatus?.forEach((status: { username: string; isOnline: boolean }) => {
              statusMap[status.username] = status.isOnline;
            });
            setOnlineStatus(statusMap);
          }
        } catch (error) {
          console.error("Failed to refresh online status:", error);
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactUsername.trim() || isSendingInvite) return;

    setIsSendingInvite(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newContactUsername.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(`Invitation sent to ${data.targetUser.username}`);
        setNewContactUsername("");
        loadData(); // Refresh data
      } else {
        setError(data.error || "Failed to send invitation");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleInvitation = async (
    invitationId: string,
    action: "accept" | "reject"
  ) => {
    try {
      const response = await fetch(
        `/api/contacts/invitations/${invitationId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      if (response.ok) {
        setSuccessMessage(`Invitation ${action}ed successfully`);
        loadData(); // Refresh data
      } else {
        const data = await response.json();
        setError(data.error || `Failed to ${action} invitation`);
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const removeContact = async (contactId: string) => {
    if (!confirm("Are you sure you want to remove this contact?")) return;

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccessMessage("Contact removed successfully");
        loadData(); // Refresh data
      } else {
        const data = await response.json();
        setError(data.error || "Failed to remove contact");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const startChat = (username: string) => {
    router.push(`/chat/${username}`);
  };

  if (isLoading) {
    return (
      <div className="w-80 sidebar p-6">
        <div className="text-center text-zinc-500 font-light">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-80 sidebar flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-zinc-900">
        <div className="flex items-center space-x-3 mb-6">
          <Image
            src="/hackloumi-logo.png"
            alt="Hackloumi"
            width={24}
            height={24}
            className="object-contain"
          />
          <h1 className="text-lg font-light text-white tracking-wide">
            CONTACTS
          </h1>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar currentUser={currentUser} />
        </div>

        {/* Add Contact Form */}
        <form onSubmit={sendInvitation} className="space-y-3">
          <input
            type="text"
            value={newContactUsername}
            onChange={(e) => setNewContactUsername(e.target.value)}
            placeholder="Enter username..."
            className="input-field w-full text-sm"
            disabled={isSendingInvite}
          />
          <button
            type="submit"
            disabled={isSendingInvite || !newContactUsername.trim()}
            className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingInvite ? "SENDING..." : "SEND INVITATION"}
          </button>
        </form>

        {/* Status Messages */}
        {error && (
          <div className="mt-3 p-3 bg-red-950 border border-red-900 text-red-300 rounded-sm text-xs">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mt-3 p-3 bg-green-950 border border-green-900 text-green-300 rounded-sm text-xs">
            {successMessage}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Contacts List */}
        <div className="p-6">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-4">
            MY CONTACTS ({contacts.length})
          </h2>
          {contacts.length === 0 ? (
            <div className="text-sm text-zinc-500 font-light">
              No contacts yet. Send an invitation to get started.
            </div>
          ) : (
            <div className="space-y-0">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`contact-item group ${
                    activeContactUsername === contact.user.username
                      ? "active"
                      : ""
                  }`}
                  onClick={() => startChat(contact.user.username)}
                >
                  <div className="flex-1 flex items-center space-x-3">
                    {/* Online Status Indicator */}
                    <div className={`w-2 h-2 rounded-full ${
                      onlineStatus[contact.user.username] ? "bg-green-500" : "bg-zinc-600"
                    }`}></div>
                    <div className="text-sm font-light text-white">
                      {contact.user.username}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeContact(contact.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white text-xs p-1 transition-all duration-200"
                    title="Remove contact"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sent Invitations */}
        {sentInvitations.length > 0 && (
          <div className="px-6 pb-6">
            <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-4">
              SENT INVITATIONS ({sentInvitations.length})
            </h2>
            <div className="space-y-2">
              {sentInvitations.map((invitation) => (
                <div key={invitation.id} className="invitation-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-light text-white">
                        {invitation.receiver?.username || "Unknown User"}
                      </div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider">
                        pending
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Received Invitations */}
        {receivedInvitations.length > 0 && (
          <div className="px-6 pb-6">
            <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-4">
              RECEIVED INVITATIONS ({receivedInvitations.length})
            </h2>
            <div className="space-y-2">
              {receivedInvitations.map((invitation) => (
                <div key={invitation.id} className="invitation-card">
                  <div className="mb-3">
                    <div className="text-sm font-light text-white">
                      {invitation.sender?.username || "Unknown User"}
                    </div>
                    <div className="text-xs text-zinc-600">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleInvitation(invitation.id, "accept")}
                      className="btn-primary text-xs flex-1"
                    >
                      ACCEPT
                    </button>
                    <button
                      onClick={() => handleInvitation(invitation.id, "reject")}
                      className="btn-ghost text-xs flex-1"
                    >
                      DECLINE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
