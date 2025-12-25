import { useState, useEffect, useCallback } from 'react';
import { Summary } from '@/types';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export function useSummaries(groupId: string) {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const fetchSummaries = useCallback(async () => {
    setIsLoading(true);
    const response = await api.getSummaries(groupId);
    if (response.success && response.data) {
      setSummaries(response.data);
    } else {
      toast({
        title: 'Error',
        description: response.error || 'Failed to fetch summaries',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [groupId, toast]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const generateChatSummary = useCallback(async (messageCount?: number) => {
    setIsGenerating(true);
    const response = await api.generateChatSummary(groupId, messageCount);
    if (response.success && response.data) {
      setSummaries((prev) => [response.data!, ...prev]);
      toast({
        title: 'Success',
        description: 'Chat summary generated successfully',
      });
      setIsGenerating(false);
      return { success: true, summary: response.data };
    }
    toast({
      title: 'Error',
      description: response.error || 'Failed to generate summary',
      variant: 'destructive',
    });
    setIsGenerating(false);
    return { success: false, error: response.error };
  }, [groupId, toast]);

  const generateDocumentSummary = useCallback(async (fileId: string) => {
    setIsGenerating(true);
    const response = await api.generateDocumentSummary(groupId, fileId);
    if (response.success && response.data) {
      setSummaries((prev) => [response.data!, ...prev]);
      toast({
        title: 'Success',
        description: 'Document summary generated successfully',
      });
      setIsGenerating(false);
      return { success: true, summary: response.data };
    }
    toast({
      title: 'Error',
      description: response.error || 'Failed to generate summary',
      variant: 'destructive',
    });
    setIsGenerating(false);
    return { success: false, error: response.error };
  }, [groupId, toast]);

  const deleteSummary = useCallback(async (summaryId: string) => {
    const response = await api.deleteSummary(groupId, summaryId);
    if (response.success) {
      setSummaries((prev) => prev.filter((s) => s._id !== summaryId));
      toast({
        title: 'Success',
        description: 'Summary deleted successfully',
      });
      return { success: true };
    }
    toast({
      title: 'Error',
      description: response.error || 'Failed to delete summary',
      variant: 'destructive',
    });
    return { success: false, error: response.error };
  }, [groupId, toast]);

  return {
    summaries,
    isLoading,
    isGenerating,
    generateChatSummary,
    generateDocumentSummary,
    deleteSummary,
    refetch: fetchSummaries,
  };
}
