"use client"

import { useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion"
import type { Event, Goal } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  Clock,
  ChevronDown,
  Play,
  SkipForward,
  Target,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Zap
} from "lucide-react"
import { format, isToday, isTomorrow, differenceInMinutes } from "date-fns"

interface NowViewProps {
  events: Event[]
  goals?: Goal[]
  onSelectEvent?: (event: Event) => void
  onUpdateEvent?: (event: Event) => void
}

const SWIPE_THRESHOLD = 100
const VELOCITY_THRESHOLD = 500

export function NowView({ events, goals = [], onSelectEvent, onUpdateEvent }: NowViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(false)
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null)
  const [momentum, setMomentum] = useState(0) // 0-100 momentum score
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set()) // Track dismissed calendar events

  // Get actionable items: unscheduled tasks + all upcoming scheduled events (tasks AND calendar events)
  const actionableItems = useMemo(() => {
    const now = new Date()

    // Unscheduled tasks (have taskStatus, no startTime)
    const unscheduledTasks = events.filter(e =>
      e.taskStatus &&
      e.taskStatus !== 'DONE' &&
      !e.startTime
    )

    // Upcoming scheduled events - both pure calendar events AND scheduled tasks
    // Include anything with a startTime in the next 24 hours that isn't already done
    const upcoming = events.filter(e => {
      if (!e.startTime) return false
      const start = new Date(e.startTime)
      const hoursUntil = differenceInMinutes(start, now) / 60
      // Include if: in next 24 hours AND (no taskStatus OR taskStatus isn't DONE)
      return hoursUntil > 0 && hoursUntil <= 24 && (!e.taskStatus || e.taskStatus !== 'DONE')
    })

    // Sort: unscheduled tasks by priority, then upcoming by time
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    const sortedTasks = unscheduledTasks.sort((a, b) =>
      (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
    )

    const sortedUpcoming = upcoming.sort((a, b) =>
      new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime()
    )

    // Filter out dismissed events
    return [...sortedTasks, ...sortedUpcoming].filter(e => !dismissedIds.has(e.id))
  }, [events, dismissedIds])

  // Timeline items for vertical peek
  const timelineItems = useMemo(() => {
    const now = new Date()
    return events
      .filter(e => e.startTime && new Date(e.startTime) > now)
      .sort((a, b) => new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime())
      .slice(0, 10)
  }, [events])

  const currentItem = actionableItems[currentIndex]

  // Check if event is a task (has taskStatus) vs pure calendar event
  const isTask = (event: Event) => !!event.taskStatus

  const handleSwipe = useCallback((direction: "left" | "right") => {
    setExitDirection(direction)

    if (direction === "right" && currentItem) {
      if (isTask(currentItem)) {
        // Commit to task - mark as in progress
        onUpdateEvent?.({
          ...currentItem,
          taskStatus: 'IN_PROGRESS'
        })
      } else {
        // Pure calendar event - dismiss it from the feed
        setDismissedIds(prev => new Set([...prev, currentItem.id]))
      }
      // Boost momentum for committing (both tasks and events)
      setMomentum(prev => Math.min(100, prev + 15))
    } else if (direction === "left") {
      // Skip - small momentum decay
      setMomentum(prev => Math.max(0, prev - 5))
    }

    // Move to next after animation
    // Note: For dismissed items, the array shrinks so we stay at current index (which now points to next item)
    // For tasks that get IN_PROGRESS, they stay in array so we need to increment
    setTimeout(() => {
      if (direction === "right" && currentItem && !isTask(currentItem)) {
        // Dismissed - array shrinks, so current index now points to next item
        // Just clamp to valid range
        setCurrentIndex(prev => Math.min(prev, Math.max(0, actionableItems.length - 2)))
      } else {
        // Skipped or task started - move to next
        setCurrentIndex(prev =>
          prev + 1 >= actionableItems.length ? 0 : prev + 1
        )
      }
      setExitDirection(null)
    }, 200)
  }, [currentItem, actionableItems.length, onUpdateEvent])

  const handleComplete = useCallback(() => {
    if (!currentItem) return

    if (isTask(currentItem)) {
      // Mark task as done
      onUpdateEvent?.({
        ...currentItem,
        taskStatus: 'DONE',
        completedAt: new Date().toISOString()
      })
    } else {
      // For pure calendar events, dismiss from the feed
      setDismissedIds(prev => new Set([...prev, currentItem.id]))
    }

    // Big momentum boost for completion
    setMomentum(prev => Math.min(100, prev + 25))

    setExitDirection("right")
    setTimeout(() => {
      // Item is removed (either DONE or dismissed), array shrinks
      // Clamp index to valid range
      setCurrentIndex(prev => Math.min(prev, Math.max(0, actionableItems.length - 2)))
      setExitDirection(null)
    }, 200)
  }, [currentItem, actionableItems.length, onUpdateEvent])

  const getGoalForEvent = (event: Event) => {
    if (!event.goalId) return null
    return goals.find(g => g.id === event.goalId)
  }

  const formatEventTime = (event: Event) => {
    if (!event.startTime) return null
    const start = new Date(event.startTime)
    if (isToday(start)) return `Today at ${format(start, 'h:mm a')}`
    if (isTomorrow(start)) return `Tomorrow at ${format(start, 'h:mm a')}`
    return format(start, 'MMM d, h:mm a')
  }

  if (actionableItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">You're all caught up</h2>
            <p className="text-muted-foreground mt-1">No tasks waiting for your attention</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-background to-background/95">
      {/* Momentum indicator - subtle bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted/30 z-20">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${momentum}%` }}
          transition={{ type: "spring", stiffness: 100 }}
        />
      </div>

      {/* Main card area */}
      <div className="flex-1 flex items-center justify-center p-4 pt-8">
        <AnimatePresence mode="popLayout">
          {currentItem && (
            <SwipeableCard
              key={currentItem.id}
              event={currentItem}
              goal={getGoalForEvent(currentItem)}
              timeLabel={formatEventTime(currentItem)}
              onSwipe={handleSwipe}
              onComplete={handleComplete}
              exitDirection={exitDirection}
              totalItems={actionableItems.length}
              currentIndex={currentIndex}
              isTask={isTask(currentItem)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-6 space-y-4">
        {/* Swipe hints */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <SkipForward className="w-3 h-3" />
            <span>Swipe left to skip</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Swipe right to start</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Upcoming peek trigger */}
        <button
          onClick={() => setIsUpcomingOpen(!isUpcomingOpen)}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl",
            "bg-card/50 border border-border/50 transition-all",
            "hover:bg-card hover:border-border",
            isUpcomingOpen && "bg-card border-border"
          )}
        >
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {timelineItems.length} upcoming
          </span>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isUpcomingOpen && "rotate-180"
          )} />
        </button>
      </div>

      {/* Upcoming timeline peek (slides up from bottom) */}
      <AnimatePresence>
        {isUpcomingOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl max-h-[60%] overflow-hidden"
          >
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-medium">Coming up</h3>
              <button
                onClick={() => setIsUpcomingOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-auto p-4 space-y-2 max-h-[calc(60vh-60px)]">
              {timelineItems.map((event) => (
                <TimelineItem
                  key={event.id}
                  event={event}
                  goal={getGoalForEvent(event)}
                  onClick={() => onSelectEvent?.(event)}
                />
              ))}
              {timelineItems.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No upcoming events scheduled
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface SwipeableCardProps {
  event: Event
  goal: Goal | null
  timeLabel: string | null
  onSwipe: (direction: "left" | "right") => void
  onComplete: () => void
  exitDirection: "left" | "right" | null
  totalItems: number
  currentIndex: number
  isTask: boolean
}

function SwipeableCard({
  event,
  goal,
  timeLabel,
  onSwipe,
  onComplete,
  exitDirection,
  totalItems,
  currentIndex,
  isTask
}: SwipeableCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5])

  // Background color hints based on swipe direction
  const leftIndicatorOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0])
  const rightIndicatorOpacity = useTransform(x, [0, 50, 150], [0, 0.5, 1])

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info

    if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > VELOCITY_THRESHOLD) {
      onSwipe(offset.x > 0 ? "right" : "left")
    }
  }

  const priorityColors = {
    HIGH: "border-red-500/50 bg-red-500/5",
    MEDIUM: "border-yellow-500/50 bg-yellow-500/5",
    LOW: "border-blue-500/50 bg-blue-500/5"
  }

  const priorityBadgeColors = {
    HIGH: "bg-red-500/20 text-red-400",
    MEDIUM: "bg-yellow-500/20 text-yellow-400",
    LOW: "bg-blue-500/20 text-blue-400"
  }

  return (
    <div className="relative w-full max-w-sm">
      {/* Skip indicator (left) */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-orange-500/20 flex items-center justify-center"
        style={{ opacity: leftIndicatorOpacity }}
      >
        <SkipForward className="w-12 h-12 text-orange-500" />
      </motion.div>

      {/* Start indicator (right) */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-green-500/20 flex items-center justify-center"
        style={{ opacity: rightIndicatorOpacity }}
      >
        <Play className="w-12 h-12 text-green-500" />
      </motion.div>

      {/* Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDragEnd={handleDragEnd}
        style={{ x, rotate, opacity }}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          x: exitDirection === "left" ? -300 : exitDirection === "right" ? 300 : 0
        }}
        exit={{
          scale: 0.9,
          opacity: 0,
          x: exitDirection === "left" ? -300 : 300
        }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className={cn(
          "relative w-full p-6 rounded-2xl border-2 bg-card cursor-grab active:cursor-grabbing",
          "shadow-lg hover:shadow-xl transition-shadow",
          priorityColors[event.priority]
        )}
      >
        {/* Card count indicator */}
        <div className="absolute top-4 right-4 text-xs text-muted-foreground">
          {currentIndex + 1} / {totalItems}
        </div>

        {/* Type + Priority badges */}
        <div className="flex items-center gap-2 mb-4">
          {isTask ? (
            <div className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              priorityBadgeColors[event.priority]
            )}>
              <Zap className="w-3 h-3" />
              {event.priority}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
              <Calendar className="w-3 h-3" />
              Event
            </div>
          )}
        </div>

        {/* Goal context */}
        {goal && (
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: goal.color || '#6366f1' }}
            />
            <span className="text-xs text-muted-foreground">{goal.title}</span>
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl font-semibold mb-2 pr-8">{event.title}</h2>

        {/* Description */}
        {event.description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Time label if scheduled */}
        {timeLabel && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Clock className="w-4 h-4" />
            {timeLabel}
          </div>
        )}

        {/* Quick complete/dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onComplete()
          }}
          className={cn(
            "w-full mt-4 py-3 rounded-xl font-medium transition-all",
            "flex items-center justify-center gap-2",
            isTask
              ? "bg-green-500/20 text-green-500 hover:bg-green-500/30"
              : "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
          )}
        >
          <CheckCircle2 className="w-5 h-5" />
          {isTask ? "Mark Complete" : "Dismiss"}
        </button>
      </motion.div>
    </div>
  )
}

interface TimelineItemProps {
  event: Event
  goal: Goal | null
  onClick?: () => void
}

function TimelineItem({ event, goal, onClick }: TimelineItemProps) {
  const startTime = event.startTime ? new Date(event.startTime) : null

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
        "hover:bg-muted/50 border border-transparent hover:border-border/50"
      )}
    >
      {/* Time */}
      <div className="w-16 text-xs text-muted-foreground shrink-0">
        {startTime && (
          <>
            <div className="font-medium">
              {isToday(startTime) ? 'Today' : isTomorrow(startTime) ? 'Tomorrow' : format(startTime, 'MMM d')}
            </div>
            <div>{format(startTime, 'h:mm a')}</div>
          </>
        )}
      </div>

      {/* Color indicator */}
      <div
        className="w-1 h-10 rounded-full shrink-0"
        style={{ backgroundColor: event.color || goal?.color || '#6366f1' }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{event.title}</div>
        {goal && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Target className="w-3 h-3" />
            {goal.title}
          </div>
        )}
      </div>
    </button>
  )
}
