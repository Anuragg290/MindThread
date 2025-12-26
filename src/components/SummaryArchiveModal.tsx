import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Zap, FileText, MessageSquare } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';
import { Summary, Group } from '@/types';
import { api } from '@/services/api';
import { format } from 'date-fns';

interface SummaryWithGroup extends Omit<Summary, 'group'> {
  group: Group;
}

interface SummaryArchiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SummaryArchiveModal({ open, onOpenChange }: SummaryArchiveModalProps) {
  const { groups } = useGroups();
  const [allSummaries, setAllSummaries] = useState<SummaryWithGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);


  const fetchAllSummariesDirect = async () => {
    setIsLoading(true);
    const summaries: SummaryWithGroup[] = [];

    for (const group of groups) {
      try {
        const response = await api.getSummaries(group._id);
        if (response.success && response.data) {
          response.data.forEach((summary: Summary) => {
            summaries.push({ ...summary, group });
          });
        }
      } catch (error) {
        console.error(`Error fetching summaries for group ${group._id}:`, error);
      }
    }

    // Sort by creation date (newest first)
    summaries.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setAllSummaries(summaries);
    setIsLoading(false);
  };

  useEffect(() => {
    if (open && groups.length > 0) {
      fetchAllSummariesDirect();
    }
  }, [open, groups]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>AI Summary Archive</DialogTitle>
          <DialogDescription>
            View all AI-generated summaries from your study groups.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : allSummaries.length === 0 ? (
            <div className="text-center py-20">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No summaries found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Generate summaries in your groups to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allSummaries.map((summary) => (
                <Card key={summary._id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {summary.type === 'document' ? (
                          <FileText className="h-4 w-4 text-purple-600" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="text-sm font-medium text-foreground">
                          {summary.group.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {summary.type === 'document' ? 'Document Summary' : 'Chat Summary'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(summary.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {summary.content}
                      </p>
                    </div>
                    {summary.keyTopics && summary.keyTopics.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Key Topics:</p>
                        <div className="flex flex-wrap gap-1">
                          {summary.keyTopics.map((topic, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-muted rounded-md text-foreground"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
