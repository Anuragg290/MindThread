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
  
  // Defensive check: handle cases where uploader might be undefined or a string ID
  const uploaderId = file.uploader
    ? (typeof file.uploader === 'string'
        ? file.uploader
        : file.uploader._id?.toString() || file.uploader.toString())
    : null;
  const isOwn = uploaderId === user?._id?.toString();

  // Defensive check for uploader username
  const uploaderUsername = typeof file.uploader === 'object' && file.uploader?.username
    ? file.uploader.username
    : 'Unknown';
  const initials = uploaderUsername
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
    
    if (!file.url) {
      console.error('File URL is missing');
      return;
    }

    // Cloudinary URLs are direct download links
    // For local URLs (backward compatibility), use the API endpoint
    if (file.url.startsWith('http://') || file.url.startsWith('https://')) {
      // Direct Cloudinary URL or external URL - open in new tab for download
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.originalName || 'download';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Local URL (backward compatibility) - fetch with auth token
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(file.url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (!response.ok) throw new Error('Failed to download file');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.originalName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading file:', error);
        // Fallback: open in new tab
        window.open(file.url, '_blank');
      }
    }
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
            {isOwn ? 'You' : uploaderUsername}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(file.createdAt)}
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
