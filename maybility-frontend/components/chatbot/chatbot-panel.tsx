"use client"

import type React from "react"

import { useState } from "react"
import { MessageSquare, Send, Minimize2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Session } from "next-auth"
import { useChatbot } from "./chatbot-context"

type Message = {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

type ChatbotPanelProps = {
  session: Session | null
}

export function ChatbotPanel({ session }: ChatbotPanelProps) {
  const { isMinimized, setIsMinimized } = useChatbot()
  const [aiName, setAiName] = useState("Maybility")
  const [showSettings, setShowSettings] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: session?.user
        ? `Welcome back, ${session.user.name?.split(" ")[0]}! How can I help you with your journaling today?`
        : "Welcome! Sign in to get personalized assistance with your journaling.",
      isUser: false,
      timestamp: new Date(),
    },
    {
      id: "2",
      content: "Help me brainstorm ideas for today's entry.",
      isUser: true,
      timestamp: new Date(),
    },
  ])
  const [currentMessage, setCurrentMessage] = useState("")

  const handleSendMessage = () => {
    if (!currentMessage.trim() || !session?.user) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: currentMessage,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setCurrentMessage("")

    // Simulate AI response (in real app, this would call your AI service)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "That's a great question! Here are some ideas to get you started...",
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (isMinimized) {
    return (
      <div
        style={{
          position: "fixed",
          right: "20px",
          bottom: "20px",
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => setIsMinimized(false)}
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "#333",
            color: "white",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)"
            e.currentTarget.style.background = "#555"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)"
            e.currentTarget.style.background = "#333"
          }}
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      </div>
    )
  }

  return (
    <aside
      style={{
        width: "320px",
        background: "white",
        borderLeft: "1px solid #e0e0e0",
        height: "calc(100vh - 60px)",
        position: "fixed",
        right: 0,
        top: "60px",
        display: "flex",
        flexDirection: "column",
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid #e0e0e0",
          background: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h2 style={{ fontSize: "1rem", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>{aiName}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              padding: "6px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Settings className="h-4 w-4 text-gray-500" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              padding: "6px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Minimize2 className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e0e0e0",
            background: "#f8f8f8",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "500",
                color: "#333",
                marginBottom: "4px",
              }}
            >
              AI Assistant Name
            </label>
            <input
              type="text"
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                border: "1px solid #d0d0d0",
                borderRadius: "4px",
                fontSize: "13px",
                background: "white",
              }}
              placeholder="Enter AI name..."
            />
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="btn"
            style={{ fontSize: "12px", padding: "4px 8px" }}
          >
            Done
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: "16px 20px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              justifyContent: message.isUser ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "10px 12px",
                borderRadius: "12px",
                fontSize: "13px",
                lineHeight: "1.4",
                background: message.isUser ? "#333" : "#f0f0f0",
                color: message.isUser ? "white" : "#333",
                border: message.isUser ? "none" : "1px solid #e0e0e0",
              }}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid #e0e0e0",
          background: "white",
        }}
      >
        <div style={{ position: "relative" }}>
          <Textarea
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={session?.user ? "Type your message..." : "Sign in to chat with AI..."}
            disabled={!session?.user}
            style={{
              width: "100%",
              minHeight: "60px",
              padding: "10px 40px 10px 12px",
              border: "1px solid #d0d0d0",
              borderRadius: "8px",
              resize: "none",
              fontSize: "13px",
              fontFamily: "inherit",
              background: session?.user ? "white" : "#f5f5f5",
              color: session?.user ? "#333" : "#999",
            }}
            rows={2}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!session?.user || !currentMessage.trim()}
            size="icon"
            style={{
              position: "absolute",
              bottom: "8px",
              right: "8px",
              width: "32px",
              height: "32px",
              background: session?.user && currentMessage.trim() ? "#333" : "#ccc",
              border: "none",
            }}
          >
            <Send className="h-3 w-3" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
        {session?.user && (
          <div
            style={{
              fontSize: "11px",
              color: "#666",
              marginTop: "6px",
              textAlign: "center",
            }}
          >
            Press Enter to send • Shift+Enter for new line
          </div>
        )}
      </div>
    </aside>
  )
}
