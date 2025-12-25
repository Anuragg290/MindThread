import { Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const { user } = useAuth();
  const isOwn = message.sender._id === user?._id;

  const initials = message.sender.username
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={cn('flex gap-3 mb-6', isOwn && 'flex-row-reverse')}>
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0 border border-border/40">
        <AvatarFallback className="text-xs font-normal bg-muted text-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Message content (IMPORTANT FIX HERE) */}
      <div
        className={cn(
          'flex flex-col min-w-0 max-w-[640px]',
          isOwn && 'items-end'
        )}
      >
        {/* Meta */}
        <div className={cn('flex items-center gap-2 mb-1.5', isOwn && 'flex-row-reverse')}>
          <span className="text-xs font-normal text-foreground">
            {isOwn ? 'You' : message.sender.username}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={cn(
            'inline-block rounded-2xl px-4 py-3',
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
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-normal">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}
