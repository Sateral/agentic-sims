import { createTRPCRouter, baseProcedure } from '../init';
import z from 'zod';
import { YouTubeService } from '@/services/platforms/youtubeIntegration';
import { TRPCError } from '@trpc/server';

export const youtubeRouter = createTRPCRouter({
  status: baseProcedure.query(async () => {
    const youtubeService = new YouTubeService();
    return await youtubeService.verifyConnection();
  }),
  getAuthUrl: baseProcedure.query(async () => {
    const youtubeService = new YouTubeService();
    return youtubeService.getAuthUrl();
  }),
  exchangeCode: baseProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input }) => {
      const youtubeService = new YouTubeService();

      const { refresh_token } = await youtubeService.getTokensFromCode(
        input.code
      );

      if (!refresh_token) {
        throw new TRPCError({
          message: 'Failed to exchange code for tokens',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      return refresh_token;
    }),
});
