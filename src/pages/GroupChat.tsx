import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMessages } from '@/hooks/useMessages';
import { useFiles } from '@/hooks/useFiles';
import { useSummaries } from '@/hooks/useSummaries';
import ChatWindow from '@/components/ChatWindow';
import GroupInfoSidebar from '@/components/GroupInfoSidebar';
import GroupsSidebar from '@/components/GroupsSidebar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { messages, isLoading: messagesLoading, hasMore, sendMessage, loadMore, addReaction } = useMessages(groupId!);
  const { files, isLoading: filesLoading, isUploading, uploadFile, deleteFile } = useFiles(groupId!);
  const { summaries, isLoading: summariesLoading, isGenerating, generateChatSummary, generateDocumentSummary, deleteSummary } = useSummaries(groupId!);
  const [activeTab, setActiveTab] = useState('chat');

  // UI-only: File upload handler - moved from Files tab to be used in ChatWindow and Sidebar
  const handleFileUpload = async (file: File) => {
    await uploadFile(file);
  };

  // UI-only: Wrapper functions for sidebar callbacks (type compatibility)
  const handleDeleteFile = async (fileId: string) => {
    await deleteFile(fileId);
  };

  const handleGenerateDocumentSummary = async (fileId: string) => {
    await generateDocumentSummary(fileId);
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* 
        LAYOUT: 3-column ChatGPT-like layout
        - Page uses h-screen (100vh) with overflow-hidden
        - Header fixed at top
        - 3-column layout: [Left Sidebar | Chat Area | Group Info]
        - Each column scrolls independently
        - Header, input, and sidebars remain fixed
      */}
      {/* Header - Fixed at top */}
      <header className="flex-shrink-0 border-b border-border bg-card z-10">
        <div className="px-4 sm:px-6">
          <div className="flex items-center gap-3 h-14">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')}
              className="hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-medium text-foreground">Study Group</h1>
          </div>
        </div>
      </header>

      {/* 
        LAYOUT: 3-column structure
        - Left Sidebar: Fixed width (w-64 = 256px), scrolls internally
        - Chat Area: Flexible width (flex-1), messages scroll internally
        - Group Info Sidebar: Fixed width (w-80 = 320px), scrolls internally
        - All columns isolated scrolling, page does not scroll
      */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Groups List */}
        <div className="hidden lg:flex lg:w-64 flex-shrink-0">
          <GroupsSidebar />
        </div>

        {/* Vertical Divider */}
        <div className="hidden lg:block w-px bg-border" />

        {/* Chat Area - Flexible width */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Tabs - Fixed at top, below header */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 border-b border-border bg-card px-4 sm:px-6 pt-4">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted p-1 rounded-lg">
                <TabsTrigger 
                  value="chat"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-normal"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Chat</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="summaries"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all font-normal"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Summaries</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="flex-1 m-0 min-h-0">
              {/* UI-only: File upload handler passed to ChatWindow for "+" button */}
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
            </TabsContent>

            <TabsContent value="summaries" className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-foreground mb-1">AI Summaries</h2>
                <p className="text-sm text-muted-foreground">AI-powered insights from your conversations</p>
              </div>
              <Button 
                onClick={() => generateChatSummary(50)} 
                disabled={isGenerating}
                variant="outline"
                className="border-border hover:bg-muted/50 transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Summarize Chat
                  </>
                )}
              </Button>
            </div>
            {summariesLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : summaries.length === 0 ? (
              <div className="text-center py-20">
                <div className="mx-auto w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <Sparkles className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <p className="text-muted-foreground">No summaries yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {summaries.map((summary) => (
                  <Card key={summary._id} className="border-border hover:bg-muted/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">{summary.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(summary.createdAt), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => deleteSummary(summary._id)}
                          className="hover:bg-muted/50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm leading-relaxed text-foreground font-normal">{summary.content}</p>
                      {summary.keyTopics.length > 0 && (
                        <div>
                          <p className="text-xs font-normal mb-2 text-foreground">Key Topics:</p>
                          <div className="flex flex-wrap gap-2">
                            {summary.keyTopics.map((t, i) => (
                              <Badge key={i} variant="outline" className="border-border">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {summary.actionItems.length > 0 && (
                        <div>
                          <p className="text-xs font-normal mb-2 text-foreground">Action Items:</p>
                          <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                            {summary.actionItems.map((a, i) => (
                              <li key={i} className="leading-relaxed">{a}</li>
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
        </TabsContent>
      </Tabs>
        </div>

        {/* Vertical Divider */}
        <div className="hidden lg:block w-px bg-border" />

        {/* Group Info Sidebar - Right sidebar, always visible on desktop */}
        <div className="hidden lg:flex lg:w-80 flex-shrink-0">
          <GroupInfoSidebar
            groupId={groupId!}
            isOpen={true}
            onClose={() => {}}
            files={files}
            filesLoading={filesLoading}
            isUploading={isUploading}
            onFileUpload={handleFileUpload}
            onDeleteFile={handleDeleteFile}
            onGenerateDocumentSummary={handleGenerateDocumentSummary}
            isGenerating={isGenerating}
          />
        </div>
      </div>
    </div>
  );
}
