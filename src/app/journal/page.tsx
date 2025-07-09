"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, FileText, Calendar } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Document {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export default function JournalPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents")
      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      }
    } catch (error) {
      toast("Failed to fetch documents")
    } finally {
      setLoading(false)
    }
  }

  const createNewDocument = async () => {
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Journal Entry",
          content: "",
        }),
      })

      if (response.ok) {
        const newDoc = await response.json()
        setDocuments([newDoc, ...documents])
        toast("New journal entry created")
      }
    } catch (error) {
      toast("Failed to create document")
    }
  }

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your journal entries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Journal</h1>
          <p className="text-muted-foreground">
            {documents.length} {documents.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        <Button onClick={createNewDocument} className="gap-2">
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your journal entries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchTerm ? "No matching entries found" : "No journal entries yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Start writing your thoughts and experiences"}
          </p>
          {!searchTerm && (
            <Button onClick={createNewDocument} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Entry
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Link key={doc.id} href={`/journal/${doc.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{doc.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">{doc.content || "No content yet..."}</p>
                  <div className="mt-3">
                    <Badge variant="secondary" className="text-xs">
                      {doc.content.length} characters
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
