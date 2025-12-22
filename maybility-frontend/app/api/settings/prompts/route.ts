import { NextResponse } from "next/server"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// GET /api/settings/prompts - Fetch default prompts from FastAPI
export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/prompts`, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`FastAPI returned ${response.status}`)
    }

    const prompts = await response.json()
    return NextResponse.json(prompts)
  } catch (error) {
    console.error("Error fetching prompts:", error)
    // Return empty object if FastAPI is unavailable
    return NextResponse.json({
      router: "",
      simple_responder: "",
      orchestrator: "",
      synthesizer: "",
      set_tasks: "",
    })
  }
}
