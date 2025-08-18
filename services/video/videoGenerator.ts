import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

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
    const pythonScript = `
import pygame
import random
import math
import cv2
import numpy as np

# Initialize pygame
pygame.init()
WIDTH, HEIGHT = ${params.width}, ${params.height}
FPS = ${params.fps}
DURATION = ${params.duration}

# Colors
BACKGROUND = '${params.backgroundColor || '#000000'}'
BALL_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']

class Ball:
    def __init__(self):
        self.x = random.randint(20, WIDTH - 20)
        self.y = random.randint(20, HEIGHT - 20)
        self.vx = random.uniform(-5, 5)
        self.vy = random.uniform(-5, 5)
        self.radius = random.randint(10, 30)
        self.color = random.choice(BALL_COLORS)
        
    def update(self):
        self.x += self.vx
        self.y += self.vy
        
        # Bounce off walls
        if self.x <= self.radius or self.x >= WIDTH - self.radius:
            self.vx *= -0.9
        if self.y <= self.radius or self.y >= HEIGHT - self.radius:
            self.vy *= -0.9
            
        # Apply gravity
        self.vy += ${params.gravity || 0.1}
        
        # Damping
        self.vx *= ${params.damping || 0.999}
        self.vy *= ${params.damping || 0.999}

# Create balls
balls = [Ball() for _ in range(${params.particleCount || 15})]

# Video writer
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter('${this.formatPathForPython(
      outputPath
    )}', fourcc, FPS, (WIDTH, HEIGHT))

# Simulation loop
for frame in range(FPS * DURATION):
    surface = pygame.Surface((WIDTH, HEIGHT))
    surface.fill(pygame.Color(BACKGROUND))
    
    for ball in balls:
        ball.update()
        pygame.draw.circle(surface, pygame.Color(ball.color), 
                         (int(ball.x), int(ball.y)), ball.radius)
    
    # Convert to numpy array for OpenCV
    frame_array = pygame.surfarray.array3d(surface)
    frame_array = np.rot90(frame_array)
    frame_array = np.flipud(frame_array)
    frame_array = cv2.cvtColor(frame_array, cv2.COLOR_RGB2BGR)
    
    out.write(frame_array)

out.release()
pygame.quit()
`;

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
    const pythonScript = `
import numpy as np
import cv2
import random
import math

WIDTH, HEIGHT = ${params.width}, ${params.height}
FPS = ${params.fps}
DURATION = ${params.duration}
PARTICLE_COUNT = ${params.particleCount || 100}

class Particle:
    def __init__(self):
        self.x = random.uniform(0, WIDTH)
        self.y = random.uniform(0, HEIGHT)
        self.vx = random.uniform(-2, 2)
        self.vy = random.uniform(-2, 2)
        self.life = 1.0
        self.decay = random.uniform(0.01, 0.03)
        
    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.life -= self.decay
        
        # Wrap around edges
        if self.x < 0: self.x = WIDTH
        if self.x > WIDTH: self.x = 0
        if self.y < 0: self.y = HEIGHT
        if self.y > HEIGHT: self.y = 0

particles = [Particle() for _ in range(PARTICLE_COUNT)]

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter('${this.formatPathForPython(
      outputPath
    )}', fourcc, FPS, (WIDTH, HEIGHT))

for frame in range(FPS * DURATION):
    image = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
    
    for particle in particles:
        particle.update()
        
        if particle.life <= 0:
            particle.__init__()  # Reset particle
            
        # Draw particle with life-based alpha
        alpha = max(0, particle.life)
        color = (int(255 * alpha), int(200 * alpha), int(100 * alpha))
        cv2.circle(image, (int(particle.x), int(particle.y)), 2, color, -1)
    
    out.write(image)

out.release()
`;

    await this.runPythonScript(pythonScript);
  }

  /**
   * Generate fluid dynamics simulation
   */
  private async generateFluidDynamics(
    params: SimulationParameters,
    outputPath: string
  ): Promise<void> {
    const pythonScript = `
import numpy as np
import cv2
from scipy.ndimage import gaussian_filter

WIDTH, HEIGHT = ${params.width}, ${params.height}
FPS = ${params.fps}
DURATION = ${params.duration}

# Create fluid grid
grid_size = 64
fluid = np.random.random((grid_size, grid_size)) * 0.1
velocity_x = np.zeros((grid_size, grid_size))
velocity_y = np.zeros((grid_size, grid_size))

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter('${this.formatPathForPython(
      outputPath
    )}', fourcc, FPS, (WIDTH, HEIGHT))

for frame in range(FPS * DURATION):
    # Add disturbance
    if frame % 30 == 0:
        x, y = np.random.randint(10, grid_size-10), np.random.randint(10, grid_size-10)
        fluid[y-5:y+5, x-5:x+5] += 0.5
    
    # Simple fluid simulation
    fluid = gaussian_filter(fluid, sigma=0.5)
    fluid *= 0.995  # Decay
    
    # Resize to output dimensions
    fluid_resized = cv2.resize(fluid, (WIDTH, HEIGHT))
    
    # Convert to color
    colored = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
    colored[:, :, 0] = np.clip(fluid_resized * 255, 0, 255)
    colored[:, :, 1] = np.clip(fluid_resized * 200, 0, 255)
    colored[:, :, 2] = np.clip(fluid_resized * 150, 0, 255)
    
    out.write(colored)

out.release()
`;

    await this.runPythonScript(pythonScript);
  }

  /**
   * Generate gravity simulation
   */
  private async generateGravitySimulation(
    params: SimulationParameters,
    outputPath: string
  ): Promise<void> {
    const pythonScript = `
import numpy as np
import cv2
import math

WIDTH, HEIGHT = ${params.width}, ${params.height}
FPS = ${params.fps}
DURATION = ${params.duration}

class Body:
    def __init__(self, x, y, mass, color):
        self.x = x
        self.y = y
        self.vx = 0
        self.vy = 0
        self.mass = mass
        self.color = color
        self.radius = int(math.sqrt(mass))

bodies = [
    Body(WIDTH//2, HEIGHT//2, 1000, (255, 255, 0)),  # Sun
    Body(WIDTH//2 + 100, HEIGHT//2, 50, (100, 149, 237)),  # Planet 1
    Body(WIDTH//2 - 80, HEIGHT//2, 30, (220, 20, 60)),    # Planet 2
    Body(WIDTH//2, HEIGHT//2 + 120, 40, (50, 205, 50))    # Planet 3
]

# Give planets initial velocity
bodies[1].vy = -2
bodies[2].vy = 2.5
bodies[3].vx = -1.8

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter('${this.formatPathForPython(
      outputPath
    )}', fourcc, FPS, (WIDTH, HEIGHT))

for frame in range(FPS * DURATION):
    image = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
    
    # Calculate gravitational forces
    for i, body1 in enumerate(bodies):
        for j, body2 in enumerate(bodies):
            if i != j:
                dx = body2.x - body1.x
                dy = body2.y - body1.y
                distance = math.sqrt(dx*dx + dy*dy)
                
                if distance > body1.radius + body2.radius:
                    force = 0.1 * body1.mass * body2.mass / (distance * distance)
                    body1.vx += force * dx / distance / body1.mass
                    body1.vy += force * dy / distance / body1.mass
    
    # Update positions
    for body in bodies:
        body.x += body.vx
        body.y += body.vy
        
        # Draw body
        cv2.circle(image, (int(body.x), int(body.y)), body.radius, body.color, -1)
    
    out.write(image)

out.release()
`;

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
      duration: 15, // 15 seconds
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
