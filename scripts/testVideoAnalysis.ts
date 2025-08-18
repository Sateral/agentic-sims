import { VideoAnalyzer } from '../services/ai/analyzeSimulation';
import { VideoGenerator } from '../services/video/videoGenerator';
import path from 'path';
import { promises as fs } from 'fs';

async function testVideoAnalysis() {
  console.log('🚀 Starting video analysis test...');

  let videoIds: string[] = [];

  try {
    // Initialize services
    const videoGenerator = new VideoGenerator();
    const videoAnalyzer = new VideoAnalyzer();

    // 1. Generate a test video
    console.log('📹 Generating test bouncing balls video...');
    videoIds = await videoGenerator.generateVariations('bouncing_balls', 1);

    if (videoIds.length === 0) {
      throw new Error('Failed to generate test video');
    }

    const videoId = videoIds[0];

    // Get the correct output path based on OS
    const isWindows = process.platform === 'win32';
    const outputDir = isWindows
      ? path.join(process.cwd(), 'temp', 'videos')
      : '/tmp/videos';
    const videoPath = path.join(outputDir, `${videoId}.mp4`);

    // Check if video file exists
    try {
      await fs.access(videoPath);
      console.log('✅ Video generated successfully:', videoPath);
    } catch {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // 2. Analyze the video
    console.log('🔍 Analyzing video with AI...');
    const analysis = await videoAnalyzer.analyzeVideo(
      videoPath,
      'bouncing_balls'
    );

    // 3. Display results
    console.log('\n📊 Analysis Results:');
    console.log('====================');
    console.log(`Score: ${analysis.score}/1.0`);
    console.log(`Appeal: ${analysis.appeal}`);
    console.log(`Title: "${analysis.suggestedTitle}"`);
    console.log(`Description: "${analysis.suggestedDescription}"`);
    console.log('Reasons:', analysis.reasons.join(', '));
    console.log('Visual Qualities:');
    console.log(`  - Color Variety: ${analysis.visualQualities.colorVariety}`);
    console.log(
      `  - Motion Intensity: ${analysis.visualQualities.motionIntensity}`
    );
    console.log(`  - Symmetry: ${analysis.visualQualities.symmetry}`);
    console.log(`  - Complexity: ${analysis.visualQualities.complexity}`);
    console.log('Hashtags:', analysis.hashtags.join(' '));

    // 4. Test quick analysis if we have a thumbnail
    console.log('\n🖼️  Testing quick analysis...');
    const quickResult = await videoAnalyzer.quickAnalyze(videoId);
    console.log(`Quick Score: ${quickResult.score}/1.0`);
    console.log(`Quick Appeal: ${quickResult.appeal}`);

    console.log('\n✅ Video analysis test completed successfully!');
  } catch (error) {
    console.error('❌ Video analysis test failed:', error);

    if (
      error instanceof Error &&
      error.message.includes('spawn ffmpeg ENOENT')
    ) {
      console.log(
        '\n💡 FFmpeg is required for video analysis but not installed.'
      );
      console.log(
        '   📥 Download FFmpeg from: https://ffmpeg.org/download.html'
      );
      console.log('   📁 Extract to C:\\ffmpeg');
      console.log(
        '   🔧 Add C:\\ffmpeg\\bin to your PATH environment variable'
      );
      console.log('   ✅ Restart your terminal/VS Code after installation');
      console.log('\n🎥 Video generation is working correctly!');
      console.log(`   Generated: ${videoIds?.[0] || 'video'}.mp4`);
    }

    if (error instanceof Error && error.message.includes('OpenAI')) {
      console.log('\n💡 Make sure OPENAI_API_KEY is set in your .env file');
    }
  }
}

// Run the test
if (require.main === module) {
  testVideoAnalysis();
}

export { testVideoAnalysis };
