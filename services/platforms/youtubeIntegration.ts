import { google } from 'googleapis';

export class YouTubeService {
  private youtube;

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    });
  }

  async uploadShort(videoPath: string, title: string, description: string) {
    const response = await this.youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
          tags: ['simulation', 'physics', 'satisfying'],
          categoryId: '28', // Science & Technology
        },
        status: {
          privacyStatus: 'public',
        },
      },
      media: {
        body: require('fs').createReadStream(videoPath),
      },
    });

    return response.data;
  }

  async getVideoMetrics(videoId: string) {
    const response = await this.youtube.videos.list({
      part: ['statistics'],
      id: [videoId],
    });

    return response.data.items?.[0]?.statistics;
  }
}
