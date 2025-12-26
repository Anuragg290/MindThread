import { useState, useMemo, useRef, useEffect } from 'react';
import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Reply } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  // 🔥 TIER 1: Message grouping props
  isGrouped?: boolean; // If true, hide avatar and reduce spacing
  showAvatar?: boolean; // Whether to show avatar
  showUsername?: boolean; // Whether to show username
  // 🔥 TIER 2: Callbacks for premium features
  onReaction?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  repliedToMessage?: Message; // Message this is replying to
}

export default function MessageBubble({ 
  message, 
  isGrouped = false,
  showAvatar = true,
  showUsername = true,
  onReaction,
  onReply,
  repliedToMessage
}: MessageBubbleProps) {
  // CRITICAL: message._id MUST exist (enforced by upsertMessage)
  // If _id is missing, this indicates a state corruption bug
  if (!message._id) {
    console.error('❌ MessageBubble: message._id is missing - this should never happen', message);
    return null; // Don't render broken messages
  }
  
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Defensive check: handle cases where sender might be undefined or a string ID
  const senderId = message.sender
    ? (typeof message.sender === 'string'
        ? message.sender
        : message.sender._id?.toString() || message.sender.toString())
    : null;
  const isOwn = senderId === user?._id?.toString();

  // Safe date formatting helper
  const formatTime = (dateValue: string | Date | undefined): string => {
    if (!dateValue) return '--:--';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '--:--';
      return format(date, 'HH:mm');
    } catch (error) {
      return '--:--';
    }
  };
  
  // 🔥 Keep reaction buttons visible for 2 seconds after mouse leaves
  const handleMouseEnter = () => {
    // Clear any pending hide timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };
  
  const handleMouseLeave = () => {
    // Standard hover delay (300ms) to allow clicking
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      hoverTimeoutRef.current = null;
    }, 200);
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  // 🔥 TIER 2: Quick reaction emojis
  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  
  // CRITICAL: message.reactions is guaranteed to be an array (normalized by upsertMessage)
  // Always use message.reactions directly (never undefined/null)
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  
  // 🔥 TIER 2: Check if user has reacted with specific emoji
  const hasUserReacted = useMemo(() => {
    if (!user?._id) return false;
    return reactions.some(reaction => reaction.users.includes(user._id));
  }, [reactions, user?._id]);
  
  // 🔥 TIER 2: Get reaction count for emoji
  const getReactionCount = (emoji: string) => {
    const reaction = reactions.find(r => r.emoji === emoji);
    return reaction?.users.length || 0;
  };
  
  // 🔥 TIER 2: Handle reaction click
  // CRITICAL: message._id is guaranteed to exist (checked at component entry)
  const handleReaction = (emoji: string) => {
    if (!onReaction) return;
    
    // message._id is guaranteed to exist (checked above at component entry)
    // Ensure _id is a string for API call
    const messageId = typeof message._id === 'string' 
      ? message._id 
      : (message._id as any)?.toString?.() || String(message._id);
    
    onReaction(messageId, emoji);
  };

  // Defensive check for sender username
  const senderUsername = typeof message.sender === 'object' && message.sender?.username
    ? message.sender.username
    : 'Unknown';
  const initials = senderUsername
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn(
      'flex gap-3',
      isGrouped ? 'mb-1' : 'mb-6', // 🔥 Reduced spacing when grouped
      isOwn && 'flex-row-reverse'
    )}>
      {/* Avatar - 🔥 Hide when grouped */}
      {showAvatar ? (
        <Avatar className="h-8 w-8 flex-shrink-0 border border-border/40">
          <AvatarFallback className="text-xs font-normal bg-muted text-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 flex-shrink-0" /> // Spacer to maintain alignment
      )}

      {/* Message content */}
      <div
        className={cn(
          'flex flex-col min-w-0 max-w-[640px]',
          isOwn && 'items-end'
        )}
      >
        {/* Meta - 🔥 Hide username when grouped */}
        {showUsername && (
          <div className={cn('flex items-center gap-2 mb-1.5', isOwn && 'flex-row-reverse')}>
            <span className="text-xs font-normal text-foreground">
              {isOwn ? 'You' : senderUsername}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'relative inline-block rounded-2xl px-4 py-3 group',
            isOwn
              ? 'rounded-br-md'
              : 'rounded-bl-md border border-border/40'
          )}
          style={{
            backgroundColor: isOwn
              ? 'hsl(var(--chat-bubble-you))'
              : 'hsl(var(--chat-bubble-others))',
            color: isOwn
              ? 'hsl(var(--chat-text-you))'
              : 'hsl(var(--chat-text-others))',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* 🔥 TIER 2: Reply preview */}
          {repliedToMessage && (
            <div className="mb-2 pb-2 border-b border-border/30">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Reply className="h-3 w-3" />
                {typeof repliedToMessage.sender === 'object' && repliedToMessage.sender?.username
                  ? repliedToMessage.sender.username
                  : 'Unknown'}
              </div>
              <div className="text-xs text-foreground/70 truncate">
                {repliedToMessage.content}
              </div>
            </div>
          )}
          
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-normal">
            {message.content}
          </p>
          
          {/* 🔥 TIER 2: Hover actions (reactions + reply) - Opposite side positioning */}
          {isHovered && (
            <div 
              className={cn(
                'absolute top-0 flex items-center gap-1 transition-opacity z-10',
                // 🔥 FIX: Reactions appear on OPPOSITE side of message
                // Own messages (right side) → reactions on left
                // Others' messages (left side) → reactions on right
                isOwn ? 'right-full mr-2' : 'left-full ml-2'
              )}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {/* Reply button */}
              {onReply && (
                <button
                  onClick={() => onReply(message)}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-card border border-border shadow-sm hover:bg-muted/50 transition-colors"
                  title="Reply"
                >
                  <Reply className="h-3.5 w-3.5 text-foreground" />
                </button>
              )}
              
              {/* Reaction buttons */}
              {onReaction && (
                <div className="flex items-center gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-sm">
                  {quickReactions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className={cn(
                        'h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors text-sm',
                        hasUserReacted && getReactionCount(emoji) > 0 && 'bg-muted/30'
                      )}
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* 🔥 TIER 2: Display reactions below message */}
          {/* CRITICAL: reactions is guaranteed to be an array (normalized) */}
          {reactions.length > 0 && (
            <div className={cn(
              'flex items-center gap-1 mt-2 flex-wrap',
              isOwn && 'justify-end'
            )}>
              {reactions
                .filter(r => r.users.length > 0)
                .map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => handleReaction(reaction.emoji)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-border bg-card hover:bg-muted/50 transition-colors',
                      reaction.users.includes(user?._id || '') && 'bg-muted/30 border-primary/20'
                    )}
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-muted-foreground">{reaction.users.length}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
