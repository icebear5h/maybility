import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/settings - Fetch user settings (creates defaults if none exist)
export async function GET() {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    })

    // Create default settings if none exist
    if (!settings) {
      // Ensure user exists first
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: session?.user?.email ?? "",
          name: session?.user?.name,
          image: session?.user?.image,
        },
      })

      settings = await prisma.userSettings.create({
        data: {
          userId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()

    // Remove fields that shouldn't be updated directly
    delete data.id
    delete data.userId
    delete data.createdAt
    delete data.updatedAt

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
