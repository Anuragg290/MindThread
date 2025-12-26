import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, Loader2, Users, Trash2, Eye } from 'lucide-react';
import { api } from '@/services/api';
import { FileDocument, Group } from '@/types';
import Navbar from '@/components/Navbar';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FileWithGroup extends Omit<FileDocument, 'group'> {
  group: Group;
}

export default function Documents() {
  const { user } = useAuth();
  const { groups } = useGroups();
  const [allFiles, setAllFiles] = useState<FileWithGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileToDelete, setFileToDelete] = useState<{ fileId: string; groupId: string } | null>(null);

  useEffect(() => {
    if (groups.length > 0) {
      fetchAllFiles();
    } else {
      setIsLoading(false);
    }
  }, [groups]);

  const fetchAllFiles = async () => {
    setIsLoading(true);
    const files: FileWithGroup[] = [];

    for (const group of groups) {
      try {
        const response = await api.getFiles(group._id);
        if (response.success && response.data) {
          response.data.forEach((file: FileDocument) => {
            files.push({ ...file, group });
          });
        }
      } catch (error) {
        console.error(`Error fetching files for group ${group._id}:`, error);
      }
    }

    // Sort by creation date (newest first)
    files.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setAllFiles(files);
    setIsLoading(false);
  };

  const filteredFiles = allFiles.filter((file) => {
    const matchesSearch = 
      file.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.group.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleDownload = (file: FileWithGroup) => {
    window.open(file.url, '_blank');
  };

  const handleView = (file: FileWithGroup) => {
    // Use the same viewing logic as GroupChat
    if (file.mimeType === 'application/pdf') {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`;
      window.open(viewerUrl, '_blank', 'noopener,noreferrer');
    } else if (file.mimeType === 'text/plain') {
      // TXT files: Fetch and display in new tab with formatted HTML
      fetch(file.url)
        .then(response => response.text())
        .then(text => {
          const htmlContent = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>${file.originalName}</title>
                <style>
                  body {
                    font-family: 'Courier New', monospace;
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 20px;
                    background: #fff;
                    color: #000;
                    line-height: 1.6;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                  }
                  @media (prefers-color-scheme: dark) {
                    body {
                      background: #1a1a1a;
                      color: #e0e0e0;
                    }
                  }
                </style>
              </head>
              <body>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
            </html>
          `;
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
          if (newWindow) {
            newWindow.addEventListener('beforeunload', () => {
              URL.revokeObjectURL(url);
            });
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          }
        })
        .catch(error => {
          console.error('Error viewing text file:', error);
          window.open(file.url, '_blank', 'noopener,noreferrer');
        });
    } else if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(file.url)}`;
      window.open(officeViewerUrl, '_blank', 'noopener,noreferrer');
    } else if (file.mimeType.startsWith('image/')) {
      window.open(file.url, '_blank', 'noopener,noreferrer');
    } else {
      window.open(file.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = async (fileId: string, groupId: string) => {
    try {
      const response = await api.deleteFile(groupId, fileId);
      if (response.success) {
        setAllFiles(prev => prev.filter(f => f._id !== fileId));
        setFileToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Documents</h2>
          <p className="text-muted-foreground">All documents shared in your study groups.</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Files List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No documents found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? 'Try a different search term' : 'Documents shared in your groups will appear here'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFiles.map((file) => (
              <Card key={file._id} className="bg-card border-border hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                      <FileText className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate mb-1">
                        {file.originalName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Users className="h-3 w-3" />
                        <span className="truncate">{file.group.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(file.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleView(file)}
                        className="gap-2 h-8"
                        title="View document"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(file)}
                        className="gap-2 h-8"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                      {(() => {
                        const uploaderId = typeof file.uploader === 'string' ? file.uploader : file.uploader?._id;
                        const isOwnFile = uploaderId === user?._id;
                        return isOwnFile ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setFileToDelete({ fileId: file._id, groupId: file.group._id })}
                            className="gap-2 h-8 text-destructive hover:text-destructive"
                            title="Delete document"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog with Glass Theme */}
      <AlertDialog open={fileToDelete !== null} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent className="backdrop-blur-xl bg-background/80 border-border/50 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Document
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this document? This action cannot be undone and the file will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background/50 backdrop-blur-sm border-border/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (fileToDelete) {
                  await handleDelete(fileToDelete.fileId, fileToDelete.groupId);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
