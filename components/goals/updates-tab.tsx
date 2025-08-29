"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, CalendarIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import type { Goal, GoalTask, GoalUpdate } from "@prisma/client"

type GoalWithDetails = Goal & {
  tasks: GoalTask[]
  updates: (GoalUpdate & { task?: { title: string } })[]
}

interface UpdatesTabProps {
  goal: GoalWithDetails
  onRefetch: () => void
}

export function UpdatesTab({ goal, onRefetch }: UpdatesTabProps) {
  const [newReflection, setNewReflection] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [expandedUpdates, setExpandedUpdates] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  console.log("[v0] UpdatesTab - goal:", goal)
  console.log("[v0] UpdatesTab - goal?.updates:", goal?.updates)

  if (!goal) {
    console.log("[v0] UpdatesTab - goal is undefined, showing loading")
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading goal data...</p>
      </div>
    )
  }

  const updates = Array.isArray(goal?.updates) ? goal.updates : []
  console.log("[v0] UpdatesTab - processed updates:", updates)
  console.log("[v0] UpdatesTab - updates.length:", updates.length)

  const handleCreateReflection = async () => {
    if (!newReflection.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch(`/api/goals/${goal.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "REFLECTION",
          body: newReflection.trim(),
        }),
      })

      if (!response.ok) throw new Error("Failed to create reflection")

      setNewReflection("")
      onRefetch()
      toast({
        title: "Reflection added",
        description: "Your reflection has been recorded.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create reflection. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleQuarterlyReview = async () => {
    setIsCreating(true)
    try {
      const response = await fetch(`/api/goals/${goal.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: "Quarterly review: progress, blockers, next 90 days.",
        }),
      })

      if (!response.ok) throw new Error("Failed to create review")

      onRefetch()
      toast({
        title: "Review created",
        description: "Quarterly review template has been added.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create review. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const toggleExpanded = (updateId: string) => {
    setExpandedUpdates((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(updateId)) {
        newSet.delete(updateId)
      } else {
        newSet.add(updateId)
      }
      return newSet
    })
  }

  const getUpdateKindLabel = (kind: string) => {
    switch (kind) {
      case "TASK_COMPLETION":
        return "Task Completed"
      case "MILESTONE":
        return "Milestone"
      case "REFLECTION":
        return "Reflection"
      case "REVIEW":
        return "Review"
      default:
        return kind
    }
  }

  const getUpdateKindColor = (kind: string) => {
    switch (kind) {
      case "TASK_COMPLETION":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "MILESTONE":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "REFLECTION":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "REVIEW":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  if (updates.length === 0) {
    console.log("[v0] UpdatesTab - no updates, showing empty state")
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-muted-foreground">
          <p>No updates yet.</p>
          <p className="text-sm mt-1">Completing tasks will generate updates automatically, or add a reflection.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-medium">Add Reflection</h3>
            <Textarea
              placeholder="Share your thoughts on progress, challenges, or insights..."
              value={newReflection}
              onChange={(e) => setNewReflection(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreateReflection} disabled={isCreating || !newReflection.trim()}>
                <MessageSquare className="h-4 w-4 mr-2" />
                {isCreating ? "Adding..." : "Add Reflection"}
              </Button>
              <Button variant="outline" onClick={handleQuarterlyReview} disabled={isCreating}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Quarterly Review
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add New Update */}
      <div className="space-y-4 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Add Update</h3>
          <Button variant="outline" size="sm" onClick={handleQuarterlyReview} disabled={isCreating}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Quarterly Review
          </Button>
        </div>
        <Textarea
          placeholder="Share your thoughts on progress, challenges, or insights..."
          value={newReflection}
          onChange={(e) => setNewReflection(e.target.value)}
          rows={3}
        />
        <Button onClick={handleCreateReflection} disabled={isCreating || !newReflection.trim()}>
          <MessageSquare className="h-4 w-4 mr-2" />
          {isCreating ? "Adding..." : "Add Reflection"}
        </Button>
      </div>

      {/* Updates Feed */}
      <div className="space-y-4">
        {updates.map((update) => {
          const isExpanded = expandedUpdates.has(update.id)
          const shouldTruncate = update.body.length > 280
          const displayBody = shouldTruncate && !isExpanded ? `${update.body.slice(0, 280)}...` : update.body

          return (
            <div key={update.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={getUpdateKindColor(update.kind)} variant="secondary">
                    {getUpdateKindLabel(update.kind)}
                  </Badge>
                  {update.task && <span className="text-sm text-muted-foreground">• {update.task.title}</span>}
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="space-y-2">
                <p className="whitespace-pre-wrap">{displayBody}</p>
                {shouldTruncate && (
                  <Button variant="ghost" size="sm" onClick={() => toggleExpanded(update.id)}>
                    {isExpanded ? "Read less" : "Read more"}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
