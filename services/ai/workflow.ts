import { VideoAnalyzer } from './analyzeSimulation';
import { PlatformServiceFactory } from '../platforms/platformServices';
import { VideoGenerator } from '../video/videoGenerator';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

export class UploadAgent {
  private videoAnalyzer = new VideoAnalyzer();
  private videoGenerator = new VideoGenerator();

  async processDailyUploads() {
    console.log('Starting daily upload process...');

    try {
      // 1. Generate new simulations if needed
      await this.generateSimulations();

      // 2. Analyze and select best videos
      const selectedVideos = await this.selectBestVideos();

      // 3. Upload to platforms
      await this.uploadToAllPlatforms(selectedVideos);

      console.log('Daily upload process completed successfully');
    } catch (error) {
      console.error('Daily upload process failed:', error);
      throw error;
    }
  }

  private async generateSimulations() {
    console.log('Generating new simulations...');

    const simulationTypes = [
      'bouncing_balls',
      'particle_physics',
      // 'fluid_dynamics',
      // 'gravity_sim',
    ];

    // Generate 5 variations per type
    for (const type of simulationTypes) {
      try {
        console.log(`Generating ${type} simulations...`);
        await this.videoGenerator.generateVariations(type, 1);
        console.log(`✓ Generated ${type} simulations`);
      } catch (error) {
        console.error(`Failed to generate ${type} simulations:`, error);
      }
    }
  }

  private async selectBestVideos() {
    console.log('Analyzing and selecting best videos...');

    // Get all videos from today that haven't been uploaded
    const videos = await prisma.video.findMany({
      where: {
        status: 'generated',
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
        uploads: {
          none: {}, // No uploads yet
        },
      },
      include: {
        simulation: true,
      },
    });

    console.log(`Found ${videos.length} videos to analyze`);

    // Analyze each video
    const analyzedVideos = await Promise.all(
      videos.map(async (video) => {
        try {
          const videoPath = path.join(
            process.cwd(),
            'temp',
            'videos',
            `${video.id}.mp4`
          );
          const analysis = await this.videoAnalyzer.analyzeVideo(
            videoPath,
            video.id,
            video.simulation.type
          );

          // Update video with AI score and suggested content
          await prisma.video.update({
            where: { id: video.id },
            data: {
              aiScore: analysis.score,
              title: analysis.suggestedTitle,
              description: analysis.suggestedDescription,
            },
          });

          return { ...video, analysis };
        } catch (error) {
          console.error(`Failed to analyze video ${video.id}:`, error);
          return null;
        }
      })
    );

    // Filter out failed analyses and select top videos
    const validVideos = analyzedVideos.filter((v) => v !== null);
    const topVideos = validVideos
      .sort((a, b) => (b?.analysis.score || 0) - (a?.analysis.score || 0))
      .slice(0, 3);

    console.log(`Selected ${topVideos.length} top videos for upload`);
    return topVideos;
  }

  private async uploadToAllPlatforms(videos: any[]) {
    // For now, only upload to YouTube
    const platforms = ['youtube'];

    console.log(`Uploading ${videos.length} videos to YouTube only...`);

    for (const video of videos) {
      console.log(`Uploading video: ${video.title}`);
      let allUploadsSucceeded = true;

      for (const platform of platforms) {
        try {
          await this.uploadToPlatform(video, platform);
          console.log(`✓ Uploaded ${video.title} to ${platform}`);
        } catch (error) {
          allUploadsSucceeded = false;
          console.error(
            `Failed to upload ${video.title} to ${platform}:`,
            error
          );
        }
      }

      // Mark video as selected for upload
      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'selected' },
      });

      // If all uploads were successful, delete the local video file
      if (allUploadsSucceeded) {
        try {
          const videoPath = path.join(
            process.cwd(),
            'temp',
            'videos',
            `${video.id}.mp4`
          );
          await fs.unlink(videoPath);
          console.log(`✓ Deleted local video file: ${video.id}.mp4`);
        } catch (error) {
          console.error(`Failed to delete video file ${video.id}.mp4:`, error);
        }
      }
    }
  }

  private async uploadToPlatform(video: any, platform: string) {
    const platformService = PlatformServiceFactory.createService(platform);
    const videoPath = path.join(
      process.cwd(),
      'temp',
      'videos',
      `${video.id}.mp4`
    );

    // Prepare tags based on simulation type
    const tags = this.generateTags(video.simulation.type);

    // Upload video
    const result = await platformService.uploadVideo(
      videoPath,
      video.title,
      video.description,
      tags
    );

    if (result.status === 'success') {
      // Create upload record
      await prisma.upload.create({
        data: {
          videoId: video.id,
          platform,
          platformId: result.platformId,
          url: result.url,
          status: 'published',
        },
      });

      console.log(`Successfully uploaded to ${platform}: ${result.url}`);
    } else {
      console.error(`Upload to ${platform} failed:`, result.error);

      // Create failed upload record
      await prisma.upload.create({
        data: {
          videoId: video.id,
          platform,
          platformId: '',
          url: '',
          status: 'failed',
        },
      });

      throw new Error(result.error || 'Upload failed');
    }
  }

  private generateTags(simulationType: string): string[] {
    const baseTags = ['physics', 'simulation', 'satisfying', 'science'];

    const typeSpecificTags: Record<string, string[]> = {
      bouncing_balls: ['balls', 'bounce', 'gravity', 'motion'],
      particle_physics: ['particles', 'physics', 'energy', 'quantum'],
      fluid_dynamics: ['fluid', 'flow', 'dynamics', 'water'],
      gravity_sim: ['gravity', 'space', 'planets', 'orbital'],
    };

    return [...baseTags, ...(typeSpecificTags[simulationType] || [])];
  }

  /**
   * Sync metrics for all uploaded videos
   */
  async syncMetrics() {
    console.log('Syncing metrics for all uploads...');

    const uploads = await prisma.upload.findMany({
      where: {
        status: 'published',
      },
    });

    for (const upload of uploads) {
      try {
        const platformService = PlatformServiceFactory.createService(
          upload.platform
        );
        const metrics = await platformService.getVideoMetrics(
          upload.platformId
        );

        // Update or create metrics record
        const existingMetric = await prisma.metric.findFirst({
          where: { uploadId: upload.id },
        });

        if (existingMetric) {
          await prisma.metric.update({
            where: { id: existingMetric.id },
            data: {
              views: metrics.views,
              likes: metrics.likes,
              comments: metrics.comments,
              shares: metrics.shares,
            },
          });
        } else {
          await prisma.metric.create({
            data: {
              uploadId: upload.id,
              views: metrics.views,
              likes: metrics.likes,
              comments: metrics.comments,
              shares: metrics.shares,
            },
          });
        }
      } catch (error) {
        console.error(`Failed to sync metrics for upload ${upload.id}:`, error);
      }
    }

    console.log('Metrics sync completed');
  }

  /**
   * Clean up old videos and data
   */
  async cleanup() {
    console.log('Starting cleanup process...');

    const fs = require('fs').promises;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Delete old video files (videos are not stored permanently)
    try {
      const videoDir = path.join(process.cwd(), 'temp', 'videos');
      const files = await fs.readdir(videoDir);

      for (const file of files) {
        const filePath = path.join(videoDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < oneWeekAgo) {
          await fs.unlink(filePath);
          console.log(`Deleted old video file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to clean up video files:', error);
    }

    // Archive old simulation data (keep for analytics)
    const oldSimulations = await prisma.simulation.findMany({
      where: {
        createdAt: {
          lt: oneWeekAgo,
        },
        status: 'completed',
      },
    });

    console.log(`Found ${oldSimulations.length} old simulations for archival`);

    console.log('Cleanup completed');
  }
}
