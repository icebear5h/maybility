import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Occurrence } from "@/types/calendar-types"
import { Task } from "@prisma/client"
import rrule, { rrulestr } from "rrule"

interface CreateTaskData {
  title: string
  description?: string
  status?: "TODO" | "IN_PROGRESS" | "DONE"
  dtstart?: Date
  rrule?: string
  startTime?: string
  endTime?: string
  priority?: "LOW" | "MEDIUM" | "HIGH"
  color?: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Return expanded calendar events (tasks with scheduled dates)
    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const rangeStart = startDate ? new Date(startDate) : defaultStart
    const rangeEnd = endDate ? new Date(endDate) : defaultEnd

    // Fetch all tasks with scheduled dates (both recurring and non-recurring)
    const singleEvents = await prisma.task.findMany({
      where: {
        userId,
        rrule: null,
        dtstart: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      orderBy: [{ dtstart: "asc" }, { startTime: "asc" }],
    })
    const recurringEvents = await prisma.task.findMany({
      where: {
        userId,
        rrule: {
          not: null,
        },
        dtstart: {
          lte: rangeStart,
        },

      },
      orderBy: [{ dtstart: "asc" }, { startTime: "asc" }],
    })
    const expandedRecurringEvents = expandRecurringEvents(recurringEvents, rangeStart, rangeEnd)
    const allEvents = [...singleEvents, ...expandedRecurringEvents]
    return NextResponse.json(allEvents)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 })
  }
}

function expandRecurringEvents(recurreingEvents: Task[], windowStart: Date, windowEnd: Date) {
  const expandedEvents: Occurrence[] = []
  for (const event of recurreingEvents) {
    // Skip events without a start date
    if (!event.dtstart) continue;
    
    let str = toICalDateTime(event.dtstart) + "\n" + event.rrule
    let rrule = rrulestr(str)
    let endDate = windowEnd
    if (event.endDate) {
      if (event.endDate < windowEnd) {
        endDate = new Date(event.endDate)
      }
    }
    let occurrences = rrule.between(windowStart, endDate)
    occurrences.map((instance) => {
      expandedEvents.push({
        id: event.id,
        title: event.title,
        description: event.description || "",
        startUtc: instance.toISOString(),
        endUtc: instance.toISOString(),
        color: event.color,
        status: event.status,
        occurrenceType: "RRULE",
        hasOverride: false,
        taskId: event.id,
        goalId: event.goalId || "",
      })
    })
  }
  return expandedEvents
}

function toICalDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}


export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user exists in database before proceeding
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data: any = await request.json()
    
    // Map scheduledDate to dtstart if provided
    const taskData: any = {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      color: data.color,
      userId,
    };

    // Handle date fields
    if (data.scheduledDate) {
      taskData.dtstart = new Date(data.scheduledDate);
    } else if (data.dtstart) {
      taskData.dtstart = new Date(data.dtstart);
    }

    // Handle time fields
    if (data.startTime) taskData.startTime = data.startTime;
    if (data.endTime) taskData.endTime = data.endTime;
    
    // Handle optional fields
    if (data.goalId) taskData.goalId = data.goalId;
    if (data.rrule) taskData.rrule = data.rrule;
    if (data.endDate) taskData.endDate = new Date(data.endDate);
    if (data.timezone) taskData.timezone = data.timezone;
    if (data.occurrenceType) taskData.occurrenceType = data.occurrenceType;

    const task = await prisma.task.create({
      data: taskData,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to create task', details: errorMessage },
      { status: 500 }
    );
  }
}