"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarSettings } from "@/components/settings/calendar-settings";
import { AccountSettings } from "@/components/settings/account-settings";
import { UserSettings, UserPreferences } from "@/types/user-settings";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch user settings
  useEffect(() => {
    if (session?.user?.id) {
      fetchSettings();
    }
  }, [session?.user?.id]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/user/${session?.user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings || !session?.user?.id) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/user/${session.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          timezone: settings.timezone,
          calendarType: settings.calendarType,
          preferences: settings.preferences,
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/user/${session?.user?.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete account");

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });

      // Sign out and redirect
      router.push("/auth/signin");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardContent className="pt-6">
              <CalendarSettings
                preferences={settings.preferences?.calendar || {}}
                onChange={(calendar) =>
                  setSettings({
                    ...settings,
                    preferences: {
                      ...settings.preferences,
                      calendar,
                    },
                  })
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardContent className="pt-6">
              <AccountSettings
                user={{
                  name: settings.name,
                  email: settings.email,
                  timezone: settings.timezone,
                  calendarType: settings.calendarType,
                }}
                onUpdate={(data) =>
                  setSettings({
                    ...settings,
                    ...data,
                  })
                }
                onDelete={handleDeleteAccount}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
