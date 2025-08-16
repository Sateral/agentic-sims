# AI Video Generation & Multi-Platform Upload System

An automated system that generates physics simulation videos using AI, analyzes them for quality, and uploads the best ones to YouTube Shorts, TikTok, and Instagram Reels. The system includes a comprehensive dashboard for monitoring performance metrics across all platforms.

## 🚀 Features

### Video Generation

- **Multiple Simulation Types**: Bouncing balls, particle physics, fluid dynamics, gravity simulations
- **AI-Powered Generation**: Uses Python/OpenGL for high-quality physics simulations
- **Automated Variations**: Generates multiple variations of each simulation type
- **Quality Analysis**: AI analyzes videos for visual appeal and engagement potential

### Multi-Platform Upload

- **YouTube Shorts**: Automated upload via YouTube Data API v3
- **TikTok**: Upload via TikTok for Business API
- **Instagram Reels**: Upload via Meta Business API
- **Smart Selection**: Only uploads the top-rated videos based on AI analysis

### Analytics Dashboard

- **Real-time Metrics**: Views, likes, comments, shares across all platforms
- **Performance Comparison**: Platform-by-platform analysis
- **Trend Analysis**: Track performance over time
- **Simulation Performance**: See which simulation types perform best

### Automation

- **Scheduled Tasks**: Daily video generation and upload
- **Metrics Sync**: Automatic metric updates from all platforms
- **Quality Control**: AI selects only the best videos for upload
- **Cleanup**: Automatic cleanup of old video files

## 🛠 Tech Stack

### Backend

- **Next.js 15**: Full-stack React framework
- **TypeScript**: Type-safe development
- **Prisma**: Database ORM with PostgreSQL
- **tRPC**: End-to-end typesafe APIs

### Video Generation

- **Python**: Physics simulation scripts
- **OpenCV**: Video processing and encoding
- **Pygame**: 2D graphics and animation
- **NumPy/SciPy**: Mathematical computations

### AI & Analysis

- **OpenAI GPT-4**: Video quality analysis
- **Computer Vision**: Frame analysis for appeal scoring

### Platform APIs

- **YouTube Data API v3**: YouTube Shorts upload
- **TikTok for Business API**: TikTok video upload
- **Meta Business API**: Instagram Reels upload

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd agentic-sims
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Python environment**

   ```bash
   npm run setup
   # or manually:
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Configure environment variables**

   ```bash
   cp env.example .env
   # Edit .env with your API keys and database URL
   ```

5. **Set up database**

   ```bash
   npm run prisma:migrate
   npm run prisma:seed  # Optional: add sample data
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/agentic_sims"

# OpenAI for video analysis
OPENAI_API_KEY="sk-your-openai-api-key-here"

# YouTube Data API v3
YOUTUBE_API_KEY="your-youtube-api-key-here"

# TikTok for Business API
TIKTOK_API_KEY="your-tiktok-api-key-here"
TIKTOK_API_SECRET="your-tiktok-api-secret-here"
TIKTOK_ACCESS_TOKEN="your-tiktok-access-token-here"

# Instagram Basic Display API
INSTAGRAM_ACCESS_TOKEN="your-instagram-access-token-here"
INSTAGRAM_BUSINESS_ACCOUNT_ID="your-instagram-business-account-id-here"
```

### API Setup

1. **YouTube Data API v3**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable YouTube Data API v3
   - Create credentials (API key)

2. **TikTok for Business API**

   - Apply for [TikTok for Business API](https://business-api.tiktok.com/)
   - Note: This requires business approval

3. **Instagram Business API**

   - Set up [Meta for Developers](https://developers.facebook.com/)
   - Create a business app and get access tokens

4. **OpenAI API**
   - Get API key from [OpenAI Platform](https://platform.openai.com/)

## 🎯 Usage

### Automated Daily Process

The system automatically:

1. Generates 20 simulation videos (5 of each type) every day at 9 AM
2. Analyzes each video using AI for quality and appeal
3. Selects the top 3 videos
4. Uploads them to all 3 platforms (YouTube, TikTok, Instagram)
5. Tracks metrics and updates the dashboard

### Manual Operations

You can also trigger operations manually through the dashboard:

- Generate specific simulation types
- Analyze existing videos
- Upload selected videos to specific platforms
- Sync metrics from all platforms

### Dashboard Features

- **Analytics Tab**: View performance metrics and trends
- **Videos Tab**: Browse recent uploads and top performers
- **Simulations Tab**: Generate new simulations and view type performance
- **Settings Tab**: Configure automation and platform connections

## 📊 Database Schema

The system uses the following main entities:

- **Simulation**: Generated physics simulations with parameters
- **Video**: Individual video files with AI scores and metadata
- **Upload**: Platform-specific uploads with URLs and status
- **Metric**: Performance metrics (views, likes, comments, shares)
- **ScheduledJob**: Automated task scheduling and status

## 🔄 Workflow

```mermaid
graph TD
    A[Generate Simulations] --> B[Create Video Files]
    B --> C[AI Analysis]
    C --> D[Quality Scoring]
    D --> E[Select Top Videos]
    E --> F[Upload to Platforms]
    F --> G[Track Metrics]
    G --> H[Update Dashboard]
    H --> I[Schedule Next Batch]
```

## 🎨 Simulation Types

### Bouncing Balls

- Realistic physics with gravity and damping
- Colorful, satisfying motion patterns
- Customizable particle count and physics parameters

### Particle Physics

- Dynamic particle systems with life cycles
- Visual effects with color gradients
- Emergent patterns and behaviors

### Fluid Dynamics

- Fluid simulation with disturbances
- Smooth, organic motion
- Visually appealing flow patterns

### Gravity Simulation

- Multi-body gravitational systems
- Orbital mechanics demonstrations
- Educational and visually striking

## 📈 Performance Optimization

- **Video Generation**: Parallelized simulation rendering
- **AI Analysis**: Batch processing for efficiency
- **Platform APIs**: Rate limiting and retry logic
- **Database**: Optimized queries with proper indexing
- **File Management**: Automatic cleanup of old videos

## 🔧 Troubleshooting

### Common Issues

1. **Python Dependencies**

   ```bash
   # On Ubuntu/Debian
   sudo apt-get install python3-dev python3-pip ffmpeg

   # On macOS
   brew install python ffmpeg
   ```

2. **Database Connection**

   - Ensure PostgreSQL is running
   - Check DATABASE_URL format
   - Run migrations: `npm run prisma:migrate`

3. **API Rate Limits**

   - YouTube: 10,000 requests/day
   - TikTok: Varies by approval level
   - Instagram: 4,800 requests/hour

4. **Video Generation Errors**
   - Check Python virtual environment is activated
   - Ensure all Python dependencies are installed
   - Verify /tmp/videos directory permissions

## 🚀 Deployment

### Production Deployment

1. **Database**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
2. **File Storage**: Configure AWS S3 or similar for temporary video storage
3. **Environment**: Set NODE_ENV=production
4. **Monitoring**: Add error tracking (Sentry, etc.)
5. **Scheduling**: Use cron or cloud functions for automation

### Docker Deployment

```dockerfile
# Use the provided Dockerfile for containerized deployment
docker build -t agentic-sims .
docker run -p 3000:3000 agentic-sims
```

## 📝 API Documentation

The system exposes tRPC APIs for:

- `/api/trpc/simulation.*`: Simulation management
- `/api/trpc/dashboard.*`: Analytics and metrics
- `/api/trpc/upload.*`: Platform upload management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Demo Dashboard](http://localhost:3000) (when running locally)
- [YouTube API Documentation](https://developers.google.com/youtube/v3)
- [TikTok Business API](https://business-api.tiktok.com/)
- [Instagram Business API](https://developers.facebook.com/docs/instagram-api)

---

**Note**: This system is designed for educational and experimental purposes. Make sure to comply with each platform's terms of service and content policies when uploading videos.
