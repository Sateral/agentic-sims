import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { prisma } from '@/lib/prisma';
import { VideoGenerator } from '@/services/video/videoGenerator';
import { UploadAgent } from '@/services/ai/workflow';
import { VideoAnalyzer } from '@/services/ai/analyzeSimulation';
import path from 'path';

const videoGenerator = new VideoGenerator();
const uploadAgent = new UploadAgent();
const videoAnalyzer = new VideoAnalyzer();

export const simulationRouter = createTRPCRouter({
  // Get all simulations with their videos and upload status
  list: baseProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
        type: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const simulations = await prisma.simulation.findMany({
        take: input.limit,
        skip: input.offset,
        where: {
          ...(input.type && { type: input.type }),
          ...(input.status && { status: input.status }),
        },
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
        orderBy: { createdAt: 'desc' },
      });

      return simulations;
    }),

  // Get simulation by ID with full details
  getById: baseProcedure.input(z.string()).query(async ({ input }) => {
    return await prisma.simulation.findUnique({
      where: { id: input },
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
  }),

  // Generate new simulations
  generate: baseProcedure
    .input(
      z.object({
        type: z.enum([
          'bouncing_balls',
          'particle_physics',
          'fluid_dynamics',
          'gravity_sim',
        ]),
        count: z.number().min(1).max(10).default(5),
        parameters: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const videoIds = await videoGenerator.generateVariations(
          input.type,
          input.count
        );

        // Get the created simulation
        const videos = await prisma.video.findMany({
          where: { id: { in: videoIds } },
          include: { simulation: true },
        });

        const simulation = videos[0]?.simulation;

        if (simulation) {
          // Update simulation status
          await prisma.simulation.update({
            where: { id: simulation.id },
            data: { status: 'completed' },
          });
        }

        return {
          simulationId: simulation?.id,
          videoIds,
          message: `Generated ${videoIds.length} videos for ${input.type}`,
        };
      } catch (error) {
        throw new Error(
          `Failed to generate simulation: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }),

  // Analyze videos and select best ones
  analyzeAndSelect: baseProcedure
    .input(z.object({ simulationId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Get all unanalyzed videos from the simulation
        const videos = await prisma.video.findMany({
          where: {
            simulationId: input.simulationId,
            status: 'generated',
            aiScore: null,
          },
          include: {
            simulation: true,
          },
        });

        const analyzedVideos = [];

        // Analyze each video with AI
        for (const video of videos) {
          try {
            const videoPath = path.join(
              process.cwd(),
              'temp',
              'videos',
              `${video.id}.mp4`
            );
            const analysis = await videoAnalyzer.analyzeVideo(
              videoPath,
              video.simulation.type
            );

            // Update video with AI analysis results
            const updatedVideo = await prisma.video.update({
              where: { id: video.id },
              data: {
                aiScore: analysis.score,
                title: analysis.suggestedTitle,
                description: analysis.suggestedDescription,
                status: analysis.score > 0.7 ? 'selected' : 'generated',
              },
            });

            analyzedVideos.push({
              ...updatedVideo,
              analysis: {
                score: analysis.score,
                appeal: analysis.appeal,
                reasons: analysis.reasons,
                visualQualities: analysis.visualQualities,
                hashtags: analysis.hashtags,
              },
            });
          } catch (error) {
            console.error(`Failed to analyze video ${video.id}:`, error);

            // Update with fallback score
            await prisma.video.update({
              where: { id: video.id },
              data: {
                aiScore: 0.5,
                status: 'generated',
              },
            });
          }
        }

        return {
          analyzed: videos.length,
          successful: analyzedVideos.length,
          videos: analyzedVideos,
          message: `Analyzed ${videos.length} videos, ${analyzedVideos.length} successful`,
        };
      } catch (error) {
        throw new Error(
          `Failed to analyze videos: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }),

  // Analyze a single video
  analyzeVideo: baseProcedure
    .input(
      z.object({
        videoId: z.string(),
        forceReanalyze: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const video = await prisma.video.findUnique({
          where: { id: input.videoId },
          include: { simulation: true },
        });

        if (!video) {
          throw new Error('Video not found');
        }

        // Skip if already analyzed unless force re-analyze
        if (video.aiScore && !input.forceReanalyze) {
          return {
            videoId: input.videoId,
            cached: true,
            score: video.aiScore,
            message: 'Using cached analysis result',
          };
        }

        const videoPath = path.join(
          process.cwd(),
          'temp',
          'videos',
          `${video.id}.mp4`
        );
        const analysis = await videoAnalyzer.analyzeVideo(
          videoPath,
          video.simulation.type
        );

        // Update video with AI analysis results
        await prisma.video.update({
          where: { id: input.videoId },
          data: {
            aiScore: analysis.score,
            title: analysis.suggestedTitle,
            description: analysis.suggestedDescription,
            status: analysis.score > 0.7 ? 'selected' : 'generated',
          },
        });

        return {
          videoId: input.videoId,
          cached: false,
          analysis: {
            score: analysis.score,
            appeal: analysis.appeal,
            reasons: analysis.reasons,
            suggestedTitle: analysis.suggestedTitle,
            suggestedDescription: analysis.suggestedDescription,
            visualQualities: analysis.visualQualities,
            hashtags: analysis.hashtags,
          },
          message: 'Video analyzed successfully',
        };
      } catch (error) {
        throw new Error(
          `Failed to analyze video: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }),

  // Upload selected videos to platforms
  uploadToPlatforms: baseProcedure
    .input(
      z.object({
        videoIds: z.array(z.string()),
        platforms: z.array(z.enum(['youtube'])).default(['youtube']), // YouTube only for now
      })
    )
    .mutation(async ({ input }) => {
      try {
        const results = [];

        for (const videoId of input.videoIds) {
          const video = await prisma.video.findUnique({
            where: { id: videoId },
            include: { simulation: true },
          });

          if (!video) {
            continue;
          }

          for (const platform of input.platforms) {
            try {
              // Create mock upload records for now
              const upload = await prisma.upload.create({
                data: {
                  videoId: video.id,
                  platform,
                  platformId: `mock_${platform}_${Date.now()}`,
                  url: `https://${platform}.com/video/${Date.now()}`,
                  status: 'published',
                },
              });

              // Create initial metrics
              await prisma.metric.create({
                data: {
                  uploadId: upload.id,
                  views: 0,
                  likes: 0,
                  comments: 0,
                  shares: 0,
                },
              });

              results.push({
                videoId,
                platform,
                status: 'success',
                url: upload.url,
              });
            } catch (error) {
              results.push({
                videoId,
                platform,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
        }

        return {
          results,
          message: `Processed ${input.videoIds.length} videos for ${input.platforms.length} platforms`,
        };
      } catch (error) {
        throw new Error(
          `Failed to upload videos: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }),

  // Run the daily upload process
  runDailyProcess: baseProcedure.mutation(async () => {
    try {
      await uploadAgent.processDailyUploads();
      return { success: true, message: 'Daily upload process completed' };
    } catch (error) {
      throw new Error(
        `Daily process failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }),

  // Sync metrics for all uploads
  syncMetrics: baseProcedure.mutation(async () => {
    try {
      await uploadAgent.syncMetrics();
      return { success: true, message: 'Metrics sync completed' };
    } catch (error) {
      throw new Error(
        `Metrics sync failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }),

  // Get simulation types and their performance
  getTypes: baseProcedure.query(async () => {
    const types = await prisma.simulation.groupBy({
      by: ['type'],
      _count: { _all: true },
    });

    const typeStats = await Promise.all(
      types.map(async (type) => {
        const videos = await prisma.video.findMany({
          where: {
            simulation: { type: type.type },
            aiScore: { not: null },
          },
          select: { aiScore: true },
        });

        const avgScore =
          videos.length > 0
            ? videos.reduce((sum, v) => sum + (v.aiScore || 0), 0) /
              videos.length
            : 0;

        const uploads = await prisma.upload.count({
          where: {
            video: {
              simulation: { type: type.type },
            },
          },
        });

        return {
          type: type.type,
          simulationCount: type._count._all,
          avgAiScore: Math.round(avgScore * 100) / 100,
          uploadCount: uploads,
        };
      })
    );

    return typeStats;
  }),

  // Delete simulation and its videos
  delete: baseProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Delete in the correct order due to foreign key constraints
        const simulation = await prisma.simulation.findUnique({
          where: { id: input.id },
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

        if (!simulation) {
          throw new Error('Simulation not found');
        }

        // Delete metrics, uploads, videos, then simulation
        for (const video of simulation.videos) {
          for (const upload of video.uploads) {
            await prisma.metric.deleteMany({
              where: { uploadId: upload.id },
            });
          }
          await prisma.upload.deleteMany({
            where: { videoId: video.id },
          });
        }

        await prisma.video.deleteMany({
          where: { simulationId: input.id },
        });

        await prisma.simulation.delete({
          where: { id: input.id },
        });

        return { success: true, message: 'Simulation deleted successfully' };
      } catch (error) {
        throw new Error(
          `Failed to delete simulation: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }),

  // Create simulation manually (keeping the original functionality)
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
          parameters: input.parameters as any,
          status: input.status,
        },
      });
    }),
});
