"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import ContactsSidebar from "@/components/ContactsSidebar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useSocket } from "@/hooks/useSocket";

interface ApiMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; username: string };
  group?: { id: string; name: string };
  status?: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  groupId?: string;
  senderUsername: string;
  groupName?: string;
  status?: string;
  type: "group";
}

interface User {
  id: string;
  username: string;
}

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

function ChatGroupPageContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const router = useRouter();
  const params = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const groupId = params?.id as string;

  // Socket.IO hook with real-time messaging
  const { 
    sendGroupMessage, 
    startGroupTyping, 
    stopGroupTyping, 
    connectionType, 
    isConnected 
  } = useSocket({
    onNewMessage: (message) => {
      console.log("🎯 onNewMessage callback triggered:", message);
      
      // Only add messages for this group
      if (message.type === "group" && message.groupId === groupId) {
        console.log("✅ Adding new group message to UI:", message);
        setMessages((prev) => {
          // Avoid duplicates
          const existingIds = new Set(prev.map((m) => m.id));
          if (existingIds.has(message.id)) {
            console.log("⚠️ New message already exists, skipping:", message.id);
            return prev;
          }
          console.log("📥 Adding new received group message to state:", message.id);
          const groupMessage: Message = {
            id: message.id,
            content: message.content,
            createdAt: message.createdAt,
            senderId: message.senderId,
            groupId: message.groupId,
            senderUsername: message.senderUsername,
            groupName: message.groupName,
            status: message.status,
            type: "group"
          };
          const newMessages = [...prev, groupMessage];
          console.log("📊 Total messages after adding:", newMessages.length);
          return newMessages;
        });
      }
    },
    onMessageSent: (message) => {
      if (message.type === "group" && message.groupId === groupId) {
        console.log("Adding sent group message to UI:", message);
        setMessages((prev) => {
          if (!message.id.startsWith("temp-")) {
            const filteredMessages = prev.filter(m => 
              !(m.id.startsWith("temp-") && 
                m.content === message.content && 
                m.groupId === message.groupId)
            );
            
            const existingIds = new Set(filteredMessages.map((m) => m.id));
            if (existingIds.has(message.id)) {
              console.log("Real message already exists, skipping:", message.id);
              return prev;
            }
            
            const groupMessage: Message = {
              id: message.id,
              content: message.content,
              createdAt: message.createdAt,
              senderId: message.senderId,
              groupId: message.groupId,
              senderUsername: message.senderUsername,
              groupName: message.groupName,
              status: message.status,
              type: "group"
            };
            return [...filteredMessages, groupMessage];
          } else {
            const existingIds = new Set(prev.map((m) => m.id));
            if (existingIds.has(message.id)) {
              return prev;
            }
            
            const updatedMessage: Message = {
              id: message.id,
              content: message.content,
              createdAt: message.createdAt,
              senderId: currentUser?.id || message.senderId,
              groupId: message.groupId,
              senderUsername: currentUser?.username || message.senderUsername,
              groupName: message.groupName,
              status: message.status,
              type: "group"
            };
            
            return [...prev, updatedMessage];
          }
        });
      }
    },
    onGroupTypingIndicator: (data) => {
      if (data.groupId === groupId && data.username !== currentUser?.username) {
        setTypingUsers((prev) => {
          if (data.isTyping) {
            if (!prev.includes(data.username)) {
              return [...prev, data.username];
            }
          } else {
            return prev.filter(username => username !== data.username);
          }
          return prev;
        });
        
        // Clear typing indicator after 3 seconds
        if (data.isTyping) {
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter(username => username !== data.username));
          }, 3000);
        }
      }
    },
    onError: (errorMessage) => {
      setError(errorMessage);
    },
  });

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadGroupData = useCallback(async () => {
    if (!groupId) return;
    
    try {
      console.log("🔄 Loading group data for:", groupId);
      
      // Load group details
      const groupResponse = await fetch(`/api/groups/${groupId}`);
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setGroup(groupData.group);
        console.log("📋 Loaded group data:", groupData.group);
      } else if (groupResponse.status === 404) {
        setError("Group not found or you don't have access to it");
        return;
      } else {
        throw new Error("Failed to load group");
      }
      
      // Load group messages
      const messagesResponse = await fetch(`/api/groups/${groupId}/messages`);
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        console.log("📬 Loaded group messages from API:", messagesData.messages.length);
        
        const formattedMessages = messagesData.messages.map((msg: ApiMessage) => ({
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt,
          senderId: msg.sender.id,
          groupId: msg.group?.id,
          senderUsername: msg.sender.username,
          groupName: msg.group?.name,
          status: msg.status,
          type: "group" as const,
        }));
        
        setMessages(formattedMessages);
      } else if (messagesResponse.status === 403) {
        setError("You are not a member of this group");
        return;
      }
    } catch (error) {
      console.error("Failed to load group data:", error);
      setError("Failed to load group. Please try again.");
    }
  }, [groupId]);

  const loadCurrentUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData.user);
        console.log("👤 Current user loaded:", userData.user.username);
      } else {
        router.push("/login");
      }
    } catch (error) {
      console.error("Failed to load current user:", error);
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    const initializeChat = async () => {
      setIsLoading(true);
      setError("");
      
      await loadCurrentUser();
      await loadGroupData();
      
      setIsLoading(false);
    };

    initializeChat();
  }, [loadCurrentUser, loadGroupData]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !groupId || !currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    // Send via Socket.IO if connected, otherwise fall back to HTTP
    if (isConnected && sendGroupMessage) {
      console.log("📤 Sending group message via Socket.IO");
      sendGroupMessage({
        content: messageText,
        groupId: groupId,
      });
    } else {
      // Fallback to HTTP API
      console.log("📤 Sending group message via HTTP API");
      try {
        const response = await fetch(`/api/groups/${groupId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: messageText,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Message will be added via polling or socket
          console.log("✅ Group message sent successfully:", data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to send message");
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        setError("Failed to send message. Please try again.");
      }
    }
  };

  const handleTyping = () => {
    if (isConnected && startGroupTyping && groupId) {
      startGroupTyping({ groupId });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (stopGroupTyping && groupId) {
          stopGroupTyping({ groupId });
        }
      }, 1000);
    }
  };

  const formatMessageTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
             ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const isOwner = group && currentUser && group.owner.id === currentUser.id;

  if (isLoading) {
    return (
      <div className="flex h-screen bg-black text-white">
        <ContactsSidebar currentUser={currentUser} activeGroupId={groupId} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-400 font-light">Loading group...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-black text-white">
        <ContactsSidebar currentUser={currentUser} activeGroupId={groupId} />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="text-red-400 text-center">{error}</div>
          <Link 
            href="/chat" 
            className="btn-primary"
          >
            Back to Chat
          </Link>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex h-screen bg-black text-white">
        <ContactsSidebar currentUser={currentUser} activeGroupId={groupId} />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="text-zinc-400 text-center">Group not found</div>
          <Link 
            href="/chat" 
            className="btn-primary"
          >
            Back to Chat
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white">
      <ContactsSidebar currentUser={currentUser} activeGroupId={groupId} />
      
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="chat-header border-b border-zinc-900 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-zinc-300">
                  {group.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-light text-white">{group.name}</h1>
                <p className="text-xs text-zinc-400">
                  {group._count.members} members • Owner: {group.owner.username}
                  {isOwner && <span className="text-zinc-500 ml-1">(you)</span>}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-xs text-zinc-500">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-zinc-600'}`}></div>
                <span className="uppercase tracking-wide">
                  {connectionType === 'websocket' ? 'REALTIME' : connectionType === 'polling' ? 'POLLING' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 mt-8">
              <p className="text-lg font-light">Welcome to {group.name}!</p>
              <p className="text-sm">Start the conversation by sending a message.</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isOwnMessage = message.senderId === currentUser?.id;
              const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
              
              return (
                <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                    {!isOwnMessage && showAvatar && (
                      <div className="text-xs text-zinc-400 mb-1 ml-2">
                        {message.senderUsername}
                      </div>
                    )}
                    <div className={`message-bubble ${isOwnMessage ? 'sent' : 'received'}`}>
                      <div className="text-sm">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {formatMessageTime(message.createdAt)}
                        {isOwnMessage && message.status && (
                          <span className="ml-2">
                            {message.status === 'DELIVERED' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="message-bubble received opacity-75">
                <div className="text-sm text-zinc-300">
                  {typingUsers.length === 1 
                    ? `${typingUsers[0]} is typing...`
                    : typingUsers.length === 2
                    ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                    : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`
                  }
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-zinc-900 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder={`Message ${group.name}...`}
              className="input-field flex-1"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              SEND
            </button>
          </form>
          
          {error && (
            <div className="mt-2 text-red-400 text-sm">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatGroupPage() {
  return (
    <ErrorBoundary>
      <ChatGroupPageContent />
    </ErrorBoundary>
  );
} 