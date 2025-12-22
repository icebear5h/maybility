import { prisma } from "./prisma"

export async function ensureUserDefaultFolders(userId: string) {
  // Check if user already has folders
  const existingFolders = await prisma.folder.findMany({
    where: { userId },
  })

  if (existingFolders.length > 0) {
    return existingFolders
  }

  // Create default root folder
  const rootFolder = await prisma.folder.create({
    data: {
      name: "All Entries",
      userId,
      isRoot: true,
    },
  })

  return [rootFolder]
}
