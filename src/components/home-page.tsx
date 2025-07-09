"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, MessageCircle, Calendar, Plus, TrendingUp, Clock, FileText } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"

interface DashboardStats {
  totalDocuments: number
  totalConversations: number
  recentDocuments: Array<{
    id: string
    title: string
    updatedAt: string
    content: string
  }>
  recentConversations: Array<{
    id: string
    title: string
    updatedAt: string
    messageCount: number
  }>
}

export function HomePage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    totalConversations: 0,
    recentDocuments: [],
    recentConversations: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [documentsRes, conversationsRes] = await Promise.all([fetch("/api/documents"), fetch("/api/conversations")])

      if (documentsRes.ok && conversationsRes.ok) {
        const documents = await documentsRes.json()
        const conversations = await conversationsRes.json()

        setStats({
          totalDocuments: documents.length,
          totalConversations: conversations.length,
          recentDocuments: documents.slice(0, 3),
          recentConversations: conversations.slice(0, 3).map((conv: any) => ({
            ...conv,
            messageCount: conv.messages?.length || 0,
          })),
        })
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      title: "New Journal Entry",
      description: "Start writing your thoughts",
      icon: Plus,
      href: "/journal",
      action: "create",
    },
    {
      title: "Start AI Chat",
      description: "Begin a conversation with AI",
      icon: MessageCircle,
      href: "/chat",
      action: "create",
    },
    {
      title: "View Calendar",
      description: "Check your schedule",
      icon: Calendar,
      href: "/calendar",
      action: "view",
    },
  ]

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Welcome back, {session?.user?.name?.split(" ")[0] || "there"}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your journal and conversations.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Journal entries written</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Conversations</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">Chats with AI assistant</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                stats.recentDocuments.filter(
                  (doc) => new Date(doc.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">New entries this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.recentDocuments.length > 0
                ? new Date(stats.recentDocuments[0].updatedAt).toLocaleDateString()
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Most recent entry</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <action.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Journal Entries */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recent Journal Entries</h2>
            <Link href="/journal">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentDocuments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2" />
                    <p>No journal entries yet</p>
                    <p className="text-sm">Start writing your first entry!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              stats.recentDocuments.map((doc) => (
                <Link key={doc.id} href={`/journal/${doc.id}`}>
                  <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium line-clamp-1">{doc.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {new Date(doc.updatedAt).toLocaleDateString()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {doc.content || "No content yet..."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recent AI Conversations</h2>
            <Link href="/chat">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentConversations.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start chatting with the AI!</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              stats.recentConversations.map((conv) => (
                <Link key={conv.id} href={`/chat/${conv.id}`}>
                  <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium line-clamp-1">{conv.title}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {new Date(conv.updatedAt).toLocaleDateString()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{conv.messageCount} messages</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
