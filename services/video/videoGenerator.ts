import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { bouncing_balls_script } from '@/scripts/python simulations/bouncing_balls';
import { particle_physics_script } from '@/scripts/python simulations/particle_physics';
import { fluid_dynamics_script } from '@/scripts/python simulations/fluid_dynamics';
import { gravity_sim_script } from '@/scripts/python simulations/gravity_sim';

export interface SimulationParameters {
  type: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
  particleCount?: number;
  gravity?: number;
  damping?: number;
  colorScheme?: string;
  backgroundColor?: string;
  [key: string]: any;
}

export class VideoGenerator {
  private outputDir: string;

  constructor() {
    // Use appropriate output directory for the OS
    const isWindows = process.platform === 'win32';
    this.outputDir = isWindows
      ? path.join(process.cwd(), 'temp', 'videos')
      : '/tmp/videos';

    this.ensureOutputDir();
  }

  private async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create output directory:', error);
    }
  }

  /**
   * Format path for use in Python scripts (handle Windows backslashes)
   */
  private formatPathForPython(filePath: string): string {
    // Convert Windows backslashes to forward slashes for Python
    return filePath.replace(/\\/g, '/');
  }

  /**
   * Generate multiple video variations for a simulation type
   */
  async generateVariations(
    simulationType: string,
    count: number = 5
  ): Promise<string[]> {
    const variations = this.createParameterVariations(simulationType, count);
    const simulationId = await this.createSimulationRecord(
      simulationType,
      variations
    );

    const videoIds: string[] = [];

    for (let i = 0; i < variations.length; i++) {
      const params = variations[i];
      try {
        const videoId = await this.generateSingleVideo(simulationId, params, i);
        videoIds.push(videoId);
      } catch (error) {
        console.error(`Failed to generate video ${i}:`, error);
      }
    }

    return videoIds;
  }

  /**
   * Generate a single video using external processes
   */
  private async generateSingleVideo(
    simulationId: string,
    parameters: SimulationParameters,
    index: number
  ): Promise<string> {
    const videoId = `sim_${simulationId}_${index}_${Date.now()}`;
    const outputPath = path.join(this.outputDir, `${videoId}.mp4`);

    // Create video record in database
    await prisma.video.create({
      data: {
        id: videoId,
        simulationId,
        title: `${parameters.type} Simulation ${index + 1}`,
        description: `Generated ${
          parameters.type
        } simulation with ${JSON.stringify(parameters)}`,
        duration: parameters.duration,
        status: 'generating',
      },
    });

    try {
      // Choose generation method based on simulation type
      switch (parameters.type) {
        case 'bouncing_balls':
          await this.generateBouncingBalls(parameters, outputPath);
          break;
        case 'particle_physics':
          await this.generateParticlePhysics(parameters, outputPath);
          break;
        case 'fluid_dynamics':
          await this.generateFluidDynamics(parameters, outputPath);
          break;
        case 'gravity_sim':
          await this.generateGravitySimulation(parameters, outputPath);
          break;
        default:
          throw new Error(`Unknown simulation type: ${parameters.type}`);
      }

      // Update status to generated
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'generated' },
      });

      return videoId;
    } catch (error) {
      // Update status to failed
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  /**
   * Generate bouncing balls simulation using Python
   */
  private async generateBouncingBalls(
    params: SimulationParameters,
    outputPath: string
  ): Promise<void> {
    const pythonScript = bouncing_balls_script(params, outputPath);

    await this.runPythonScript(pythonScript);
  }

  /**
   * Generate particle physics simulation using C++/OpenGL
   */
  private async generateParticlePhysics(
    params: SimulationParameters,
    outputPath: string
  ): Promise<void> {
    // For now, use Python implementation, but could be replaced with C++
    const pythonScript = particle_physics_script(params, outputPath);

    await this.runPythonScript(pythonScript);
  }

  /**
   * Generate fluid dynamics simulation
   */
  private async generateFluidDynamics(
    params: SimulationParameters,
    outputPath: string
  ): Promise<void> {
    const pythonScript = fluid_dynamics_script(params, outputPath);

    await this.runPythonScript(pythonScript);
  }

  /**
   * Generate gravity simulation
   */
  private async generateGravitySimulation(
    params: SimulationParameters,
    outputPath: string
  ): Promise<void> {
    const pythonScript = gravity_sim_script(params, outputPath);
    await this.runPythonScript(pythonScript);
  }

  /**
   * Run Python script using virtual environment
   */
  private async runPythonScript(script: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use the virtual environment Python executable
      // Windows virtual environment structure is different from Linux
      const isWindows = process.platform === 'win32';
      const pythonPath = isWindows
        ? 'D:/Coding/React Projects/agentic-sims/venv/Scripts/python.exe'
        : '/home/danielkop/Projects/agentic-sims/venv/bin/python';

      const python = spawn(pythonPath, ['-c', script]);

      python.stdout.on('data', (data) => {
        console.log(`Python output: ${data}`);
      });

      python.stderr.on('data', (data) => {
        console.error(`Python error: ${data}`);
      });

      python.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Python script exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Create parameter variations for a simulation type
   */
  private createParameterVariations(
    type: string,
    count: number
  ): SimulationParameters[] {
    const baseParams: SimulationParameters = {
      type,
      width: 1080,
      height: 1920, // Vertical format for shorts
      duration: 60, // 60 seconds
      fps: 30,
    };

    const variations: SimulationParameters[] = [];

    for (let i = 0; i < count; i++) {
      const params = { ...baseParams };

      switch (type) {
        case 'bouncing_balls':
          params.particleCount = 10 + Math.floor(Math.random() * 20);
          params.gravity = 0.1 + Math.random() * 0.3;
          params.damping = 0.95 + Math.random() * 0.04;
          params.backgroundColor = ['#000033', '#001122', '#110022'][
            Math.floor(Math.random() * 3)
          ];
          break;

        case 'particle_physics':
          params.particleCount = 50 + Math.floor(Math.random() * 100);
          break;

        case 'fluid_dynamics':
          params.viscosity = 0.1 + Math.random() * 0.5;
          break;

        case 'gravity_sim':
          params.bodyCount = 3 + Math.floor(Math.random() * 5);
          break;
      }

      variations.push(params);
    }

    return variations;
  }

  /**
   * Create simulation record in database
   */
  private async createSimulationRecord(
    type: string,
    parameters: SimulationParameters[]
  ): Promise<string> {
    const simulation = await prisma.simulation.create({
      data: {
        name: `${type} - ${new Date().toISOString()}`,
        type,
        parameters: parameters,
        status: 'generating',
      },
    });

    return simulation.id;
  }
}
