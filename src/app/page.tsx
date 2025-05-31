import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-12">
          <div className="w-24 h-24 border border-zinc-800 mx-auto mb-8 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-zinc-600"
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
          <h1 className="text-4xl font-light text-white mb-6 tracking-wide">
            HACKLOUMI CHAT
          </h1>
          <p className="text-lg text-zinc-400 font-light leading-relaxed max-w-2xl mx-auto">
            A modern, minimalistic chat platform built for seamless
            conversations. Privacy-focused, real-time messaging with an elegant
            interface.
          </p>
        </div>

        <div className="card p-8 mb-12">
          <h2 className="text-lg font-light text-white mb-8 tracking-wide uppercase">
            Get Started
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="btn-primary px-8 py-3 text-sm font-medium uppercase tracking-wide"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="btn-secondary px-8 py-3 text-sm font-medium uppercase tracking-wide"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 text-left mb-12">
          <div className="card p-6">
            <div className="w-8 h-8 border border-zinc-800 mb-4 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-zinc-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-white mb-3 uppercase tracking-wider">
              Privacy First
            </h3>
            <p className="text-zinc-500 text-sm font-light leading-relaxed">
              Simple registration with username and password only. No email
              required, no tracking, just secure messaging.
            </p>
          </div>
          <div className="card p-6">
            <div className="w-8 h-8 border border-zinc-800 mb-4 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-zinc-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-white mb-3 uppercase tracking-wider">
              Real-time Chat
            </h3>
            <p className="text-zinc-500 text-sm font-light leading-relaxed">
              Instant message delivery with persistent history. Reliable
              communication designed for modern workflows.
            </p>
          </div>
          <div className="card p-6">
            <div className="w-8 h-8 border border-zinc-800 mb-4 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-zinc-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-white mb-3 uppercase tracking-wider">
              Modern Stack
            </h3>
            <p className="text-zinc-500 text-sm font-light leading-relaxed">
              Built with Next.js, TypeScript, and PostgreSQL. Production-ready
              architecture for scalable performance.
            </p>
          </div>
        </div>

        <div className="text-xs text-zinc-600 font-light uppercase tracking-wider">
          <p>Made with precision and minimal design principles</p>
        </div>
      </div>
    </div>
  );
}
