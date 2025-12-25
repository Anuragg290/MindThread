import { io, Socket } from 'socket.io-client';
import { Message } from '@/types';

// Socket.io client wrapper for real-time functionality
// Configure your socket server URL here
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

type MessageHandler = (message: Message) => void;
type NotificationHandler = (data: { userId: string; username: string; action: 'join' | 'leave' }) => void;
type TypingHandler = (data: { userId: string; username: string; isTyping: boolean }) => void;

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private notificationHandlers: NotificationHandler[] = [];
  private typingHandlers: TypingHandler[] = [];
  private currentGroupId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    try {
      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
      }

      this.socket = io(SOCKET_URL, {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.reconnectAttempts = 0;
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.reconnectAttempts++;
      });

      // Listen for messages
      this.socket.on('message', (message: Message) => {
        this.messageHandlers.forEach((handler) => handler(message));
      });

      // Listen for notifications
      this.socket.on('notification', (data: { userId: string; username: string; action: 'join' | 'leave' }) => {
        this.notificationHandlers.forEach((handler) => handler(data));
      });

      // Listen for typing indicators
      this.socket.on('typing', (data: { userId: string; username: string; isTyping: boolean }) => {
        this.typingHandlers.forEach((handler) => handler(data));
      });

      // Listen for errors
      this.socket.on('error', (error: { message: string }) => {
        console.error('Socket error:', error.message);
      });

      // Listen for join/leave confirmations
      this.socket.on('joined_group', (data: { groupId: string }) => {
        console.log('Joined group:', data.groupId);
      });

      this.socket.on('left_group', (data: { groupId: string }) => {
        console.log('Left group:', data.groupId);
      });
    } catch (error) {
      console.error('Failed to connect socket', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinGroup(groupId: string) {
    if (this.currentGroupId) {
      this.leaveGroup(this.currentGroupId);
    }
    this.currentGroupId = groupId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_group', { groupId });
    }
  }

  leaveGroup(groupId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_group', { groupId });
    }
    this.currentGroupId = null;
  }

  sendMessage(groupId: string, content: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_message', { groupId, content });
    }
  }

  sendTyping(groupId: string, isTyping: boolean) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing', { groupId, isTyping });
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onNotification(handler: NotificationHandler) {
    this.notificationHandlers.push(handler);
    return () => {
      this.notificationHandlers = this.notificationHandlers.filter((h) => h !== handler);
    };
  }

  onTyping(handler: TypingHandler) {
    this.typingHandlers.push(handler);
    return () => {
      this.typingHandlers = this.typingHandlers.filter((h) => h !== handler);
    };
  }
}

export const socketService = new SocketService();
