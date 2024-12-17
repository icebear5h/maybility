/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `entry` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `speaker` on the `Conversation` table. All the data in the column will be lost.
  - Added the required column `title` to the `Conversation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "createdAt",
DROP COLUMN "entry",
DROP COLUMN "speaker",
ADD COLUMN     "title" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Speaker";

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
