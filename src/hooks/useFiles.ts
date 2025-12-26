import { useState, useEffect, useCallback } from 'react';
import { FileDocument } from '@/types';
import { api } from '@/services/api';
import { socketService } from '@/services/socket';
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
    
    // CRITICAL FIX: Listen for real-time file uploads via socket
    const unsubscribe = socketService.onFile((file) => {
      console.log('📁 Socket file received in useFiles:', {
        id: file._id,
        filename: file.originalName,
        group: file.group,
        groupType: typeof file.group
      });
      
      // Handle different file.group formats
      const fileGroupId = typeof file.group === 'string' 
        ? file.group 
        : (file.group as any)?._id?.toString() || (file.group as any)?.toString() || file.group;
      
      const currentGroupIdStr = groupId.toString();
      const fileGroupIdStr = fileGroupId?.toString();
      
      // Only process files for current group
      if (fileGroupIdStr === currentGroupIdStr) {
        setFiles((prev) => {
          // Check if file already exists by ID
          const existsById = prev.some((f) => {
            const fId = f._id?.toString();
            const newFileId = file._id?.toString();
            return fId === newFileId;
          });
          
          // Also check by filename and timestamp to catch duplicates
          const existsByFilename = prev.some((f) => {
            const sameFilename = f.originalName === file.originalName;
            const sameUploader = f.uploader?._id?.toString() === file.uploader?._id?.toString() ||
                               f.uploader?.toString() === file.uploader?.toString();
            const timeDiff = Math.abs(
              new Date(f.createdAt).getTime() - new Date(file.createdAt).getTime()
            );
            return sameFilename && sameUploader && timeDiff < 2000;
          });
          
          if (existsById) {
            console.log('🔴 Duplicate file by ID prevented:', file._id);
            return prev;
          }
          
          if (existsByFilename) {
            console.log('🔴 Duplicate file by filename prevented:', file.originalName);
            return prev;
          }
          
          console.log('✅ Adding new file via socket:', file._id, file.originalName);
          // Add new file immutably - append to end
          return [...prev, file];
        });
      } else {
        console.log('⚠️ File ignored - wrong group:', fileGroupIdStr, 'expected:', currentGroupIdStr);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [groupId, fetchFiles]);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    const response = await api.uploadFile(groupId, file);
    if (response.success && response.data) {
      // CRITICAL FIX: Add file optimistically so uploader sees it immediately
      const newFile = response.data;
      setFiles((prev) => {
        // Check if already exists (shouldn't, but be safe)
        const exists = prev.some((f) => f._id?.toString() === newFile._id?.toString());
        if (exists) {
          console.log('🔴 File already exists (optimistic):', newFile._id);
          return prev;
        }
        console.log('✅ Adding file optimistically:', newFile._id, newFile.originalName);
        return [...prev, newFile];
      });
      
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
