import { SimulationParameters } from '@/services/video/videoGenerator';

export const particle_physics_script = (
  params: SimulationParameters,
  outputPath: string
) => `
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
out = cv2.VideoWriter('${outputPath.replace(
  /\\/g,
  '/'
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
