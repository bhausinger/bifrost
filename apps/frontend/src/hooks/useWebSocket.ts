import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  progress: ScrapingProgress | null;
  joinScrapingRoom: (taskId: string, userId: string) => void;
  leaveScrapingRoom: (taskId: string) => void;
}

export const useWebSocket = (serverURL: string = 'http://localhost:4444'): UseWebSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState<ScrapingProgress | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const newSocket = io(serverURL, {
      transports: ['websocket'],
      upgrade: false,
      rememberUpgrade: false
    });

    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setIsConnected(false);
      
      // Auto-reconnect after 3 seconds if not a manual disconnect
      if (reason !== 'io client disconnect') {
        reconnectTimeout.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          newSocket.connect();
        }, 3000);
      }
    });

    newSocket.on('scraping-progress', (progressData: ScrapingProgress) => {
      console.log('📊 Progress update:', progressData);
      setProgress(progressData);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🚫 WebSocket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      newSocket.close();
    };
  }, [serverURL]);

  const joinScrapingRoom = (taskId: string, userId: string) => {
    if (socket && isConnected) {
      console.log(`🎯 Joining scraping room: ${taskId}`);
      socket.emit('join-scraping-room', { taskId, userId });
    }
  };

  const leaveScrapingRoom = (taskId: string) => {
    if (socket) {
      console.log(`🚪 Leaving scraping room: ${taskId}`);
      socket.emit('leave-scraping-room', { taskId });
    }
  };

  return {
    socket,
    isConnected,
    progress,
    joinScrapingRoom,
    leaveScrapingRoom
  };
};

export default useWebSocket;