/*
  Warnings:

  - You are about to drop the column `originalStart` on the `recurring_overrides` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `tasks` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventId]` on the table `recurring_exceptions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eventId]` on the table `recurring_overrides` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `endTime` to the `tasks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."recurring_exceptions_eventId_originalStart_key";

-- DropIndex
DROP INDEX "public"."recurring_overrides_eventId_originalStart_key";

-- AlterTable
ALTER TABLE "recurring_overrides" DROP COLUMN "originalStart";

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "endDate",
DROP COLUMN "startDate",
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "recurring_exceptions_eventId_key" ON "recurring_exceptions"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_overrides_eventId_key" ON "recurring_overrides"("eventId");
