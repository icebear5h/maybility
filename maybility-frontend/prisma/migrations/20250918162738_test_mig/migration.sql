/*
  Warnings:

  - You are about to drop the column `dueDate` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedDuration` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledDate` on the `tasks` table. All the data in the column will be lost.
  - Added the required column `date` to the `tasks` table without a default value. This is not possible if the table is not empty.
  - Made the column `startTime` on table `tasks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `endTime` on table `tasks` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."OccurrenceType" AS ENUM ('SINGLE', 'RRULE', 'UNSCHEDULED');

-- AlterTable
ALTER TABLE "public"."tasks" DROP COLUMN "dueDate",
DROP COLUMN "estimatedDuration",
DROP COLUMN "scheduledDate",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "occurrenceType" "public"."OccurrenceType" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN     "rrule" TEXT,
ADD COLUMN     "timezone" TEXT,
ALTER COLUMN "startTime" SET NOT NULL,
ALTER COLUMN "endTime" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "timezone" TEXT;

-- CreateTable
CREATE TABLE "public"."recurring_exceptions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "originalStart" TIMESTAMP(3) NOT NULL,
    "isCancelled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recurring_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recurring_overrides" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "originalStart" TIMESTAMP(3) NOT NULL,
    "newStart" TIMESTAMP(3),
    "newEnd" TIMESTAMP(3),
    "title" TEXT,
    "description" TEXT,
    "status" "public"."TaskStatus",

    CONSTRAINT "recurring_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recurring_exceptions_eventId_originalStart_key" ON "public"."recurring_exceptions"("eventId", "originalStart");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_overrides_eventId_originalStart_key" ON "public"."recurring_overrides"("eventId", "originalStart");

-- CreateIndex
CREATE INDEX "tasks_userId_idx" ON "public"."tasks"("userId");

-- AddForeignKey
ALTER TABLE "public"."recurring_exceptions" ADD CONSTRAINT "recurring_exceptions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recurring_overrides" ADD CONSTRAINT "recurring_overrides_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
