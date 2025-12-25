import { Group } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, LogOut, UserPlus, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GroupCardProps {
  group: Group;
  onLeave?: (groupId: string) => void;
  onJoin?: (groupId: string) => Promise<void>;
  showGroupId?: boolean;
}

export default function GroupCard({ group, onLeave, onJoin, showGroupId }: GroupCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const memberRole = group.members.find((m) => m.user._id === user?._id)?.role;
  const isOwner = memberRole === 'owner';
  const isMember = group.isMember !== false && memberRole !== undefined;

  const handleCopyGroupId = () => {
    navigator.clipboard.writeText(group._id);
    toast({
      title: 'Copied!',
      description: 'Group ID copied to clipboard',
    });
  };

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onJoin) {
      await onJoin(group._id);
    }
  };

  return (
    <Card className="hover:bg-muted/30 border-border transition-all duration-300 cursor-pointer group bg-card overflow-hidden">
      <CardHeader className="pb-4 pt-5 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0" onClick={() => isMember && navigate(`/groups/${group._id}`)}>
            <CardTitle className="text-lg font-medium group-hover:text-foreground transition-colors mb-1.5 line-clamp-1">
              {group.name}
            </CardTitle>
            <CardDescription className="mt-1.5 line-clamp-2 text-sm leading-relaxed">
              {group.description || 'No description'}
            </CardDescription>
            {showGroupId && (
              <div className="mt-3 flex items-center gap-2 p-2 bg-muted rounded-lg border border-border">
                <span className="text-xs text-muted-foreground font-mono truncate flex-1">ID: {group._id}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 hover:bg-muted/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyGroupId();
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          {memberRole && (
            <Badge 
              variant={isOwner ? 'secondary' : 'secondary'} 
              className="ml-2 flex-shrink-0"
            >
              {memberRole}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="font-normal">{group.members.length}</span>
            <span className="ml-1">member{group.members.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex gap-2">
            {isMember ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/groups/${group._id}`)}
                  className="border-border hover:bg-muted/50 transition-colors"
                >
                  <MessageSquare className="h-4 w-4 mr-1.5" />
                  Open
                </Button>
                {!isOwner && onLeave && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLeave(group._id);
                    }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleJoin}
                className="border-border hover:bg-muted/50 transition-colors"
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                Join
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
