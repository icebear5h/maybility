import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Get query parameter to determine what data to return
    const { searchParams } = new URL(request.url)
    const field = searchParams.get('field') // e.g., ?field=timezone
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        timezone: true,
        email: true,
        name: true
      }
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Return specific field if requested
    if (field === 'timezone') {
      return NextResponse.json({ timezone: user.timezone })
    }
    
    // Return all user data by default
    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user data:", error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 })
  }
}
