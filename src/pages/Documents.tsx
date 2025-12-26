import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Download, Loader2, Users } from 'lucide-react';
import { api } from '@/services/api';
import { FileDocument, Group } from '@/types';
import Navbar from '@/components/Navbar';
import { format } from 'date-fns';

interface FileWithGroup extends FileDocument {
  group: Group;
}

export default function Documents() {
  const { user } = useAuth();
  const { groups } = useGroups();
  const [allFiles, setAllFiles] = useState<FileWithGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file)}
                      className="gap-2"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
