"use client";

import React from "react";
import { renderMarkdown } from "@/lib/markdown";
import LazyImage from "./LazyImage";

interface MessageBubbleProps {
  content: string;
  imageUrl?: string | null;
  imageFilename?: string | null;
  isOwnMessage: boolean;
  timestamp: string;
  senderUsername?: string;
  showSender?: boolean;
}

export default function MessageBubble({
  content,
  imageUrl,
  imageFilename,
  isOwnMessage,
  timestamp,
  senderUsername,
  showSender = false,
}: MessageBubbleProps) {
  const formatMessageTime = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return (
        date.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }
  };

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs lg:max-w-md ${isOwnMessage ? "order-2" : "order-1"}`}
      >
        {!isOwnMessage && showSender && senderUsername && (
          <div className="text-xs text-zinc-400 mb-1 ml-2">
            {senderUsername}
          </div>
        )}

        <div className={`message-bubble ${isOwnMessage ? "sent" : "received"}`}>
          <div className="space-y-2">
            {/* Image attachment */}
            {imageUrl && (
              <div className="rounded-lg overflow-hidden">
                <LazyImage
                  src={imageUrl}
                  alt={imageFilename || "Shared image"}
                  maxWidth={250}
                  maxHeight={200}
                  className="w-full"
                />
                {imageFilename && (
                  <div className="text-xs text-zinc-500 mt-1 px-1">
                    📎 {imageFilename}
                  </div>
                )}
              </div>
            )}

            {/* Text content with markdown */}
            {content && content.trim() && (
              <div className="text-sm leading-relaxed">
                {renderMarkdown(content)}
              </div>
            )}
          </div>

          <div className="text-xs text-zinc-500 mt-2">
            {formatMessageTime(timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}
