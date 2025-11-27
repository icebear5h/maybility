"use client"

import { useState, useEffect } from "react"
import { X, Repeat, Clock, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { JournalEntry, RecurrenceRule, EventColor } from "@/lib/types"

const EVENT_COLORS: { value: EventColor; label: string; color: string }[] = [
  { value: "tomato", label: "Tomato", color: "#D50000" },
  { value: "flamingo", label: "Flamingo", color: "#E67C73" },
  { value: "tangerine", label: "Tangerine", color: "#F4511E" },
  { value: "banana", label: "Banana", color: "#F6BF26" },
  { value: "sage", label: "Sage", color: "#33B679" },
  { value: "basil", label: "Basil", color: "#0B8043" },
  { value: "peacock", label: "Peacock", color: "#039BE5" },
  { value: "blueberry", label: "Blueberry", color: "#3F51B5" },
  { value: "lavender", label: "Lavender", color: "#7986CB" },
  { value: "grape", label: "Grape", color: "#8E24AA" },
  { value: "graphite", label: "Graphite", color: "#616161" },
]

interface EventEditorProps {
  entry?: JournalEntry | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<JournalEntry>) => void
  onDelete?: (entry: JournalEntry) => void
  initialDate?: Date
}

export function EventEditor({ entry, isOpen, onClose, onSave, onDelete, initialDate }: EventEditorProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [isAllDay, setIsAllDay] = useState(false)
  const [color, setColor] = useState<EventColor>("blueberry")
  const [showRecurrence, setShowRecurrence] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<"none" | "daily" | "weekly" | "monthly" | "yearly">("none")
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([])
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("")

  useEffect(() => {
    if (entry) {
      setTitle(entry.title)
      setDescription(entry.content)
      const entryDate = new Date(entry.createdAt)
      setStartDate(entryDate.toISOString().split("T")[0])
      setStartTime(entryDate.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }))
      if (entry.endTime) {
        const endDate = new Date(entry.endTime)
        setEndTime(endDate.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }))
      } else {
        const defaultEnd = new Date(entryDate)
        defaultEnd.setHours(defaultEnd.getHours() + 1)
        setEndTime(defaultEnd.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }))
      }
      setIsAllDay(entry.isAllDay || false)
      setColor(entry.color || "blueberry")
      if (entry.recurrence) {
        setRecurrenceType(entry.recurrence.frequency)
        setRecurrenceDays(entry.recurrence.daysOfWeek || [])
        if (entry.recurrence.endDate) {
          setRecurrenceEndDate(new Date(entry.recurrence.endDate).toISOString().split("T")[0])
        }
      }
    } else if (initialDate) {
      setTitle("")
      setDescription("")
      setStartDate(initialDate.toISOString().split("T")[0])
      setStartTime(initialDate.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }))
      const defaultEnd = new Date(initialDate)
      defaultEnd.setHours(defaultEnd.getHours() + 1)
      setEndTime(defaultEnd.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }))
      setIsAllDay(false)
      setColor("blueberry")
      setRecurrenceType("none")
      setRecurrenceDays([])
      setRecurrenceEndDate("")
    }
  }, [entry, initialDate, isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    const [year, month, day] = startDate.split("-").map(Number)
    const [startHour, startMinute] = startTime.split(":").map(Number)
    const [endHour, endMinute] = endTime.split(":").map(Number)

    const startDateTime = new Date(year, month - 1, day, startHour, startMinute)
    const endDateTime = new Date(year, month - 1, day, endHour, endMinute)

    let recurrence: RecurrenceRule | undefined
    if (recurrenceType !== "none") {
      recurrence = {
        frequency: recurrenceType,
        interval: 1,
        daysOfWeek: recurrenceType === "weekly" ? recurrenceDays : undefined,
        endDate: recurrenceEndDate ? new Date(recurrenceEndDate) : undefined,
      }
    }

    onSave({
      id: entry?.id,
      title: title || "Untitled Event",
      content: description,
      createdAt: startDateTime,
      endTime: endDateTime,
      isAllDay,
      color,
      recurrence,
    })
    onClose()
  }

  const handleDelete = () => {
    if (entry && onDelete) {
      onDelete(entry)
      onClose()
    }
  }

  const toggleRecurrenceDay = (day: number) => {
    setRecurrenceDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">{entry ? "Edit Event" : "New Event"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-4">
          {/* Title */}
          <Input
            placeholder="Add title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-medium bg-transparent border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
          />

          {/* Date and Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 bg-muted/50"
              />
            </div>

            {!isAllDay && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex-1 bg-muted/50"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="flex-1 bg-muted/50"
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm">All day</span>
            </label>
          </div>

          {/* Recurrence */}
          <div className="space-y-2">
            <button
              onClick={() => setShowRecurrence(!showRecurrence)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Repeat className="h-4 w-4" />
              {recurrenceType === "none" ? "Does not repeat" : `Repeats ${recurrenceType}`}
            </button>

            {showRecurrence && (
              <div className="space-y-3 rounded-lg bg-muted/30 p-3">
                <div className="flex flex-wrap gap-2">
                  {(["none", "daily", "weekly", "monthly", "yearly"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setRecurrenceType(type)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        recurrenceType === type ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
                      )}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>

                {recurrenceType === "weekly" && (
                  <div className="flex gap-1">
                    {dayLabels.map((label, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleRecurrenceDay(idx)}
                        className={cn(
                          "h-8 w-8 rounded-full text-xs font-medium transition-colors",
                          recurrenceDays.includes(idx)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {recurrenceType !== "none" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Ends:</span>
                    <Input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      className="flex-1 h-8 text-xs bg-muted/50"
                      placeholder="Never"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Color</span>
            <div className="flex flex-wrap gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "h-6 w-6 rounded-full transition-transform",
                    color === c.value && "ring-2 ring-offset-2 ring-offset-card ring-white scale-110",
                  )}
                  style={{ backgroundColor: c.color }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <Textarea
            placeholder="Add description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[80px] bg-muted/50 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          {entry && onDelete ? (
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete}>
              Delete
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
