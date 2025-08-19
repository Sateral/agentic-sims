import { SimulationParameters } from '@/services/video/videoGenerator';

export const gravity_sim_script = (
  params: SimulationParameters,
  outputPath: string
) => `
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
out = cv2.VideoWriter('${outputPath.replace(
  /\\/g,
  '/'
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
