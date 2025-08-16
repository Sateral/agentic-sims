import { NextRequest, NextResponse } from 'next/server';
import { YouTubeOAuthHelper } from '@/scripts/setupYouTubeOAuth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json(
      { error: 'OAuth authorization denied', details: error },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: 'No authorization code received' },
      { status: 400 }
    );
  }

  try {
    const helper = new YouTubeOAuthHelper();
    const tokens = await helper.exchangeCodeForTokens(code);

    return NextResponse.json({
      success: true,
      message: 'OAuth tokens obtained successfully!',
      refreshToken: tokens.refresh_token,
      instructions: [
        'Copy the refresh token below to your .env file:',
        `YOUTUBE_REFRESH_TOKEN="${tokens.refresh_token}"`,
        '',
        'Then restart your development server.',
      ],
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      {
        error: 'Failed to exchange code for tokens',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
