-- AlterTable
ALTER TABLE "public"."metric_snapshots" ADD COLUMN     "commentsDelta" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "likesDelta" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sharesDelta" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewsDelta" INTEGER NOT NULL DEFAULT 0;
