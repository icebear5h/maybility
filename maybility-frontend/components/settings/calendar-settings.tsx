"use client";

import { CalendarPreferences } from "@/types/user-settings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface CalendarSettingsProps {
  preferences: CalendarPreferences;
  onChange: (preferences: CalendarPreferences) => void;
}

export function CalendarSettings({
  preferences,
  onChange,
}: CalendarSettingsProps) {
  const updatePreference = <K extends keyof CalendarPreferences>(
    key: K,
    value: CalendarPreferences[K]
  ) => {
    onChange({ ...preferences, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Calendar Settings</h3>
        <p className="text-sm text-muted-foreground">
          Customize how your calendar behaves
        </p>
      </div>

      <div className="space-y-4">
        {/* Default Event Duration */}
        <div className="space-y-2">
          <Label htmlFor="defaultDuration">Default Event Duration</Label>
          <Select
            value={preferences.defaultEventDuration?.toString() || "60"}
            onValueChange={(value) =>
              updatePreference("defaultEventDuration", parseInt(value))
            }
          >
            <SelectTrigger id="defaultDuration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default Color */}
        <div className="space-y-2">
          <Label htmlFor="defaultColor">Default Event Color</Label>
          <div className="flex gap-2">
            <Input
              id="defaultColor"
              type="color"
              value={preferences.defaultColor || "#3b82f6"}
              onChange={(e) => updatePreference("defaultColor", e.target.value)}
              className="w-20 h-10"
            />
            <Input
              type="text"
              value={preferences.defaultColor || "#3b82f6"}
              onChange={(e) => updatePreference("defaultColor", e.target.value)}
              placeholder="#3b82f6"
              className="flex-1"
            />
          </div>
        </div>

        {/* Default Priority */}
        <div className="space-y-2">
          <Label htmlFor="defaultPriority">Default Priority</Label>
          <Select
            value={preferences.defaultPriority || "MEDIUM"}
            onValueChange={(value: "LOW" | "MEDIUM" | "HIGH") =>
              updatePreference("defaultPriority", value)
            }
          >
            <SelectTrigger id="defaultPriority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Work Hours */}
        <div className="space-y-2">
          <Label>Work Hours</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="time"
              value={preferences.workHoursStart || "09:00"}
              onChange={(e) =>
                updatePreference("workHoursStart", e.target.value)
              }
              className="flex-1"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="time"
              value={preferences.workHoursEnd || "17:00"}
              onChange={(e) => updatePreference("workHoursEnd", e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* First Day of Week */}
        <div className="space-y-2">
          <Label htmlFor="firstDayOfWeek">First Day of Week</Label>
          <Select
            value={preferences.firstDayOfWeek?.toString() || "0"}
            onValueChange={(value) =>
              updatePreference("firstDayOfWeek", parseInt(value) as 0 | 1)
            }
          >
            <SelectTrigger id="firstDayOfWeek">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sunday</SelectItem>
              <SelectItem value="1">Monday</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default View */}
        <div className="space-y-2">
          <Label htmlFor="defaultView">Default View</Label>
          <Select
            value={preferences.defaultView || "month"}
            onValueChange={(value: "month" | "week" | "day") =>
              updatePreference("defaultView", value)
            }
          >
            <SelectTrigger id="defaultView">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Auto Decline Conflicts */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="autoDecline">Auto-decline Conflicts</Label>
            <p className="text-sm text-muted-foreground">
              Automatically decline events that conflict with existing ones
            </p>
          </div>
          <Switch
            id="autoDecline"
            checked={preferences.autoDeclineConflicts || false}
            onCheckedChange={(checked) =>
              updatePreference("autoDeclineConflicts", checked)
            }
          />
        </div>
      </div>
    </div>
  );
}
