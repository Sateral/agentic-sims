import { SimulationParameters } from '@/services/video/videoGenerator';

export const fluid_dynamics_script = (
  params: SimulationParameters,
  outputPath: string
) => `
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
out = cv2.VideoWriter('${outputPath.replace(
  /\\/g,
  '/'
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
