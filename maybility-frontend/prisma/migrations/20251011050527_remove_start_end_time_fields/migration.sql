/*
  Warnings:

  - You are about to drop the column `dtstart` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `tasks` table. All the data in the column will be lost.
  - Added the required column `startDate` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "dtstart",
DROP COLUMN "endTime",
DROP COLUMN "startTime",
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;
