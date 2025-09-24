/*
  Warnings:

  - You are about to drop the column `date` on the `tasks` table. All the data in the column will be lost.
  - Added the required column `dtstart` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."tasks" DROP COLUMN "date",
ADD COLUMN     "dtstart" TIMESTAMP(3) NOT NULL;
