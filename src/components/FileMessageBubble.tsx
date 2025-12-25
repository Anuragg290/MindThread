import { FileDocument } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { FileText, File, Download } from 'lucide-react';
import { useMemo } from 'react';

interface FileMessageBubbleProps {
  file: FileDocument;
}

export default function FileMessageBubble({ file }: FileMessageBubbleProps) {
  const { user } = useAuth();
  const isOwn = file.uploader._id === user?._id;

  const initials = file.uploader.username
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const fileIcon = useMemo(() => {
    const mimeType = file.mimeType?.toLowerCase() || '';
    const fileName = file.originalName?.toLowerCase() || '';

    if (
      mimeType.includes('pdf') ||
      mimeType.includes('word') ||
      mimeType.includes('text') ||
      fileName.endsWith('.pdf') ||
      fileName.endsWith('.doc') ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.txt')
    ) {
      return <FileText className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  }, [file.mimeType, file.originalName]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    // 🔒 unchanged download logic
  };

  return (
    <div className={cn('flex gap-3 mb-6', isOwn && 'flex-row-reverse')}>
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0 border border-border/40">
        <AvatarFallback className="text-xs font-normal bg-muted text-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* File content (IMPORTANT FIX HERE) */}
      <div
        className={cn(
          'flex flex-col min-w-0 max-w-[640px]',
          isOwn && 'items-end'
        )}
      >
        {/* Meta */}
        <div className={cn('flex items-center gap-2 mb-1.5', isOwn && 'flex-row-reverse')}>
          <span className="text-xs font-normal text-foreground">
            {isOwn ? 'You' : file.uploader.username}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(file.createdAt), 'HH:mm')}
          </span>
        </div>

        {/* File bubble */}
        <div
          className={cn(
            'inline-flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer group transition-all',
            isOwn
              ? 'rounded-br-md'
              : 'rounded-bl-md border border-border/40',
            'hover:bg-muted/50'
          )}
          style={{
            backgroundColor: isOwn
              ? 'hsl(var(--chat-bubble-you))'
              : 'hsl(var(--chat-bubble-others))',
            color: isOwn
              ? 'hsl(var(--chat-text-you))'
              : 'hsl(var(--chat-text-others))',
          }}
          onClick={handleDownload}
          title="Click to download"
        >
          {fileIcon}

          <div className="min-w-0">
            <p className="text-sm font-normal break-words">
              {file.originalName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(file.size)}
            </p>
          </div>

          <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
