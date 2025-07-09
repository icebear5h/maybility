"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Save, Trash2, ArrowLeft, Bot } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Document {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchDocument()
    }
  }, [params.id])

  const fetchDocument = async () => {
    try {
      const response = await fetch("/api/documents")
      if (response.ok) {
        const documents = await response.json()
        const doc = documents.find((d: Document) => d.id === params.id)
        if (doc) {
          setDocument(doc)
          setTitle(doc.title)
          setContent(doc.content)
        }
      }
    } catch (error) {
      toast("Failed to fetch document")
    } finally {
      setLoading(false)
    }
  }

  const saveDocument = async () => {
    if (!document) return

    setSaving(true)
    try {
      const response = await fetch("/api/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          title,
          content,
          updateEmbedding: true,
        }),
      })

      if (response.ok) {
        const updatedDoc = await response.json()
        setDocument(updatedDoc)
        toast("Document saved successfully")
      }
    } catch (error) {
      toast("Failed to save document")
    } finally {
      setSaving(false)
    }
  }

  const deleteDocument = async () => {
    if (!document) return

    try {
      const response = await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: document.id }),
      })

      if (response.ok) {
        toast("Document deleted successfully")
        router.push("/journal")
      }
    } catch (error) {
      toast("Failed to delete document")
    }
  }

  const startChatAboutDocument = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Chat about: ${title}`,
          messages: [
            {
              role: "user",
              content: `I'd like to discuss my journal entry titled "${title}". Here's the content: ${content}`,
            },
          ],
        }),
      })

      if (response.ok) {
        const conversation = await response.json()
        router.push(`/chat/${conversation.id}`)
      }
    } catch (error) {
      toast("Failed to start chat")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Document not found</h1>
          <Link href="/journal">
            <Button>Back to Journal</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/journal">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Journal
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button onClick={startChatAboutDocument} variant="outline" className="gap-2 bg-transparent">
            <Bot className="h-4 w-4" />
            Chat About This
          </Button>
          <Button onClick={saveDocument} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button onClick={deleteDocument} variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title..."
            className="text-2xl font-bold border-none p-0 focus-visible:ring-0"
          />
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>Created: {new Date(document.createdAt).toLocaleString()}</span>
            <span>•</span>
            <span>Updated: {new Date(document.updatedAt).toLocaleString()}</span>
            <Badge variant="secondary" className="ml-auto">
              {content.length} characters
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your thoughts..."
            className="min-h-[500px] resize-none border-none p-0 focus-visible:ring-0"
          />
        </CardContent>
      </Card>
    </div>
  )
}
