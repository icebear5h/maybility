"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface AccountSettingsProps {
  user: {
    name?: string | null;
    email: string;
    timezone?: string | null;
    calendarType: "GOOGLE" | "INTERNAL";
  };
  onUpdate: (data: {
    name?: string;
    timezone?: string;
    calendarType?: "GOOGLE" | "INTERNAL";
  }) => void;
  onDelete: () => void;
}

export function AccountSettings({
  user,
  onUpdate,
  onDelete,
}: AccountSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account information
        </p>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={user.name || ""}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Your name"
          />
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user.email} disabled />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed
          </p>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            value={user.timezone || "UTC"}
            onValueChange={(value) => onUpdate({ timezone: value })}
          >
            <SelectTrigger id="timezone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">
                Eastern Time (ET)
              </SelectItem>
              <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
              <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
              <SelectItem value="America/Los_Angeles">
                Pacific Time (PT)
              </SelectItem>
              <SelectItem value="Europe/London">London (GMT)</SelectItem>
              <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
              <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
              <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
              <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Calendar Type */}
        <div className="space-y-2">
          <Label htmlFor="calendarType">Calendar Type</Label>
          <Select
            value={user.calendarType}
            onValueChange={(value: "GOOGLE" | "INTERNAL") =>
              onUpdate({ calendarType: value })
            }
          >
            <SelectTrigger id="calendarType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INTERNAL">Internal Calendar</SelectItem>
              <SelectItem value="GOOGLE">Google Calendar</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {user.calendarType === "GOOGLE"
              ? "Synced with your Google Calendar"
              : "Using Maybility's internal calendar"}
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-6 border-t">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="mt-2"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}
