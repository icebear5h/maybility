import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { combineDateTimeToUtc } from "@/lib/timezone-utils"

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
    
    // console.log('[GET /api/tasks] Query range:', {
    //   startDate,
    //   endDate,
    //   rangeStart,
    //   rangeEnd,
    //   userId
    // })

    // Fetch all tasks (series definitions)
    // Client will handle expansion
    // For single tasks, we need to check if they overlap with the range at all
    // An event overlaps if: startTime <= rangeEnd AND endTime >= rangeStart
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        OR: [
          // Single tasks that overlap with the range
          {
            occurrenceType: 'SINGLE',
            startTime: {
              lte: rangeEnd,
            },
            endTime: {
              gte: rangeStart,
            },
          },
          // Recurring tasks (fetch all, client will expand)
          {
            occurrenceType: 'RRULE',
          },
        ],
      },
      include: {
        exceptions: true,
        overrides: true,
      },
      orderBy: [{ startTime: "asc" }],
    })
    
    console.log('[GET /api/tasks] Found tasks:', {
      count: tasks.length,
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        startTime: t.startTime,
        endTime: t.endTime,
        occurrenceType: t.occurrenceType
      }))
    })

    return NextResponse.json(tasks)
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
    
    // Debug: Log incoming data
    // console.log('[POST /api/tasks] Received data:', JSON.stringify(data, null, 2))
    // console.log('[POST /api/tasks] Field check:', {
    //   hasDate: !!data.date,
    //   hasStartTime: !!data.startTime,
    //   hasEndTime: !!data.endTime,
    //   hasTimezone: !!data.timezone,
    //   date: data.date,
    //   startTime: data.startTime,
    //   endTime: data.endTime,
    //   timezone: data.timezone
    // })
    
    // Check if startTime/endTime are ISO strings (Date objects serialized from frontend)
    const isISOString = typeof data.startTime === 'string' && data.startTime.includes('T')
    
    let startUtc, endUtc
    
    if (isISOString) {
      // Frontend sent Date objects (serialized to ISO strings) - already in UTC
      if (!data.startTime || !data.endTime || !data.timezone) {
        return NextResponse.json(
          { error: 'Missing required fields: startTime, endTime, timezone' },
          { status: 400 }
        );
      }
      
      startUtc = new Date(data.startTime)
      endUtc = new Date(data.endTime)
    } else {
      // Old format: date + time strings (HH:MM) + timezone
      if (!data.date || !data.startTime || !data.endTime || !data.timezone) {
        const missingFields = []
        if (!data.date) missingFields.push('date')
        if (!data.startTime) missingFields.push('startTime')
        if (!data.endTime) missingFields.push('endTime')
        if (!data.timezone) missingFields.push('timezone')
        
        console.error('[POST /api/tasks] Missing fields:', missingFields)
        return NextResponse.json(
          { 
            error: 'Missing required fields: date, startTime, endTime, timezone',
            missing: missingFields,
            received: data
          },
          { status: 400 }
        );
      }
      
      // Convert local date/time to UTC using timezone utils
      const startUtcDT = combineDateTimeToUtc(data.date, data.startTime, data.timezone)
      let endUtcDT = combineDateTimeToUtc(data.date, data.endTime, data.timezone)
      
      if (!startUtcDT || !endUtcDT) {
        console.error('[POST /api/tasks] Failed to convert times to UTC')
        return NextResponse.json(
          { error: 'Invalid date/time conversion' },
          { status: 400 }
        )
      }
      
      // Handle cross-midnight events (endTime < startTime means next day)
      if (endUtcDT <= startUtcDT) {
        const nextDay = new Date(data.date)
        nextDay.setDate(nextDay.getDate() + 1)
        const nextDayStr = nextDay.toISOString().split('T')[0]
        endUtcDT = combineDateTimeToUtc(nextDayStr, data.endTime, data.timezone)
        
        if (!endUtcDT) {
          return NextResponse.json(
            { error: 'Invalid end time conversion' },
            { status: 400 }
          )
        }
      }
      
      startUtc = new Date(startUtcDT.toISO()!)
      endUtc = new Date(endUtcDT.toISO()!)
    }
    
    // Build task data
    const taskData: any = {
      title: data.title,
      description: data.description,
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      color: data.color || '#3b82f6',
      userId,
      timezone: data.timezone,
      occurrenceType: data.isRecurring ? 'RRULE' : 'SINGLE',
      startTime: startUtc,
      endTime: endUtc,
    }
    
    // Handle optional fields
    if (data.goalId) taskData.goalId = data.goalId;
    if (data.rrule) taskData.rrule = data.rrule;

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
