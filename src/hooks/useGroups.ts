import { useState, useEffect, useCallback } from 'react';
import { Group } from '@/types';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    const response = await api.getGroups();
    if (response.success && response.data) {
      setGroups(response.data);
    } else {
      toast({
        title: 'Error',
        description: response.error || 'Failed to fetch groups',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = useCallback(async (name: string, description: string) => {
    const response = await api.createGroup(name, description);
    if (response.success && response.data) {
      setGroups((prev) => [...prev, response.data!]);
      toast({
        title: 'Success',
        description: 'Group created successfully',
      });
      return { success: true, data: response.data };
    }
    toast({
      title: 'Error',
      description: response.error || 'Failed to create group',
      variant: 'destructive',
    });
    return { success: false, error: response.error };
  }, [toast]);

  const joinGroup = useCallback(async (groupId: string) => {
    const response = await api.joinGroup(groupId);
    if (response.success && response.data) {
      setGroups((prev) => [...prev, response.data!]);
      toast({
        title: 'Success',
        description: 'Joined group successfully',
      });
      return { success: true };
    }
    toast({
      title: 'Error',
      description: response.error || 'Failed to join group',
      variant: 'destructive',
    });
    return { success: false, error: response.error };
  }, [toast]);

  const leaveGroup = useCallback(async (groupId: string) => {
    const response = await api.leaveGroup(groupId);
    if (response.success) {
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
      toast({
        title: 'Success',
        description: 'Left group successfully',
      });
      return { success: true };
    }
    toast({
      title: 'Error',
      description: response.error || 'Failed to leave group',
      variant: 'destructive',
    });
    return { success: false, error: response.error };
  }, [toast]);

  return {
    groups,
    isLoading,
    createGroup,
    joinGroup,
    leaveGroup,
    refetch: fetchGroups,
  };
}
