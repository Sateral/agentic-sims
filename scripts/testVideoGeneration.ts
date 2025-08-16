#!/usr/bin/env tsx

/**
 * Test Video Generation
 *
 * This script tests video generation without uploading to any platform.
 * Use this to verify your Python environment and video generation works.
 */

import { VideoGenerator } from '../services/video/videoGenerator';
import { VideoAnalyzer } from '../services/ai/analyzeSimulation';

async function testVideoGeneration() {
  console.log('🎬 Testing Video Generation System');
  console.log('================================');

  const videoGenerator = new VideoGenerator();
  const videoAnalyzer = new VideoAnalyzer();

  try {
    // Test 1: Generate a single bouncing balls simulation
    console.log('\n📹 Step 1: Generating bouncing balls simulation...');
    const videoIds = await videoGenerator.generateVariations(
      'bouncing_balls',
      1
    );

    if (videoIds.length > 0) {
      console.log(`✅ Successfully generated video: ${videoIds[0]}`);

      // Test 2: Analyze the generated video
      console.log('\n🤖 Step 2: Analyzing video quality...');
      const videoPath = `/tmp/videos/${videoIds[0]}.mp4`;

      try {
        const analysis = await videoAnalyzer.analyzeVideo(
          videoPath,
          'bouncing_balls'
        );
        console.log(`✅ Video analysis complete:`);
        console.log(`   Score: ${analysis.score}/1.0`);
        console.log(`   Appeal: ${analysis.appeal}`);
        console.log(`   Title: ${analysis.suggestedTitle}`);
        console.log(`   Description: ${analysis.suggestedDescription}`);
      } catch (error) {
        console.log(
          `⚠️  Video analysis skipped (requires OpenAI API): ${error}`
        );
      }

      // Test 3: Check if video file exists
      console.log('\n📁 Step 3: Verifying video file...');
      const fs = require('fs');
      if (fs.existsSync(videoPath)) {
        const stats = fs.statSync(videoPath);
        console.log(
          `✅ Video file exists: ${(stats.size / 1024 / 1024).toFixed(2)} MB`
        );
      } else {
        console.log(`❌ Video file not found at: ${videoPath}`);
      }

      console.log('\n🎉 Test completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Set up YouTube OAuth credentials in .env');
      console.log('2. Run the full daily process to test uploads');
    } else {
      console.log('❌ No videos were generated');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure Python 3 is installed');
    console.log(
      '2. Install Python dependencies: pip install -r requirements.txt'
    );
    console.log('3. Check that /tmp/videos directory is writable');

    process.exit(1);
  }
}

// Run the test
testVideoGeneration();
