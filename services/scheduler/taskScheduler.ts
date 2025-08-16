import { prisma } from '@/lib/prisma';
import { UploadAgent } from '@/services/ai/workflow';

export interface ScheduledTask {
  id: string;
  type: 'daily_upload' | 'metrics_sync' | 'cleanup';
  scheduledAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export class TaskScheduler {
  private uploadAgent = new UploadAgent();
  private isRunning = false;

  constructor() {
    // Start the scheduler
    this.startScheduler();
  }

  /**
   * Start the task scheduler
   */
  private startScheduler() {
    // Check for pending tasks every minute
    setInterval(() => {
      if (!this.isRunning) {
        this.processPendingTasks();
      }
    }, 60 * 1000);

    // Schedule daily tasks
    this.scheduleDailyTasks();
  }

  /**
   * Schedule recurring daily tasks
   */
  private async scheduleDailyTasks() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow

    // Check if tasks are already scheduled for tomorrow
    const existingTasks = await prisma.scheduledJob.findMany({
      where: {
        scheduledAt: {
          gte: new Date(tomorrow.getTime() - 60 * 60 * 1000), // 1 hour before
          lte: new Date(tomorrow.getTime() + 60 * 60 * 1000), // 1 hour after
        },
        status: 'pending',
      },
    });

    // Schedule daily upload if not already scheduled
    if (!existingTasks.some((task) => task.type === 'daily_upload')) {
      await this.scheduleTask('daily_upload', tomorrow);
    }

    // Schedule metrics sync (2 hours after upload)
    const metricsTime = new Date(tomorrow);
    metricsTime.setHours(11, 0, 0, 0);

    if (!existingTasks.some((task) => task.type === 'metrics_sync')) {
      await this.scheduleTask('metrics_sync', metricsTime);
    }

    // Schedule cleanup (once a week)
    if (tomorrow.getDay() === 0) {
      // Sunday
      const cleanupTime = new Date(tomorrow);
      cleanupTime.setHours(2, 0, 0, 0); // 2 AM Sunday

      if (!existingTasks.some((task) => task.type === 'cleanup')) {
        await this.scheduleTask('cleanup', cleanupTime);
      }
    }
  }

  /**
   * Schedule a task
   */
  async scheduleTask(
    type: 'daily_upload' | 'metrics_sync' | 'cleanup',
    scheduledAt: Date
  ): Promise<string> {
    const task = await prisma.scheduledJob.create({
      data: {
        type,
        scheduledAt,
        status: 'pending',
      },
    });

    console.log(`Scheduled ${type} task for ${scheduledAt.toISOString()}`);
    return task.id;
  }

  /**
   * Process all pending tasks
   */
  private async processPendingTasks() {
    this.isRunning = true;

    try {
      const pendingTasks = await prisma.scheduledJob.findMany({
        where: {
          status: 'pending',
          scheduledAt: {
            lte: new Date(),
          },
        },
        orderBy: {
          scheduledAt: 'asc',
        },
      });

      for (const task of pendingTasks) {
        await this.executeTask(task);
      }
    } catch (error) {
      console.error('Error processing pending tasks:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: { id: string; type: string }) {
    console.log(`Executing task ${task.id} of type ${task.type}`);

    // Mark task as running
    await prisma.scheduledJob.update({
      where: { id: task.id },
      data: { status: 'running' },
    });

    try {
      switch (task.type) {
        case 'daily_upload':
          await this.uploadAgent.processDailyUploads();
          break;

        case 'metrics_sync':
          await this.uploadAgent.syncMetrics();
          break;

        case 'cleanup':
          await this.uploadAgent.cleanup();
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Mark task as completed
      await prisma.scheduledJob.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      console.log(`Task ${task.id} completed successfully`);
    } catch (error) {
      // Mark task as failed
      await prisma.scheduledJob.update({
        where: { id: task.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      console.error(`Task ${task.id} failed:`, error);
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(): Promise<ScheduledTask[]> {
    const tasks = await prisma.scheduledJob.findMany({
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });

    return tasks.map((task) => ({
      id: task.id,
      type: task.type as any,
      scheduledAt: task.scheduledAt,
      status: task.status as any,
    }));
  }

  /**
   * Manually trigger a task type
   */
  async triggerTask(
    type: 'daily_upload' | 'metrics_sync' | 'cleanup'
  ): Promise<string> {
    const taskId = await this.scheduleTask(type, new Date());

    // Process immediately
    setTimeout(() => {
      this.processPendingTasks();
    }, 1000);

    return taskId;
  }

  /**
   * Cancel a pending task
   */
  async cancelTask(taskId: string): Promise<void> {
    await prisma.scheduledJob.update({
      where: { id: taskId },
      data: { status: 'failed', error: 'Cancelled by user' },
    });
  }
}

// Create singleton instance
export const taskScheduler = new TaskScheduler();
