import { prisma } from '@/lib/prisma';
import { PlatformServiceFactory } from '../platforms/platformServices';

export class MetricsService {
  /**
   * Collect and store hourly metric snapshots
   */
  async collectHourlySnapshots() {
    console.log('Collecting hourly metric snapshots...');

    const uploads = await prisma.upload.findMany({
      where: {
        status: 'published',
      },
    });

    const now = new Date();
    console.log(now);

    // use UTC-aligned hour buckets for consistency across servers/clients
    const startOfHour = new Date(now);
    startOfHour.setMinutes(0, 0, 0);
    startOfHour.setUTCMilliseconds(0);

    const currentHour = startOfHour.getUTCHours();
    const year = startOfHour.getUTCFullYear();

    const dayOfYear = Math.floor(
      (startOfHour.getTime() - Date.UTC(year, 0, 0)) / (1000 * 60 * 60 * 24)
    );

    for (const upload of uploads) {
      try {
        const platformService = PlatformServiceFactory.createService(
          upload.platform
        );
        const metrics = await platformService.getVideoMetrics(
          upload.platformId
        );

        //transaction per-upload to keep read+write consistent
        await prisma.$transaction(async (tx) => {
          // baseline: last snapshot STRICTLY before this hour's start
          const lastBefore = await tx.metricSnapshot.findFirst({
            where: {
              uploadId: upload.id,
              timestamp: { lt: startOfHour },
            },
            orderBy: {
              timestamp: 'desc',
            },
          });

          const baselineViews = lastBefore ? lastBefore.views : 0;
          const baselineLikes = lastBefore ? lastBefore.likes : 0;
          const baselineComments = lastBefore ? lastBefore.comments : 0;
          const baselineShares = lastBefore ? lastBefore.shares : 0;

          // compute deltas relative to baseline (treat negative as reset -> use current)
          const computeDelta = (cur: number, base: number) => {
            const diff = cur - base;
            return diff >= 0 ? diff : cur; // if counter reset, count cur as delta
          };

          const viewsDelta = computeDelta(metrics.views ?? 0, baselineViews);
          const likesDelta = computeDelta(metrics.likes ?? 0, baselineLikes);
          const commentsDelta = computeDelta(
            metrics.comments ?? 0,
            baselineComments
          );
          const sharesDelta = computeDelta(metrics.shares ?? 0, baselineShares);

          // check if a snapshot for this upload/hour already exists
          const existingSnapshot = await tx.metricSnapshot.findFirst({
            where: {
              uploadId: upload.id,
              year,
              dayOfYear,
              hour: currentHour,
            },
          });

          if (!existingSnapshot) {
            // create a single snapshot for this hour
            await tx.metricSnapshot.create({
              data: {
                uploadId: upload.id,
                views: metrics.views ?? 0,
                likes: metrics.likes ?? 0,
                comments: metrics.comments ?? 0,
                shares: metrics.shares ?? 0,
                viewsDelta,
                likesDelta,
                commentsDelta,
                sharesDelta,
                timestamp: now, // store actual capture time
                hour: currentHour,
                dayOfYear,
                year,
              },
            });
            console.log(
              `✓ Created snapshot for upload ${upload.id} (hour ${currentHour} UTC)`
            );
          } else {
            // update the existing hour snapshot with the new cumulative and recomputed delta
            await tx.metricSnapshot.update({
              where: { id: existingSnapshot.id },
              data: {
                views: metrics.views ?? 0,
                likes: metrics.likes ?? 0,
                comments: metrics.comments ?? 0,
                shares: metrics.shares ?? 0,
                viewsDelta,
                likesDelta,
                commentsDelta,
                sharesDelta,
                timestamp: now,
              },
            });
            console.log(
              `↻ Updated snapshot for upload ${upload.id} (hour ${currentHour} UTC)`
            );
          }
        }); // end transaction
      } catch (error) {
        console.error(
          `Failed to collect metrics for upload ${upload.id}:`,
          error
        );
      }
    }

    console.log('Hourly snapshot collection completed');
  }

  /**
   * Get metrics for visualization based on time range
   */
  async getMetricsForTimeRange(
    uploadId: string,
    range: 'today' | 'week' | 'month'
  ) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentDayOfYear = Math.floor(
      (now.getTime() - new Date(currentYear, 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    let whereClause = '';
    let params: any[] = [uploadId];

    switch (range) {
      case 'today':
        whereClause = `
          WHERE "uploadId" = $1 
          AND year = $2 
          AND "dayOfYear" = $3
        `;
        params.push(currentYear, currentDayOfYear);
        break;
      case 'week':
        whereClause = `
          WHERE "uploadId" = $1 
          AND year = $2 
          AND "dayOfYear" >= $3 
          AND "dayOfYear" <= $4
        `;
        params.push(currentYear, currentDayOfYear - 7, currentDayOfYear);
        break;
      case 'month':
        whereClause = `
          WHERE "uploadId" = $1 
          AND year = $2 
          AND "dayOfYear" >= $3 
          AND "dayOfYear" <= $4
        `;
        params.push(currentYear, currentDayOfYear - 30, currentDayOfYear);
        break;
    }

    const snapshots = await prisma.$queryRaw`
      SELECT timestamp, views, likes, comments, shares
      FROM metric_snapshots 
      ${prisma.$queryRawUnsafe(whereClause, ...params)}
      ORDER BY timestamp ASC
    `;

    return snapshots;
  }

  /**
   * Get aggregated metrics for dashboard
   */
  async getAggregatedMetrics(
    uploadId: string,
    range: 'today' | 'week' | 'month'
  ) {
    const snapshots = await this.getMetricsForTimeRange(uploadId, range);

    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        growth: {
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
        },
      };
    }

    const latest = snapshots[snapshots.length - 1] as any;
    const earliest = snapshots[0] as any;

    return {
      totalViews: latest.views,
      totalLikes: latest.likes,
      totalComments: latest.comments,
      totalShares: latest.shares,
      growth: {
        views: latest.views - earliest.views,
        likes: latest.likes - earliest.likes,
        comments: latest.comments - earliest.comments,
        shares: latest.shares - earliest.shares,
      },
    };
  }

  /**
   * Clean up old metric snapshots (older than 30 days)
   */
  async cleanupOldSnapshots() {
    console.log('Cleaning up old metric snapshots...');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
      const result = await prisma.$executeRaw`
        DELETE FROM metric_snapshots 
        WHERE timestamp < ${thirtyDaysAgo}
      `;

      console.log(`✓ Deleted old metric snapshots`);
      return result;
    } catch (error) {
      console.error('Failed to cleanup old snapshots:', error);
      throw error;
    }
  }

  /**
   * Get metric snapshots count for monitoring
   */
  async getSnapshotStats() {
    const totalSnapshots = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM metric_snapshots
    `;

    const snapshotsToday = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM metric_snapshots 
      WHERE DATE(timestamp) = CURRENT_DATE
    `;

    const oldestSnapshot = await prisma.$queryRaw`
      SELECT timestamp FROM metric_snapshots 
      ORDER BY timestamp ASC 
      LIMIT 1
    `;

    return {
      total: totalSnapshots,
      today: snapshotsToday,
      oldest: oldestSnapshot,
    };
  }
}
