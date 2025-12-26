import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Message, FileDocument } from '@/types';
import MessageBubble from './MessageBubble';
import FileMessageBubble from './FileMessageBubble';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, MessageSquare, Plus, ChevronDown, X } from 'lucide-react';
import { socketService } from '@/services/socket';
import { useAuth } from '@/contexts/AuthContext';

interface ChatWindowProps {
  groupId: string; // 🔥 Added for typing indicator
  messages: Message[];
  files?: FileDocument[];
  isLoading: boolean;
  hasMore: boolean;
  onSendMessage: (content: string, replyTo?: string) => Promise<{ success: boolean }>;
  onLoadMore: () => void;
  onFileUpload?: (file: File) => Promise<void>;
  isUploading?: boolean;
  // 🔥 TIER 2: Callbacks for premium features
  onReaction?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
}

export default function ChatWindow({
  groupId,
  messages,
  files = [],
  isLoading,
  hasMore,
  onSendMessage,
  onLoadMore,
  onFileUpload,
  isUploading = false,
  onReaction,
  onReply,
}: ChatWindowProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 🔥 TIER 1: Typing indicator state
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map()); // userId -> username
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🔥 TIER 2: Reply to message state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // 🔥 TIER 1: Combine messages and files with grouping logic
  const combinedItems = useMemo(() => {
    const items: Array<{ 
      type: 'message' | 'file'; 
      data: Message | FileDocument; 
      timestamp: string;
      // Grouping props for messages
      isGrouped?: boolean;
      showAvatar?: boolean;
      showUsername?: boolean;
    }> = [];
    
    // Add messages with grouping calculation
    messages.forEach((msg, index) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      
      // 🔥 Grouping logic: same sender + within 2 minutes
      // Defensive check: handle cases where sender might be undefined or a string ID
      const prevSenderId = prevMessage?.sender 
        ? (typeof prevMessage.sender === 'string' 
            ? prevMessage.sender 
            : prevMessage.sender._id?.toString() || prevMessage.sender.toString())
        : null;
      const currentSenderId = msg.sender
        ? (typeof msg.sender === 'string'
            ? msg.sender
            : msg.sender._id?.toString() || msg.sender.toString())
        : null;
      
      // Safe date comparison for grouping
      let timeDiff = Infinity;
      try {
        if (msg.createdAt && prevMessage.createdAt) {
          const msgDate = new Date(msg.createdAt);
          const prevDate = new Date(prevMessage.createdAt);
          if (!isNaN(msgDate.getTime()) && !isNaN(prevDate.getTime())) {
            timeDiff = msgDate.getTime() - prevDate.getTime();
          }
        }
      } catch (error) {
        // Invalid dates, skip grouping
        timeDiff = Infinity;
      }
      
      const isGrouped = prevMessage && 
        prevSenderId && 
        currentSenderId &&
        prevSenderId === currentSenderId &&
        timeDiff <= 2 * 60 * 1000;
      
      const showAvatar = !isGrouped;
      const showUsername = !isGrouped;
      
      items.push({ 
        type: 'message', 
        data: msg, 
        timestamp: msg.createdAt,
        isGrouped,
        showAvatar,
        showUsername
      });
    });
    
    // Add files (no grouping for files)
    files.forEach(file => {
      items.push({ type: 'file', data: file, timestamp: file.createdAt });
    });
    
    // Sort by timestamp (oldest first)
    return items.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [messages, files]);

  // UI-only: Handle file upload trigger from "+" button
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      await onFileUpload(file);
      // Reset input to allow uploading same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 🔥 TIER 1: Listen for typing indicators from other users
  useEffect(() => {
    const unsubscribe = socketService.onTyping((data) => {
      // Ignore own typing indicator
      if (data.userId === user?._id) return;
      
      if (data.isTyping) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.set(data.userId, data.username);
          return next;
        });
        
        // Auto-hide after 3 seconds of inactivity
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(data.userId);
            return next;
          });
        }, 3000);
      } else {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }
    });

    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user?._id]);

  // Track if this is the initial load
  const isInitialLoadRef = useRef(true);

  // 🔥 TIER 1: Scroll to bottom on initial load, then only if user is near bottom (ChatGPT behavior)
  useEffect(() => {
    if (messagesContainerRef.current && bottomRef.current) {
      const container = messagesContainerRef.current;
      
      // On initial load, always scroll to bottom
      if (isInitialLoadRef.current && !isLoading && combinedItems.length > 0) {
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'auto' });
          isInitialLoadRef.current = false;
          // Mark messages as read when viewing
          if (user?._id) {
            const lastMessage = combinedItems[combinedItems.length - 1];
            if (lastMessage) {
              localStorage.setItem(`lastRead_${groupId}_${user._id}`, lastMessage.timestamp);
            }
          }
        }, 100);
        return;
      }
      
      // After initial load, only auto-scroll if near bottom
      const scrollThreshold = 150;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold;
      
      if (isNearBottom) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        setShowScrollToBottom(false);
        // Mark messages as read when scrolling to bottom
        if (user?._id && combinedItems.length > 0) {
          const lastMessage = combinedItems[combinedItems.length - 1];
          if (lastMessage) {
            localStorage.setItem(`lastRead_${groupId}_${user._id}`, lastMessage.timestamp);
          }
        }
      }
    }
  }, [combinedItems, isLoading, groupId, user?._id]);

  // Reset initial load flag when groupId changes
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [groupId]);

  // Handle scroll position to show/hide scroll-to-bottom button and mark messages as read
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollThreshold = 200;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold;
      setShowScrollToBottom(!isNearBottom);
      
      // Mark messages as read when user scrolls to bottom
      if (isNearBottom && user?._id && combinedItems.length > 0) {
        const lastMessage = combinedItems[combinedItems.length - 1];
        if (lastMessage) {
          localStorage.setItem(`lastRead_${groupId}_${user._id}`, lastMessage.timestamp);
        }
      }
    };

    // Check initial state after a brief delay to ensure DOM is ready
    setTimeout(() => handleScroll(), 100);

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [combinedItems, groupId, user?._id]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (bottomRef.current && messagesContainerRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 🔥 TIER 2: Handle reply
  const handleReply = useCallback((message: Message) => {
    setReplyingTo(message);
    scrollToBottom(); // Scroll to input when replying
  }, []);

  // 🔥 TIER 2: Cancel reply
  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    emitTyping(false); // 🔥 Stop typing indicator when sending
    setIsSending(true);
    
    // 🔥 TIER 2: Pass replyTo separately (not in content)
    const replyToId = replyingTo?._id;
    const result = await onSendMessage(newMessage.trim(), replyToId);
    if (result.success) {
      setNewMessage('');
      setReplyingTo(null); // Clear reply state
    }
    setIsSending(false);
  };

  // 🔥 TIER 1: Debounced typing indicator (400ms debounce)
  const emitTyping = useCallback((isTyping: boolean) => {
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }
    
    typingDebounceRef.current = setTimeout(() => {
      socketService.sendTyping(groupId, isTyping);
    }, 400);
  }, [groupId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // 🔥 Emit typing indicator when user types
    if (value.trim().length > 0) {
      emitTyping(true);
    } else {
      emitTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      emitTyping(false); // Stop typing when sending
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* 
        LAYOUT: ChatGPT-like scrolling
        - Messages area scrolls independently
        - Input fixed at bottom
        - Messages have max-width and left alignment
        - Right padding to avoid touching sidebar
      */}
      {/* Messages Area - Scrollable container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scrollbar-thin"
      >
        <div className="max-w-7xl pr-4 lg:pr-6">
          {hasMore && (
            <div className="flex justify-center mb-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onLoadMore} 
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Load earlier messages'
                )}
              </Button>
            </div>
          )}

          {isLoading && combinedItems.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : combinedItems.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {combinedItems.map((item, index) => {
                if (item.type === 'message') {
                  const msg = item.data as Message;
                  // 🔥 TIER 2: Find replied-to message for preview
                  const repliedToMessage = msg.replyTo 
                    ? messages.find(m => m._id === msg.replyTo)
                    : null;
                  
                  // CRITICAL: message._id MUST exist (enforced by upsertMessage)
                  // React key MUST be message._id for proper reconciliation
                  if (!msg._id) {
                    console.error('❌ Message missing _id in ChatWindow render', msg);
                    return null; // Skip rendering messages without _id
                  }
                  
                  return (
                    <MessageBubble 
                      key={msg._id} 
                      message={msg}
                      isGrouped={item.isGrouped}
                      showAvatar={item.showAvatar}
                      showUsername={item.showUsername}
                      onReaction={onReaction}
                      onReply={handleReply}
                      repliedToMessage={repliedToMessage || undefined}
                    />
                  );
                } else {
                  const file = item.data as FileDocument;
                  const safeKey = file._id ? `file-${file._id}` : `file-${item.timestamp}-${index}`;
                  return <FileMessageBubble key={safeKey} file={file} />;
                }
              })}
            </div>
          )}
          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* 🔥 TIER 1: Typing Indicator - Shows above input */}
      {typingUsers.size > 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-card border border-border rounded-full shadow-sm text-xs text-muted-foreground">
          {Array.from(typingUsers.values()).length === 1 ? (
            <span>{Array.from(typingUsers.values())[0]} is typing…</span>
          ) : typingUsers.size === 2 ? (
            <span>{Array.from(typingUsers.values()).join(' and ')} are typing…</span>
          ) : (
            <span>{typingUsers.size} people are typing…</span>
          )}
        </div>
      )}

      {/* Scroll to Bottom Button - Appears when scrolled up */}
      {showScrollToBottom && (
  <button
    onClick={scrollToBottom}
    className="
      absolute
      bottom-24
      left-1/2
      -translate-x-1/2
      z-20
      h-10 w-10
      rounded-full
      bg-card
      border border-border
      shadow-lg
      flex items-center justify-center
      hover:bg-muted/50
      transition-all
      hover:scale-105
    "
    title="Scroll to bottom"
  >
    <ChevronDown className="h-5 w-5 text-foreground" />
  </button>
)}


      {/* Input Area - Fixed at bottom */}
      {/* 
        INPUT LAYOUT: Fixed at bottom
        - Always positioned at bottom (flex-shrink-0)
        - Centered horizontally (max-w-3xl mx-auto)
        - Floating above bottom with spacing (pb-4 pt-2)
        - Pill-shaped (rounded-full)
        - Icons inside input (left: +, right: send)
        - Not full-width, subtle border
        - ChatGPT-like monochrome design
      */}
      <div className="flex-shrink-0 pb-4 pt-2 border-t border-border bg-background">
        <div className="max-w-[700px] mx-auto px-4 pr-4 lg:pr-6">
          {/* 🔥 TIER 2: Reply preview above input */}
          {replyingTo && (
            <div className="mb-2 px-3 py-2 bg-muted/30 border border-border rounded-lg flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">
                  Replying to <span className="font-medium text-foreground">{replyingTo.sender?.username || 'Unknown'}</span>
                </div>
                <div className="text-sm text-foreground/80 line-clamp-2">
                  {replyingTo.content || 'File attachment'}
                </div>
              </div>
              <button
                onClick={cancelReply}
                className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
                title="Cancel reply"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}
          {/* Hidden file input - UI trigger moved here from Files tab */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.docx,.txt"
          />
          {/* ChatGPT-style input: pill-shaped, centered, with icons inside */}
          <div className="relative flex items-center rounded-full border border-border bg-card shadow-sm">
            {/* "+" icon inside input on the left */}
            <button
              type="button"
              onClick={handleFileButtonClick}
              disabled={isUploading}
              className="absolute left-3 h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors disabled:opacity-50 z-10"
              title="Upload file"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-foreground" />
              ) : (
                <Plus className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {/* Textarea - takes full width with padding for icons */}
            <Textarea
              placeholder={replyingTo ? `Reply to ${replyingTo.sender?.username || 'message'}...` : "Message..."}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={() => emitTyping(false)} // 🔥 Stop typing when input loses focus
              rows={1}
              className="flex-1 min-h-[44px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-full pl-11 pr-11 py-3 text-sm"
            />
            {/* Send button inside input on the right */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
              className="absolute right-2 h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin text-foreground" />
              ) : (
                <Send className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
