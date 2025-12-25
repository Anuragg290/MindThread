import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '@/types';
import { api } from '@/services/api';
import { socketService } from '@/services/socket';
import { useToast } from '@/hooks/use-toast';

export function useMessages(groupId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const fetchMessages = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) {
      setIsLoading(true);
    }
    const response = await api.getMessages(groupId, pageNum);
    if (response.success && response.data) {
      const { data, hasMore: more } = response.data;
      if (pageNum === 1) {
        setMessages(data);
      } else {
        setMessages((prev) => [...data, ...prev]);
      }
      setHasMore(more);
      setPage(pageNum);
    } else {
      toast({
        title: 'Error',
        description: response.error || 'Failed to fetch messages',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [groupId, toast]);

  useEffect(() => {
    fetchMessages(1);
    socketService.joinGroup(groupId);

    const unsubscribe = socketService.onMessage((message) => {
      if (message.group === groupId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      unsubscribe();
      socketService.leaveGroup(groupId);
    };
  }, [groupId, fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    const response = await api.sendMessage(groupId, content);
    if (response.success && response.data) {
      // Message will be added via socket, but add optimistically for better UX
      setMessages((prev) => [...prev, response.data!]);
      return { success: true };
    }
    toast({
      title: 'Error',
      description: response.error || 'Failed to send message',
      variant: 'destructive',
    });
    return { success: false, error: response.error };
  }, [groupId, toast]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchMessages(page + 1);
    }
  }, [hasMore, isLoading, page, fetchMessages]);

  return {
    messages,
    isLoading,
    hasMore,
    sendMessage,
    loadMore,
    refetch: () => fetchMessages(1),
  };
}
