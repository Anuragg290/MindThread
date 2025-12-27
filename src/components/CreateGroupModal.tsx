import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Group } from '@/types';

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description: string) => Promise<{ success: boolean; data?: Group }>;
}

export default function CreateGroupModal({ open, onOpenChange, onSubmit }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await onSubmit(name, description);
    if (result.success && result.data) {
      setCreatedGroup(result.data);
      // Don't close modal yet - show group code
    } else {
      setIsLoading(false);
    }
  };

  const handleCopyGroupCode = async () => {
    if (!createdGroup) return;
    try {
      await navigator.clipboard.writeText(createdGroup._id);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Group code copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy group code',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
      setName('');
      setDescription('');
    setCreatedGroup(null);
    setCopied(false);
      onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {!createdGroup ? (
          <>
        <DialogHeader>
          <DialogTitle>Create Study Group</DialogTitle>
          <DialogDescription>
            Create a new study group and invite members to join.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="e.g., Computer Science 101"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this study group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
          </DialogFooter>
        </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Group Created Successfully!</DialogTitle>
              <DialogDescription>
                Share this group code with others to invite them to join.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Group Code</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border border-border">
                  <code className="flex-1 text-sm font-mono text-foreground break-all">
                    {createdGroup._id}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyGroupCode}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this code with others so they can join your group using the "Join with Code" option.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
