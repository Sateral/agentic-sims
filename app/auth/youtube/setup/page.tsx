'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ExternalLink, Copy, AlertCircle } from 'lucide-react';

export default function YouTubeOAuthSetup() {
  const [step, setStep] = useState(1);
  const [oauthUrl, setOauthUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const generateOAuthUrl = async () => {
    setLoading(true);
    try {
      // Create the OAuth URL directly (since we have the client ID)
      const clientId =
        process.env.NEXT_PUBLIC_YOUTUBE_CLIENT_ID ||
        '186919940991-29afum3a738j14putojjibsnsb4o51jg.apps.googleusercontent.com';
      const redirectUri = encodeURIComponent(
        'http://localhost:3000/auth/youtube/callback'
      );
      const scope = encodeURIComponent(
        'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly'
      );

      const url =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${scope}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent`;

      setOauthUrl(url);
      setStep(2);
    } catch (error) {
      console.error('Failed to generate OAuth URL:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">YouTube OAuth Setup</h1>
          <p className="text-gray-600 mt-2">
            Set up YouTube authentication for video uploads
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1 */}
          <Card className={step >= 1 ? 'border-blue-200 bg-blue-50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {step > 1 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                    1
                  </span>
                )}
                Generate OAuth URL
              </CardTitle>
              <CardDescription>Create the authorization URL</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={generateOAuthUrl}
                disabled={loading || step > 1}
                className="w-full"
              >
                {loading ? 'Generating...' : 'Generate OAuth URL'}
              </Button>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card
            className={step >= 2 ? 'border-blue-200 bg-blue-50' : 'opacity-50'}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {step > 2 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                    2
                  </span>
                )}
                Authorize YouTube
              </CardTitle>
              <CardDescription>
                Grant permissions to your YouTube channel
              </CardDescription>
            </CardHeader>
            <CardContent>
              {oauthUrl && (
                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <a
                      href={oauthUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open YouTube OAuth
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(oauthUrl)}
                    className="w-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy URL
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card
            className={step >= 3 ? 'border-blue-200 bg-blue-50' : 'opacity-50'}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                  3
                </span>
                Get Refresh Token
              </CardTitle>
              <CardDescription>
                Copy the token to your .env file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                After authorization, you'll be redirected back with your refresh
                token.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>
              Follow these steps to complete YouTube OAuth setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Prerequisites:</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• YouTube channel connected to your Google account</li>
                <li>
                  • Google Cloud Console project with YouTube Data API enabled
                </li>
                <li>• OAuth credentials configured in Google Cloud Console</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Current Configuration:</h4>
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                <div>
                  Client ID:
                  186919940991-29afum3a738j14putojjibsnsb4o51jg.apps.googleusercontent.com
                </div>
                <div>
                  Redirect URI: http://localhost:3000/auth/youtube/callback
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Make sure your development server is running on
                http://localhost:3000 before starting the OAuth flow.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>If you see "Error 400: invalid_request":</strong>
              </p>
              <ul className="ml-4 space-y-1 text-gray-600">
                <li>
                  • Check that the redirect URI in Google Cloud Console matches
                  exactly:{' '}
                  <code>http://localhost:3000/auth/youtube/callback</code>
                </li>
                <li>
                  • Verify the Client ID in your .env file matches the one in
                  Google Cloud Console
                </li>
                <li>
                  • Make sure the YouTube Data API v3 is enabled in your Google
                  Cloud project
                </li>
              </ul>

              <p className="mt-4">
                <strong>If you see "Access blocked":</strong>
              </p>
              <ul className="ml-4 space-y-1 text-gray-600">
                <li>
                  • Your OAuth app might need verification if it's requesting
                  sensitive scopes
                </li>
                <li>
                  • Add your Google account as a test user in Google Cloud
                  Console
                </li>
                <li>• Make sure your app is in testing mode if not verified</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
