# Quick Start Guide - YouTube Testing

This guide will help you set up the system for YouTube Shorts testing only.

## Prerequisites

1. **Node.js 18+** installed
2. **Python 3.8+** installed
3. **PostgreSQL** database (you already have Neon setup)
4. **Google Cloud Console** access for YouTube API

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
npm run setup  # Sets up Python environment
```

### 2. Database Setup

```bash
npm run prisma:migrate
npm run prisma:seed  # Optional: adds sample data
```

### 3. YouTube API Setup

#### 3a. Enable YouTube Data API v3 (already done)

- ✅ You already have `YOUTUBE_API_KEY` set up

#### 3b. Set up YouTube OAuth for Uploads

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (same one with YouTube API)
3. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
4. Application type: "Web application"
5. Authorized redirect URIs: `http://localhost:3000/auth/youtube/callback`
6. Copy the Client ID and Client Secret to your `.env`:

```env
YOUTUBE_CLIENT_ID="your-client-id-here"
YOUTUBE_CLIENT_SECRET="your-client-secret-here"
```

#### 3c. Get OAuth Tokens

```bash
npm run setup:youtube
# Follow the instructions to get your refresh token
```

### 4. Test Video Generation

```bash
npm run test:video
```

This will:

- Generate a test video using Python
- Analyze it with AI (if OpenAI key works)
- Verify the file was created
- NOT upload anything

### 5. Start the Dashboard

```bash
npm run dev
```

Visit http://localhost:3000 to see the dashboard.

## Testing the Full Pipeline

Once everything is set up:

1. **Manual Test**: Use the dashboard to generate a few videos
2. **Upload Test**: Try uploading one video to YouTube manually
3. **Daily Process**: Run the full automated workflow

## Current System Status

✅ **Enabled**: YouTube Shorts upload and analytics
❌ **Disabled**: TikTok and Instagram (for testing)

The system will:

- Generate 20 videos daily (5 of each simulation type)
- Analyze them with AI
- Upload the top 3 to YouTube only
- Track metrics and display in dashboard

## Troubleshooting

### Python Issues

```bash
# On Ubuntu/WSL
sudo apt-get install python3-dev python3-pip ffmpeg

# Activate virtual environment
source venv/bin/activate
pip install -r requirements.txt
```

### Video Generation Fails

- Check `/tmp/videos` directory exists and is writable
- Verify Python dependencies are installed
- Run `npm run test:video` to isolate the issue

### YouTube Upload Fails

- Verify OAuth tokens are set up correctly
- Check YouTube API quotas (10,000 requests/day)
- Ensure video file exists and is valid MP4

## Next Steps

Once YouTube testing works:

1. Enable TikTok integration
2. Enable Instagram integration
3. Deploy to production
4. Set up monitoring and alerts
