import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';

import ffmpegPath from 'ffmpeg-static';
import Ffmpeg from 'fluent-ffmpeg';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface VideoAnalysis {
  score: number; // 0-1
  appeal: string; // "high", "medium", "low"
  reasons: string[];
  suggestedTitle: string;
  suggestedDescription: string;
  visualQualities: {
    colorVariety: number;
    motionIntensity: number;
    symmetry: number;
    complexity: number;
  };
  hashtags: string[];
}

export class VideoAnalyzer {
  async analyzeVideo(
    videoPath: string,
    videoId: string,
    simulationType: string
  ): Promise<VideoAnalysis> {
    try {
      // 1. Extract key frames from video
      const frameImages = await this.extractKeyFrames(videoPath, videoId, 6);

      // 2. Convert frames to base64 for OpenAI Vision API
      const frameData = await this.prepareFramesForAnalysis(frameImages);

      // 3. Analyze with OpenAI Vision API
      const analysis = await this.analyzeWithVision(frameData, simulationType);

      // 4. Clean up temporary frame files
      await this.cleanupFrames(frameImages);

      return analysis;
    } catch (error) {
      console.error('Video analysis failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to analyze video: ${errorMessage}`);
    }
  }

  private getFFmpegPath(): string {
    if (!ffmpegPath) {
      throw new Error('FFmpeg is not installed');
    }

    // If the path contains ROOT, resolve it properly
    if (ffmpegPath.includes('\\ROOT\\')) {
      // Resolve to the actual project root
      const projectRoot = process.cwd();
      const relativePath = ffmpegPath.replace('\\ROOT\\', '');
      const resolvedPath = path.join(projectRoot, relativePath);
      // console.log(`Resolved FFmpeg path from ${ffmpegPath} to ${resolvedPath}`);
      return resolvedPath;
    }

    // If it's already absolute and exists, use it
    if (path.isAbsolute(ffmpegPath)) {
      return ffmpegPath;
    }

    // Otherwise resolve relative to project root
    const resolvedPath = path.resolve(process.cwd(), ffmpegPath);
    // console.log(`Resolved relative FFmpeg path to: ${resolvedPath}`);
    return resolvedPath;
  }

  /**
   * Extract key frames from video at specific intervals
   */
  async extractKeyFrames(
    videoPath: string,
    videoId: string,
    frameCount: number = 6
  ): Promise<string[]> {
    const baseDir = path.dirname(videoPath);
    const outputDir = path.join(baseDir, `frames_${videoId}`);

    // Create frames directory
    await fs.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      // Tell fluent-ffmpeg where FFmpeg is
      const resolvedFFmpegPath = this.getFFmpegPath();
      Ffmpeg.setFfmpegPath(resolvedFFmpegPath);

      const command = Ffmpeg()
        .input(videoPath)
        .saveToFile(path.join(outputDir, 'frame_%03d.jpg'))
        .FPS(1 / 2.5) // Extract one frame every 2.5 seconds
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Processing: ${Math.floor(progress.percent)}% done`);
          }
        })
        .on('end', async (stdout, stderr) => {
          if (stderr) {
            // ffmpeg can output to stderr on success, so just log it
            console.warn('FFmpeg stderr:', stderr);
          }

          try {
            const files = await fs.readdir(outputDir);
            const sortedFiles = files
              .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
              .sort()
              .slice(0, frameCount)
              .map((f) => path.join(outputDir, f));

            resolve(sortedFiles);
          } catch (error) {
            reject(error);
          } finally {
            // Ensure the process is killed to release file handles
            if (command) {
              command.kill('SIGKILL');
            }
          }
        })
        .on('error', (error, stdout, stderr) => {
          console.error('FFmpeg stdout:', stdout);
          console.error('FFmpeg stderr:', stderr);
          reject(
            new Error(
              `FFmpeg error: ${error.message}. Make sure FFmpeg is installed and available in PATH.`
            )
          );
        });
    });
  }

  /**
   * Convert frame images to base64 format for OpenAI Vision API
   */
  private async prepareFramesForAnalysis(
    framePaths: string[]
  ): Promise<Array<{ type: string; image_url: { url: string } }>> {
    const frameData = [];

    for (const framePath of framePaths) {
      try {
        // Read the entire file into a buffer first to avoid file locking issues
        const fileBuffer = await fs.readFile(framePath);

        // Resize image to reduce API costs (max 512px width)
        const resizedBuffer = await sharp(fileBuffer)
          .resize(512, null, { withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();

        const base64Image = resizedBuffer.toString('base64');

        frameData.push({
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`,
          },
        });
      } catch (error) {
        console.error(`Failed to process frame ${framePath}:`, error);
      }
    }

    return frameData;
  }

  /**
   * Analyze video frames using OpenAI Vision API
   */
  private async analyzeWithVision(
    frameData: any[],
    simulationType: string
  ): Promise<VideoAnalysis> {
    // First, validate API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not found, using fallback analysis');
      return this.generateFallbackAnalysis(simulationType);
    }

    if (
      process.env.OPENAI_API_KEY === 'undefined' ||
      process.env.OPENAI_API_KEY === 'your-key-here'
    ) {
      console.warn(
        '⚠️ OPENAI_API_KEY appears to be a placeholder, using fallback analysis'
      );
      return this.generateFallbackAnalysis(simulationType);
    }
    const prompt = `Analyze these ${frameData.length} frames from a ${simulationType} physics simulation video for social media appeal (YouTube Shorts/TikTok).

Please evaluate:
1. Visual Appeal (0-1): Colors, composition, visual interest
2. Motion Dynamics (0-1): How engaging is the movement/animation
3. Virality Potential (0-1): Likelihood to capture attention and get shared
4. Overall Quality (0-1): Production value and visual clarity

Based on this analysis, provide:
- An overall score (0-1)
- Appeal level (high/medium/low) 
- 3-5 specific reasons for the score
- An engaging YouTube Shorts title (under 60 chars)
- A compelling description with relevant hashtags (under 125 chars)
- 5-8 relevant hashtags
- Visual quality metrics

Respond in this JSON format:
{
  "score": 0.85,
  "appeal": "high",
  "reasons": ["Dynamic particle movement", "Vibrant color scheme", "Satisfying physics interactions"],
  "suggestedTitle": "Mesmerizing Physics: Bouncing Ball Chaos! 🔥",
  "suggestedDescription": "Watch these colorful balls defy gravity! The physics is so satisfying 😍 #physics #simulation #satisfying #viral",
  "visualQualities": {
    "colorVariety": 0.9,
    "motionIntensity": 0.8,
    "symmetry": 0.6,
    "complexity": 0.7
  },
  "hashtags": ["#physics", "#simulation", "#satisfying", "#viral", "#science", "#animation", "#mesmerizing", "#fyp"]
}`;

    try {
      console.log('📝 Making OpenAI Vision API request...', {
        model: 'gpt-4o-mini',
        frameCount: frameData.length,
        apiKeyStatus: process.env.OPENAI_API_KEY ? 'present' : 'missing',
        apiKeyPrefix: process.env.OPENAI_API_KEY
          ? process.env.OPENAI_API_KEY.substring(0, 7) + '...'
          : 'none',
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_completion_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }, ...frameData],
          },
        ],
      });

      console.log('📋 OpenAI response received:', {
        hasChoices: !!response.choices?.length,
        choiceCount: response.choices?.length || 0,
        hasContent: !!response.choices?.[0]?.message?.content,
        usage: response.usage,
        responseType: typeof response.choices?.[0]?.message?.content,
      });

      if (response.choices[0]?.message?.content) {
        console.log('✅ Analysis completed successfully');
        return this.parseAnalysis(response.choices[0].message.content);
      }

      throw new Error('No content in OpenAI Vision API response');
    } catch (error) {
      console.error('❌ OpenAI Vision API error:', {
        error: error instanceof Error ? error.message : error,
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack?.split('\n')[0] : undefined,
        type: typeof error,
      });

      // Fallback to basic analysis if AI fails
      return this.generateFallbackAnalysis(simulationType);
    }
  }

  /**
   * Parse OpenAI response into structured format
   */
  private parseAnalysis(content: string): VideoAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate required fields
        return {
          score: Math.max(0, Math.min(1, parsed.score || 0.5)),
          appeal: ['high', 'medium', 'low'].includes(parsed.appeal)
            ? parsed.appeal
            : 'medium',
          reasons: Array.isArray(parsed.reasons)
            ? parsed.reasons
            : ['AI analysis completed'],
          suggestedTitle: parsed.suggestedTitle || 'Physics Simulation',
          suggestedDescription:
            parsed.suggestedDescription ||
            'Amazing physics simulation #physics #simulation',
          visualQualities: {
            colorVariety: Math.max(
              0,
              Math.min(1, parsed.visualQualities?.colorVariety || 0.5)
            ),
            motionIntensity: Math.max(
              0,
              Math.min(1, parsed.visualQualities?.motionIntensity || 0.5)
            ),
            symmetry: Math.max(
              0,
              Math.min(1, parsed.visualQualities?.symmetry || 0.5)
            ),
            complexity: Math.max(
              0,
              Math.min(1, parsed.visualQualities?.complexity || 0.5)
            ),
          },
          hashtags: Array.isArray(parsed.hashtags)
            ? parsed.hashtags
            : ['#physics', '#simulation'],
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }

    // Fallback if parsing fails
    return this.generateFallbackAnalysis('unknown');
  }

  /**
   * Generate basic analysis if AI fails
   */
  private generateFallbackAnalysis(simulationType: string): VideoAnalysis {
    const typeData: Record<
      string,
      {
        score: number;
        title: string;
        description: string;
        hashtags: string[];
      }
    > = {
      bouncing_balls: {
        score: 0.7,
        title: 'Bouncing Balls Physics Simulation',
        description:
          'Satisfying bouncing ball physics! #physics #balls #simulation #satisfying',
        hashtags: [
          '#physics',
          '#balls',
          '#simulation',
          '#satisfying',
          '#gravity',
        ],
      },
      particle_physics: {
        score: 0.6,
        title: 'Mesmerizing Particle Physics',
        description:
          'Beautiful particle interactions in motion #physics #particles #science',
        hashtags: [
          '#physics',
          '#particles',
          '#science',
          '#simulation',
          '#energy',
        ],
      },
      fluid_dynamics: {
        score: 0.8,
        title: 'Fluid Dynamics Visualization',
        description:
          'Watch fluid flow in stunning detail #fluid #physics #dynamics #flow',
        hashtags: ['#fluid', '#physics', '#dynamics', '#flow', '#simulation'],
      },
      gravity_sim: {
        score: 0.75,
        title: 'Gravity Simulation: Planetary Motion',
        description:
          'Planets dancing through space #gravity #space #planets #physics',
        hashtags: ['#gravity', '#space', '#planets', '#physics', '#orbital'],
      },
    };

    const data = typeData[simulationType] || typeData.particle_physics;

    return {
      score: data.score,
      appeal: data.score > 0.7 ? 'high' : data.score > 0.5 ? 'medium' : 'low',
      reasons: ['Fallback analysis - manual review recommended'],
      suggestedTitle: data.title,
      suggestedDescription: data.description,
      visualQualities: {
        colorVariety: 0.6,
        motionIntensity: 0.7,
        symmetry: 0.5,
        complexity: 0.6,
      },
      hashtags: data.hashtags,
    };
  }

  /**
   * Clean up temporary frame files with retry logic for Windows
   */
  private async cleanupFrames(framePaths: string[]): Promise<void> {
    if (framePaths.length === 0) return;

    const frameDir = path.dirname(framePaths[0]);

    try {
      // Use recursive removal which is more robust
      await fs.rm(frameDir, { recursive: true, force: true });
      console.log(`Successfully cleaned up directory: ${frameDir}`);
    } catch (error: any) {
      console.warn(
        `Could not clean up directory ${frameDir}. This might be due to file locks. Manual cleanup may be required.`,
        error.code
      );
    }
  }

  /**
   * Windows-specific cleanup with graceful degradation
   */
  private async cleanupFramesWindows(
    framePaths: string[],
    videoId: string
  ): Promise<void> {
    // The new cleanupFrames implementation is platform-agnostic and more robust.
    // This method is kept for compatibility but delegates to the main one.
    await this.cleanupFrames(framePaths);
  }

  /**
   * Unix/Linux cleanup (more reliable)
   */
  private async cleanupFramesUnix(
    framePaths: string[],
    videoId: string
  ): Promise<void> {
    // The new cleanupFrames implementation is platform-agnostic and more robust.
    // This method is kept for compatibility but delegates to the main one.
    await this.cleanupFrames(framePaths);
  }

  /**
   * Delete file with retry logic for Windows file locking issues
   */
  private async deleteFileWithRetry(
    filePath: string,
    maxRetries: number
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fs.unlink(filePath);
        return; // Success, exit
      } catch (error: any) {
        if (error.code === 'EPERM' || error.code === 'EBUSY') {
          if (attempt < maxRetries) {
            // Wait longer with each attempt
            const delay = attempt * 500;
            console.log(
              `Retrying file deletion in ${delay}ms (attempt ${attempt}/${maxRetries}): ${path.basename(
                filePath
              )}`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        if (error.code === 'ENOENT') {
          // File doesn't exist, that's fine
          return;
        }

        // Log but don't throw - cleanup failure shouldn't break the analysis
        console.warn(
          `Failed to delete frame after ${maxRetries} attempts: ${filePath}`,
          error.code
        );
      }
    }
  }

  /**
   * Delete directory with retry logic
   */
  private async deleteDirectoryWithRetry(
    dirPath: string,
    maxRetries: number
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fs.rmdir(dirPath);
        return;
      } catch (error: any) {
        if (error.code === 'ENOTEMPTY') {
          // Directory not empty, that's expected sometimes
          return;
        }

        if (error.code === 'ENOENT') {
          // Directory doesn't exist, that's fine
          return;
        }

        if (error.code === 'EPERM' && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        // Don't throw, just log
        console.warn(
          `Could not remove frames directory: ${dirPath}`,
          error.code
        );
        return;
      }
    }
  }

  /**
   * Quick analysis for already uploaded videos (using thumbnails)
   */
  async quickAnalyze(
    videoId: string,
    thumbnailPath?: string
  ): Promise<Partial<VideoAnalysis>> {
    if (!thumbnailPath) {
      return { score: 0.5, appeal: 'medium' };
    }

    try {
      const thumbnailBuffer = await sharp(thumbnailPath)
        .resize(512, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const base64Image = thumbnailBuffer.toString('base64');

      const response = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Rate this physics simulation thumbnail for social media appeal (0-1 score). Consider colors, composition, and visual interest.',
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
              },
            ],
          },
        ],
      });

      const content = response.choices[0].message.content;
      const scoreMatch = content?.match(/(\d*\.?\d+)/);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0.5;

      return {
        score: Math.max(0, Math.min(1, score)),
        appeal: score > 0.7 ? 'high' : score > 0.5 ? 'medium' : 'low',
      };
    } catch (error) {
      console.error('Quick analysis failed:', error);
      return { score: 0.5, appeal: 'medium' };
    }
  }

  /**
   * Clean up old temporary files (run periodically)
   */
  static async cleanupOldTempFiles(): Promise<void> {
    try {
      const isWindows = process.platform === 'win32';
      const tempDir = isWindows
        ? path.join(process.cwd(), 'temp', 'videos')
        : '/tmp/videos';

      const framesDir = path.join(tempDir, 'frames');

      // Look for files older than 1 hour
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      try {
        const files = await fs.readdir(framesDir);

        for (const file of files) {
          const filePath = path.join(framesDir, file);

          try {
            const stats = await fs.stat(filePath);

            if (stats.mtime.getTime() < oneHourAgo) {
              await fs.unlink(filePath);
              console.log(`Cleaned up old temp file: ${file}`);
            }
          } catch {
            // Ignore errors for individual files
          }
        }
      } catch {
        // Frames directory doesn't exist, that's fine
      }
    } catch (error) {
      console.error('Error during temp file cleanup:', error);
    }
  }
}
