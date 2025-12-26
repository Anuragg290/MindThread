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
    
    // CRITICAL FIX: Join group - socket service will wait for connection if needed
    console.log('🔄 useMessages: Joining group:', groupId);
    socketService.joinGroup(groupId);
    
    // CRITICAL FIX: Socket message listener - handles real-time messages
    // Register listener ONCE per group - socket service handles connection lifecycle
    const unsubscribe = socketService.onMessage((message) => {
      console.log('🔵 Socket message received in useMessages:', {
        id: message._id,
        content: message.content?.substring(0, 30),
        group: message.group,
        groupType: typeof message.group
      });
      
      // Handle different message.group formats (string ID, object with _id, or populated object)
      const messageGroupId = typeof message.group === 'string' 
        ? message.group 
        : (message.group as any)?._id?.toString() || (message.group as any)?.toString() || message.group;
      
      const currentGroupIdStr = groupId.toString();
      const messageGroupIdStr = messageGroupId?.toString();
      
      console.log('🔵 Group comparison:', {
        messageGroupId: messageGroupIdStr,
        currentGroupId: currentGroupIdStr,
        match: messageGroupIdStr === currentGroupIdStr
      });
      
      // Only process messages for current group
      if (messageGroupIdStr === currentGroupIdStr) {
        // CRITICAL FIX: Prevent duplicates by checking message ID AND content
        setMessages((prev) => {
          // Check if message already exists by ID
          const existsById = prev.some((msg) => {
            const msgId = msg._id?.toString();
            const newMsgId = message._id?.toString();
            return msgId === newMsgId;
          });
          
          // Also check by content and timestamp to catch duplicates with different IDs
          // (This happens when REST API creates one message and socket creates another)
          const existsByContent = prev.some((msg) => {
            const sameContent = msg.content === message.content;
            const sameSender = msg.sender?._id?.toString() === message.sender?._id?.toString() ||
                             msg.sender?.toString() === message.sender?.toString() ||
                             (msg.sender && message.sender && 
                              (msg.sender.username === message.sender?.username || 
                               msg.sender._id === message.sender?._id));
            const timeDiff = Math.abs(
              new Date(msg.createdAt).getTime() - new Date(message.createdAt).getTime()
            );
            // Same content, same sender, within 2 seconds = likely duplicate
            return sameContent && sameSender && timeDiff < 2000;
          });
          
          if (existsById) {
            console.log('🔴 Duplicate by ID prevented:', message._id);
            return prev; // Don't add duplicate
          }
          
          if (existsByContent) {
            console.log('🔴 Duplicate by content prevented:', message.content?.substring(0, 30));
            return prev; // Don't add duplicate
          }
          
          console.log('✅ Adding new message via socket:', message._id, message.content?.substring(0, 30));
          // Add new message immutably - append to end
          return [...prev, message];
        });
      } else {
        console.log('⚠️ Message ignored - wrong group:', messageGroupIdStr, 'expected:', currentGroupIdStr);
      }
    });

    return () => {
      unsubscribe();
      socketService.leaveGroup(groupId);
      // Note: connect handler cleanup is handled by socket service
    };
  }, [groupId, fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    // CRITICAL FIX: Send via REST API first (for database persistence)
    const response = await api.sendMessage(groupId, content);
    if (response.success && response.data) {
      // CRITICAL FIX: Add message optimistically so sender sees it immediately
      const newMessage = response.data;
      setMessages((prev) => {
        // Check if already exists (shouldn't, but be safe)
        const exists = prev.some((msg) => msg._id?.toString() === newMessage._id?.toString());
        if (exists) {
          console.log('🔴 Message already exists (optimistic):', newMessage._id);
          return prev;
        }
        console.log('✅ Adding message optimistically:', newMessage._id, newMessage.content?.substring(0, 30));
        return [...prev, newMessage];
      });
      
      // CRITICAL FIX: DO NOT emit via socket - REST API already saved it
      // The backend should emit socket events when REST API creates messages
      // Emitting here would create a duplicate message in the database
      // socketService.sendMessage(groupId, content); // REMOVED - causes duplicates
      
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
