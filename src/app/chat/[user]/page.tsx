"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import ContactsSidebar from "@/components/ContactsSidebar";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
  };
  receiver: {
    id: string;
    username: string;
  };
}

interface User {
  id: string;
  username: string;
}

export default function ChatUserPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const peerUsername = params.user as string;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/messages?peer=${encodeURIComponent(peerUsername)}`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      } else if (response.status === 404) {
        setError(`User "${peerUsername}" not found`);
      }
    } catch {
      console.error("Failed to load messages");
    }
  }, [peerUsername]);

  const startPolling = useCallback(() => {
    // Poll for new messages every 2 seconds
    pollingRef.current = setInterval(async () => {
      try {
        const lastMessage = messages[messages.length - 1];
        const since = lastMessage ? lastMessage.createdAt : undefined;

        const url = since
          ? `/api/messages?peer=${encodeURIComponent(peerUsername)}&since=${encodeURIComponent(since)}`
          : `/api/messages?peer=${encodeURIComponent(peerUsername)}`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.messages.length > 0) {
            setMessages((prev) => {
              // Avoid duplicates by filtering out messages we already have
              const existingIds = new Set(prev.map((m) => m.id));
              const newMessages = data.messages.filter(
                (m: Message) => !existingIds.has(m.id)
              );
              return [...prev, ...newMessages];
            });
          }
        }
      } catch {
        console.error("Polling failed");
      }
    }, 2000);
  }, [peerUsername, messages]);

  useEffect(() => {
    // Check authentication and load initial messages
    const initializeChat = async () => {
      try {
        const authResponse = await fetch("/api/auth/me");
        if (!authResponse.ok) {
          router.push("/login");
          return;
        }

        const authData = await authResponse.json();
        setCurrentUser(authData.user);

        // Load initial messages
        await loadMessages();

        // Start polling for new messages
        startPolling();
      } catch {
        console.error("Chat initialization failed");
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();

    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [peerUsername, router, loadMessages, startPolling]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    setError("");

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          receiverUsername: peerUsername,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, data.data]);
        setNewMessage("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to send message");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-zinc-500 font-light">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Contacts Sidebar */}
      <ContactsSidebar
        currentUser={currentUser}
        activeContactUsername={peerUsername}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-zinc-950 border-b border-zinc-900 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link
                href="/chat"
                className="text-zinc-400 hover:text-white text-sm font-light uppercase tracking-wider transition-colors duration-200"
              >
                ← BACK
              </Link>
              <div>
                <h1 className="text-lg font-light text-white tracking-wide">
                  {peerUsername?.toUpperCase()}
                </h1>
                <p className="text-zinc-500 text-xs font-light mt-1 uppercase tracking-wider">
                  CONVERSATION
                </p>
              </div>
            </div>
            <div className="text-xs text-zinc-500 font-light uppercase tracking-wider">
              {currentUser?.username}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {error && (
                <div className="bg-red-950 border border-red-900 text-red-300 px-4 py-3 rounded-sm text-sm font-light">
                  {error}
                </div>
              )}

              {messages.length === 0 ? (
                <div className="text-center text-zinc-500 py-16 font-light">
                  <div className="w-16 h-16 border border-zinc-800 mx-auto mb-4 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-zinc-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.985-.504L10 16H6c-1.105 0-2-.895-2-2V6c0-1.105.895-2 2-2h12c1.105 0 2 .895 2 2v6z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm uppercase tracking-wider">
                    No messages yet
                  </p>
                  <p className="text-xs text-zinc-600 mt-2 uppercase tracking-wider">
                    Start the conversation
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender.username === currentUser?.username
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div className="max-w-sm">
                      <div
                        className={`${
                          message.sender.username === currentUser?.username
                            ? "message-bubble-sent"
                            : "message-bubble-received"
                        }`}
                      >
                        <div className="text-xs font-medium mb-2 opacity-70 uppercase tracking-wider">
                          {message.sender.username}
                        </div>
                        <div className="font-light leading-relaxed">
                          {message.content}
                        </div>
                        <div className="text-xs mt-3 opacity-50 uppercase tracking-wider">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-zinc-900 bg-zinc-950 p-6">
              <form onSubmit={sendMessage} className="flex space-x-4">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 input-field resize-none font-light"
                  rows={2}
                  disabled={isSending}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isSending || !newMessage.trim()}
                  className="btn-primary text-sm font-medium uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? "SENDING..." : "SEND"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
