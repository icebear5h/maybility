"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

type ChatbotContextType = {
  isMinimized: boolean
  setIsMinimized: (minimized: boolean) => void
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined)

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const [isMinimized, setIsMinimized] = useState(true)

  return <ChatbotContext.Provider value={{ isMinimized, setIsMinimized }}>{children}</ChatbotContext.Provider>
}

export function useChatbot() {
  const context = useContext(ChatbotContext)
  if (context === undefined) {
    throw new Error("useChatbot must be used within a ChatbotProvider")
  }
  return context
}
