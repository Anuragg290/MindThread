import { io, Socket } from 'socket.io-client';
import { Message, FileDocument } from '@/types';

// Socket.io client wrapper for real-time functionality
// Configure your socket server URL here
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

type MessageHandler = (message: Message) => void;
type FileHandler = (file: FileDocument) => void;
type NotificationHandler = (data: { userId: string; username: string; action: 'join' | 'leave' }) => void;
type TypingHandler = (data: { userId: string; username: string; isTyping: boolean }) => void;
type ReactionHandler = (data: { messageId: string; message: Message }) => void;

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private fileHandlers: FileHandler[] = [];
  private notificationHandlers: NotificationHandler[] = [];
  private typingHandlers: TypingHandler[] = [];
  private reactionHandlers: ReactionHandler[] = [];
  private currentGroupId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnectedState: boolean = false;
  private pendingJoinGroupId: string | null = null;

  // CRITICAL FIX: Set up socket event listeners (called once, re-attached on reconnect)
  private setupSocketListeners() {
    if (!this.socket) return;

    // CRITICAL FIX: Remove existing listeners to prevent duplicates
    this.socket.off('message');
    this.socket.off('message:new'); // Backend emits 'message:new'
    this.socket.off('file');
    this.socket.off('file:new');
    this.socket.off('file:uploaded');
    this.socket.off('notification');
    this.socket.off('typing');
    this.socket.off('reaction:update');
    this.socket.off('error');
    this.socket.off('joined_group');
    this.socket.off('left_group');

    // CRITICAL FIX: Listen for messages - Backend emits 'message:new' event
    // Listen to BOTH 'message' and 'message:new' for compatibility
    const handleMessage = (message: any) => {
      console.log('🟢 Socket message event received:', {
        event: 'message:new or message',
        hasId: !!message?._id,
        messageId: message?._id,
        hasContent: !!message?.content,
        contentPreview: message?.content?.substring(0, 50),
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
        
        // CRITICAL FIX: Call all registered handlers
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
    };

    // CRITICAL FIX: Backend emits 'message:new' - listen to that event
    this.socket.on('message:new', (message: any) => {
      console.log('📨 Received "message:new" event from backend');
      handleMessage(message);
    });
    
    // Also listen to 'message' for backward compatibility (if backend uses it)
    this.socket.on('message', (message: any) => {
      console.log('📨 Received "message" event from backend');
      handleMessage(message);
    });
    
    console.log('✅ Socket listeners registered for "message:new" and "message" events');

    // CRITICAL FIX: Listen for file uploads - backend may emit 'file:new' or 'file:uploaded'
    const handleFile = (file: any) => {
      console.log('📁 Socket file event received:', {
        hasId: !!file?._id,
        filename: file?.originalName || file?.filename,
        group: file?.group,
        handlersCount: this.fileHandlers.length
      });
      
      if (file && file._id) {
        // Normalize file format
        const normalizedFile: FileDocument = {
          ...file,
          _id: file._id?.toString() || file._id,
          createdAt: file.createdAt 
            ? (typeof file.createdAt === 'string' 
                ? file.createdAt 
                : file.createdAt instanceof Date
                ? file.createdAt.toISOString()
                : file.createdAt?.toISOString?.() || new Date(file.createdAt).toISOString())
            : new Date().toISOString(),
          updatedAt: file.updatedAt 
            ? (typeof file.updatedAt === 'string' 
                ? file.updatedAt 
                : file.updatedAt instanceof Date
                ? file.updatedAt.toISOString()
                : file.updatedAt?.toISOString?.() || new Date(file.updatedAt).toISOString())
            : new Date().toISOString(),
          group: typeof file.group === 'string' 
            ? file.group 
            : file.group?._id?.toString() || file.group?.toString() || file.group,
        };
        
        // Call all registered file handlers
        this.fileHandlers.forEach((handler, index) => {
          try {
            console.log(`📁 Calling file handler ${index + 1}/${this.fileHandlers.length}`);
            handler(normalizedFile);
          } catch (error) {
            console.error('❌ Error in file handler:', error);
          }
        });
      } else {
        console.warn('⚠️ Received invalid file format:', file);
      }
    };
    
    // Listen for file events (backend may emit 'file:new', 'file:uploaded', or 'file')
    this.socket.on('file:new', (file: any) => {
      console.log('📨 Received "file:new" event from backend');
      handleFile(file);
    });
    this.socket.on('file:uploaded', (file: any) => {
      console.log('📨 Received "file:uploaded" event from backend');
      handleFile(file);
    });
    this.socket.on('file', (file: any) => {
      console.log('📨 Received "file" event from backend');
      handleFile(file);
    });
    console.log('✅ Socket listeners registered for file events');

    // Listen for notifications
    this.socket.on('notification', (data: { userId: string; username: string; action: 'join' | 'leave' }) => {
      this.notificationHandlers.forEach((handler) => handler(data));
    });

    // Listen for typing indicators
    this.socket.on('typing', (data: { userId: string; username: string; isTyping: boolean }) => {
      this.typingHandlers.forEach((handler) => handler(data));
    });

    // 🔥 TIER 2: Listen for reaction updates
    this.socket.on('reaction:update', (data: any) => {
      console.log('🔥 Reaction update received:', data.messageId);
      // Normalize message format
      const message = data.message as any;
      // Safe date normalization helper
      const normalizeDate = (dateValue: any): string => {
        if (!dateValue) return new Date().toISOString();
        try {
          if (typeof dateValue === 'string') {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return new Date().toISOString();
            return dateValue; // Already a string, return as-is if valid
          }
          if (dateValue instanceof Date) {
            if (isNaN(dateValue.getTime())) return new Date().toISOString();
            return dateValue.toISOString();
          }
          if ((dateValue as any)?.toISOString) {
            return (dateValue as any).toISOString();
          }
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return new Date().toISOString();
          return date.toISOString();
        } catch (error) {
          return new Date().toISOString();
        }
      };

      const normalizedMessage: Message = {
        ...message, // Preserve all fields including sender, content, etc.
        _id: message._id?.toString() || message._id,
        createdAt: normalizeDate(message.createdAt),
        updatedAt: normalizeDate(message.updatedAt),
        // Preserve sender as-is (backend should populate it)
        sender: message.sender || message.sender,
        // Preserve all other fields
        content: message.content || message.content,
        group: message.group || message.group,
        replyTo: message.replyTo || message.replyTo,
        reactions: message.reactions || message.reactions,
      };
      this.reactionHandlers.forEach((handler) => handler({ messageId: data.messageId, message: normalizedMessage }));
    });

    // Listen for errors
    this.socket.on('error', (error: any) => {
      try {
        const errorMsg = error?.message || String(error) || 'Unknown socket error';
        console.error('Socket error:', errorMsg);
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
  }

  connect(token: string) {
    try {
      // Disconnect existing socket if any
      if (this.socket) {
        this.socket.disconnect();
        this.socket.removeAllListeners();
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

      // CRITICAL FIX: Set up listeners immediately (before connect event)
      this.setupSocketListeners();

      this.socket.on('connect', () => {
        console.log('✅ SOCKET CONNECTED - Socket ID:', this.socket?.id);
        this.isConnectedState = true;
        this.reconnectAttempts = 0;
        
        // CRITICAL FIX: Re-attach listeners on reconnect (in case they were lost)
        this.setupSocketListeners();
        console.log('✅ Socket listeners re-attached, registered handlers:', this.messageHandlers.length);
        
        // CRITICAL FIX: Automatically rejoin the last active group on reconnect
        if (this.currentGroupId) {
          console.log('🔄 Auto-rejoining group after reconnect:', this.currentGroupId);
          this.socket?.emit('join_group', { groupId: this.currentGroupId });
        }
        
        // CRITICAL FIX: Join any pending group that was waiting for connection
        if (this.pendingJoinGroupId) {
          console.log('🔄 Joining pending group after connection:', this.pendingJoinGroupId);
          this.socket?.emit('join_group', { groupId: this.pendingJoinGroupId });
          this.currentGroupId = this.pendingJoinGroupId;
          this.pendingJoinGroupId = null;
        }
      });

      this.socket.on('disconnect', () => {
        console.log('⚠️ Socket disconnected');
        this.isConnectedState = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.reconnectAttempts++;
      });
    } catch (error) {
      console.error('Failed to connect socket', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnectedState = false;
      this.currentGroupId = null;
      this.pendingJoinGroupId = null;
    }
  }

  // CRITICAL FIX: Expose connection state
  isConnected(): boolean {
    return this.isConnectedState && this.socket?.connected === true;
  }

  joinGroup(groupId: string) {
    console.log('🔄 joinGroup called:', {
      groupId,
      currentGroupId: this.currentGroupId,
      socketExists: !!this.socket,
      isConnected: this.isConnected(),
      socketId: this.socket?.id
    });
    
    // CRITICAL FIX: Leave previous group if different
    if (this.currentGroupId && this.currentGroupId !== groupId) {
      this.leaveGroup(this.currentGroupId);
    }
    
    this.currentGroupId = groupId;
    
    // CRITICAL FIX: Wait for socket connection before joining
    if (!this.socket) {
      console.warn('⚠️ Socket not initialized, storing group for later:', groupId);
      this.pendingJoinGroupId = groupId;
      return;
    }
    
    if (this.isConnected()) {
      // Socket is connected, join immediately
      console.log('✅ Joining group (socket connected):', groupId, 'Socket ID:', this.socket.id);
      this.socket.emit('join_group', { groupId });
      this.pendingJoinGroupId = null;
    } else {
      // Socket not connected yet, store group ID and wait for connection
      console.log('⏳ Socket not connected, will join when connected:', groupId);
      this.pendingJoinGroupId = groupId;
      
      // The connect event handler in connect() will handle joining
      // No need to set up additional listener here
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

  // CRITICAL FIX: Register message handler - works even if socket not connected yet
  onMessage(handler: MessageHandler) {
    console.log('📝 Registering message handler, total handlers:', this.messageHandlers.length + 1);
    this.messageHandlers.push(handler);
    
    // CRITICAL FIX: If socket is already connected, ensure listener is set up
    if (this.socket && this.isConnected()) {
      // Listener should already be set up, but verify
      console.log('✅ Socket connected, handler registered and ready');
    } else {
      console.log('⏳ Socket not connected yet, handler will be called when socket connects');
    }
    
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
      console.log('🗑️ Unregistered message handler, remaining handlers:', this.messageHandlers.length);
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

  // CRITICAL FIX: Register file handler - works even if socket not connected yet
  onFile(handler: FileHandler) {
    console.log('📝 Registering file handler, total handlers:', this.fileHandlers.length + 1);
    this.fileHandlers.push(handler);
    
    if (this.socket && this.isConnected()) {
      console.log('✅ Socket connected, file handler registered and ready');
    } else {
      console.log('⏳ Socket not connected yet, file handler will be called when socket connects');
    }
    
    return () => {
      this.fileHandlers = this.fileHandlers.filter((h) => h !== handler);
      console.log('🗑️ Unregistered file handler, remaining handlers:', this.fileHandlers.length);
    };
  }

  // 🔥 TIER 2: Subscribe to reaction updates
  onReaction(handler: ReactionHandler) {
    console.log('🔥 Registering reaction handler, total handlers:', this.reactionHandlers.length + 1);
    this.reactionHandlers.push(handler);
    
    if (this.socket && this.isConnected()) {
      console.log('✅ Socket connected, reaction handler registered and ready');
    } else {
      console.log('⏳ Socket not connected yet, reaction handler will be called when socket connects');
    }
    
    return () => {
      this.reactionHandlers = this.reactionHandlers.filter((h) => h !== handler);
      console.log('🗑️ Unregistered reaction handler, remaining handlers:', this.reactionHandlers.length);
    };
  }
}

export const socketService = new SocketService();
