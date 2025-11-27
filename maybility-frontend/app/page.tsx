import { AppShell } from "@/components/shell/app-shell"
import type { JournalEntry, Folder, Goal } from "@/lib/types"

// Mock data for development - will be replaced with real API calls
const mockEntries: JournalEntry[] = [
  {
    id: "1",
    title: "Morning Reflection",
    content:
      "Woke up feeling energized today. The project is coming together nicely, and I'm excited about the direction it's taking. Need to focus on the remaining features.",
    createdAt: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "1",
    folderId: "folder-reflections",
    mood: 0.7,
    energy: 0.8,
    clarity: 0.6,
    duration: 90,
    color: "Sage",
    goalId: "goal-2",
    stageId: "stage-2-2", // Link to "Building Habit" stage
  },
  {
    id: "2",
    title: "Afternoon Slump",
    content:
      "Hit a wall after lunch. Feeling a bit scattered and unsure about the next steps. Maybe a walk would help clear my head.",
    createdAt: new Date(new Date().setHours(14, 30, 0, 0)).toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "1",
    folderId: "folder-reflections",
    mood: -0.2,
    energy: -0.4,
    clarity: -0.3,
    duration: 45,
    color: "Tangerine",
  },
  {
    id: "3",
    title: "Team Standup",
    content: "Daily standup meeting with the team.",
    createdAt: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "1",
    folderId: "folder-work",
    mood: 0.3,
    energy: 0.5,
    clarity: 0.6,
    duration: 30,
    color: "Blueberry",
    goalId: "goal-1",
    stageId: "stage-1-2", // Link to "Skill Development" stage
    recurrence: {
      frequency: "weekly",
      interval: 1,
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    },
  },
  {
    id: "4",
    title: "Deep Work Session",
    content: "Focused coding time - no meetings or interruptions.",
    createdAt: new Date(new Date().setHours(13, 0, 0, 0)).toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "1",
    folderId: "folder-work",
    mood: 0.6,
    energy: 0.7,
    clarity: 0.9,
    duration: 120,
    color: "Grape",
    goalId: "goal-1",
    stageId: "stage-1-2", // Link to "Skill Development" stage
  },
  {
    id: "5",
    title: "Lunch Break",
    content: "Time to recharge.",
    createdAt: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "1",
    folderId: "folder-reflections",
    mood: 0.5,
    energy: 0.4,
    clarity: 0.5,
    duration: 60,
    color: "Banana",
    recurrence: {
      frequency: "daily",
      interval: 1,
    },
  },
  {
    id: "6",
    title: "Weekly Review",
    content:
      "Looking back at this week's entries. There's been a lot of ups and downs, but overall I'm making progress.",
    createdAt: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "1",
    folderId: "folder-reflections",
    mood: 0.4,
    energy: 0.5,
    clarity: 0.7,
    duration: 60,
    color: "Lavender",
    recurrence: {
      frequency: "weekly",
      interval: 1,
      daysOfWeek: [5], // Friday only
    },
  },
  {
    id: "7",
    title: "Thanksgiving Day",
    content: "Holiday - office closed.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "1",
    folderId: "folder-reflections",
    isAllDay: true,
    color: "Peacock",
  },
  {
    id: "8",
    title: "Evening Yoga",
    content: "Wind down with some stretching.",
    createdAt: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "1",
    folderId: "folder-reflections",
    mood: 0.8,
    energy: 0.3,
    clarity: 0.7,
    duration: 45,
    color: "Basil",
    goalId: "goal-3",
    stageId: "stage-3-2", // Link to "Distance Training" stage
    recurrence: {
      frequency: "weekly",
      interval: 1,
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
    },
  },
  {
    id: "9",
    title: "Late Night Ideas",
    content:
      "Had a breakthrough moment while trying to sleep. What if we approach the problem from a completely different angle?",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    userId: "1",
    folderId: "folder-ideas",
    mood: 0.5,
    energy: 0.3,
    clarity: 0.9,
    duration: 30,
    color: "Flamingo",
    goalId: "goal-1",
    stageId: "stage-1-3", // Link to "Project Leadership" stage
  },
]

const mockFolders: Folder[] = [
  {
    id: "all-entries", // Changed from folder-root to all-entries to match castle-view default
    name: "All Entries",
    parentId: null,
    isRoot: true,
  },
  {
    id: "folder-ideas",
    name: "Ideas",
    parentId: "all-entries", // Updated parent reference
  },
  {
    id: "folder-reflections",
    name: "Reflections",
    parentId: "all-entries", // Updated parent reference
  },
  {
    id: "folder-work",
    name: "Work",
    parentId: "all-entries", // Updated parent reference
  },
  {
    id: "folder-meetings",
    name: "Meetings",
    parentId: "folder-work",
  },
  {
    id: "folder-projects",
    name: "Projects",
    parentId: "folder-work",
  },
  {
    id: "folder-daily",
    name: "Daily",
    parentId: "folder-reflections",
  },
  {
    id: "folder-weekly",
    name: "Weekly",
    parentId: "folder-reflections",
  },
]

const mockGoals: Goal[] = [
  {
    id: "goal-1",
    title: "Career Advancement",
    description: "Get promoted to senior position by building expertise and leading projects",
    color: "#6366f1",
    status: "in-progress",
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
    targetDate: new Date(new Date().getFullYear() + 1, 0, 1).toISOString(),
    category: "career",
    stages: [
      {
        id: "stage-1-1",
        title: "Research & Planning",
        description: "Identify required skills and certifications",
        order: 0,
        status: "completed",
      },
      {
        id: "stage-1-2",
        title: "Skill Development",
        description: "Complete certifications and training",
        order: 1,
        status: "active",
      },
      {
        id: "stage-1-3",
        title: "Project Leadership",
        description: "Lead a major project to demonstrate capability",
        order: 2,
        status: "pending",
      },
      {
        id: "stage-1-4",
        title: "Performance Review",
        description: "Discuss promotion with manager",
        order: 3,
        status: "pending",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "goal-2",
    title: "Daily Meditation Practice",
    description: "Establish a consistent meditation practice for mental clarity",
    color: "#10b981",
    status: "in-progress",
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
    targetDate: new Date(new Date().getFullYear(), 11, 31).toISOString(),
    category: "health",
    stages: [
      {
        id: "stage-2-1",
        title: "Getting Started",
        description: "Start with 5-minute sessions",
        order: 0,
        status: "completed",
      },
      {
        id: "stage-2-2",
        title: "Building Habit",
        description: "Increase to 15-minute daily sessions",
        order: 1,
        status: "active",
      },
      {
        id: "stage-2-3",
        title: "Deepening Practice",
        description: "Explore different meditation techniques",
        order: 2,
        status: "pending",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "goal-3",
    title: "Run a Half Marathon",
    description: "Train and complete a half marathon",
    color: "#f59e0b",
    status: "in-progress",
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
    targetDate: new Date(new Date().getFullYear() + 1, 5, 1).toISOString(),
    category: "health",
    stages: [
      {
        id: "stage-3-1",
        title: "Base Building",
        description: "Build up to running 5K comfortably",
        order: 0,
        status: "completed",
      },
      {
        id: "stage-3-2",
        title: "Distance Training",
        description: "Gradually increase to 10K",
        order: 1,
        status: "active",
      },
      {
        id: "stage-3-3",
        title: "Half Marathon Prep",
        description: "Long runs and race-specific training",
        order: 2,
        status: "pending",
      },
      {
        id: "stage-3-4",
        title: "Race Day",
        description: "Complete the half marathon",
        order: 3,
        status: "pending",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "goal-4",
    title: "Learn a New Language",
    description: "Become conversational in Spanish",
    color: "#ec4899",
    status: "not-started",
    startDate: new Date(new Date().getFullYear() + 1, 0, 1).toISOString(),
    targetDate: new Date(new Date().getFullYear() + 3, 0, 1).toISOString(),
    category: "education",
    stages: [
      {
        id: "stage-4-1",
        title: "Foundations",
        description: "Learn basic vocabulary and grammar",
        order: 0,
        status: "pending",
      },
      {
        id: "stage-4-2",
        title: "Practice Speaking",
        description: "Start conversation practice with tutors",
        order: 1,
        status: "pending",
      },
      {
        id: "stage-4-3",
        title: "Immersion",
        description: "Watch shows, read books in Spanish",
        order: 2,
        status: "pending",
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export default function HomePage() {
  return <AppShell entries={mockEntries} folders={mockFolders} goals={mockGoals} />
}
