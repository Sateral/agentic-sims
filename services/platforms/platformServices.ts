import { ReadStream } from 'fs';

export interface PlatformUploadResult {
  platformId: string;
  url: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface VideoMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export abstract class BasePlatformService {
  abstract uploadVideo(
    videoPath: string,
    title: string,
    description: string,
    tags?: string[]
  ): Promise<PlatformUploadResult>;

  abstract getVideoMetrics(platformId: string): Promise<VideoMetrics>;
}

// TikTok API integration (unofficial API or using TikTok for Business)
export class TikTokService extends BasePlatformService {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    super();
    this.apiKey = process.env.TIKTOK_API_KEY || '';
    this.apiSecret = process.env.TIKTOK_API_SECRET || '';
  }

  async uploadVideo(
    videoPath: string,
    title: string,
    description: string,
    tags: string[] = []
  ): Promise<PlatformUploadResult> {
    try {
      // Note: TikTok's official API for content creation is limited
      // This is a placeholder for the actual implementation
      // You might need to use unofficial APIs or browser automation

      const formData = new FormData();
      const videoBuffer = await this.readVideoFile(videoPath);

      formData.append('video', new Blob([videoBuffer]), 'video.mp4');
      formData.append(
        'text',
        `${title}\n\n${description}\n\n${tags
          .map((tag) => `#${tag}`)
          .join(' ')}`
      );
      formData.append('privacy', 'public');

      const response = await fetch(
        'https://open-api.tiktok.com/share/video/upload/',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.getAccessToken()}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          platformId: data.video.video_id,
          url: data.video.share_url,
          status: 'success',
        };
      } else {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
    } catch (error) {
      return {
        platformId: '',
        url: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getVideoMetrics(platformId: string): Promise<VideoMetrics> {
    try {
      const response = await fetch(
        `https://open-api.tiktok.com/research/video/info/?video_id=${platformId}`,
        {
          headers: {
            Authorization: `Bearer ${this.getAccessToken()}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          views: data.video.view_count || 0,
          likes: data.video.like_count || 0,
          comments: data.video.comment_count || 0,
          shares: data.video.share_count || 0,
        };
      }
    } catch (error) {
      console.error('Failed to fetch TikTok metrics:', error);
    }

    return { views: 0, likes: 0, comments: 0, shares: 0 };
  }

  private getAccessToken(): string {
    // Implement OAuth flow to get access token
    return process.env.TIKTOK_ACCESS_TOKEN || '';
  }

  private async readVideoFile(videoPath: string): Promise<ArrayBuffer> {
    const fs = require('fs').promises;
    const buffer = await fs.readFile(videoPath);
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
  }
}

// Instagram Reels API integration (Meta Business API)
export class InstagramService extends BasePlatformService {
  private accessToken: string;
  private businessAccountId: string;

  constructor() {
    super();
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
    this.businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
  }

  async uploadVideo(
    videoPath: string,
    title: string,
    description: string,
    tags: string[] = []
  ): Promise<PlatformUploadResult> {
    try {
      // Step 1: Create media container
      const caption = `${title}\n\n${description}\n\n${tags
        .map((tag) => `#${tag}`)
        .join(' ')}`;

      // First, upload video to a publicly accessible URL (you'll need a temp storage service)
      const videoUrl = await this.uploadToTempStorage(videoPath);

      const containerResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.businessAccountId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_url: videoUrl,
            caption: caption,
            media_type: 'REELS',
            access_token: this.accessToken,
          }),
        }
      );

      if (!containerResponse.ok) {
        throw new Error(
          `Container creation failed: ${containerResponse.statusText}`
        );
      }

      const containerData = await containerResponse.json();
      const creationId = containerData.id;

      // Step 2: Publish the media
      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.businessAccountId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: this.accessToken,
          }),
        }
      );

      if (publishResponse.ok) {
        const publishData = await publishResponse.json();
        return {
          platformId: publishData.id,
          url: `https://www.instagram.com/p/${publishData.id}/`,
          status: 'success',
        };
      } else {
        throw new Error(`Publishing failed: ${publishResponse.statusText}`);
      }
    } catch (error) {
      return {
        platformId: '',
        url: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getVideoMetrics(platformId: string): Promise<VideoMetrics> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${platformId}/insights?metric=reach,impressions,likes,comments,shares&access_token=${this.accessToken}`
      );

      if (response.ok) {
        const data = await response.json();
        const metrics = data.data.reduce((acc: any, metric: any) => {
          acc[metric.name] = metric.values[0].value;
          return acc;
        }, {});

        return {
          views: metrics.reach || 0,
          likes: metrics.likes || 0,
          comments: metrics.comments || 0,
          shares: metrics.shares || 0,
        };
      }
    } catch (error) {
      console.error('Failed to fetch Instagram metrics:', error);
    }

    return { views: 0, likes: 0, comments: 0, shares: 0 };
  }

  private async uploadToTempStorage(videoPath: string): Promise<string> {
    // Upload to AWS S3, Cloudinary, or similar service
    // This is a placeholder - implement based on your preferred storage service

    // For now, return a placeholder URL
    // In production, you'd upload the file and return the public URL
    return `https://your-temp-storage.com/videos/${Date.now()}.mp4`;
  }
}

// Updated YouTube service
export class YouTubeService extends BasePlatformService {
  private youtube;
  private oauth2Client;

  constructor() {
    super();
    const { google } = require('googleapis');

    // Set up OAuth2 client for uploads (API key is read-only)
    this.oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    // Set credentials if we have them
    if (process.env.YOUTUBE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
      });
    }

    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });
  }

  async uploadVideo(
    videoPath: string,
    title: string,
    description: string,
    tags: string[] = []
  ): Promise<PlatformUploadResult> {
    try {
      const fs = require('fs');

      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
            tags: [...tags, 'simulation', 'physics', 'satisfying', 'shorts'],
            categoryId: '28', // Science & Technology
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(videoPath),
        },
      });

      if (response.data && response.data.id) {
        return {
          platformId: response.data.id,
          url: `https://youtube.com/watch?v=${response.data.id}`,
          status: 'success',
        };
      } else {
        throw new Error('Upload response missing video ID');
      }
    } catch (error) {
      console.error('YouTube upload error:', error);
      return {
        platformId: '',
        url: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getVideoMetrics(platformId: string): Promise<VideoMetrics> {
    try {
      // For metrics, we can use a separate client with API key
      const { google } = require('googleapis');
      const youtubeReadOnly = google.youtube({
        version: 'v3',
        auth: process.env.YOUTUBE_API_KEY,
      });

      const response = await youtubeReadOnly.videos.list({
        part: ['statistics'],
        id: [platformId],
      });

      const stats = response.data.items?.[0]?.statistics;
      if (stats) {
        return {
          views: parseInt(stats.viewCount || '0'),
          likes: parseInt(stats.likeCount || '0'),
          comments: parseInt(stats.commentCount || '0'),
          shares: 0, // YouTube doesn't provide share count via API
        };
      }
    } catch (error) {
      console.error('Failed to fetch YouTube metrics:', error);
    }

    return { views: 0, likes: 0, comments: 0, shares: 0 };
  }
}

// Platform factory
export class PlatformServiceFactory {
  static createService(platform: string): BasePlatformService {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return new YouTubeService();
      case 'tiktok':
        return new TikTokService();
      case 'instagram':
        return new InstagramService();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
