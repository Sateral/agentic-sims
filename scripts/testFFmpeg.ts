import ffmpegPath from 'ffmpeg-static';
import Ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { promises as fs } from 'fs';

const videoPath =
  'D:/Coding/React Projects/agentic-sims/temp/videos/sim_cmehwqe33000ahd30ljrr13dh_0_1755569467037.mp4';

const outputDir = 'D:/Coding/React Projects/agentic-sims/temp/videos/frames';

if (!ffmpegPath) {
  throw new Error('FFmpeg is not installed');
}

Ffmpeg.setFfmpegPath(ffmpegPath);

Ffmpeg()
  .input(videoPath)
  .FPS(1 / 2.5)
  .on('error', (error) => {
    throw new Error(
      `FFmpeg error: ${error.message}. Make sure FFmpeg is installed and available in PATH.`
    );
  })
  .saveToFile(path.join(outputDir, 'frame_%03d.jpg'))
  .on('progress', (progress) => {
    if (progress.percent) {
      console.log(`Processing: ${Math.floor(progress.percent)}% done`);
    }
  })
  .on('end', async () => {
    try {
      const files = await fs.readdir(outputDir);
      const sortedFiles = files
        .filter((f) => f.startsWith('frame_') && f.endsWith('.jpg'))
        .sort()
        .slice(0, 5)
        .map((f) => path.join(outputDir, f));

      return sortedFiles;
    } catch (error) {
      throw new Error(`Error reading frame directory: ${error}`);
    }
  });
