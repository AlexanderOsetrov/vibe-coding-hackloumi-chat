"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-2xl font-light text-white mb-4">Page Not Found</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="space-y-3">
          <Link
            href="/chat"
            className="block w-full bg-white text-black font-medium py-3 px-6 rounded-lg hover:bg-zinc-200 transition-colors text-center"
          >
            Go to Chat
          </Link>
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