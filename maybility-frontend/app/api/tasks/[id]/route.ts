import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TaskStatus, Priority, OccurrenceType } from "@prisma/client"
import { combineDateTimeToUtc, extractDateTimeFromUtc } from "@/lib/timezone-utils"
import { RecurringOverride } from "@prisma/client"
import { RecurringException } from "@prisma/client"

interface updateTaskData {
  title?: string,
  description?: string,
  status?: TaskStatus,
  priority?: Priority,
  color?: string,
  goalId?: string,
  timezone?: string,
  occurrenceType?: OccurrenceType,
  
  // Date/time fields (frontend format)
  date?: string,        // YYYY-MM-DD
  startTime?: string,   // HH:MM or ISO string
  endTime?: string,     // HH:MM or ISO string
  startDate?: string,   // YYYY-MM-DD (alternative to date)
  
  // Recurring event fields
  rrule?: string,
  editType?: "this" | "following" | "all",  // How to edit recurring events
  occurrenceKey?: string,  // Occurrence key (e.g., "task-1-2024-10-15T09:00") - which specific occurrence is being edited
  overrides?: RecurringOverride[],
  exceptions?: RecurringException[],
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await params; 
    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data: updateTaskData = await request.json()
    
    console.log('[PATCH /api/tasks/[id]] Received update data:', JSON.stringify(data, null, 2))
    console.log('[PATCH /api/tasks/[id]] Task ID:', taskId)
    console.log('[PATCH /api/tasks/[id]] Field check:', {
      hasDate: !!data.date,
      hasStartTime: !!data.startTime,
      hasEndTime: !!data.endTime,
      hasTimezone: !!data.timezone,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: data.timezone,
      rrule: data.rrule,
      title: data.title,
      status: data.status,
      overrides: data.overrides,
      exceptions: data.exceptions,
    })

    // Get the task and verify ownership
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Handle recurring event edit types
    if (data.editType && task.occurrenceType === 'RRULE') {
      console.log('[PATCH] Recurring event edit type:', data.editType)
      
      if (data.editType === 'this' && data.occurrenceKey) {
        // Strategy: Create an override for this specific occurrence
        console.log('[PATCH] Creating override for occurrence:', data.occurrenceKey)
        
        // Parse occurrenceKey to extract the date (format: "{taskId}-{YYYY-MM-DDTHH:mm}")
        // The taskId can contain hyphens, so we match the date pattern at the end
        const dateMatch = data.occurrenceKey.match(/-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/)
        if (!dateMatch) {
          return NextResponse.json({ error: "Invalid occurrence key format" }, { status: 400 })
        }
        const dateTimePart = dateMatch[1]
        const originalStart = new Date(dateTimePart)
        
        // Prepare new start/end times (already in UTC from frontend)
        let newStart: Date | null = null
        let newEnd: Date | null = null
        
        if (data.startTime && data.endTime) {
          newStart = new Date(data.startTime)
          newEnd = new Date(data.endTime)
        }
        
        // Create or update the override
        await prisma.recurringOverride.upsert({
          where: {
            eventId_originalStart: {
              eventId: taskId,
              originalStart,
            },
          },
          create: {
            eventId: taskId,
            originalStart,
            newStart,
            newEnd,
            title: data.title || null,
            description: data.description || null,
            status: data.status || null,
          },
          update: {
            newStart,
            newEnd,
            title: data.title || null,
            description: data.description || null,
            status: data.status || null,
          },
        })
        
        console.log('[PATCH] Override created/updated successfully')
        
        // Return the task with updated overrides
        const updatedTask = await prisma.task.findUnique({
          where: { id: taskId },
          include: {
            exceptions: true,
            overrides: true,
          },
        })
        
        return NextResponse.json(updatedTask)
      } else if (data.editType === 'following' && data.occurrenceKey) {
        // Strategy: End current series at this date, create new series from this date forward
        console.log('[PATCH] Splitting series at:', data.occurrenceKey)
        
        // Parse occurrenceKey to extract the date (format: "task-1-2024-10-15T09:00")
        const dateTimePart = data.occurrenceKey.split('-').slice(2).join('-')
        const splitDate = new Date(dateTimePart)
        
        // Update the original task's RRULE to end before the split date
        // Add UNTIL clause to the RRULE
        let updatedRRule = task.rrule || ''
        
        // Remove existing UNTIL if present
        updatedRRule = updatedRRule.replace(/;UNTIL=[^;]+/, '')
        
        // Format split date as YYYYMMDD for RRULE UNTIL
        const splitDateStr = splitDate.toISOString().split('T')[0].replace(/-/g, '')
        const dayBefore = new Date(splitDate)
        dayBefore.setDate(dayBefore.getDate() - 1)
        const untilDateStr = dayBefore.toISOString().split('T')[0].replace(/-/g, '')
        
        // Add UNTIL to end the series the day before the split
        if (updatedRRule.includes('RRULE:')) {
          updatedRRule = updatedRRule.replace('RRULE:', `RRULE:UNTIL=${untilDateStr}T235959Z;`)
        }
        
        console.log('[PATCH] Updated original RRULE:', updatedRRule)
        
        // Update the original task
        await prisma.task.update({
          where: { id: taskId },
          data: { rrule: updatedRRule },
        })
        
        // Create new task for the "following" series with updated values
        const newRRule = task.rrule || ''
        const newStartTime = data.startTime ? new Date(data.startTime) : task.startTime
        const newEndTime = data.endTime ? new Date(data.endTime) : task.endTime
        
        const newTask = await prisma.task.create({
          data: {
            userId: task.userId,
            title: data.title || task.title,
            description: data.description !== undefined ? data.description : task.description,
            status: data.status || task.status,
            priority: task.priority,
            color: task.color,
            goalId: task.goalId,
            occurrenceType: 'RRULE',
            rrule: newRRule,
            startTime: newStartTime,
            endTime: newEndTime,
            timezone: data.timezone || task.timezone,
          },
        })
        
        console.log('[PATCH] Created new series:', newTask.id)
        
        // Return both tasks
        return NextResponse.json({
          originalTask: await prisma.task.findUnique({
            where: { id: taskId },
            include: { exceptions: true, overrides: true },
          }),
          newTask,
        })
      }
      // 'all' - just update the task normally (default behavior)
    }

    const updateData: any = {
      updatedAt: new Date(),
    }

    // Simple field updates
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.status !== undefined) updateData.status = data.status
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.color !== undefined) updateData.color = data.color
    if (data.occurrenceType !== undefined) updateData.occurrenceType = data.occurrenceType
    if (data.goalId !== undefined) updateData.goalId = data.goalId
    if (data.rrule !== undefined) updateData.rrule = data.rrule
    
    // Handle date/time updates with timezone utils
    if (data.startTime !== undefined && data.endTime !== undefined) {
      // Check if startTime/endTime are ISO strings (Date objects serialized from frontend)
      const isISOString = typeof data.startTime === 'string' && data.startTime.includes('T')
      
      if (isISOString) {
        // Frontend sent Date objects (serialized to ISO strings) - already in UTC
        console.log('[PATCH] Using ISO string path')
        updateData.startTime = new Date(data.startTime)
        updateData.endTime = new Date(data.endTime)
        if (data.timezone !== undefined) {
          updateData.timezone = data.timezone
        }
        console.log('[PATCH] Updated times:', {
          startTime: updateData.startTime,
          endTime: updateData.endTime,
          timezone: updateData.timezone
        })
      } else if (data.date !== undefined) {
        // Old format: date + time strings (HH:MM) + timezone
        const timezone = data.timezone || task.timezone || 'UTC'
        
        const startUtc = combineDateTimeToUtc(data.date, data.startTime, timezone)
        let endUtc = combineDateTimeToUtc(data.date, data.endTime, timezone)
        
        if (!startUtc || !endUtc) {
          return NextResponse.json(
            { error: 'Invalid date/time conversion' },
            { status: 400 }
          )
        }
        
        // Handle cross-midnight events
        if (endUtc <= startUtc) {
          const nextDay = new Date(data.date)
          nextDay.setDate(nextDay.getDate() + 1)
          const nextDayStr = nextDay.toISOString().split('T')[0]
          endUtc = combineDateTimeToUtc(nextDayStr, data.endTime, timezone)
          
          if (!endUtc) {
            return NextResponse.json(
              { error: 'Invalid end time conversion' },
              { status: 400 }
            )
          }
        }
        
        // Store as Date objects (Prisma will handle)
        updateData.startTime = new Date(startUtc.toISO()!)
        updateData.endTime = new Date(endUtc.toISO()!)
        updateData.timezone = timezone
      }
    } else if (data.date !== undefined) {
      // Just date changed, preserve existing time
      if (task.startTime && task.endTime && task.timezone) {
        const existingStart = extractDateTimeFromUtc(task.startTime, task.timezone)
        const existingEnd = extractDateTimeFromUtc(task.endTime, task.timezone)
        
        if (!existingStart || !existingEnd) {
          return NextResponse.json(
            { error: 'Failed to extract existing times' },
            { status: 500 }
          )
        }
        
        const newStartUtc = combineDateTimeToUtc(data.date, existingStart.time, task.timezone)
        const newEndUtc = combineDateTimeToUtc(data.date, existingEnd.time, task.timezone)
        
        if (!newStartUtc || !newEndUtc) {
          return NextResponse.json(
            { error: 'Failed to convert new date/time' },
            { status: 400 }
          )
        }
        
        // Store as Date objects (Prisma will handle)
        updateData.startTime = new Date(newStartUtc.toISO()!)
        updateData.endTime = new Date(newEndUtc.toISO()!)
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params.id
    const { id: taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query params to check if this is an override deletion
    const { searchParams } = new URL(request.url)
    const occurrenceKey = searchParams.get("occurrenceKey")
    const editType = searchParams.get("editType")

    // Get the task and verify ownership
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Handle override deletion (delete specific occurrence)
    if (editType === 'this' && occurrenceKey && task.occurrenceType === 'RRULE') {
      console.log('[DELETE] Deleting override for occurrence:', occurrenceKey)
      
      // Parse occurrenceKey to extract the date (format: "{taskId}-{YYYY-MM-DDTHH:mm}")
      const dateMatch = occurrenceKey.match(/-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/)
      if (!dateMatch) {
        return NextResponse.json({ error: "Invalid occurrence key format" }, { status: 400 })
      }
      const dateTimePart = dateMatch[1]
      const originalStart = new Date(dateTimePart)
      
      // Delete the override if it exists
      await prisma.recurringOverride.deleteMany({
        where: {
          eventId: taskId,
          originalStart,
        },
      })
      
      // Create an exception to hide this occurrence
      await prisma.recurringException.upsert({
        where: {
          eventId_originalStart: {
            eventId: taskId,
            originalStart,
          },
        },
        create: {
          eventId: taskId,
          originalStart,
        },
        update: {
          // Exception already exists, nothing to update
        },
      })
      
      console.log('[DELETE] Override deleted and exception created for occurrence')
      return NextResponse.json({ success: true, type: 'override_deleted' })
    }

    // Default: Delete the entire task
    await prisma.task.delete({
      where: { id: taskId },
    })

    return NextResponse.json({ success: true, type: 'task_deleted' })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
