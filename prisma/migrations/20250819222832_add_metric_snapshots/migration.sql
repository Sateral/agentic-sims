-- CreateTable
CREATE TABLE "public"."metric_snapshots" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hour" INTEGER NOT NULL,
    "dayOfYear" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "metric_snapshots_uploadId_year_dayOfYear_hour_idx" ON "public"."metric_snapshots"("uploadId", "year", "dayOfYear", "hour");

-- CreateIndex
CREATE INDEX "metric_snapshots_timestamp_idx" ON "public"."metric_snapshots"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "metric_snapshots_uploadId_timestamp_key" ON "public"."metric_snapshots"("uploadId", "timestamp");

-- AddForeignKey
ALTER TABLE "public"."metric_snapshots" ADD CONSTRAINT "metric_snapshots_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "public"."uploads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
