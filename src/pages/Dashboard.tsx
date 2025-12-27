import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups } from '@/hooks/useGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GroupCard from '@/components/GroupCard';
import CreateGroupModal from '@/components/CreateGroupModal';
import JoinGroupModal from '@/components/JoinGroupModal';
import RecentActivity from '@/components/RecentActivity';
import SummaryArchiveModal from '@/components/SummaryArchiveModal';
import Navbar from '@/components/Navbar';
import { 
  BookOpen, 
  Plus, 
  UserPlus, 
  Search, 
  Loader2, 
  Users, 
  MessageSquare, 
  FileText, 
  Zap,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Key,
  Archive,
  Compass
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Group, Message, FileDocument, Summary } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const { groups, isLoading, createGroup, joinGroup, leaveGroup, refetch } = useGroups();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showDiscover, setShowDiscover] = useState(false);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [showSummaryArchive, setShowSummaryArchive] = useState(false);
  const [stats, setStats] = useState({
    activeGroups: 0,
    unreadMessages: 0,
    sharedDocuments: 0,
    aiSummaries: 0,
  });
  const [previousStats, setPreviousStats] = useState({
    activeGroups: 0,
    unreadMessages: 0,
    sharedDocuments: 0,
    aiSummaries: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const filteredGroups = groups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'active') {
      // Filter for groups with recent activity (within last 24 hours)
      return matchesSearch;
    } else if (activeTab === 'upcoming') {
      // For now, just show all groups (can be enhanced with session scheduling)
      return matchesSearch;
    }
    return matchesSearch;
  });

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

  const filteredAllGroups = allGroups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase());
    // Only show groups user is not a member of
    const isMember = group.members.some((m) => m.user._id === user?._id);
    return matchesSearch && !isMember;
  });

  useEffect(() => {
      if (showDiscover) {
      fetchAllGroups();
    }
  }, [showDiscover]);

  // Fetch stats and recent activity
  useEffect(() => {
    const fetchStats = async () => {
      try {
        let totalMessages = 0;
        let totalFiles = 0;
        let totalSummaries = 0;
        const activities: any[] = [];

        // Fetch data from all groups
        for (const group of groups) {
          try {
            // Get messages - fetch more to get recent ones
            const messagesRes = await api.getMessages(group._id, 1, 50);
            if (messagesRes.success && messagesRes.data) {
              totalMessages += messagesRes.data.data.length;
              // Add recent messages to activity (messages are already sorted by date desc)
              messagesRes.data.data.slice(0, 10).forEach((msg: Message) => {
                activities.push({
                  type: 'message',
                  user: msg.sender,
                  content: msg.content,
                  group: group,
                  timestamp: msg.createdAt,
                });
              });
            }

            // Get files
            const filesRes = await api.getFiles(group._id);
            if (filesRes.success && filesRes.data) {
              totalFiles += filesRes.data.length;
              // Sort files by date and add recent ones to activity
              const sortedFiles = [...filesRes.data].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              sortedFiles.slice(0, 5).forEach((file: FileDocument) => {
                activities.push({
                  type: 'file',
                  user: file.uploader,
                  content: file.originalName,
                  group: group,
                  timestamp: file.createdAt,
                });
              });
            }

            // Get summaries
            const summariesRes = await api.getSummaries(group._id);
            if (summariesRes.success && summariesRes.data) {
              totalSummaries += summariesRes.data.length;
              // Sort summaries by date and add recent ones to activity
              const sortedSummaries = [...summariesRes.data].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              sortedSummaries.slice(0, 5).forEach((summary: Summary) => {
                activities.push({
                  type: 'summary',
                  user: summary.generatedBy,
                  content: summary.content,
                  group: group,
                  timestamp: summary.createdAt,
                });
              });
            }
          } catch (error) {
            console.error(`Error fetching data for group ${group._id}:`, error);
          }
        }

        // Sort activities by timestamp (most recent first)
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Calculate actual unread messages across all groups
        let totalUnread = 0;
        for (const group of groups) {
          const lastReadKey = `lastRead_${group._id}_${user?._id}`;
          const lastReadTimestamp = localStorage.getItem(lastReadKey);
          
          try {
            const messagesRes = await api.getMessages(group._id, 1, 50);
            if (messagesRes.success && messagesRes.data) {
              const messages = messagesRes.data.data;
              if (lastReadTimestamp) {
                const lastReadTime = new Date(lastReadTimestamp).getTime();
                const unread = messages.filter(msg => {
                  const msgTime = new Date(msg.createdAt).getTime();
                  const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender?._id;
                  return msgTime > lastReadTime && senderId !== user?._id;
                });
                totalUnread += unread.length;
              } else {
                // No last read timestamp, count all messages from other users
                const unread = messages.filter(msg => {
                  const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender?._id;
                  return senderId !== user?._id;
                });
                totalUnread += unread.length;
              }
            }
          } catch (error) {
            console.error(`Error calculating unread for group ${group._id}:`, error);
          }
        }

        // Calculate changes from previous stats
        const newStats = {
          activeGroups: groups.length,
          unreadMessages: totalUnread,
          sharedDocuments: totalFiles,
          aiSummaries: totalSummaries,
        };
        
        // Update previous stats for next calculation (save current before updating)
        setPreviousStats((prev) => {
          // Only update if stats have been set before (not initial load)
          if (stats.activeGroups > 0 || stats.unreadMessages > 0 || stats.sharedDocuments > 0 || stats.aiSummaries > 0) {
            return stats;
          }
          return prev;
        });
        setStats(newStats);

        setRecentActivity(activities.slice(0, 5));
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    if (groups.length > 0) {
      fetchStats();
    }
  }, [groups]);


  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} sec ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour${Math.floor(diffInSeconds / 3600) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <Navbar onShowDiscover={() => setShowDiscover(true)} />

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with your study groups.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                {stats.activeGroups > previousStats.activeGroups && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    <span>+{stats.activeGroups - previousStats.activeGroups}</span>
                  </div>
                )}
                {stats.activeGroups < previousStats.activeGroups && (
                  <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                    <TrendingDown className="h-4 w-4" />
                    <span>{stats.activeGroups - previousStats.activeGroups}</span>
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stats.activeGroups}</div>
              <div className="text-sm text-muted-foreground">Active Groups</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                {stats.unreadMessages > previousStats.unreadMessages && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    <span>+{stats.unreadMessages - previousStats.unreadMessages}</span>
                  </div>
                )}
                {stats.unreadMessages < previousStats.unreadMessages && (
                  <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                    <TrendingDown className="h-4 w-4" />
                    <span>{stats.unreadMessages - previousStats.unreadMessages}</span>
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stats.unreadMessages}</div>
              <div className="text-sm text-muted-foreground">Unread Messages</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                {stats.sharedDocuments > previousStats.sharedDocuments && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    <span>+{stats.sharedDocuments - previousStats.sharedDocuments}</span>
                  </div>
                )}
                {stats.sharedDocuments < previousStats.sharedDocuments && (
                  <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                    <TrendingDown className="h-4 w-4" />
                    <span>{stats.sharedDocuments - previousStats.sharedDocuments}</span>
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stats.sharedDocuments}</div>
              <div className="text-sm text-muted-foreground">Shared Documents</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                {stats.aiSummaries > previousStats.aiSummaries && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    <span>+{stats.aiSummaries - previousStats.aiSummaries}</span>
                  </div>
                )}
                {stats.aiSummaries < previousStats.aiSummaries && (
                  <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                    <TrendingDown className="h-4 w-4" />
                    <span>{stats.aiSummaries - previousStats.aiSummaries}</span>
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stats.aiSummaries}</div>
              <div className="text-sm text-muted-foreground">AI Summaries</div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card 
            className="bg-card border-border hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => setCreateModalOpen(true)}
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Plus className="h-6 w-6 text-primary" />
              </div>
              <div>
                  <h3 className="font-semibold text-foreground mb-1">Create New Group</h3>
                  <p className="text-sm text-muted-foreground">Start a new study group and invite members.</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card 
            className="bg-card border-border hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => setJoinModalOpen(true)}
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Key className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Join with Code</h3>
                  <p className="text-sm text-muted-foreground">Enter an invitation code to join a group.</p>
              </div>
            </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card 
            className="bg-card border-border hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => setShowSummaryArchive(true)}
            >
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Archive className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">AI Summary Archive</h3>
                  <p className="text-sm text-muted-foreground">View all AI-generated summaries.</p>
                </div>
          </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Search Section */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search study groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Two Column Layout: Your Study Groups and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Your Study Groups Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-foreground">
                {showDiscover ? 'Discover Groups' : 'Your Study Groups'}
              </h3>
              <div className="flex gap-2">
                {!showDiscover && (
            <Button 
              onClick={() => setCreateModalOpen(true)}
                    size="sm"
                    className="gap-2"
            >
                    <Plus className="h-4 w-4" />
                    New Group
            </Button>
                )}
            <Button 
                  onClick={() => {
                    setShowDiscover(!showDiscover);
                    if (!showDiscover) {
                      fetchAllGroups();
                    }
                  }}
                  size="sm"
                  variant={showDiscover ? "default" : "outline"}
                  className="gap-2"
            >
                  {showDiscover ? 'My Groups' : 'Discover'}
            </Button>
          </div>
        </div>

            {!showDiscover && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {showDiscover ? (
              isLoadingAll ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredAllGroups.length === 0 ? (
                <div className="text-center py-20 px-4">
                  <div className="mx-auto w-20 h-20 bg-muted/50 rounded-2xl flex items-center justify-center mb-5">
                    <Users className="h-10 w-10 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-foreground">No groups to discover</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {searchQuery
                      ? 'No groups match your search'
                      : 'All available groups have been joined or no groups exist yet'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredAllGroups.map((group) => (
                    <GroupCard 
                      key={group._id} 
                      group={group} 
                      onJoin={async (groupId) => {
                        await joinGroup(groupId);
                        await refetch();
                        await fetchAllGroups();
                      }} 
                      showGroupId={true}
                    />
                  ))}
            </div>
              )
            ) : isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-20 px-4">
                <div className="mx-auto w-20 h-20 bg-muted/50 rounded-2xl flex items-center justify-center mb-5">
                  <BookOpen className="h-10 w-10 text-muted-foreground/60" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-foreground">No groups yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchQuery
                    ? 'No groups match your search'
                    : 'Create or join a study group to get started'}
                </p>
                {!searchQuery && (
                    <Button 
                      onClick={() => setCreateModalOpen(true)}
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Group
                    </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredGroups.map((group) => (
                  <GroupCard 
                    key={group._id} 
                    group={group} 
                    onLeave={leaveGroup} 
                    onJoin={async (groupId) => {
                      await joinGroup(groupId);
                    }} 
                  />
                ))}
              </div>
            )}
            </div>

          {/* Recent Activity Section */}
          <div className="lg:col-span-1">
            <h3 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h3>
            <RecentActivity activities={recentActivity.slice(0, 5)} />
              </div>
              </div>
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
      <SummaryArchiveModal
        open={showSummaryArchive}
        onOpenChange={setShowSummaryArchive}
      />
    </div>
  );
}