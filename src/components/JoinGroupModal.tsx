import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface JoinGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (groupId: string) => Promise<{ success: boolean }>;
}

export default function JoinGroupModal({ open, onOpenChange, onSubmit }: JoinGroupModalProps) {
  const [groupId, setGroupId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await onSubmit(groupId);
    if (result.success) {
      setGroupId('');
      onOpenChange(false);
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Study Group</DialogTitle>
          <DialogDescription>
            Enter the group ID or invite code to join an existing study group.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupId">Group ID or Invite Code</Label>
              <Input
                id="groupId"
                placeholder="Enter group ID..."
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !groupId.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Group'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
