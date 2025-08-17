import { YouTubeService } from '../services/platforms/youtubeIntegration';

/**
 * YouTube OAuth Setup Helper
 *
 * This script helps you set up YouTube OAuth for video uploads.
 * Run this to get the OAuth URL and exchange codes for tokens.
 */

export class YouTubeOAuthHelper {
  private youtubeService: YouTubeService;

  constructor() {
    this.youtubeService = new YouTubeService();
  }

  /**
   * Step 1: Get the OAuth URL to visit
   */
  getOAuthUrl(): string {
    // Check if required env vars are set
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

    console.log('\n🔗 YouTube OAuth Setup');
    console.log('====================');

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('❌ Missing required environment variables:');
      if (!clientId) console.error('   - YOUTUBE_CLIENT_ID');
      if (!clientSecret) console.error('   - YOUTUBE_CLIENT_SECRET');
      if (!redirectUri) console.error('   - YOUTUBE_REDIRECT_URI');
      console.log('\nPlease set these in your .env file first.');
      throw new Error('Missing OAuth configuration');
    }

    console.log('✅ OAuth configuration found:');
    console.log(`   Client ID: ${clientId.substring(0, 20)}...`);
    console.log(`   Redirect URI: ${redirectUri}`);

    const url = this.youtubeService.getAuthUrl();
    console.log('\n1. Visit this URL in your browser:');
    console.log(url);
    console.log('\n2. Grant permission to your YouTube channel');
    console.log(
      '3. You will be redirected to: http://localhost:3000/auth/youtube/callback'
    );
    console.log(
      '4. The page will show your refresh token - copy it to your .env file'
    );
    return url;
  }

  /**
   * Step 2: Exchange the authorization code for tokens
   */
  async exchangeCodeForTokens(authCode: string) {
    try {
      const tokens = await this.youtubeService.getTokensFromCode(authCode);

      console.log('\n✅ Successfully obtained tokens!');
      console.log('Add these to your .env file:');
      console.log('================================');
      console.log(`YOUTUBE_REFRESH_TOKEN="${tokens.refresh_token}"`);

      if (tokens.access_token) {
        console.log(`# Access token (expires): ${tokens.access_token}`);
      }

      return tokens;
    } catch (error) {
      console.error('❌ Failed to exchange code for tokens:', error);
      throw error;
    }
  }

  async verifyConnection() {
    const client_id = process.env.YOUTUBE_CLIENT_ID;
    const client_secret = process.env.YOUTUBE_CLIENT_SECRET;
    const refresh_token = process.env.YOUTUBE_REFRESH_TOKEN;

    if (!client_id || !client_secret || !refresh_token) {
      console.error('❌ Missing required environment variables:');
      if (!client_id) console.error('   - YOUTUBE_CLIENT_ID');
      if (!client_secret) console.error('   - YOUTUBE_CLIENT_SECRET');
      if (!refresh_token) console.error('   - YOUTUBE_REFRESH_TOKEN');
      return { connected: false, reason: 'Missing OAuth configuration' };
    }

    try {
      // Create properly formatted URL-encoded body
      const body = new URLSearchParams({
        client_id,
        client_secret,
        refresh_token,
        grant_type: 'refresh_token',
      });

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!tokenRes.ok) {
        const msg = await tokenRes.text();
        return { connected: false, reason: `Refresh failed: ${msg}` };
      }

      const { access_token } = (await tokenRes.json()) as {
        access_token: string;
      };

      const ytRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      if (!ytRes.ok) {
        const msg = await ytRes.text();
        return { connected: false, reason: `YouTube check failed: ${msg}` };
      }

      const data = (await ytRes.json()) as { items?: Array<{ id: string }> };
      const channelId = data.items?.[0]?.id;

      return { connected: true, channelId };
    } catch (error) {
      console.error('❌ YouTube verification error:', error);
      return {
        connected: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Example usage for testing
async function setupYouTubeOAuth() {
  try {
    const helper = new YouTubeOAuthHelper();

    // Step 1: Get OAuth URL
    const url = helper.getOAuthUrl();

    console.log('\n📝 Instructions:');
    console.log('1. Make sure your development server is running: npm run dev');
    console.log('2. Visit the URL above in your browser');
    console.log('3. Complete the OAuth flow');
    console.log(
      '4. Copy the refresh token from the callback page to your .env file'
    );
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

// Auto-run when called directly
if (require.main === module) {
  setupYouTubeOAuth();
}
