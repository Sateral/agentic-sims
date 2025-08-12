import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { prisma } from '@/lib/prisma';

export const simulationRouter = createTRPCRouter({
  create: baseProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.string(),
        parameters: z.record(z.any(), z.any()),
        status: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await prisma.simulation.create({
        data: {
          name: input.name,
          type: input.type,
          parameters: input.parameters as any, // ensure compatibility with Prisma's InputJsonValue
          status: input.status,
        },
      });
    }),

  list: baseProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      return await prisma.simulation.findMany({
        take: input.limit,
        skip: input.offset,
        include: {
          videos: {
            include: {
              uploads: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  getById: baseProcedure.input(z.string()).query(async ({ input }) => {
    return await prisma.simulation.findUnique({
      where: { id: input },
      include: {
        videos: {
          include: {
            uploads: {
              include: {
                metrics: true,
              },
            },
          },
        },
      },
    });
  }),
});
