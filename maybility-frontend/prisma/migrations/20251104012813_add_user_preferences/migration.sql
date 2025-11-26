-- CreateEnum
CREATE TYPE "CalendarType" AS ENUM ('GOOGLE', 'INTERNAL');

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "endTime" DROP NOT NULL,
ALTER COLUMN "startTime" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "calendarType" "CalendarType" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "preferences" JSONB;
