import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, FileText, Zap, Users, Calendar, Loader2 } from 'lucide-react';
import { User, Group } from '@/types';

interface Activity {
  type: 'message' | 'file' | 'summary' | 'join' | 'session';
  user: User | string;
  content: string;
  group: Group | string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} sec ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour${Math.floor(diffInSeconds / 3600) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) > 1 ? 's' : ''} ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'file':
        return <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'summary':
        return <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'join':
        return <Users className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'session':
        return <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getUserName = (user: User | string): string => {
    if (typeof user === 'string') return 'Unknown User';
    return user.username || user.email || 'Unknown User';
  };

  const getUserAvatar = (user: User | string): string | undefined => {
    if (typeof user === 'string') return undefined;
    return user.avatar;
  };

  const getGroupName = (group: Group | string): string => {
    if (typeof group === 'string') return 'Unknown Group';
    return group.name || 'Unknown Group';
  };

  const getActivityText = (activity: Activity): string => {
    const userName = getUserName(activity.user);
    const groupName = getGroupName(activity.group);
    
    switch (activity.type) {
      case 'message':
        return `${userName} sent a message in`;
      case 'file':
        return `${userName} uploaded a file in`;
      case 'summary':
        return `AI Assistant generated a summary for`;
      case 'join':
        return `${userName} joined`;
      case 'session':
        return `${userName} scheduled a session in`;
      default:
        return `${userName} performed an action in`;
    }
  };

  const getActivityAvatar = (activity: Activity) => {
    if (activity.type === 'summary') {
      // Return AI Assistant icon for summaries
      return (
        <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
          <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>
      );
    }
    // Return user avatar for other activities
    const user = typeof activity.user === 'string' ? null : activity.user;
    const avatarUrl = getUserAvatar(activity.user);
    const initials = user ? (user.username?.[0] || user.email?.[0] || 'U').toUpperCase() : 'U';
    return (
      <Avatar className="h-10 w-10">
        <AvatarImage src={avatarUrl} alt={getUserName(activity.user)} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
    );
  };

  if (activities.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin">
          {activities.map((activity, index) => {
            return (
              <div key={index} className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
                {getActivityAvatar(activity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm text-foreground">
                      {getActivityText(activity)}
                      <span className="font-medium ml-1">{getGroupName(activity.group)}</span>
                    </p>
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                    {activity.content}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
