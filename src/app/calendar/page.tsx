"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, ArrowLeft, Trash2, Bot, User } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
}

export default function ChatConversationPage() {
  const params = useParams()
  const router = useRouter()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (params.id) {
      fetchConversation()
    }
  }, [params.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchConversation = async () => {
    try {
      const response = await fetch("/api/conversations")
      if (response.ok) {
        const conversations = await response.json()
        const conv = conversations.find((c: Conversation) => c.id === params.id)
        if (conv) {
          setConversation(conv)
          setMessages(conv.messages)
        }
      }
    } catch (error) {
      toast("Failed to fetch conversation")
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !conversation || sending) return

    const userMessage = input.trim()
    setInput("")
    setSending(true)

    // Add user message to UI immediately
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
    }
    setMessages((prev) => [...prev, newUserMessage])

    try {
      // Update conversation with user message
      await fetch("/api/conversations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          userMessage: userMessage,
        }),
      })

      // Get AI response
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, newUserMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (response.ok) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let aiResponse = ""

        // Add AI message placeholder
        const aiMessageId = (Date.now() + 1).toString()
        setMessages((prev) => [
          ...prev,
          {
            id: aiMessageId,
            role: "assistant",
            content: "",
          },
        ])

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.choices?.[0]?.delta?.content) {
                    aiResponse += data.choices[0].delta.content
                    setMessages((prev) => prev.map((m) => (m.id === aiMessageId ? { ...m, content: aiResponse } : m)))
                  }
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        }
      }
    } catch (error) {
      toast("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const deleteConversation = async () => {
    if (!conversation) return

    try {
      const response = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conversation.id }),
      })

      if (response.ok) {
        toast("Conversation deleted successfully")
        router.push("/chat")
      }
    } catch (error) {
      toast("Failed to delete conversation")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Conversation not found</h1>
          <Link href="/chat">
            <Button>Back to Conversations</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">{conversation.title}</h1>
        </div>
        <Button onClick={deleteConversation} variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && (
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === "user" && (
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex gap-3 justify-start">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-lg p-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !input.trim()} className="gap-2">
            <Send className="h-4 w-4" />
            Send
          </Button>
        </form>
      </div>
    </div>
  )
}
