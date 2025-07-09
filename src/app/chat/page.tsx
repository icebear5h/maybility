"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, MessageCircle, Calendar } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: Array<{
    id: string
    role: string
    content: string
  }>
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations")
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      }
    } catch (error) {
      toast("Failed to fetch conversations")
    } finally {
      setLoading(false)
    }
  }

  const createNewConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Conversation",
          messages: [
            {
              role: "user",
              content: "Hello! I'd like to start a new conversation.",
            },
          ],
        }),
      })

      if (response.ok) {
        const newConversation = await response.json()
        setConversations([newConversation, ...conversations])
        toast("New conversation started")
      }
    } catch (error) {
      toast("Failed to create conversation")
    }
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Conversations</h1>
          <p className="text-muted-foreground">
            {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"}
          </p>
        </div>
        <Button onClick={createNewConversation} className="gap-2">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredConversations.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm ? "No matching conversations found" : "No conversations yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Start a conversation with the AI assistant"}
          </p>
          {!searchTerm && (
            <Button onClick={createNewConversation} className="gap-2">
              <Plus className="h-4 w-4" />
              Start Your First Chat
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredConversations.map((conv) => (
            <Link key={conv.id} href={`/chat/${conv.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{conv.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {conv.messages[conv.messages.length - 1]?.content || "No messages yet..."}
                  </p>
                  <div className="mt-3">
                    <Badge variant="secondary" className="text-xs">
                      {conv.messages.length} messages
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
