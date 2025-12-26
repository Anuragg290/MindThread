import { Group } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, MessageSquare, LogOut, UserPlus, ArrowRight, Copy, Check, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Message } from '@/types';

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
  const [lastActivity, setLastActivity] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showGroupCode, setShowGroupCode] = useState<boolean>(false);

  const memberRole = group.members.find((m) => m.user._id === user?._id)?.role;
  const isOwner = memberRole === 'owner';
  const isMember = group.isMember !== false && memberRole !== undefined;

  // Fetch last activity and unread count
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const messagesRes = await api.getMessages(group._id, 1, 1);
        if (messagesRes.success && messagesRes.data && messagesRes.data.data.length > 0) {
          const lastMessage = messagesRes.data.data[0];
          setLastActivity(formatTimeAgo(lastMessage.createdAt));
          
          // Check if message is recent (within 24 hours) to determine active status
          const messageTime = new Date(lastMessage.createdAt).getTime();
          const now = Date.now();
          const hoursSinceMessage = (now - messageTime) / (1000 * 60 * 60);
          setIsActive(hoursSinceMessage < 24);
        }
      } catch (error) {
        console.error('Error fetching activity:', error);
      }
    };

    if (isMember) {
      fetchActivity();
    }
  }, [group._id, isMember]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} sec ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour${Math.floor(diffInSeconds / 3600) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) > 1 ? 's' : ''} ago`;
  };

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onJoin) {
      await onJoin(group._id);
    }
  };

  const handleOpenGroup = () => {
    if (isMember) {
      navigate(`/groups/${group._id}`);
    }
  };

  const handleCopyGroupCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(group._id);
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

  // Get subject from description or group name
  const getSubject = () => {
    // Try to extract subject from description or use a default
    const subjects = ['Biology', 'Mathematics', 'History', 'Chemistry', 'Physics', 'English', 'Computer Science', 'Calculus'];
    const foundSubject = subjects.find(subject => 
      group.description.toLowerCase().includes(subject.toLowerCase()) ||
      group.name.toLowerCase().includes(subject.toLowerCase())
    );
    return foundSubject || 'General';
  };

  // Get first 4 members for avatar display
  const displayMembers = group.members.slice(0, 4);
  const remainingMembers = Math.max(0, group.members.length - 4);

  return (
    <Card className="bg-card border-border hover:shadow-md transition-all cursor-pointer group overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {group.name}
              </h3>
              {isMember && unreadCount > 0 && (
                <Badge className="bg-blue-600 text-white h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
              {isMember && !unreadCount && isActive && (
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{getSubject()}</p>
            {/* Group Code Button */}
            <div className="mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGroupCode(!showGroupCode);
                }}
                className="h-7 text-xs gap-1"
              >
                <Key className="h-3 w-3" />
                {showGroupCode ? 'Hide Code' : 'Show Code'}
              </Button>
              {showGroupCode && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-lg border border-border">
                  <span className="text-xs text-muted-foreground font-mono flex-1 truncate">
                    {group._id}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyGroupCode}
                    className="h-6 w-6 p-0 hover:bg-muted"
                    title="Copy group code"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
              </div>
              {lastActivity && (
                <span>Last activity: {lastActivity}</span>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Session (placeholder - can be enhanced with actual session data) */}
        {isMember && (group.name.toLowerCase().includes('biology') || group.name.toLowerCase().includes('history')) && (
          <div className="mb-3 p-2 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-1">Upcoming Session</p>
            <p className="text-sm text-foreground">
              {group.name.toLowerCase().includes('biology') 
                ? 'Tomorrow at 3:00 PM - Cell Division Review'
                : 'Friday at 5:00 PM - WWI Discussion'}
            </p>
          </div>
        )}

        {/* Member Avatars */}
        {displayMembers.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            {displayMembers.map((member, index) => {
              const user = member.user;
              const initials = (user.username?.[0] || user.email?.[0] || 'U').toUpperCase();
              return (
                <Avatar key={member.user._id || index} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={user.avatar} alt={user.username} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {remainingMembers > 0 && (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
                +{remainingMembers}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          {isMember ? (
            <>
              <Button
                onClick={handleOpenGroup}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                Open Group
                <ArrowRight className="h-4 w-4" />
              </Button>
              {!isOwner && onLeave && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLeave(group._id);
                  }}
                  className="hover:bg-muted transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="outline"
              onClick={handleJoin}
              className="w-full border-border hover:bg-muted/50 transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Join Group
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}