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
        // CRITICAL FIX: Rejoin group room if we were in one before reconnection
        if (this.currentGroupId) {
          console.log('Rejoining group after reconnect:', this.currentGroupId);
          this.socket?.emit('join_group', { groupId: this.currentGroupId });
        }
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.reconnectAttempts++;
      });

      // CRITICAL FIX: Listen for messages - ensure handler is always registered
      this.socket.on('message', (message: any) => {
        console.log('🟢 Socket.on("message") triggered:', {
          hasId: !!message?._id,
          hasContent: !!message?.content,
          group: message?.group,
          handlersCount: this.messageHandlers.length
        });
        
        // CRITICAL FIX: Normalize message format - handle undefined timestamps
        if (message && message._id) {
          // Normalize timestamps to prevent toISOString errors
          const normalizedMessage = {
            ...message,
            _id: message._id?.toString() || message._id,
            createdAt: message.createdAt 
              ? (typeof message.createdAt === 'string' 
                  ? message.createdAt 
                  : message.createdAt instanceof Date
                  ? message.createdAt.toISOString()
                  : message.createdAt?.toISOString?.() || new Date(message.createdAt).toISOString())
              : new Date().toISOString(),
            updatedAt: message.updatedAt 
              ? (typeof message.updatedAt === 'string' 
                  ? message.updatedAt 
                  : message.updatedAt instanceof Date
                  ? message.updatedAt.toISOString()
                  : message.updatedAt?.toISOString?.() || new Date(message.updatedAt).toISOString())
              : new Date().toISOString(),
            content: message.content || '',
            sender: message.sender || message.sender,
            group: typeof message.group === 'string' 
              ? message.group 
              : message.group?._id?.toString() || message.group?.toString() || message.group,
          };
          
          // Ensure all handlers receive the normalized message
          this.messageHandlers.forEach((handler, index) => {
            try {
              console.log(`🟢 Calling handler ${index + 1}/${this.messageHandlers.length} with normalized message`);
              handler(normalizedMessage);
            } catch (error) {
              console.error('❌ Error in message handler:', error);
            }
          });
        } else {
          console.warn('⚠️ Received invalid message format:', message);
        }
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
      this.socket.on('error', (error: any) => {
        // CRITICAL FIX: Safely handle error without triggering toISOString
        try {
          const errorMsg = error?.message || String(error) || 'Unknown socket error';
          console.error('Socket error:', errorMsg);
          // Don't try to serialize the error object to avoid toISOString issues
        } catch (err) {
          console.error('Error handling socket error');
        }
      });

      // Listen for join/leave confirmations
      this.socket.on('joined_group', (data: { groupId: string }) => {
        console.log('✅ Successfully joined group:', data.groupId);
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
    
    // CRITICAL FIX: Ensure socket is connected before joining
    if (this.socket) {
      if (this.socket.connected) {
        // Socket is connected, join immediately
        console.log('Joining group (socket connected):', groupId);
        this.socket.emit('join_group', { groupId });
      } else {
        // Socket not connected yet, wait for connection
        console.log('Socket not connected, waiting for connection to join group:', groupId);
        this.socket.once('connect', () => {
          console.log('Socket connected, now joining group:', groupId);
          this.socket?.emit('join_group', { groupId });
        });
      }
    } else {
      console.warn('Socket not initialized, cannot join group:', groupId);
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
      console.log('📤 Emitting send_message via socket:', { groupId, content: content.substring(0, 30) });
      this.socket.emit('send_message', { groupId, content });
    } else {
      console.warn('⚠️ Cannot send message via socket - not connected');
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
