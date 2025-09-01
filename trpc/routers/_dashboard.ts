import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { prisma } from '@/lib/prisma';

export const dashboardRouter = createTRPCRouter({
  getStats: baseProcedure.query(async () => {
    const [
      totalVideos,
      totalUploads,
      todayUploads,
      avgViews,
      totalViews,
      totalLikes,
      platformStats,
    ] = await Promise.all([
      prisma.video.count(),
      prisma.upload.count(),
      prisma.upload.count({
        where: {
          uploadedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.metricSnapshot.aggregate({
        _avg: { viewsDelta: true },
      }),
      prisma.metricSnapshot.aggregate({
        _sum: { viewsDelta: true },
      }),
      prisma.metricSnapshot.aggregate({
        _sum: { likesDelta: true },
      }),
      prisma.upload.groupBy({
        by: ['platform'],
        _count: { _all: true },
      }),
    ]);

    return {
      totalVideos,
      totalUploads,
      todayUploads,
      avgViews: Math.round(avgViews._avg.viewsDelta || 0),
      totalViews: totalViews._sum.viewsDelta || 0,
      totalLikes: totalLikes._sum.likesDelta || 0,
      platformStats: platformStats.map((stat) => ({
        platform: stat.platform,
        count: stat._count._all,
      })),
    };
  }),

  getRecentUploads: baseProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      return await prisma.upload.findMany({
        take: input.limit,
        include: {
          video: {
            include: { simulation: true },
          },
          metricSnapshots: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
        orderBy: { uploadedAt: 'desc' },
      });
    }),

  getMetricsOverTime: baseProcedure
    .input(
      z.object({
        days: z.number().default(30),
        platform: z.string().optional(),
        metric: z
          .enum(['views', 'likes', 'comments', 'shares'])
          .default('views'),
      })
    )
    .query(async ({ input }) => {
      try {
        const now = new Date();
        const cutOffDate = new Date(
          Date.now() - input.days * 24 * 60 * 60 * 1000
        );
        const deltaField = `${input.metric}Delta`; // e.g. "viewsDelta"

        // fetch snapshots in range
        const metrics = await prisma.metricSnapshot.findMany({
          where: {
            timestamp: { gte: cutOffDate },
            ...(input.platform && { upload: { platform: input.platform } }),
          },
          include: { upload: { select: { platform: true, uploadedAt: true } } },
          orderBy: { timestamp: 'asc' },
        });

        // Decide granularity
        const useHourly = input.days <= 1;

        // bucket key helper
        const getBucketKey = (d: Date) => {
          const dt = new Date(d);
          if (useHourly) {
            dt.setMinutes(0, 0, 0);
            dt.setSeconds(0, 0);
            dt.setMilliseconds(0);
            return dt.toISOString(); // "2025-08-19T13:00:00.000Z"
          } else {
            dt.setHours(0, 0, 0, 0);
            return dt.toISOString().split('T')[0]; // "2025-08-19"
          }
        };

        // prepare buckets (guarantee we have every bucket)
        const buckets: Record<
          string,
          { date: string; value: number; count: number }
        > = {};
        const iter = new Date(cutOffDate);
        if (useHourly) {
          iter.setMinutes(0, 0, 0);
          iter.setSeconds(0, 0);
          iter.setMilliseconds(0);
          while (iter <= now) {
            const key = getBucketKey(iter);
            buckets[key] = { date: key, value: 0, count: 0 };
            iter.setHours(iter.getHours() + 1);
          }
        } else {
          iter.setHours(0, 0, 0, 0);
          while (iter <= now) {
            const key = getBucketKey(iter);
            buckets[key] = { date: key, value: 0, count: 0 };
            iter.setDate(iter.getDate() + 1);
          }
        }

        // If no snapshots were returned, return the empty-but-populated buckets array
        if (!metrics || metrics.length === 0) {
          console.debug(
            '[getMetricsOverTime] no snapshots found; returning empty buckets',
            {
              days: input.days,
              platform: input.platform,
              metric: input.metric,
            }
          );
          return Object.values(buckets).sort((a, b) =>
            a.date < b.date ? -1 : 1
          );
        }

        // fast-path: all snapshots already have delta field
        const allHaveDelta =
          metrics.length > 0 &&
          metrics.every((m) => typeof (m as any)[deltaField] === 'number');

        if (allHaveDelta) {
          for (const m of metrics) {
            const key = getBucketKey(new Date(m.timestamp));
            if (!buckets[key]) buckets[key] = { date: key, value: 0, count: 0 };
            buckets[key].value += (m as any)[deltaField] ?? 0;
            buckets[key].count += 1;
          }
          return Object.values(buckets).sort((a, b) =>
            a.date < b.date ? -1 : 1
          );
        }

        // fallback: compute deltas per upload for snapshots missing deltas
        const byUpload = metrics.reduce<Record<string, typeof metrics>>(
          (acc, s) => {
            (acc[s.uploadId] ||= []).push(s);
            return acc;
          },
          {}
        );

        const uploadIds = Object.keys(byUpload);
        const beforeMap: Record<string, any | null> = {};

        // fetch the last snapshot before cutoff for each upload
        await Promise.all(
          uploadIds.map(async (uid) => {
            const lastBefore = await prisma.metricSnapshot.findFirst({
              where: { uploadId: uid, timestamp: { lt: cutOffDate } },
              orderBy: { timestamp: 'desc' },
            });
            beforeMap[uid] = lastBefore ?? null;
          })
        );

        // compute per-upload deltas and bucket them
        for (const [uploadId, snaps] of Object.entries(byUpload)) {
          snaps.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          let prev = beforeMap[uploadId]
            ? (beforeMap[uploadId] as any)[input.metric] ?? 0
            : 0;

          for (const s of snaps) {
            const cur = (s as any)[input.metric] ?? 0;
            let delta: number;

            if (typeof (s as any)[deltaField] === 'number') {
              delta = (s as any)[deltaField];
            } else {
              delta = cur - prev;
              if (delta < 0) {
                // treat as counter reset; count the current value as the increment
                delta = cur;
              }
            }

            prev = cur;
            const key = getBucketKey(new Date(s.timestamp));
            if (!buckets[key]) buckets[key] = { date: key, value: 0, count: 0 };
            buckets[key].value += delta;
            buckets[key].count += 1;
          }
        }

        return Object.values(buckets).sort((a, b) =>
          a.date < b.date ? -1 : 1
        );
      } catch (err) {
        // log error and rethrow a readable error for the client
        console.error('[getMetricsOverTime] error', {
          error: err,
          input,
        });
        // Ensure we don't return undefined; rethrow a tRPC-friendly error
        throw new Error(
          'Failed to compute metrics over time. See server logs for details.'
        );
      }
    }),

  getPlatformComparison: baseProcedure.query(async () => {
    const platforms = await prisma.upload.groupBy({
      by: ['platform'],
      _count: { _all: true },
    });

    const platformMetrics = await Promise.all(
      platforms.map(async (platform) => {
        const metrics = await prisma.metricSnapshot.aggregate({
          where: {
            upload: { platform: platform.platform },
          },
          _avg: { views: true, likes: true, comments: true, shares: true },
          _sum: { views: true, likes: true, comments: true, shares: true },
        });

        return {
          platform: platform.platform,
          count: platform._count._all,
          avgViews: Math.round(metrics._avg.views || 0),
          avgLikes: Math.round(metrics._avg.likes || 0),
          avgComments: Math.round(metrics._avg.comments || 0),
          avgShares: Math.round(metrics._avg.shares || 0),
          totalViews: metrics._sum.views || 0,
          totalLikes: metrics._sum.likes || 0,
          totalComments: metrics._sum.comments || 0,
          totalShares: metrics._sum.shares || 0,
        };
      })
    );

    return platformMetrics;
  }),

  getTopPerformingVideos: baseProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        platform: z.string().optional(),
        sortBy: z
          .enum(['views', 'likes', 'comments', 'shares'])
          .default('views'),
        timeframe: z.enum(['day', 'week', 'month', 'all']).default('all'),
      })
    )
    .query(async ({ input }) => {
      let dateFilter = {};

      if (input.timeframe !== 'all') {
        const now = new Date();
        const timeframes = {
          day: 1,
          week: 7,
          month: 30,
        };
        const daysAgo = timeframes[input.timeframe];
        const startDate = new Date(
          now.getTime() - daysAgo * 24 * 60 * 60 * 1000
        );
        dateFilter = { uploadedAt: { gte: startDate } };
      }

      const uploads = await prisma.upload.findMany({
        where: {
          ...dateFilter,
          ...(input.platform && { platform: input.platform }),
        },
        include: {
          video: {
            include: { simulation: true },
          },
          metricSnapshots: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      // Sort by the selected metric
      const sorted = uploads
        .filter((upload) => upload.metricSnapshots.length > 0)
        .sort((a, b) => {
          const aValue = a.metricSnapshots[0]?.[input.sortBy] || 0;
          const bValue = b.metricSnapshots[0]?.[input.sortBy] || 0;
          return bValue - aValue;
        })
        .slice(0, input.limit);

      return sorted;
    }),

  getSimulationTypePerformance: baseProcedure.query(async () => {
    const simulations = await prisma.simulation.findMany({
      include: {
        videos: {
          include: {
            uploads: {
              include: {
                metrics: {
                  orderBy: { updatedAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const typeMetrics = simulations.reduce((acc, sim) => {
      const type = sim.type;
      if (!acc[type]) {
        acc[type] = {
          type,
          videoCount: 0,
          uploadCount: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          avgScore: 0,
          scoreCount: 0,
        };
      }

      acc[type].videoCount += sim.videos.length;

      sim.videos.forEach((video) => {
        if (video.aiScore) {
          acc[type].avgScore += video.aiScore;
          acc[type].scoreCount += 1;
        }

        video.uploads.forEach((upload) => {
          acc[type].uploadCount += 1;
          if (upload.metrics.length > 0) {
            const metric = upload.metrics[0];
            acc[type].totalViews += metric.views;
            acc[type].totalLikes += metric.likes;
            acc[type].totalComments += metric.comments;
            acc[type].totalShares += metric.shares;
          }
        });
      });

      if (acc[type].scoreCount > 0) {
        acc[type].avgScore = acc[type].avgScore / acc[type].scoreCount;
      }

      return acc;
    }, {} as Record<string, any>);

    return Object.values(typeMetrics);
  }),

  getMetricsTrend: baseProcedure
    .input(
      z.object({
        days: z.number().default(7),
        platform: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - input.days * 24 * 60 * 60 * 1000
      );

      const metrics = await prisma.metric.findMany({
        where: {
          updatedAt: { gte: startDate, lte: endDate },
          ...(input.platform && {
            upload: { platform: input.platform },
          }),
        },
        include: {
          upload: true,
        },
        orderBy: { updatedAt: 'asc' },
      });

      // Group by day and calculate daily totals
      const dailyMetrics = metrics.reduce((acc, metric) => {
        const day = metric.updatedAt.toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = {
            date: day,
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            uploads: new Set(),
          };
        }
        acc[day].views += metric.views;
        acc[day].likes += metric.likes;
        acc[day].comments += metric.comments;
        acc[day].shares += metric.shares;
        acc[day].uploads.add(metric.uploadId);
        return acc;
      }, {} as Record<string, any>);

      // Convert to array and add upload count
      return Object.values(dailyMetrics).map((day: any) => ({
        ...day,
        uploadCount: day.uploads.size,
        uploads: undefined, // Remove the Set
      }));
    }),
});
