import type React from "react"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <main className="min-h-screen bg-background pt-4">{children}</main>
}
