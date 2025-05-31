"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ContactsSidebar from "@/components/ContactsSidebar";

interface User {
  id: string;
  username: string;
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated by trying to fetch current user info
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData.user);
        } else {
          // Not authenticated, redirect to login
          router.push("/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-zinc-500 font-light">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Contacts Sidebar */}
      <ContactsSidebar currentUser={currentUser} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-zinc-950 border-b border-zinc-900 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-light text-white tracking-wide">
                WELCOME, {currentUser?.username?.toUpperCase()}
              </h1>
              <p className="text-zinc-500 text-sm font-light mt-1">
                Select a contact to start chatting
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-ghost text-sm font-medium uppercase tracking-wide"
            >
              LOGOUT
            </button>
          </div>
        </div>

        {/* Welcome Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md mx-auto text-center">
            <div className="card p-12">
              <div className="w-20 h-20 border border-zinc-800 flex items-center justify-center mx-auto mb-8">
                <svg
                  className="w-8 h-8 text-zinc-600"
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

              <h2 className="text-lg font-light text-white mb-2 tracking-wide">
                START CHATTING
              </h2>

              <p className="text-zinc-500 text-sm font-light mb-8 leading-relaxed">
                Use the sidebar to manage contacts and start conversations.
                Connect with users by sending invitations.
              </p>

              <div className="space-y-4 text-xs text-zinc-600">
                <div className="flex items-center justify-center">
                  <div className="w-1 h-1 bg-white mr-3"></div>
                  <span className="uppercase tracking-wider">
                    Send invitations to connect
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-1 h-1 bg-white mr-3"></div>
                  <span className="uppercase tracking-wider">
                    Accept or reject invitations
                  </span>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-1 h-1 bg-white mr-3"></div>
                  <span className="uppercase tracking-wider">
                    Click contacts to start chatting
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 text-xs text-zinc-600 font-light">
              <p className="uppercase tracking-wider">
                Direct access via{" "}
                <code className="bg-zinc-900 px-2 py-1 border border-zinc-800 text-zinc-400">
                  /chat/[username]
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
