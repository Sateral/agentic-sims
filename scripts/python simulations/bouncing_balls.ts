import { SimulationParameters } from '@/services/video/videoGenerator';

export const bouncing_balls_script = (
  params: SimulationParameters,
  outputPath: string
) => `
import numpy as np
import cv2
import random
import math

# Parameters
WIDTH, HEIGHT = ${params.width}, ${params.height}
FPS = ${params.fps}
DURATION = ${params.duration}  # seconds
CIRCLE_CENTER = np.array([WIDTH/2, HEIGHT/2], dtype=np.float64)
CIRCLE_RADIUS = 150
BALL_RADIUS = 5
GRAVITY = 0.2
SPINNING_SPEED = 0.01
ARC_DEGREE = 60
START_ANGLE = math.radians(-ARC_DEGREE/2)
END_ANGLE = math.radians(ARC_DEGREE/2)

# Video writer
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter('${outputPath.replace(
  /\\/g,
  '/'
)}', fourcc, FPS, (WIDTH, HEIGHT))

class Ball:
    def __init__(self, position, velocity):
        self.pos = np.array(position, dtype=np.float64)
        self.v = np.array(velocity, dtype=np.float64)
        self.color = (
            random.randint(100, 255),
            random.randint(100, 255),
            random.randint(100, 255),
        )
        self.is_in = True

def draw_arc(image, center, radius, start_angle, end_angle, color=(0,0,0)):
    p1 = center + (radius+1000) * np.array([math.cos(start_angle),math.sin(start_angle)])
    p2 = center + (radius+1000) * np.array([math.cos(end_angle),math.sin(end_angle)])
    pts = np.array([center, p1, p2], np.int32).reshape((-1,1,2))
    cv2.fillPoly(image, [pts], color)

def is_ball_in_arc(ball_pos, center, start_angle, end_angle):
    dx = ball_pos[0] - center[0]
    dy = ball_pos[1] - center[1]
    ball_angle = math.atan2(dy, dx)
    end_angle = end_angle % (2 * math.pi)
    start_angle = start_angle % (2 * math.pi)
    if start_angle > end_angle:
        end_angle += 2 * math.pi
    return start_angle <= ball_angle <= end_angle or (start_angle <= ball_angle + 2*math.pi <= end_angle)

# Initial ball(s)
ball_pos = np.array([WIDTH/2, HEIGHT/2 - 120], dtype=np.float64)
ball_vel = np.array([0,0], dtype=np.float64)
balls = [Ball(ball_pos, ball_vel)]

start_angle = START_ANGLE
end_angle = END_ANGLE

for frame in range(FPS * DURATION):
    # Black background
    image = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)

    # Rotate arc
    start_angle += SPINNING_SPEED
    end_angle += SPINNING_SPEED

    # Update balls
    for ball in list(balls):  # copy to avoid mutation issues
        # Respawn if outside bounds
        if ball.pos[1] > HEIGHT or ball.pos[0]<0 or ball.pos[0]>WIDTH or ball.pos[1]<0: 
            balls.remove(ball)
            balls.append(Ball([WIDTH // 2, HEIGHT // 2 - 120],[random.uniform(-4, 4),random.uniform(-1, 1)]))
            balls.append(Ball([WIDTH // 2, HEIGHT // 2 - 120],[random.uniform(-4, 4),random.uniform(-1, 1)]))
            continue

        # Apply gravity
        ball.v[1] += GRAVITY 
        ball.pos += ball.v

        # Bounce inside circle
        dist = np.linalg.norm(ball.pos - CIRCLE_CENTER)
        if dist + BALL_RADIUS > CIRCLE_RADIUS:
            if is_ball_in_arc(ball.pos, CIRCLE_CENTER, start_angle, end_angle):
                ball.is_in = False
            if ball.is_in:
                d = ball.pos - CIRCLE_CENTER
                d_unit = d / np.linalg.norm(d)
                ball.pos = CIRCLE_CENTER + (CIRCLE_RADIUS - BALL_RADIUS) * d_unit
                t = np.array([-d[1], d[0]], dtype=np.float64)
                proj_v_t = (np.dot(ball.v, t)/np.dot(t,t)) * t
                ball.v = 2 * proj_v_t - ball.v
                ball.v += t * SPINNING_SPEED

    # Draw circle & arc
    cv2.circle(image, (int(CIRCLE_CENTER[0]), int(CIRCLE_CENTER[1])), CIRCLE_RADIUS, (0,165,255), 2)
    draw_arc(image, CIRCLE_CENTER, CIRCLE_RADIUS, start_angle, end_angle, (0,0,0))

    # Draw balls
    for ball in balls:
        cv2.circle(image, (int(ball.pos[0]), int(ball.pos[1])), BALL_RADIUS, ball.color, -1)

    out.write(image)

out.release()
print("Video saved as bouncing_balls.mp4")
`;
