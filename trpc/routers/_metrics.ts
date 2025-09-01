import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { UploadAgent } from '@/services/ai/workflow';
import { MetricsService } from '@/services/metrics/metricsService';

const uploadAgent = new UploadAgent();
const metricsService = new MetricsService();

export const metricsRouter = createTRPCRouter({
  // Collect hourly metrics snapshots
  collectMetrics: baseProcedure.mutation(async () => {
    await uploadAgent.syncMetrics();
    return {
      success: true,
      message: 'Metrics collected successfully',
      timestamp: new Date().toISOString(),
    };
  }),

  // Get metrics for time range visualization
  getTimeRangeMetrics: baseProcedure
    .input(
      z.object({
        uploadId: z.string(),
        range: z.enum(['today', 'week', 'month']).default('today'),
      })
    )
    .query(async ({ input }) => {
      const data = await uploadAgent.getMetricsForTimeRange(
        input.uploadId,
        input.range
      );
      return {
        uploadId: input.uploadId,
        range: input.range,
        data,
      };
    }),

  // Get aggregated metrics for dashboard
  getAggregatedMetrics: baseProcedure
    .input(
      z.object({
        uploadId: z.string(),
        range: z.enum(['today', 'week', 'month']).default('today'),
      })
    )
    .query(async ({ input }) => {
      const data = await uploadAgent.getAggregatedMetrics(
        input.uploadId,
        input.range
      );
      return {
        uploadId: input.uploadId,
        range: input.range,
        ...data,
      };
    }),

  // Get system statistics about metric snapshots
  getSnapshotStats: baseProcedure.query(async () => {
    const stats = await metricsService.getSnapshotStats();
    return {
      ...stats,
      lastUpdated: new Date().toISOString(),
    };
  }),

  // Clean up old snapshots manually
  cleanupOldSnapshots: baseProcedure.mutation(async () => {
    await metricsService.cleanupOldSnapshots();
    return {
      success: true,
      message: 'Old metric snapshots cleaned up successfully',
      timestamp: new Date().toISOString(),
    };
  }),

  // Schedule hourly metrics collection
  scheduleHourlyCollection: baseProcedure.mutation(async () => {
    await uploadAgent.scheduleHourlyMetricsCollection();
    return {
      success: true,
      message: 'Hourly metrics collection scheduled',
      timestamp: new Date().toISOString(),
    };
  }),

  // Get metrics for multiple uploads (useful for dashboard overview)
  getBulkMetrics: baseProcedure
    .input(
      z.object({
        uploadIds: z.array(z.string()),
        range: z.enum(['today', 'week', 'month']).default('today'),
      })
    )
    .query(async ({ input }) => {
      const results = await Promise.allSettled(
        input.uploadIds.map(async (uploadId) => {
          const timeRangeData = await uploadAgent.getMetricsForTimeRange(
            uploadId,
            input.range
          );
          const aggregatedData = await uploadAgent.getAggregatedMetrics(
            uploadId,
            input.range
          );

          return {
            uploadId,
            timeRangeData,
            aggregatedData,
          };
        })
      );

      const successful = results
        .filter(
          (result): result is PromiseFulfilledResult<any> =>
            result.status === 'fulfilled'
        )
        .map((result) => result.value);

      const failed = results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected'
        )
        .map((result) => result.reason);

      return {
        range: input.range,
        successful,
        failed: failed.length,
        errors: failed,
      };
    }),

  // Get latest metrics for a specific upload
  getLatestMetrics: baseProcedure
    .input(
      z.object({
        uploadId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const snapshots = await metricsService.getMetricsForTimeRange(
        input.uploadId,
        'today'
      );

      if (!Array.isArray(snapshots) || snapshots.length === 0) {
        return {
          uploadId: input.uploadId,
          hasData: false,
          message: 'No metrics data available',
        };
      }

      const latest = snapshots[snapshots.length - 1] as any;

      return {
        uploadId: input.uploadId,
        hasData: true,
        metrics: {
          views: latest.views,
          likes: latest.likes,
          comments: latest.comments,
          shares: latest.shares,
          timestamp: latest.timestamp,
        },
      };
    }),
});
