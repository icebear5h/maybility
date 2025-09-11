import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Create a test user (you can modify this based on your auth setup)
  const testUser = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
    },
  })

  console.log("👤 Created test user:", testUser.email)

  const journalFolder = await prisma.journalFolder.create({
    data: {
      name: "journal",
      userId: testUser.id,
    },
  })

  const ideasFolder = await prisma.journalFolder.create({
    data: {
      name: "ideas",
      userId: testUser.id,
    },
  })

  const projectsFolder = await prisma.journalFolder.create({
    data: {
      name: "projects",
      userId: testUser.id,
    },
  })

  // Create sample journal entries
  const journalEntries = await Promise.all([
    prisma.journalEntry.create({
      data: {
        title: "2025-08-14 Journal.md",
        content: `# Today's Reflection

What a productive day! I managed to complete the project proposal and had a great meeting with the team. The new authentication system is working perfectly.

## Key Accomplishments
- Finished project proposal
- Team meeting went well
- Authentication system deployed

## Tomorrow's Goals
- Review code changes
- Plan next sprint`,
        folderId: journalFolder.id,
        userId: testUser.id,
      },
    }),
    prisma.journalEntry.create({
      data: {
        title: "Mobile App Concept.md",
        content: `# App Idea: Daily Habit Tracker

Concept: A minimalist habit tracking app that focuses on simplicity and motivation.

## Features
- Simple habit creation
- Visual progress tracking
- Motivational quotes
- Data export functionality

## Technical Requirements
- React Native for cross-platform
- Local storage with cloud sync
- Push notifications
- Authentication system`,
        folderId: ideasFolder.id,
        userId: testUser.id,
      },
    }),
    prisma.journalEntry.create({
      data: {
        title: "2025 Goals.md",
        content: `# 2025 Annual Goals

## Professional
- Launch new product with robust authentication
- Improve project management skills
- Lead a major technical initiative

## Personal
- Read 24 books this year
- Establish consistent morning routine
- Learn a new programming language

## Health
- Exercise 4 times per week
- Meditate daily
- Improve sleep schedule`,
        folderId: projectsFolder.id,
        userId: testUser.id,
      },
    }),
  ])

  console.log(`📝 Created ${journalEntries.length} journal entries`)

  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: "Review quarterly reports",
        priority: "HIGH",
        estimatedDuration: 120,
        userId: testUser.id,
      },
    }),
    prisma.task.create({
      data: {
        title: "Update project documentation",
        priority: "MEDIUM",
        estimatedDuration: 180,
        userId: testUser.id,
      },
    }),
    prisma.task.create({
      data: {
        title: "Call insurance company",
        priority: "LOW",
        userId: testUser.id,
      },
    }),
    prisma.task.create({
      data: {
        title: "Buy groceries",
        status: "DONE",
        userId: testUser.id,
      },
    }),
    prisma.task.create({
      data: {
        title: "Team Meeting",
        scheduledDate: new Date("2025-08-04"),
        startTime: "09:00",
        endTime: "10:30",
        color: "#1e40af",
        userId: testUser.id,
      },
    }),
    prisma.task.create({
      data: {
        title: "Project Review",
        scheduledDate: new Date("2025-08-06"),
        startTime: "14:15",
        endTime: "15:45",
        color: "#16a34a",
        userId: testUser.id,
      },
    }),
    prisma.task.create({
      data: {
        title: "Client Call",
        scheduledDate: new Date("2025-08-06"),
        startTime: "16:30",
        endTime: "17:00",
        color: "#dc2626",
        userId: testUser.id,
      },
    }),
  ])

  console.log(`✅ Created ${tasks.length} tasks`)

  const updates = await Promise.all([
    prisma.update.create({
      data: {
        kind: "REFLECTION",
        body: "Made great progress on the authentication system today. The new JWT implementation is much more secure.",
        userId: testUser.id,
      },
    }),
    prisma.update.create({
      data: {
        kind: "MILESTONE",
        body: "Successfully completed the quarterly review process. All metrics are looking positive.",
        userId: testUser.id,
      },
    }),
  ])

  console.log(`📝 Created ${updates.length} updates`)

  console.log("✅ Seeding completed!")
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
