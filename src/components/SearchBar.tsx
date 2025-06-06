"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  id: string;
  content: string;
  createdAt: string;
  rank: number;
  type: "direct" | "group";
  sender: {
    id: string;
    username: string;
  };
  receiver?: {
    id: string;
    username: string;
  };
  group?: {
    id: string;
    name: string;
  };
  conversationWith: string;
}

interface SearchBarProps {
  currentUser: {
    id: string;
    username: string;
  } | null;
}

export default function SearchBar({ currentUser }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await performSearch(query.trim());
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (response.ok) {
        setResults(data.results || []);
        setIsOpen(true);
      } else {
        setError(data.error || "Search failed");
        setResults([]);
        setIsOpen(true);
      }
    } catch {
      setError("Network error. Please try again.");
      setResults([]);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");

    if (result.type === "group") {
      // Navigate to group chat
      router.push(`/chat/group/${result.group?.id}`);
    } else {
      // Navigate to direct chat
      router.push(`/chat/${result.conversationWith}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;

    const regex = new RegExp(
      `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-zinc-700 text-white px-1 rounded-sm">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getResultTypeIcon = (type: "direct" | "group") => {
    if (type === "group") {
      return (
        <svg
          className="w-3 h-3 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="w-3 h-3 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      );
    }
  };

  return (
    <div ref={searchRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && results.length > 0 && setIsOpen(true)}
          placeholder="Search messages..."
          className="input-field w-full pl-10 pr-4 text-sm"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <div className="w-4 h-4 border border-zinc-600 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg
              className="w-4 h-4 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-sm shadow-lg z-50 max-h-96 overflow-y-auto">
          {error && (
            <div className="p-3 text-red-300 text-xs border-b border-zinc-800">
              {error}
            </div>
          )}

          {results.length === 0 && !error && !isLoading && (
            <div className="p-4 text-zinc-500 text-sm text-center">
              No messages found for &quot;{query}&quot;
            </div>
          )}

          {results.map((result) => (
            <div
              key={result.id}
              onClick={() => handleResultClick(result)}
              className="p-3 hover:bg-zinc-900 cursor-pointer border-b border-zinc-900 last:border-b-0 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getResultTypeIcon(result.type)}
                  <div className="text-xs text-zinc-400 uppercase tracking-wider">
                    {result.type === "group"
                      ? `# ${result.conversationWith}`
                      : result.conversationWith}
                  </div>
                  {result.type === "group" && (
                    <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                      GROUP
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500">
                  {formatDate(result.createdAt)}
                </div>
              </div>
              <div className="text-sm text-zinc-300 font-light leading-relaxed">
                {highlightMatch(result.content, query)}
              </div>
              <div className="mt-2 text-xs text-zinc-600">
                From:{" "}
                {result.sender.username === currentUser?.username
                  ? "You"
                  : result.sender.username}
                {result.type === "group" && ` in ${result.group?.name}`}
              </div>
            </div>
          ))}

          {results.length > 0 && (
            <div className="p-2 text-xs text-zinc-600 text-center border-t border-zinc-800">
              {results.length} result{results.length !== 1 ? "s" : ""} found
              {results.some((r) => r.type === "direct") &&
                results.some((r) => r.type === "group") &&
                ` (${results.filter((r) => r.type === "direct").length} direct, ${results.filter((r) => r.type === "group").length} group)`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
