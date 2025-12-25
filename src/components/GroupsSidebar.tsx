import { Group } from '@/types';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useGroups } from '@/hooks/useGroups';

export default function GroupsSidebar() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { groups, isLoading } = useGroups();

  const handleGroupClick = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };

  return (
    <div 
      className="h-full w-full flex flex-col border-r border-border"
      style={{
        backgroundColor: 'hsl(var(--sidebar-background))',
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <h2 className="text-lg font-medium text-foreground">Chats</h2>
      </div>

      {/* Groups List - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : groups.length === 0 ? (
          <div className="p-4 text-center">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No groups yet</p>
          </div>
        ) : (
          <div className="p-2">
            {groups.map((group) => {
              const isActive = group._id === groupId;
              return (
                <button
                  key={group._id}
                  onClick={() => handleGroupClick(group._id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg mb-1 transition-colors',
                    'hover:bg-muted/50',
                    isActive && 'bg-muted'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-normal truncate',
                        isActive ? 'text-foreground' : 'text-foreground'
                      )}>
                        {group.name}
                      </p>
                      {group.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

