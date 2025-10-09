import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Occurrence } from "@/types/calendar-types"
import { Task } from "@prisma/client"
import rrule, { rrulestr } from "rrule"
import { taskToOccurrence } from '@/lib/occurrence-utils'



function expandRecurringEvents(recurringTasks: Task[], windowStart: Date, windowEnd: Date) {
  const expandedOccurrences: Occurrence[] = []
  
  for (const task of recurringTasks) {
    // Skip events without a start date
    if (!task.startDate) continue;
    
    let str = toICalDateTime(task.startDate) + "\n" + task.rrule
    let rrule = rrulestr(str)
    let endDate = windowEnd
    if (task.endDate) {
      if (task.endDate < windowEnd) {
        endDate = new Date(task.endDate)
      }
    }
    let occurrenceDates = rrule.between(windowStart, endDate)
    
    occurrenceDates.forEach((occurrenceDate) => {
      expandedOccurrences.push(taskToOccurrence(task, occurrenceDate))
    })
  }
  
  return expandedOccurrences
}

function toICalDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
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
    const singleTasks = await prisma.task.findMany({
      where: {
        userId,
        rrule: null,
        startDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      orderBy: [{ startDate: "asc" }, { startTime: "asc" }],
    })
    const recurringTasks = await prisma.task.findMany({
      where: {
        userId,
        rrule: {
          not: null,
        },
        startDate: {
          lte: rangeStart,
        },
      },
      orderBy: [{ startDate: "asc" }, { startTime: "asc" }],
    })

    // Transform single tasks to occurrences
    const singleOccurrences = singleTasks.map(task => taskToOccurrence(task, task.startDate!))

    // Expand recurring tasks to occurrences
    const recurringOccurrences = expandRecurringEvents(recurringTasks, rangeStart, rangeEnd)

    const allOccurrences = [...singleOccurrences, ...recurringOccurrences]
    return NextResponse.json(allOccurrences)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 })
  }
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