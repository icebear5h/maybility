# User Settings Setup

## What Was Implemented

### 1. Database Schema
Added to `User` model in `prisma/schema.prisma`:
- `preferences` (Json) - Stores calendar and notification preferences

### 2. API Routes
**`/api/user/[id]`** - Full CRUD for user settings
- `GET` - Fetch user profile and settings
- `PATCH` - Update user settings
- `DELETE` - Delete user account

**Security**: Users can only access/modify their own data (validated via session)

### 3. Frontend Components
**`/app/settings/page.tsx`** - Main settings page with tabs
- Calendar Settings tab
- Account Settings tab
- Auto-save functionality

**`/components/settings/calendar-settings.tsx`**
- Default event duration
- Default color picker
- Default priority
- Work hours (start/end)
- First day of week
- Default view (month/week/day)
- Auto-decline conflicts toggle

**`/components/settings/account-settings.tsx`**
- Name
- Email (read-only)
- Timezone selector
- Calendar type (INTERNAL/GOOGLE)
- Delete account (danger zone)

### 4. Types
**`/types/user-settings.ts`**
- `CalendarPreferences` interface
- `NotificationPreferences` interface
- `UserPreferences` interface
- `UserSettings` interface

## Setup Instructions

### 1. Run Prisma Migration
```bash
cd maybility-frontend
npx prisma migrate dev --name add_user_preferences
npx prisma generate
```

### 2. The TypeScript errors in the API route will resolve after running `prisma generate`

### 3. Access the Settings Page
Navigate to: `http://localhost:3000/settings`

## Preferences Structure

The `preferences` JSON field stores:

```typescript
{
  calendar: {
    defaultEventDuration: 60,        // minutes
    defaultColor: "#3b82f6",         // hex color
    defaultPriority: "MEDIUM",       // LOW | MEDIUM | HIGH
    workHoursStart: "09:00",         // HH:mm
    workHoursEnd: "17:00",           // HH:mm
    firstDayOfWeek: 0,               // 0 = Sunday, 1 = Monday
    defaultView: "month",            // month | week | day
    autoDeclineConflicts: false      // boolean
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: false,
    reminderMinutesBefore: 15
  }
}
```

## Usage in Your App

### Fetch User Settings
```typescript
const res = await fetch(`/api/user/${userId}`);
const settings = await res.json();
console.log(settings.preferences.calendar.defaultEventDuration);
```

### Update Settings
```typescript
await fetch(`/api/user/${userId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    timezone: 'America/New_York',
    preferences: {
      calendar: {
        defaultEventDuration: 30,
        defaultColor: '#10b981'
      }
    }
  })
});
```

### Use in Calendar Agent (FastAPI)
The timezone is already integrated:
```python
# In /api/chat endpoint
user_timezone = payload.get("timezone")
# Falls back to database if not provided
```

## Next Steps

1. **Add Notification Preferences Tab** - Extend the settings page
2. **Sync with Google Calendar** - Implement OAuth flow for GOOGLE calendar type
3. **Apply Preferences** - Use these settings in your calendar views
4. **Validation** - Add form validation for work hours, colors, etc.

## Notes

- Timezone auto-detects on user creation (can be updated in settings)
- Calendar type can be switched between INTERNAL and GOOGLE
- All preferences are optional with sensible defaults
- Delete account includes confirmation dialog
