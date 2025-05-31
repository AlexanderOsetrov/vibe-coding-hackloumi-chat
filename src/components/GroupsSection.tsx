"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Group {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
  };
  members: {
    id: string;
    joinedAt: string;
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

interface GroupsSectionProps {
  currentUser: {
    id: string;
    username: string;
  } | null;
  activeGroupId?: string;
}

export default function GroupsSection({
  currentUser,
  activeGroupId,
}: GroupsSectionProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const router = useRouter();

  const loadGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load groups");
      }
    } catch (error) {
      console.error("Failed to load groups:", error);
      setError("Network error loading groups");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadGroups();
    }
  }, [currentUser]);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || isCreating) return;

    setIsCreating(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(`Group "${data.group.name}" created successfully`);
        setNewGroupName("");
        setShowCreateForm(false);
        loadGroups(); // Refresh groups
      } else {
        setError(data.error || "Failed to create group");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberUsername.trim() || !selectedGroup || isAddingMember) return;

    setIsAddingMember(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: newMemberUsername.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(`Added ${newMemberUsername} to the group`);
        setNewMemberUsername("");
        loadGroups(); // Refresh groups
      } else {
        setError(data.error || "Failed to add member");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsAddingMember(false);
    }
  };

  const removeMember = async (
    groupId: string,
    userId: string,
    username: string
  ) => {
    if (!confirm(`Remove ${username} from the group?`)) return;

    try {
      const response = await fetch(
        `/api/groups/${groupId}/members?userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setSuccessMessage(`Removed ${username} from the group`);
        loadGroups(); // Refresh groups
      } else {
        const data = await response.json();
        setError(data.error || "Failed to remove member");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const deleteGroup = async (groupId: string, groupName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the group "${groupName}"? This action cannot be undone.`
      )
    )
      return;

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccessMessage(`Group "${groupName}" deleted successfully`);
        setShowGroupDetails(false);
        setSelectedGroup(null);
        loadGroups(); // Refresh groups
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete group");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const openGroupChat = (groupId: string) => {
    router.push(`/chat/group/${groupId}`);
  };

  const isOwner = (group: Group) => {
    return currentUser && group.owner.id === currentUser.id;
  };

  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
          <div className="h-8 bg-zinc-700 rounded"></div>
          <div className="h-8 bg-zinc-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-light tracking-wide text-white uppercase">
          Groups
        </h3>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            clearMessages();
          }}
          className="text-zinc-400 hover:text-white transition-colors text-sm"
        >
          {showCreateForm ? "CANCEL" : "NEW"}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-900/20 border border-green-800 text-green-300 px-3 py-2 rounded text-sm">
          {successMessage}
        </div>
      )}

      {/* Create Group Form */}
      {showCreateForm && (
        <form onSubmit={createGroup} className="space-y-3">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-white"
            maxLength={100}
          />
          <button
            type="submit"
            disabled={isCreating || !newGroupName.trim()}
            className="w-full bg-white text-black py-2 rounded font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
          >
            {isCreating ? "CREATING..." : "CREATE GROUP"}
          </button>
        </form>
      )}

      {/* Groups List */}
      <div className="space-y-2">
        {groups.length === 0 ? (
          <p className="text-zinc-400 text-sm text-center py-4">
            No groups yet. Create one to get started!
          </p>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className={`border border-zinc-800 rounded p-3 transition-colors ${
                activeGroupId === group.id
                  ? "bg-zinc-800 border-zinc-700"
                  : "bg-zinc-900 hover:bg-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => openGroupChat(group.id)}
                >
                  <h4 className="text-white font-medium text-sm">
                    {group.name}
                  </h4>
                  <p className="text-zinc-400 text-xs">
                    {group._count.members} members • {group._count.messages}{" "}
                    messages
                  </p>
                  <p className="text-zinc-500 text-xs">
                    Owner: {group.owner.username}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedGroup(group);
                    setShowGroupDetails(true);
                    clearMessages();
                  }}
                  className="text-zinc-400 hover:text-white transition-colors text-xs"
                >
                  MANAGE
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Group Details Modal */}
      {showGroupDetails && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">
                {selectedGroup.name}
              </h3>
              <button
                onClick={() => {
                  setShowGroupDetails(false);
                  setSelectedGroup(null);
                  clearMessages();
                }}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Add Member (Owner only) */}
            {isOwner(selectedGroup) && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-white mb-2">
                  Add Member
                </h4>
                <form onSubmit={addMember} className="space-y-2">
                  <input
                    type="text"
                    value={newMemberUsername}
                    onChange={(e) => setNewMemberUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-white"
                  />
                  <button
                    type="submit"
                    disabled={isAddingMember || !newMemberUsername.trim()}
                    className="w-full bg-white text-black py-2 rounded font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
                  >
                    {isAddingMember ? "ADDING..." : "ADD MEMBER"}
                  </button>
                </form>
              </div>
            )}

            {/* Members List */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-white mb-2">
                Members ({selectedGroup.members.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedGroup.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-zinc-800 rounded px-3 py-2"
                  >
                    <div>
                      <span className="text-white text-sm">
                        {member.user.username}
                      </span>
                      {member.user.id === selectedGroup.owner.id && (
                        <span className="text-xs text-zinc-400 ml-2">
                          (Owner)
                        </span>
                      )}
                    </div>
                    {isOwner(selectedGroup) &&
                      member.user.id !== selectedGroup.owner.id && (
                        <button
                          onClick={() =>
                            removeMember(
                              selectedGroup.id,
                              member.user.id,
                              member.user.username
                            )
                          }
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          REMOVE
                        </button>
                      )}
                  </div>
                ))}
              </div>
            </div>

            {/* Delete Group (Owner only) */}
            {isOwner(selectedGroup) && (
              <button
                onClick={() =>
                  deleteGroup(selectedGroup.id, selectedGroup.name)
                }
                className="w-full bg-red-900 hover:bg-red-800 text-red-300 py-2 rounded font-medium text-sm transition-colors"
              >
                DELETE GROUP
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
