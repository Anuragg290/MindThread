import { useState, useRef, useEffect, useMemo } from 'react';
import { Message, FileDocument } from '@/types';
import MessageBubble from './MessageBubble';
import FileMessageBubble from './FileMessageBubble';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, MessageSquare, Plus, ChevronDown } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  files?: FileDocument[];
  isLoading: boolean;
  hasMore: boolean;
  onSendMessage: (content: string) => Promise<{ success: boolean }>;
  onLoadMore: () => void;
  onFileUpload?: (file: File) => Promise<void>;
  isUploading?: boolean;
}

export default function ChatWindow({
  messages,
  files = [],
  isLoading,
  hasMore,
  onSendMessage,
  onLoadMore,
  onFileUpload,
  isUploading = false,
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combine messages and files chronologically for display
  const combinedItems = useMemo(() => {
    const items: Array<{ type: 'message' | 'file'; data: Message | FileDocument; timestamp: string }> = [];
    
    // Add messages
    messages.forEach(msg => {
      items.push({ type: 'message', data: msg, timestamp: msg.createdAt });
    });
    
    // Add files
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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current && bottomRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        setShowScrollToBottom(false);
      }
    }
  }, [combinedItems]);

  // Handle scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollThreshold = 200;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < scrollThreshold;
      setShowScrollToBottom(!isNearBottom);
    };

    // Check initial state after a brief delay to ensure DOM is ready
    setTimeout(() => handleScroll(), 100);

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [combinedItems]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (bottomRef.current && messagesContainerRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const result = await onSendMessage(newMessage.trim());
    if (result.success) {
      setNewMessage('');
    }
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
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
              {combinedItems.map((item) => {
                if (item.type === 'message') {
                  return <MessageBubble key={`msg-${item.data._id}`} message={item.data as Message} />;
                } else {
                  return <FileMessageBubble key={`file-${item.data._id}`} file={item.data as FileDocument} />;
                }
              })}
            </div>
          )}
          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

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
              placeholder="Message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
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
