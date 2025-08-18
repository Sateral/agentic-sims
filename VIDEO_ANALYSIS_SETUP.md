# Video Analysis Setup Guide

This guide will help you set up the video analysis system that uses AI to evaluate generated simulations for social media appeal.

## Dependencies Required

### 1. FFmpeg

The system uses FFmpeg to extract frames from generated videos for AI analysis.

**Windows:**

1. Download from: https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your PATH environment variable
4. Verify: Open PowerShell and run `ffmpeg -version`

**macOS:**

```bash
brew install ffmpeg
```

**Linux:**

```bash
sudo apt update
sudo apt install ffmpeg
```

### 2. Sharp (Image Processing)

Already included in package.json. Used for resizing images before sending to OpenAI Vision API.

### 3. OpenAI API Key

Make sure you have `OPENAI_API_KEY` in your `.env` file:

```
OPENAI_API_KEY=sk-your-key-here
```

## How Video Analysis Works

### 1. Frame Extraction

- Extracts 6 key frames from each generated video
- Uses FFmpeg to capture frames at even intervals
- Resizes frames to 512px width to reduce API costs

### 2. AI Analysis

- Sends frames to OpenAI Vision API (GPT-4 Vision)
- Analyzes visual appeal, motion dynamics, colors, composition
- Generates scores, titles, descriptions, and hashtags
- Evaluates virality potential for social media

### 3. Analysis Results

Each video gets:

- **Score** (0-1): Overall appeal rating
- **Appeal Level**: high/medium/low
- **Reasons**: Specific feedback on visual qualities
- **Suggested Title**: Optimized for YouTube Shorts
- **Description**: With hashtags for maximum reach
- **Visual Qualities**: Color variety, motion, symmetry, complexity
- **Hashtags**: Relevant tags for the simulation type

## Usage

### Analyze a Single Video

```typescript
import { VideoAnalyzer } from '@/services/ai/analyzeSimulation';

const analyzer = new VideoAnalyzer();
const analysis = await analyzer.analyzeVideo(
  '/path/to/video.mp4',
  'bouncing_balls'
);

console.log('Score:', analysis.score);
console.log('Title:', analysis.suggestedTitle);
console.log('Description:', analysis.suggestedDescription);
```

### Via tRPC API

```typescript
// Analyze specific video
const result = await trpc.simulation.analyzeVideo.mutate({
  videoId: 'video_id_here',
  forceReanalyze: false,
});

// Analyze all videos in a simulation
const batch = await trpc.simulation.analyzeAndSelect.mutate({
  simulationId: 'simulation_id_here',
});
```

### Test the System

```bash
npm run test-analysis
```

This will:

1. Generate a test video
2. Extract frames and analyze with AI
3. Display the analysis results
4. Test both full and quick analysis modes

## Video Types Supported

The system can analyze these simulation types:

- **bouncing_balls**: Ball physics simulations
- **particle_physics**: Particle interaction systems
- **fluid_dynamics**: Fluid flow visualizations
- **gravity_sim**: Gravitational body simulations

## API Costs

OpenAI Vision API costs approximately:

- $0.01 per 6 frames (typical video analysis)
- Frames are resized to 512px to minimize costs
- High-quality images cost more than low-quality

## Fallback System

If AI analysis fails:

- System provides reasonable default scores
- Uses simulation type to generate appropriate titles/descriptions
- Ensures the workflow continues even if AI is unavailable

## Performance Optimization

### Frame Extraction

- Only extracts necessary frames (6 per video)
- Automatically cleans up temporary files
- Efficient FFmpeg parameters

### Image Processing

- Resizes images before API calls
- Uses JPEG compression to reduce size
- Maintains quality while minimizing costs

### Caching

- Stores analysis results in database
- Skips re-analysis unless forced
- Quick analysis mode for thumbnails

## Troubleshooting

### FFmpeg Not Found

```
Error: spawn ffmpeg ENOENT
```

**Solution**: Install FFmpeg and add to PATH

### OpenAI API Errors

```
Error: OpenAI API error: 401
```

**Solution**: Check OPENAI_API_KEY in .env file

### File Not Found

```
Error: Video file not found
```

**Solution**: Ensure video generation completed successfully

### Memory Issues

```
Error: spawn ENOMEM
```

**Solution**: Process videos in smaller batches, ensure sufficient RAM

## Integration with Workflow

The video analysis integrates with the daily upload workflow:

1. **Generate Videos** → Multiple variations per simulation type
2. **Analyze Videos** → AI scores each video for appeal
3. **Select Best** → Top-scoring videos chosen for upload
4. **Upload to Platforms** → Selected videos published to YouTube
5. **Track Performance** → Monitor real engagement vs AI predictions

This creates a feedback loop where AI predictions can be validated against actual performance metrics.
