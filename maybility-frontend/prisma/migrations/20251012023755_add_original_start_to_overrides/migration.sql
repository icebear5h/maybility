/*
  Warnings:

  - A unique constraint covering the columns `[eventId,originalStart]` on the table `recurring_exceptions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eventId,originalStart]` on the table `recurring_overrides` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `originalStart` to the `recurring_overrides` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."recurring_exceptions_eventId_key";

-- DropIndex
DROP INDEX "public"."recurring_overrides_eventId_key";

-- AlterTable
ALTER TABLE "recurring_overrides" ADD COLUMN     "originalStart" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "recurring_exceptions_eventId_originalStart_key" ON "recurring_exceptions"("eventId", "originalStart");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_overrides_eventId_originalStart_key" ON "recurring_overrides"("eventId", "originalStart");
