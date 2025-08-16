import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { dashboardRouter } from './_dashboard';
import { simulationRouter } from './_simulation';

export const appRouter = createTRPCRouter({
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query((opts) => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),
  dashboard: dashboardRouter,
  simulation: simulationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
