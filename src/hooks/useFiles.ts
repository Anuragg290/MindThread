import { useState, useEffect, useCallback } from 'react';
import { FileDocument } from '@/types';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export function useFiles(groupId: string) {
  const [files, setFiles] = useState<FileDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    const response = await api.getFiles(groupId);
    if (response.success && response.data) {
      setFiles(response.data);
    } else {
      toast({
        title: 'Error',
        description: response.error || 'Failed to fetch files',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [groupId, toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    const response = await api.uploadFile(groupId, file);
    if (response.success && response.data) {
      setFiles((prev) => [...prev, response.data!]);
      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
      setIsUploading(false);
      return { success: true, file: response.data };
    }
    toast({
      title: 'Error',
      description: response.error || 'Failed to upload file',
      variant: 'destructive',
    });
    setIsUploading(false);
    return { success: false, error: response.error };
  }, [groupId, toast]);

  const deleteFile = useCallback(async (fileId: string) => {
    const response = await api.deleteFile(groupId, fileId);
    if (response.success) {
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
      toast({
        title: 'Success',
        description: 'File deleted successfully',
      });
      return { success: true };
    }
    toast({
      title: 'Error',
      description: response.error || 'Failed to delete file',
      variant: 'destructive',
    });
    return { success: false, error: response.error };
  }, [groupId, toast]);

  return {
    files,
    isLoading,
    isUploading,
    uploadFile,
    deleteFile,
    refetch: fetchFiles,
  };
}
