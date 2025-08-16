import { google } from 'googleapis';

export class YouTubeService {
  private youtube;
  private oauth2Client;

  constructor() {
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

  async uploadShort(videoPath: string, title: string, description: string) {
    try {
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
            tags: ['simulation', 'physics', 'satisfying', 'shorts'],
            categoryId: '28', // Science & Technology
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: require('fs').createReadStream(videoPath),
        },
      });

      return response.data;
    } catch (error) {
      console.error('YouTube upload failed:', error);
      throw error;
    }
  }

  async getVideoMetrics(videoId: string) {
    try {
      const response = await this.youtube.videos.list({
        part: ['statistics'],
        id: [videoId],
      });

      return response.data.items?.[0]?.statistics;
    } catch (error) {
      console.error('Failed to fetch YouTube metrics:', error);
      return null;
    }
  }

  /**
   * Generate OAuth URL for initial setup
   */
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  /**
   * Exchange auth code for tokens
   */
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }
}
