"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Smile } from "lucide-react"
import type { DailyRecap } from "@/lib/types"

export function DailyRecapForm() {
  const [formData, setFormData] = useState<Partial<DailyRecap>>({
    feeling: "",
    wins: "",
    blockers: "",
    summary: "",
    emoji: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, you would send this data to your backend.
    console.log("Form submitted:", formData)
    alert("Recap saved! Check the console for the data.")
  }

  return (
    <Card className="w-full shadow-soft rounded-sm border-stone-300/80">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="text-2xl text-stone-700">Yesterday's Highlights</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="feeling" className="font-serif text-lg text-stone-600">
              Today I felt...
            </Label>
            <Input
              id="feeling"
              name="feeling"
              placeholder="e.g., energized, a bit tired, optimistic..."
              value={formData.feeling}
              onChange={handleInputChange}
              className="rounded-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wins" className="font-serif text-lg text-stone-600">
              My wins yesterday were...
            </Label>
            <Textarea
              id="wins"
              name="wins"
              placeholder="What went well? No win is too small!"
              value={formData.wins}
              onChange={handleInputChange}
              className="rounded-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="blockers" className="font-serif text-lg text-stone-600">
              Any blockers?
            </Label>
            <Textarea
              id="blockers"
              name="blockers"
              placeholder="What got in the way, if anything?"
              value={formData.blockers}
              onChange={handleInputChange}
              className="rounded-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor="summary" className="font-serif text-lg text-stone-600">
                In 3 words:
              </Label>
              <Input
                id="summary"
                name="summary"
                placeholder="e.g., Productive, focused, calm"
                value={formData.summary}
                onChange={handleInputChange}
                className="rounded-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="font-serif text-lg text-stone-600 invisible sm:visible">Emoji</Label>
              <Button type="button" variant="outline" className="h-10 w-full rounded-sm border-dashed bg-transparent">
                <Smile className="mr-2 h-4 w-4 text-accent-slate" />
                Pick Emoji
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full bg-accent-green hover:bg-accent-green/90 text-primary-foreground rounded-sm"
          >
            Save Recap
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
