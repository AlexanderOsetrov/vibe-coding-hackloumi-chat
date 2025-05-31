'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Message {
  id: string
  content: string
  createdAt: string
  sender: {
    id: string
    username: string
  }
  receiver: {
    id: string
    username: string
  }
}

interface User {
  id: string
  username: string
}

export default function ChatUserPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const peerUsername = params.user as string

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/messages?peer=${encodeURIComponent(peerUsername)}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      } else if (response.status === 404) {
        setError(`User "${peerUsername}" not found`)
      }
    } catch {
      console.error('Failed to load messages')
    }
  }, [peerUsername])

  const startPolling = useCallback(() => {
    // Poll for new messages every 2 seconds
    pollingRef.current = setInterval(async () => {
      try {
        const lastMessage = messages[messages.length - 1]
        const since = lastMessage ? lastMessage.createdAt : undefined
        
        const url = since 
          ? `/api/messages?peer=${encodeURIComponent(peerUsername)}&since=${encodeURIComponent(since)}`
          : `/api/messages?peer=${encodeURIComponent(peerUsername)}`
        
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          if (data.messages.length > 0) {
            setMessages(prev => {
              // Avoid duplicates by filtering out messages we already have
              const existingIds = new Set(prev.map(m => m.id))
              const newMessages = data.messages.filter((m: Message) => !existingIds.has(m.id))
              return [...prev, ...newMessages]
            })
          }
        }
      } catch {
        console.error('Polling failed')
      }
    }, 2000)
  }, [peerUsername, messages])

  useEffect(() => {
    // Check authentication and load initial messages
    const initializeChat = async () => {
      try {
        const authResponse = await fetch('/api/auth/me')
        if (!authResponse.ok) {
          router.push('/login')
          return
        }

        const authData = await authResponse.json()
        setCurrentUser(authData.user)

        // Load initial messages
        await loadMessages()
        
        // Start polling for new messages
        startPolling()
      } catch {
        console.error('Chat initialization failed')
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    initializeChat()

    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [peerUsername, router, loadMessages, startPolling])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    setError('')

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          receiverUsername: peerUsername
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.data])
        setNewMessage('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to send message')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading chat...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/chat"
              className="text-indigo-600 hover:text-indigo-800"
            >
              ← Back to Chat
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">
              Chat with {peerUsername}
            </h1>
          </div>
          <div className="text-sm text-gray-600">
            Logged in as {currentUser?.username}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender.username === currentUser?.username
                      ? 'justify-end'
                      : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender.username === currentUser?.username
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {message.sender.username}
                    </div>
                    <div>{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.sender.username === currentUser?.username
                        ? 'text-indigo-200'
                        : 'text-gray-500'
                    }`}>
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 bg-white p-4">
            <form onSubmit={sendMessage} className="flex space-x-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                rows={2}
                disabled={isSending}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(e)
                  }
                }}
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 