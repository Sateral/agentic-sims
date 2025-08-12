import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { prisma } from '@/lib/prisma';

export const dashboardRouter = createTRPCRouter({
  getStats: baseProcedure.query(async () => {
    const [totalVideos, totalUploads, todayUploads, avgViews] =
      await Promise.all([
        prisma.video.count(),
        prisma.upload.count(),
        prisma.upload.count({
          where: {
            uploadedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.metric.aggregate({
          _avg: { views: true },
        }),
      ]);

    return {
      totalVideos,
      totalUploads,
      todayUploads,
      avgViews: avgViews._avg.views || 0,
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
          metrics: true,
        },
        orderBy: { uploadedAt: 'desc' },
      });
    }),

  getMetricsOverTime: baseProcedure
    .input(
      z.object({
        days: z.number().default(30),
        platform: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      return await prisma.metric.findMany({
        where: {
          updatedAt: { gte: startDate },
          ...(input.platform && {
            upload: { platform: input.platform },
          }),
        },
        include: {
          upload: true,
        },
        orderBy: { updatedAt: 'asc' },
      });
    }),
});
