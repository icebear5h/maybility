"use client"

import { useState, useEffect } from "react"
import { GoalWithDetails } from "@//types/goal-types"

export function useGoals(options: UseGoalsOptions = {}) {
  const [goals, setGoals] = useState<GoalWithDetails[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = async () => {
    try {
      setIsLoading(true)

      let filteredGoals = MOCK_GOALS

      if (options.archived !== undefined) {
        filteredGoals = MOCK_GOALS.filter((goal) => goal.archived === options.archived)
      }

      await new Promise((resolve) => setTimeout(resolve, 100))

      setGoals(filteredGoals)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setGoals(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [options.archived])

  return {
    goals,
    isLoading,
    error,
    refetch: fetchGoals,
  }
}
