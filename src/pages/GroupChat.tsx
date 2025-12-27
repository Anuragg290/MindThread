import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessages } from '@/hooks/useMessages';
import { useFiles } from '@/hooks/useFiles';
import { useSummaries } from '@/hooks/useSummaries';
import { useGroups } from '@/hooks/useGroups';
import ChatWindow from '@/components/ChatWindow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, 
  MessageSquare, 
  FileText, 
  Users, 
  Calendar,
  Search,
  Upload,
  MoreVertical,
  Download,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  Trash2
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Group, FileDocument, Message, Summary } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

export default function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups, leaveGroup } = useGroups();
  const { messages, isLoading: messagesLoading, hasMore, sendMessage, loadMore, addReaction } = useMessages(groupId!);
  const { files, isLoading: filesLoading, isUploading, uploadFile, deleteFile } = useFiles(groupId!);
  const { summaries, generateDocumentSummary, generateChatSummary, deleteSummary, isGenerating, refetch: refetchSummaries } = useSummaries(groupId!);
  const [showSummariesModal, setShowSummariesModal] = useState(false);
  const [summaryToDelete, setSummaryToDelete] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoadingGroup, setIsLoadingGroup] = useState(true);
  const [documentSearch, setDocumentSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [documentFilter, setDocumentFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [memberStats, setMemberStats] = useState<Record<string, { messages: number; files: number }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') || 'light') as 'light' | 'dark';
  });
  const [mobileTab, setMobileTab] = useState<'chat' | 'documents' | 'members'>('chat');

  useEffect(() => {
    if (groupId) {
      fetchGroup();
    }
  }, [groupId, groups]);

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setCurrentTheme(savedTheme as 'light' | 'dark');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  // Calculate member statistics (messages and files)
  useEffect(() => {
    const calculateMemberStats = async () => {
      if (!groupId || !group) return;

      const stats: Record<string, { messages: number; files: number }> = {};

      // Initialize all members with 0 stats
      group.members.forEach(member => {
        stats[member.user._id] = { messages: 0, files: 0 };
      });

      // Count messages per member
      try {
        const messagesRes = await api.getMessages(groupId, 1, 1000); // Get more messages for accurate count
        if (messagesRes.success && messagesRes.data) {
          messagesRes.data.data.forEach((msg: Message) => {
            const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender?._id;
            if (senderId && stats[senderId]) {
              stats[senderId].messages++;
            }
          });
        }
      } catch (error) {
        console.error('Error fetching messages for stats:', error);
      }

      // Count files per member
      files.forEach(file => {
        const uploaderId = typeof file.uploader === 'string' ? file.uploader : file.uploader?._id;
        if (uploaderId && stats[uploaderId]) {
          stats[uploaderId].files++;
        }
      });

      setMemberStats(stats);
    };

    if (group && files.length >= 0) {
      calculateMemberStats();
    }
  }, [groupId, group, files, messages]);

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setCurrentTheme(theme);
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  };

  const fetchGroup = async () => {
    setIsLoadingGroup(true);
    const response = await api.getGroup(groupId!);
    if (response.success && response.data) {
      setGroup(response.data);
    }
    setIsLoadingGroup(false);
  };

  const handleFileUpload = async (file: File) => {
    await uploadFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredDocuments = files.filter(file => {
    const matchesSearch = file.originalName.toLowerCase().includes(documentSearch.toLowerCase());
    const matchesFilter = documentFilter === 'all' || 
      (documentFilter === 'pdf' && file.mimeType === 'application/pdf') ||
      (documentFilter === 'docx' && file.mimeType?.includes('wordprocessingml')) ||
      (documentFilter === 'image' && file.mimeType?.startsWith('image/'));
    return matchesSearch && matchesFilter;
  });

  const filteredMembers = group?.members.filter(member => {
    const matchesSearch = member.user.username.toLowerCase().includes(memberSearch.toLowerCase()) ||
      member.user.email.toLowerCase().includes(memberSearch.toLowerCase());
    const matchesFilter = memberFilter === 'all' || member.role === memberFilter;
    return matchesSearch && matchesFilter;
  }) || [];

  const onlineMembers = filteredMembers.length; // Simplified - can be enhanced with actual online status
  const totalMembers = group?.members.length || 0;

  if (isLoadingGroup) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Group not found</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Header Section */}
      <header className="flex-shrink-0 border-b border-border bg-card">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')}
                className="hover:bg-muted/50 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="hidden sm:block p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground mb-1 sm:mb-2 truncate">{group.name}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-4 line-clamp-2">{group.description}</p>
                <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{totalMembers} members</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{files.length} docs</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created {format(new Date(group.createdAt), 'MM/dd/yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                    <MoreVertical className="h-4 w-4" />
            </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleThemeChange('light')}>
                    <Sun className="h-4 w-4 mr-2" />
                    Light Theme
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark Theme
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile: Tab-based Layout */}
      <div className="flex-1 flex flex-col lg:hidden overflow-hidden min-h-0 h-full">
        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as 'chat' | 'documents' | 'members')} className="flex-1 flex flex-col overflow-hidden min-h-0 h-full">
          <div className="flex-shrink-0 border-b border-border bg-card px-2 sm:px-4">
            <TabsList className="grid w-full grid-cols-3 h-10">
              <TabsTrigger value="chat" className="text-xs sm:text-sm">
                <MessageSquare className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs sm:text-sm">
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Docs</span>
              </TabsTrigger>
              <TabsTrigger value="members" className="text-xs sm:text-sm">
                <Users className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Members</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="!mt-0 flex-1 flex flex-col overflow-hidden min-h-0 h-full data-[state=active]:flex">
            <div className="flex-shrink-0 border-b border-border bg-card px-3 sm:px-4 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{onlineMembers} online</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => generateChatSummary(50)}
                    disabled={isGenerating}
                    className="h-8 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    title="Generate new summary"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        <span>Generating</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        <span>Generate</span>
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowSummariesModal(true)}
                    className="h-8 px-3 text-xs border-border"
                    title="View all summaries"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    <span>View</span>
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 relative">
              <ChatWindow 
                groupId={groupId!}
                messages={messages}
                files={files}
                isLoading={messagesLoading} 
                hasMore={hasMore} 
                onSendMessage={sendMessage} 
                onLoadMore={loadMore}
                onFileUpload={handleFileUpload}
                isUploading={isUploading}
                onReaction={addReaction}
              />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="!mt-0 flex-1 flex flex-col overflow-hidden min-h-0 h-full data-[state=active]:flex">
            <div className="flex-shrink-0 border-b border-border bg-card px-3 sm:px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  <h2 className="text-sm sm:text-base font-semibold text-foreground">Documents</h2>
                  <Badge variant="secondary" className="text-xs">{files.length}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={documentSearch}
                    onChange={(e) => setDocumentSearch(e.target.value)}
                    className="pl-10 h-9 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={documentFilter}
                    onChange={(e) => setDocumentFilter(e.target.value)}
                    className="flex-1 h-9 px-3 text-sm border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="all">All Types</option>
                    <option value="pdf">PDF</option>
                    <option value="docx">DOCX</option>
                    <option value="txt">TXT</option>
                  </select>
                  <Button 
                    size="sm"
                    variant="default"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 px-3"
                  >
                    <Upload className="h-4 w-4 mr-1.5" />
                    Upload
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3 min-h-0">
              {filesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs sm:text-sm text-muted-foreground">No documents found</p>
                </div>
              ) : (
                filteredDocuments.map((file) => {
                  const uploader = typeof file.uploader === 'string' ? null : file.uploader;
                  const uploaderId = typeof file.uploader === 'string' ? file.uploader : file.uploader?._id;
                  const isOwnFile = uploaderId === user?._id;
                  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
                  const fileExtension = file.originalName.split('.').pop()?.toUpperCase() || 'FILE';
                  const hasSummary = summaries.some(s => {
                    if (!s.sourceDocument) return false;
                    const sourceDoc = s.sourceDocument;
                    if (typeof sourceDoc === 'string') {
                      return sourceDoc === file._id;
                    }
                    if (typeof sourceDoc === 'object' && '_id' in sourceDoc) {
                      return (sourceDoc as any)._id === file._id;
                    }
                    return false;
                  });
                  
                  return (
                    <Card key={file._id} className="border-border hover:bg-muted/30 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate mb-1">{file.originalName}</p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {fileSizeMB} MB {fileExtension} • {format(new Date(file.createdAt), 'MM/dd/yyyy')}
                            </p>
                            {uploader && (
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={uploader.avatar} alt={uploader.username} />
                                  <AvatarFallback className="text-xs">{uploader.username[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">{uploader.username}</span>
                              </div>
                            )}
                            {hasSummary && (
                              <Badge variant="secondary" className="text-xs mb-2 inline-flex items-center">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Summary Ready
                              </Badge>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 px-3 text-xs whitespace-nowrap" 
                                onClick={async () => {
                                  if (file.mimeType === 'application/pdf') {
                                    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`;
                                    window.open(viewerUrl, '_blank', 'noopener,noreferrer');
                                  } else if (file.mimeType === 'text/plain') {
                                    try {
                                      const response = await fetch(file.url);
                                      const text = await response.text();
                                      const htmlContent = `
                                        <!DOCTYPE html>
                                        <html>
                                          <head>
                                            <meta charset="UTF-8">
                                            <title>${file.originalName}</title>
                                            <style>
                                              body { font-family: 'Courier New', monospace; max-width: 1200px; margin: 0 auto; padding: 20px; background: #fff; color: #000; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; }
                                              @media (prefers-color-scheme: dark) { body { background: #1a1a1a; color: #e0e0e0; } }
                                            </style>
                                          </head>
                                          <body>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
                                        </html>
                                      `;
                                      const blob = new Blob([htmlContent], { type: 'text/html' });
                                      const url = URL.createObjectURL(blob);
                                      window.open(url, '_blank', 'noopener,noreferrer');
                                    } catch (error) {
                                      window.open(file.url, '_blank', 'noopener,noreferrer');
                                    }
                                  } else if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                                    const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(file.url)}`;
                                    window.open(officeViewerUrl, '_blank', 'noopener,noreferrer');
                                  } else if (file.mimeType.startsWith('image/')) {
                                    window.open(file.url, '_blank', 'noopener,noreferrer');
                                  } else {
                                    window.open(file.url, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                              >
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 px-3 text-xs whitespace-nowrap" 
                                onClick={async () => {
                                  try {
                                    const response = await fetch(file.url);
                                    if (!response.ok) throw new Error('Failed to fetch file');
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = file.originalName || 'download';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                  } catch (error) {
                                    const link = document.createElement('a');
                                    link.href = file.url;
                                    link.download = file.originalName || 'download';
                                    link.target = '_blank';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }
                                }}
                              >
                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                Download
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 px-3 text-xs whitespace-nowrap"
                                onClick={async () => {
                                  if (groupId && !isGenerating && !hasSummary) {
                                    const result = await generateDocumentSummary(file._id);
                                    if (result?.success) {
                                      await refetchSummaries();
                                    }
                                  }
                                }}
                                disabled={isGenerating || hasSummary}
                              >
                                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                {hasSummary ? 'Summary' : 'AI Summary'}
                              </Button>
                              {isOwnFile && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 px-3 text-xs whitespace-nowrap text-destructive hover:text-destructive border-destructive/50"
                                  onClick={() => setFileToDelete(file._id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="members" className="!mt-0 flex-1 flex flex-col overflow-hidden min-h-0 h-full data-[state=active]:flex">
            <div className="flex-shrink-0 border-b border-border bg-card px-3 sm:px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  <h2 className="text-sm sm:text-base font-semibold text-foreground">Members</h2>
                  <Badge variant="secondary" className="text-xs">{totalMembers} • {onlineMembers} online</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-10 h-9 text-sm"
                  />
                </div>
                <select
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Owner</option>
                  <option value="member">Member</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3 min-h-0">
              {filteredMembers.map((member) => {
                const memberUser = member.user;
                const initials = (memberUser.username?.[0] || memberUser.email?.[0] || 'U').toUpperCase();
                const isOnline = true;
                const isCurrentUser = memberUser._id === user?._id;
                const isOwner = member.role === 'owner';
                const currentUserIsOwner = group?.members.find(m => m.user._id === user?._id)?.role === 'owner';
                const canLeave = isCurrentUser && !isOwner;
                
                const handleLeaveGroup = async () => {
                  if (groupId && window.confirm('Are you sure you want to leave this group?')) {
                    await leaveGroup(groupId);
                    navigate('/dashboard');
                  }
                };
                
                return (
                  <Card key={memberUser._id} className="border-border hover:bg-muted/30 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={memberUser.avatar} alt={memberUser.username} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {isOnline && (
                              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{memberUser.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{memberUser.email}</p>
                            <Badge variant="secondary" className="text-xs mt-1 mr-1">
                              {member.role === 'owner' ? 'Admin' : member.role === 'admin' ? 'Moderator' : 'Member'}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              Joined {format(new Date(member.joinedAt), 'MM/dd/yyyy')}
                            </p>
                            {memberStats[memberUser._id] && (
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{memberStats[memberUser._id].messages} messages</span>
                                <span>{memberStats[memberUser._id].files} files</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {canLeave && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={handleLeaveGroup} className="text-red-600 dark:text-red-400">
                                <LogOut className="h-4 w-4 mr-2" />
                                Leave Group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: Three-Panel Layout */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Left Panel: Group Chat */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          <div className="flex-shrink-0 border-b border-border bg-card px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Group Chat</h2>
                <Badge variant="secondary" className="text-xs">{onlineMembers} members online</Badge>
        </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => generateChatSummary(50)}
                  disabled={isGenerating}
                  className="h-8"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Generate Chat Summary
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowSummariesModal(true)}
                  className="h-8"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  View Summaries
                </Button>
                <Button variant="ghost" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
              <ChatWindow 
                groupId={groupId!}
                messages={messages}
                files={files}
                isLoading={messagesLoading} 
                hasMore={hasMore} 
                onSendMessage={sendMessage} 
                onLoadMore={loadMore}
                onFileUpload={handleFileUpload}
                isUploading={isUploading}
                onReaction={addReaction}
              />
          </div>
        </div>

        {/* Middle Panel: Shared Documents */}
        <div className="w-96 flex flex-col border-r border-border bg-card">
          <div className="flex-shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Shared Documents</h2>
                <Badge variant="secondary" className="text-xs">{files.length} files</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={documentSearch}
                  onChange={(e) => setDocumentSearch(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={documentFilter}
                  onChange={(e) => setDocumentFilter(e.target.value)}
                  className="w-full h-9 px-2 text-sm border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">All Types</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="txt">TXT</option>
                </select>
              <Button 
                  size="sm"
                variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
              </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {filesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No documents found</p>
              </div>
            ) : (
              filteredDocuments.map((file) => {
                const uploader = typeof file.uploader === 'string' ? null : file.uploader;
                const uploaderId = typeof file.uploader === 'string' ? file.uploader : file.uploader?._id;
                const isOwnFile = uploaderId === user?._id;
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
                const fileExtension = file.originalName.split('.').pop()?.toUpperCase() || 'FILE';
                const hasSummary = summaries.some(s => {
                  if (!s.sourceDocument) return false;
                  const sourceDoc = s.sourceDocument;
                  if (typeof sourceDoc === 'string') {
                    return sourceDoc === file._id;
                  }
                  if (typeof sourceDoc === 'object' && '_id' in sourceDoc) {
                    return (sourceDoc as any)._id === file._id;
                  }
                  return false;
                });
                const isProcessing = false; // Files are uploaded directly, no processing needed
                
                return (
                  <Card key={file._id} className="border-border hover:bg-muted/30 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate mb-1">{file.originalName}</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            {fileSizeMB} MB {fileExtension} • {format(new Date(file.createdAt), 'MM/dd/yyyy')}
                          </p>
                          {uploader && (
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={uploader.avatar} alt={uploader.username} />
                                <AvatarFallback className="text-xs">{uploader.username[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">{uploader.username}</span>
                            </div>
                          )}
                          {isProcessing && (
                            <Badge variant="secondary" className="text-xs mb-2">
                              Processing...
                            </Badge>
                          )}
                          {hasSummary && !isProcessing && (
                            <Badge variant="secondary" className="text-xs mb-2 inline-flex items-center">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Summary Ready
                            </Badge>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-xs whitespace-nowrap" 
                              onClick={async () => {
                                // Handle different file types appropriately
                                if (file.mimeType === 'application/pdf') {
                                  // PDFs: Use Google Docs Viewer
                                  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`;
                                  window.open(viewerUrl, '_blank', 'noopener,noreferrer');
                                } else if (file.mimeType === 'text/plain') {
                                  // TXT files: Fetch and display in new tab with formatted HTML
                                  try {
                                    const response = await fetch(file.url);
                                    const text = await response.text();
                                    // Create an HTML page with the text content
                                    const htmlContent = `
                                      <!DOCTYPE html>
                                      <html>
                                        <head>
                                          <meta charset="UTF-8">
                                          <title>${file.originalName}</title>
                                          <style>
                                            body {
                                              font-family: 'Courier New', monospace;
                                              max-width: 1200px;
                                              margin: 0 auto;
                                              padding: 20px;
                                              background: #fff;
                                              color: #000;
                                              line-height: 1.6;
                                              white-space: pre-wrap;
                                              word-wrap: break-word;
                                            }
                                            @media (prefers-color-scheme: dark) {
                                              body {
                                                background: #1a1a1a;
                                                color: #e0e0e0;
                                              }
                                            }
                                          </style>
                                        </head>
                                        <body>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
                                      </html>
                                    `;
                                    const blob = new Blob([htmlContent], { type: 'text/html' });
                                    const url = URL.createObjectURL(blob);
                                    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
                                    // Clean up after window closes or after delay
                                    if (newWindow) {
                                      newWindow.addEventListener('beforeunload', () => {
                                        URL.revokeObjectURL(url);
                                      });
                                      setTimeout(() => URL.revokeObjectURL(url), 60000); // Clean up after 1 minute
                                    }
                                  } catch (error) {
                                    console.error('Error viewing text file:', error);
                                    // Fallback: open directly
                                    window.open(file.url, '_blank', 'noopener,noreferrer');
                                  }
                                } else if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                                  // DOCX files: Try Office Online viewer, fallback to download
                                  // Office Online requires the file to be publicly accessible
                                  const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(file.url)}`;
                                  const viewerWindow = window.open(officeViewerUrl, '_blank', 'noopener,noreferrer');
                                  // If Office viewer fails, fallback to direct download
                                  if (!viewerWindow) {
                                    // Fallback: trigger download
                                    const link = document.createElement('a');
                                    link.href = file.url;
                                    link.download = file.originalName;
                                    link.target = '_blank';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }
                                } else if (file.mimeType.startsWith('image/')) {
                                  // Images can be viewed directly
                                  window.open(file.url, '_blank', 'noopener,noreferrer');
                                } else {
                                  // For other files, try to open directly
                                  window.open(file.url, '_blank', 'noopener,noreferrer');
                                }
                              }}
                            >
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-xs whitespace-nowrap" 
                              onClick={async () => {
                                // Force download by fetching as blob to preserve filename and extension
                                try {
                                  const response = await fetch(file.url);
                                  if (!response.ok) throw new Error('Failed to fetch file');
                                  
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  // Use original filename which should include extension
                                  link.download = file.originalName || 'download';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(url);
                                } catch (error) {
                                  console.error('Error downloading file:', error);
                                  // Fallback: direct download with proper filename
                                  const link = document.createElement('a');
                                  link.href = file.url;
                                  // Use original filename which should include extension
                                  link.download = file.originalName || 'download';
                                  link.target = '_blank';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                              className="h-7 px-2 text-xs whitespace-nowrap"
                              onClick={async () => {
                                if (groupId && !isGenerating && !hasSummary) {
                                  const result = await generateDocumentSummary(file._id);
                                  if (result?.success) {
                                    // Refresh summaries to show the new one
                                    await refetchSummaries();
                                  }
                                }
                              }}
                              disabled={isGenerating || hasSummary}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              {hasSummary ? 'Summary Ready' : 'AI Summary'}
                        </Button>
                        {isOwnFile && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 px-2 text-xs whitespace-nowrap text-destructive hover:text-destructive"
                            onClick={() => setFileToDelete(file._id)}
                            title="Delete document"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        )}
                          </div>
                        </div>
                        </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Members */}
        <div className="w-80 flex flex-col bg-card">
          <div className="flex-shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Members</h2>
                <Badge variant="secondary" className="text-xs">{totalMembers} members • {onlineMembers} online</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Owner</option>
                  <option value="member">Member</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {filteredMembers.map((member) => {
              const memberUser = member.user;
              const initials = (memberUser.username?.[0] || memberUser.email?.[0] || 'U').toUpperCase();
              const isOnline = true; // Simplified - can be enhanced with actual online status
              const isCurrentUser = memberUser._id === user?._id;
              const isOwner = member.role === 'owner';
              const currentUserIsOwner = group?.members.find(m => m.user._id === user?._id)?.role === 'owner';
              const canLeave = isCurrentUser && !isOwner;
              
              const handleLeaveGroup = async () => {
                if (groupId && window.confirm('Are you sure you want to leave this group?')) {
                  await leaveGroup(groupId);
                  navigate('/dashboard');
                }
              };
              
              return (
                <Card key={memberUser._id} className="border-border hover:bg-muted/30 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={memberUser.avatar} alt={memberUser.username} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{memberUser.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{memberUser.email}</p>
                          <Badge variant="secondary" className="text-xs mt-1 mr-1">
                            {member.role === 'owner' ? 'Admin' : member.role === 'admin' ? 'Moderator' : 'Member'}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Joined {format(new Date(member.joinedAt), 'MM/dd/yyyy')}
                          </p>
                          {memberStats[memberUser._id] && (
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{memberStats[memberUser._id].messages} messages</span>
                              <span>{memberStats[memberUser._id].files} files</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {canLeave && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={handleLeaveGroup} className="text-red-600 dark:text-red-400">
                              <LogOut className="h-4 w-4 mr-2" />
                              Leave Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summaries Modal */}
      <Dialog open={showSummariesModal} onOpenChange={setShowSummariesModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              AI Summaries
            </DialogTitle>
            <DialogDescription>
              View all AI-generated summaries for this group.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="flex justify-end mb-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateChatSummary(50)} 
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Generate Chat Summary
                  </>
                )}
              </Button>
            </div>
            {summaries.length === 0 ? (
              <div className="text-center py-10">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">No summaries yet for this group.</p>
                <p className="text-xs text-muted-foreground">
                  Use the button above to generate a chat summary.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {summaries.map((summary) => (
                  <Card key={summary._id} className="border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {summary.type === 'document' ? (
                            <FileText className="h-4 w-4 text-purple-600" />
                          ) : (
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {summary.type === 'document' ? 'Document Summary' : 'Chat Summary'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(summary.createdAt), 'MMM d, yyyy HH:mm')}
                          </span>
                        <Button 
                          variant="ghost" 
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setSummaryToDelete(summary._id)}
                            title="Delete summary"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                      </div>
                      <p className="text-sm text-foreground mb-3 whitespace-pre-wrap break-words">
                        {summary.content}
                      </p>
                      {summary.keyTopics && summary.keyTopics.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Key Topics:</p>
                          <div className="flex flex-wrap gap-2">
                            {summary.keyTopics.map((topic, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {summary.actionItems && summary.actionItems.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Action Items:</p>
                          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                            {summary.actionItems.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Summary Confirmation Dialog with Glass Theme */}
      <AlertDialog open={summaryToDelete !== null} onOpenChange={(open) => !open && setSummaryToDelete(null)}>
        <AlertDialogContent className="backdrop-blur-xl bg-background/80 border-border/50 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Summary
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this summary? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background/50 backdrop-blur-sm border-border/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (summaryToDelete) {
                  await deleteSummary(summaryToDelete);
                  setSummaryToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete File Confirmation Dialog with Glass Theme */}
      <AlertDialog open={fileToDelete !== null} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent className="backdrop-blur-xl bg-background/80 border-border/50 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Document
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this document? This action cannot be undone and the file will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background/50 backdrop-blur-sm border-border/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (fileToDelete) {
                  await deleteFile(fileToDelete);
                  setFileToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
