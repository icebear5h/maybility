"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import type { JournalEntry, UserSettings } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Send, Sparkles, User, PanelLeftClose, PanelLeft, RotateCcw } from "lucide-react"

// FastAPI backend URL - configure via env or default to localhost
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface AiChatSidebarProps {
  selectedEntry: JournalEntry | null
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function AiChatSidebar({ selectedEntry }: AiChatSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hey! I can help manage your calendar, create events, check your schedule, or answer questions. What do you need?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [agentSettings, setAgentSettings] = useState<UserSettings | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch user settings on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then(setAgentSettings)
      .catch(console.error)
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Build context from selected entry
  const buildContext = (): string => {
    if (!selectedEntry) return ""
    return `Currently viewing journal entry: "${selectedEntry.title}"\nContent: ${selectedEntry.content?.slice(0, 500) || ""}`
  }

  // Get user timezone
  const getUserTimezone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  // Clear conversation
  const handleClearChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "Chat cleared. How can I help you?",
      },
    ])
    setThreadId(null)
    setError(null)
  }

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
    setError(null)

    try {
      // Build messages array for API
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TODO: Add auth token when auth is implemented
          // "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          context: buildContext(),
          timezone: agentSettings?.timezone || getUserTimezone(),
          threadId: threadId,
          agentSettings: agentSettings
            ? {
                fastModel: agentSettings.fastModel,
                reasoningModel: agentSettings.reasoningModel,
                routerThreshold: agentSettings.routerThreshold,
                enableComplexPath: agentSettings.enableComplexPath,
                customPrompts: {
                  router: agentSettings.customRouterPrompt,
                  simple_responder: agentSettings.customSimplePrompt,
                  orchestrator: agentSettings.customOrchestratorPrompt,
                  synthesizer: agentSettings.customSynthesizerPrompt,
                  set_tasks: agentSettings.customSetTasksPrompt,
                },
              }
            : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `API error: ${response.status}`)
      }

      const data = await response.json()

      // Save thread ID for conversation continuity
      if (data.threadId) {
        setThreadId(data.threadId)
      }

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response || "I processed your request but have no response to show.",
        },
      ])
    } catch (err) {
      console.error("Chat error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to AI"
      setError(errorMessage)

      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, I encountered an error: ${errorMessage}. Make sure the backend is running.`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Collapsed state - thin column with icon (now on left side)
  if (isCollapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-border/50 bg-card/30 py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8"
          title="Open AI Chat"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center gap-1 mt-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">{messages.length}</span>
        </div>
      </div>
    )
  }

  // Expanded state (now on left side)
  return (
    <div className="flex h-full w-80 flex-col border-r border-border/50 bg-card/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Calendar & tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearChat}
            className="h-6 w-6"
            title="Clear chat"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-6 w-6"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Selected entry context indicator */}
      {selectedEntry && (
        <div className="border-b border-border/50 bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Context:</p>
          <p className="truncate text-sm font-medium">{selectedEntry.title}</p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="border-b border-destructive/50 bg-destructive/10 p-2">
          <p className="text-xs text-destructive">Backend unavailable</p>
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
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
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
      <form onSubmit={handleSubmit} className="border-t border-border/50 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What's on my calendar today?"
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
