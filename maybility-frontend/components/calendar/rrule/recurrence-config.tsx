"use client"

import { useState, useEffect } from "react"
import { RRule, Frequency } from "rrule"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { RecurrenceConfig as RecurrenceConfigType } from "@/types/calendar-types"

interface RecurrenceConfigProps {
  isOpen: boolean
  onToggle: () => void
  config: RecurrenceConfigType
  onChange: (config: RecurrenceConfigType) => void
  onRRuleChange: (rrule: string) => void
  startDate: string
}

const WEEKDAYS = [
  { value: 0, label: "Mon", fullLabel: "Monday" },
  { value: 1, label: "Tue", fullLabel: "Tuesday" },
  { value: 2, label: "Wed", fullLabel: "Wednesday" },
  { value: 3, label: "Thu", fullLabel: "Thursday" },
  { value: 4, label: "Fri", fullLabel: "Friday" },
  { value: 5, label: "Sat", fullLabel: "Saturday" },
  { value: 6, label: "Sun", fullLabel: "Sunday" },
]

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function RecurrenceConfig({
  isOpen,
  onToggle,
  config,
  onChange,
  onRRuleChange,
  startDate,
}: RecurrenceConfigProps) {
  const [endType, setEndType] = useState<"never" | "count" | "until">("never")

  // Generate RRule string whenever config changes
  useEffect(() => {
    try {
      const startDateTime = new Date(startDate)

      const ruleOptions: any = {
        freq: Frequency[config.frequency],
        interval: config.interval,
        dtstart: startDateTime,
      }

      if (config.byweekday && config.byweekday.length > 0) {
        ruleOptions.byweekday = config.byweekday
      }

      if (config.bymonthday && config.bymonthday.length > 0) {
        ruleOptions.bymonthday = config.bymonthday
      }

      if (config.bymonth && config.bymonth.length > 0) {
        ruleOptions.bymonth = config.bymonth
      }

      if (config.count && config.count > 0) {
        ruleOptions.count = config.count
      }

      if (config.until) {
        ruleOptions.until = new Date(config.until)
      }

      const rule = new RRule(ruleOptions)
      onRRuleChange(rule.toString())
    } catch (error) {
      console.error("Error generating RRule:", error)
    }
  }, [config, startDate, onRRuleChange])

  const updateConfig = (updates: Partial<RecurrenceConfigType>) => {
    onChange({ ...config, ...updates })
  }

  const handleEndTypeChange = (type: "never" | "count" | "until") => {
    setEndType(type)
    if (type === "never") {
      updateConfig({ count: undefined, until: undefined })
    } else if (type === "count") {
      updateConfig({ count: 10, until: undefined })
    } else if (type === "until") {
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      updateConfig({ count: undefined, until: nextMonth.toISOString().split("T")[0] })
    }
  }

  const toggleWeekday = (day: number) => {
    const current = config.byweekday || []
    const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()
    updateConfig({ byweekday: updated })
  }

  const toggleMonthday = (day: number) => {
    const current = config.bymonthday || []
    const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()
    updateConfig({ bymonthday: updated })
  }

  const toggleMonth = (month: number) => {
    const current = config.bymonth || []
    const updated = current.includes(month) ? current.filter((m) => m !== month) : [...current, month].sort()
    updateConfig({ bymonth: updated })
  }

  return (
    <div className="border border-stone-200 rounded-md">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-stone-50 transition-colors"
      >
        <span className="text-sm font-medium text-stone-700">Recurring Event</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-stone-500" /> : <ChevronDown className="h-4 w-4 text-stone-500" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-stone-200 space-y-4">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Repeats</label>
            <div className="flex gap-2">
              <select
                value={config.frequency}
                onChange={(e) => updateConfig({ frequency: e.target.value as any })}
                className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-600">every</span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={config.interval}
                  onChange={(e) => updateConfig({ interval: Number.parseInt(e.target.value) || 1 })}
                  className="w-16 px-2 py-2 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                />
                <span className="text-sm text-stone-600">
                  {config.frequency.toLowerCase().slice(0, -2)}
                  {config.interval > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly options */}
          {config.frequency === "WEEKLY" && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Repeat on</label>
              <div className="flex gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      config.byweekday?.includes(day.value)
                        ? "bg-blue-600 text-white"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly options */}
          {config.frequency === "MONTHLY" && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Repeat on days</label>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleMonthday(day)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      config.bymonthday?.includes(day)
                        ? "bg-blue-600 text-white"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Yearly options */}
          {config.frequency === "YEARLY" && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Repeat in months</label>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((month, index) => (
                  <button
                    key={month}
                    type="button"
                    onClick={() => toggleMonth(index + 1)}
                    className={`px-3 py-2 text-xs rounded-md transition-colors ${
                      config.bymonth?.includes(index + 1)
                        ? "bg-blue-600 text-white"
                        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                    }`}
                  >
                    {month.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End options */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Ends</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="endType"
                  checked={endType === "never"}
                  onChange={() => handleEndTypeChange("never")}
                  className="text-blue-600"
                />
                <span className="text-sm text-stone-700">Never</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="endType"
                  checked={endType === "count"}
                  onChange={() => handleEndTypeChange("count")}
                  className="text-blue-600"
                />
                <span className="text-sm text-stone-700">After</span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={config.count || 10}
                  onChange={(e) => updateConfig({ count: Number.parseInt(e.target.value) || 10 })}
                  disabled={endType !== "count"}
                  className="w-16 px-2 py-1 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center disabled:bg-stone-100"
                />
                <span className="text-sm text-stone-700">occurrences</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="endType"
                  checked={endType === "until"}
                  onChange={() => handleEndTypeChange("until")}
                  className="text-blue-600"
                />
                <span className="text-sm text-stone-700">On</span>
                <input
                  type="date"
                  value={config.until || ""}
                  onChange={(e) => updateConfig({ until: e.target.value })}
                  disabled={endType !== "until"}
                  className="px-2 py-1 bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-stone-100"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
