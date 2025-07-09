import type React from "react"
import "./globals.css" // Make sure this path is correct for your new project structure
import { Inter } from "next/font/google"
import SessionWrapper from "@/components/auth/client-session-wrapper" // Important for client-side session access
import { Navbar } from "@/components/navbar"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Journal & AI Chat",
  description: "Personal journaling with AI-powered conversations",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionWrapper>
          <Navbar />
          {children}
        </SessionWrapper>
      </body>
    </html>
  )
}
