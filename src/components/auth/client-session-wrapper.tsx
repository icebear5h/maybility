"use client"

import type React from "react"
import { SessionProvider } from "next-auth/react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface SessionWrapperProps {
  children: React.ReactNode
}

function AuthCheck({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Return children by default to match server-side rendering
  if (status === 'loading' || !session) {
    return children
  }

  return children
}

export function SessionWrapper({ children }: SessionWrapperProps) {
  return (
    <SessionProvider>
      <AuthCheck>{children}</AuthCheck>
    </SessionProvider>
  )
}

export default SessionWrapper