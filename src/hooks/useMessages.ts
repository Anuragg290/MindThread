import { useState, useEffect, useCallback, useRef } from 'react';
import { Message } from '@/types';
import { api } from '@/services/api';
import { socketService } from '@/services/socket';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

/**
 * IMMUTABILITY HELPER: Normalize message reactions
 * Ensures reactions is always an array, never undefined/null
 * This prevents React reconciliation issues
 */
const normalizeMessageReactions = (message: Message): Message => {
  return {
    ...message,
    reactions: Array.isArray(message.reactions) ? message.reactions : [],
  };
};

/**
 * IMMUTABILITY HELPER: Normalize array of messages
 * Ensures all messages have normalized reactions
 */
const normalizeMessages = (messages: Message[]): Message[] => {
  return messages.map(normalizeMessageReactions);
};

/**
 * CANONICAL MESSAGE IDENTITY HELPER
 * 
 * CRITICAL: Ensures exactly ONE message per _id in state.
 * This prevents duplicate messages and broken React reconciliation.
 * 
 * Rules:
 * - If message has no _id, it is rejected (prevents broken state)
 * - If message exists, it is REPLACED (not merged)
 * - If message doesn't exist, it is ADDED
 * - Reactions are always normalized to an array
 * 
 * This guarantees:
 * 1. No duplicate messages with same _id
 * 2. All messages have valid _id
 * 3. Socket + optimistic updates converge to same object
 */
function upsertMessage(prevMessages: Message[], incomingMessage: Message | null | undefined): Message[] {
  // CRITICAL: Reject messages without _id
  if (!incomingMessage?._id) {
    console.warn('⚠️ upsertMessage: Rejecting message without _id', incomingMessage);
    return prevMessages;
  }

  // Normalize the incoming message
  const normalized: Message = {
    ...incomingMessage,
    _id: incomingMessage._id.toString(), // Ensure _id is always a string
    reactions: Array.isArray(incomingMessage.reactions)
      ? incomingMessage.reactions
      : [],
  };

  // Find existing message by _id (canonical lookup)
  const index = prevMessages.findIndex(
    (m) => m._id?.toString() === normalized._id.toString()
  );

  if (index === -1) {
    // Message doesn't exist - add it
    return [...prevMessages, normalized];
  }

  // Message exists - REPLACE it (don't merge)
  // This ensures socket and optimistic updates converge to the same object
  const updated = [...prevMessages];
  updated[index] = normalized;
  return updated;
}

export function useMessages(groupId: string) {
  const { user } = useAuth();
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
      // CRITICAL: Normalize reactions array for all messages
      const normalizedData = normalizeMessages(data);
      if (pageNum === 1) {
        setMessages(normalizedData);
      } else {
        setMessages((prev) => [...normalizeMessages(data), ...prev]);
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
        // CRITICAL: Use upsertMessage to ensure canonical identity
        // upsertMessage automatically prevents duplicates by _id
        setMessages((prev) => {
          return upsertMessage(prev, message);
        });
      } else {
        console.log('⚠️ Message ignored - wrong group:', messageGroupIdStr, 'expected:', currentGroupIdStr);
      }
    });

    // 🔥 TIER 2: Listen for reaction updates from other users
    // CRITICAL: Use upsertMessage to ensure canonical message identity
    // This guarantees exactly one message per _id and prevents duplicate/ghost messages
    const unsubscribeReactions = socketService.onReaction((data) => {
      console.log('🔥 Reaction update received in useMessages:', {
        messageId: data.messageId,
        hasMessage: !!data.message,
        hasMessageId: !!data.message?._id,
      });
      
      // CRITICAL: Use upsertMessage - this ensures:
      // 1. Exactly one message per _id (no duplicates)
      // 2. Messages without _id are rejected (prevents broken state)
      // 3. Socket updates REPLACE (not merge) existing messages
      // 4. Socket + optimistic updates converge to the SAME message object
      setMessages((prev) => {
        if (!data.message) {
          console.warn('⚠️ Reaction update: No message data', data);
          return prev;
        }
        
        // CRITICAL: upsertMessage handles all identity guarantees
        return upsertMessage(prev, data.message);
      });
    });

    return () => {
      unsubscribe();
      unsubscribeReactions();
      socketService.leaveGroup(groupId);
      // Note: connect handler cleanup is handled by socket service
    };
  }, [groupId, fetchMessages]);

  const sendMessage = useCallback(async (content: string, replyTo?: string) => {
    // CRITICAL FIX: Send via REST API first (for database persistence)
    const response = await api.sendMessage(groupId, content, replyTo);
    if (response.success && response.data) {
      // CRITICAL FIX: Add message optimistically so sender sees it immediately
      // CRITICAL: Use upsertMessage to ensure canonical identity
      // upsertMessage automatically handles duplicates and validates _id
      const newMessage = response.data;
      setMessages((prev) => {
        return upsertMessage(prev, newMessage);
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

  // 🔥 TIER 2: Add reaction to message (with API call and socket sync)
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    const userId = user?._id;
    if (!userId) {
      console.error('❌ Cannot add reaction: user not authenticated');
      return;
    }
    
    // CRITICAL: Validate messageId before making API call
    if (!messageId || messageId === 'undefined' || messageId === 'null') {
      console.error('❌ Cannot add reaction: invalid messageId', messageId);
      toast({
        title: 'Error',
        description: 'Invalid message ID',
        variant: 'destructive',
      });
      return;
    }
    
    // Normalize messageId to string
    const normalizedMessageId = typeof messageId === 'string' 
      ? messageId 
      : (messageId as any)?.toString?.() || String(messageId);

    // CRITICAL: Optimistic update using upsertMessage
    // This ensures canonical message identity and prevents duplicate/ghost messages
    setMessages((prev) => {
      // Find the canonical message by _id
      const targetMessage = prev.find((msg) => {
        const msgIdStr = msg._id?.toString();
        return msgIdStr === normalizedMessageId;
      });

      // CRITICAL: Abort if message not found or has no _id
      if (!targetMessage || !targetMessage._id) {
        console.error('❌ Cannot react: message not found or missing _id', {
          messageId: normalizedMessageId,
          found: !!targetMessage,
          hasId: !!targetMessage?._id,
          availableIds: prev.map(m => m._id?.toString()).filter(Boolean).slice(0, 5)
        });
        return prev; // Don't update state
      }

      // CRITICAL: Normalize reactions array (ensure it's always an array)
      const currentReactions = Array.isArray(targetMessage.reactions) ? targetMessage.reactions : [];
      const existingReaction = currentReactions.find(r => r.emoji === emoji);
      
      let updatedReactions: typeof currentReactions;
      
      if (existingReaction) {
        // Toggle: remove if user already reacted, add if not
        const userIndex = existingReaction.users.findIndex(id => id.toString() === userId.toString());
        
        if (userIndex > -1) {
          // Remove user from reaction
          const newUsers = existingReaction.users.filter(id => id.toString() !== userId.toString());
          if (newUsers.length === 0) {
            // Remove reaction entirely if no users left
            updatedReactions = currentReactions.filter(r => r.emoji !== emoji);
          } else {
            // Update reaction with new users array
            updatedReactions = currentReactions.map(r => 
              r.emoji === emoji 
                ? { ...r, users: [...newUsers] } // New array reference
                : r
            );
          }
        } else {
          // Add user to reaction
          updatedReactions = currentReactions.map(r => 
            r.emoji === emoji 
              ? { ...r, users: [...r.users, userId] } // New array reference
              : r
          );
        }
      } else {
        // Create new reaction - new array reference
        updatedReactions = [...currentReactions, { emoji, users: [userId] }];
      }
      
      // CRITICAL: Create updated message with new reactions
      // MUST preserve _id and all other fields
      const updatedMessage: Message = {
        ...targetMessage,
        _id: targetMessage._id.toString(), // Ensure _id is string
        reactions: updatedReactions, // New array reference
      };

      // CRITICAL: Use upsertMessage to ensure canonical identity
      // This guarantees exactly one message per _id
      return upsertMessage(prev, updatedMessage);
    });
    
    // Call API to persist reaction
    try {
      const response = await api.addMessageReaction(groupId, normalizedMessageId, emoji);
      if (response.success && response.data) {
        // CRITICAL: Use upsertMessage to replace with server response
        // Server response has populated users and correct reaction state
        setMessages((prev) => {
          return upsertMessage(prev, response.data);
        });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      // Revert optimistic update on error
      // TODO: Could add toast notification here
    }
  }, [groupId, user?._id]);

  return {
    messages,
    isLoading,
    hasMore,
    sendMessage,
    loadMore,
    addReaction,
    refetch: () => fetchMessages(1),
  };
}
