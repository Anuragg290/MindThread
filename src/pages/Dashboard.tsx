import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import GroupCard from '@/components/GroupCard';
import CreateGroupModal from '@/components/CreateGroupModal';
import JoinGroupModal from '@/components/JoinGroupModal';
import { BookOpen, Plus, UserPlus, LogOut, Search, Loader2, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Group } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { groups, isLoading, createGroup, joinGroup, leaveGroup, refetch } = useGroups();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllGroups = allGroups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const discoverableGroups = filteredAllGroups.filter((group) => !group.isMember);

  useEffect(() => {
    if (showDiscover) {
      fetchAllGroups();
    }
  }, [showDiscover]);

  const fetchAllGroups = async () => {
    setIsLoadingAll(true);
    const response = await api.getAllGroups();
    if (response.success && response.data) {
      setAllGroups(response.data);
    } else {
      toast({
        title: 'Error',
        description: response.error || 'Failed to fetch groups',
        variant: 'destructive',
      });
    }
    setIsLoadingAll(false);
  };

  const handleJoinGroup = async (groupId: string) => {
    const result = await joinGroup(groupId);
    if (result.success) {
      await refetch();
      if (showDiscover) {
        await fetchAllGroups();
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Clean, minimal design */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-muted rounded-xl">
                <BookOpen className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-medium text-foreground">Virtual Study Group</h1>
                <p className="text-xs text-muted-foreground">Welcome, {user?.username}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="hover:bg-muted/50 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Improved spacing and layout */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 max-w-7xl">
        {/* Actions Bar - Better visual hierarchy */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-card border-border focus:border-border focus:ring-2 focus:ring-foreground/10 transition-all"
            />
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <Button 
              onClick={() => setCreateModalOpen(true)}
              variant="outline"
              className="h-11 border-border hover:bg-muted/50 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowDiscover(!showDiscover)}
              className="h-11 border-border hover:bg-muted/50 transition-colors"
            >
              <Compass className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{showDiscover ? 'My Groups' : 'Discover Groups'}</span>
              <span className="sm:hidden">{showDiscover ? 'My' : 'Discover'}</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setJoinModalOpen(true)}
              className="h-11 border-border hover:bg-muted/50 transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Join by ID</span>
              <span className="sm:hidden">Join</span>
            </Button>
          </div>
        </div>

        {/* Section Headers and Content */}
        {!showDiscover ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-medium text-foreground mb-1">My Groups</h2>
              <p className="text-sm text-muted-foreground">Groups you're part of</p>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="mx-auto w-20 h-20 bg-muted/50 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                  <BookOpen className="h-10 w-10 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-foreground">No groups yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchQuery
                    ? 'No groups match your search'
                    : 'Create or join a study group to get started'}
                </p>
                {!searchQuery && (
                  <div className="flex justify-center gap-3 flex-wrap">
                    <Button 
                      onClick={() => setCreateModalOpen(true)}
                      variant="outline"
                      className="border-border hover:bg-muted/50 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Group
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowDiscover(true)}
                      className="border-border hover:bg-muted/50 transition-colors"
                    >
                      <Compass className="h-4 w-4 mr-2" />
                      Discover Groups
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredGroups.map((group) => (
                  <GroupCard key={group._id} group={group} onLeave={leaveGroup} onJoin={handleJoinGroup} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-medium text-foreground mb-1">Discover Groups</h2>
              <p className="text-sm text-muted-foreground">Find and join new study groups</p>
            </div>
            {isLoadingAll ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : discoverableGroups.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="mx-auto w-20 h-20 bg-muted/50 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                  <Compass className="h-10 w-10 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-foreground">No groups to discover</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchQuery
                    ? 'No groups match your search'
                    : 'All available groups have been joined or no groups exist yet'}
                </p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {discoverableGroups.map((group) => (
                  <GroupCard key={group._id} group={group} onJoin={handleJoinGroup} showGroupId />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <CreateGroupModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={createGroup}
      />
      <JoinGroupModal
        open={joinModalOpen}
        onOpenChange={setJoinModalOpen}
        onSubmit={joinGroup}
      />
    </div>
  );
}
