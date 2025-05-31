import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">
            Hacklumi Chat 💬
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A modern, privacy‑respecting chat platform built with Next.js, Tailwind CSS, and TypeScript
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Get Started
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-white text-indigo-600 font-medium rounded-lg border-2 border-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 text-left">
          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🔐 Privacy First
            </h3>
            <p className="text-gray-600">
              Instant sign‑up with just a username and password—no emails or external identity providers.
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              💬 Real-time Chat
            </h3>
            <p className="text-gray-600">
              Persistent, searchable history for all 1‑to‑1 conversations with reliable message delivery.
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🚀 Modern Tech
            </h3>
            <p className="text-gray-600">
              Built with Next.js, TypeScript, and PostgreSQL for a fast, reliable experience.
            </p>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            Made with ♥ and a shoestring budget. |{" "}
            <a 
              href="https://github.com" 
              className="text-indigo-600 hover:text-indigo-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
