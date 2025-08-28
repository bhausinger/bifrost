import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '@/utils/logger';

interface ScrapingProgress {
  taskId: string;
  userId: string;
  totalArtists: number;
  completedArtists: number;
  currentArtist: string;
  progress: number;
  estimatedTimeRemaining: number;
  startTime: number;
  results: any[];
  status: 'running' | 'completed' | 'error';
  error?: string;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private progressTrackers: Map<string, ScrapingProgress> = new Map();

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: ["http://localhost:3333", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.io.on('connection', (socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      socket.on('join-scraping-room', (data: { taskId: string, userId: string }) => {
        const roomName = `scraping-${data.taskId}`;
        socket.join(roomName);
        logger.info(`Client ${socket.id} joined room ${roomName}`);

        // Send current progress if available
        const progress = this.progressTrackers.get(data.taskId);
        if (progress) {
          socket.emit('scraping-progress', progress);
        }
      });

      socket.on('leave-scraping-room', (data: { taskId: string }) => {
        const roomName = `scraping-${data.taskId}`;
        socket.leave(roomName);
        logger.info(`Client ${socket.id} left room ${roomName}`);
      });

      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id}`);
      });
    });

    logger.info('WebSocket service initialized');
  }

  startScrapingProgress(taskId: string, userId: string, artistNames: string[]): void {
    const progress: ScrapingProgress = {
      taskId,
      userId,
      totalArtists: artistNames.length,
      completedArtists: 0,
      currentArtist: artistNames[0] || '',
      progress: 0,
      estimatedTimeRemaining: artistNames.length * 5, // Rough estimate: 5 seconds per artist
      startTime: Date.now(),
      results: [],
      status: 'running'
    };

    this.progressTrackers.set(taskId, progress);
    this.emitProgress(taskId, progress);
  }

  updateScrapingProgress(
    taskId: string, 
    completedArtists: number, 
    currentArtist: string, 
    latestResult?: any
  ): void {
    const progress = this.progressTrackers.get(taskId);
    if (!progress) return;

    const now = Date.now();
    const elapsedTime = (now - progress.startTime) / 1000; // seconds
    const avgTimePerArtist = elapsedTime / Math.max(completedArtists, 1);
    const remainingArtists = progress.totalArtists - completedArtists;
    const estimatedTimeRemaining = remainingArtists * avgTimePerArtist;

    progress.completedArtists = completedArtists;
    progress.currentArtist = currentArtist;
    progress.progress = (completedArtists / progress.totalArtists) * 100;
    progress.estimatedTimeRemaining = Math.round(estimatedTimeRemaining);

    if (latestResult) {
      progress.results.push(latestResult);
    }

    this.emitProgress(taskId, progress);
  }

  completeScrapingProgress(taskId: string, finalResults: any[]): void {
    const progress = this.progressTrackers.get(taskId);
    if (!progress) return;

    progress.completedArtists = progress.totalArtists;
    progress.progress = 100;
    progress.estimatedTimeRemaining = 0;
    progress.results = finalResults;
    progress.status = 'completed';

    this.emitProgress(taskId, progress);

    // Clean up after 5 minutes
    setTimeout(() => {
      this.progressTrackers.delete(taskId);
    }, 5 * 60 * 1000);
  }

  errorScrapingProgress(taskId: string, error: string): void {
    const progress = this.progressTrackers.get(taskId);
    if (!progress) return;

    progress.status = 'error';
    progress.error = error;

    this.emitProgress(taskId, progress);

    // Clean up after 1 minute on error
    setTimeout(() => {
      this.progressTrackers.delete(taskId);
    }, 60 * 1000);
  }

  private emitProgress(taskId: string, progress: ScrapingProgress): void {
    if (!this.io) return;

    const roomName = `scraping-${taskId}`;
    this.io.to(roomName).emit('scraping-progress', progress);
    logger.debug(`Emitted progress for task ${taskId}: ${progress.progress.toFixed(1)}%`);
  }

  // Helper method to format time remaining
  private formatTimeRemaining(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  // Get current progress for a task
  getProgress(taskId: string): ScrapingProgress | null {
    return this.progressTrackers.get(taskId) || null;
  }

  // Get all active progress tasks for a user
  getUserProgress(userId: string): ScrapingProgress[] {
    return Array.from(this.progressTrackers.values())
      .filter(progress => progress.userId === userId);
  }
}

export const webSocketService = new WebSocketService();