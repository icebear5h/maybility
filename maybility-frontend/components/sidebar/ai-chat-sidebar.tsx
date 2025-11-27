"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { JournalEntry } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X, Send, Sparkles, User } from "lucide-react"

interface AiChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  selectedEntry: JournalEntry | null
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function AiChatSidebar({ isOpen, onClose, selectedEntry }: AiChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your journal companion. I can help you reflect on your entries, explore patterns in your thoughts, or assist with writing. What would you like to explore today?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Update context when entry is selected
  useEffect(() => {
    if (selectedEntry) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `I see you've selected "${selectedEntry.title}". Would you like me to help you reflect on this entry, explore related themes, or expand on your thoughts?`,
        },
      ])
    }
  }, [selectedEntry]) // Updated to use the entire selectedEntry object

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response (replace with actual AI SDK call)
    setTimeout(() => {
      const responses = [
        "That's a thoughtful observation. How does this connect to how you've been feeling lately?",
        "I notice you often write about this theme. Would you like to explore what it means to you?",
        "It sounds like you're processing something important. Take your time with these feelings.",
        "Your entries show interesting patterns. Shall I help you identify some recurring themes?",
      ]
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: responses[Math.floor(Math.random() * responses.length)],
        },
      ])
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div
      className={cn(
        "fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l border-border bg-card shadow-xl transition-transform duration-300",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">AI Companion</h3>
            <p className="text-xs text-muted-foreground">Reflect & explore</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Selected entry context */}
      {selectedEntry && (
        <div className="border-b border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Discussing:</p>
          <p className="truncate text-sm font-medium">{selectedEntry.title}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  message.role === "assistant" ? "bg-primary/10" : "bg-muted",
                )}
              >
                {message.role === "assistant" ? (
                  <Sparkles className="h-4 w-4 text-primary" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  message.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              </div>
              <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2">
                <div className="flex gap-1">
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
