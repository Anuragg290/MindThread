import React, { useState, useEffect, useRef } from 'react';
import { Group, FileDocument } from '@/types';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
// Note: X icon and Button for close removed - sidebar is always visible
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Info, 
  Settings, 
  Users, 
  FileText, 
  Shield, 
  ChevronRight,
  Sparkles,
  Trash2,
  Loader2,
  Sun,
  Moon,
  Copy,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface GroupInfoSidebarProps {
  groupId: string;
  isOpen: boolean; // Kept for compatibility, but always true now
  onClose: () => void; // Kept for compatibility, but no-op now
  files: FileDocument[];
  filesLoading: boolean;
  isUploading: boolean;
  onFileUpload: (file: File) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
  onGenerateDocumentSummary: (fileId: string) => Promise<void>;
  isGenerating: boolean;
}

export default function GroupInfoSidebar({
  groupId,
  isOpen,
  onClose,
  files,
  filesLoading,
  isUploading,
  onFileUpload,
  onDeleteFile,
  onGenerateDocumentSummary,
  isGenerating,
}: GroupInfoSidebarProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGroupCode, setShowGroupCode] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (groupId) {
      fetchGroup();
    }
  }, [groupId]);

  const fetchGroup = async () => {
    setIsLoading(true);
    const response = await api.getGroup(groupId);
    if (response.success && response.data) {
      setGroup(response.data);
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onFileUpload(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSectionClick = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleCopyGroupCode = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group._id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy group code:', error);
    }
  };

  return (
    <div 
      className="h-full w-full flex flex-col border-l border-border"
      style={{
        backgroundColor: 'hsl(var(--sidebar-background))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-medium text-foreground">Group Info</h2>
        {/* Close button removed - sidebar is always visible on desktop */}
      </div>

      {/* Content - Scrollable independently */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : group ? (
            <div className="p-4 space-y-2">
              {/* Chat Info */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => handleSectionClick('info')}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-muted-foreground" />
                    <span className="font-normal text-foreground">Chat Info</span>
                  </div>
                  <ChevronRight 
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      activeSection === 'info' ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {activeSection === 'info' && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Group Name</p>
                      <p className="font-normal text-foreground">{group.name}</p>
                    </div>
                    {group.description && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Description</p>
                        <p className="text-sm text-foreground">{group.description}</p>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-muted-foreground">Group Code</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowGroupCode(!showGroupCode)}
                          className="h-7 text-xs"
                        >
                          {showGroupCode ? 'Hide' : 'Show'}
                        </Button>
                      </div>
                      {showGroupCode && (
                        <>
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border border-border">
                            <code className="flex-1 text-xs font-mono text-foreground break-all">
                              {group._id}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCopyGroupCode}
                              className="h-7 w-7 p-0 flex-shrink-0"
                              title="Copy group code"
                            >
                              {copied ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Share this code to invite others
                          </p>
                        </>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Created</p>
                      <p className="text-sm text-foreground">
                        {format(new Date(group.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Owner</p>
                      <p className="text-sm font-normal text-foreground">
                        {group.owner.username}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Customise Chat - Theme Toggle */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => handleSectionClick('customise')}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    <span className="font-normal text-foreground">Customise Chat</span>
                  </div>
                  <ChevronRight 
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      activeSection === 'customise' ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {activeSection === 'customise' && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    {/* Theme Toggle - UI only, no state logic */}
                    <div className="space-y-2">
                      <p className="text-sm font-normal text-foreground">Theme</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            // Toggle theme and persist to localStorage
                            document.documentElement.removeAttribute('data-theme');
                            localStorage.setItem('theme', 'light');
                          }}
                          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all hover:bg-muted/50"
                          style={{
                            borderColor: document.documentElement.getAttribute('data-theme') !== 'dark' 
                              ? 'hsl(var(--border))' 
                              : 'hsl(var(--border))',
                            backgroundColor: document.documentElement.getAttribute('data-theme') !== 'dark' 
                              ? 'hsl(var(--muted))' 
                              : 'transparent',
                          }}
                          title="Light theme"
                        >
                          <Sun className="h-4 w-4 text-foreground" />
                          <span className="text-sm font-normal text-foreground">Light</span>
                        </button>
                        <button
                          onClick={() => {
                            // Toggle theme and persist to localStorage
                            document.documentElement.setAttribute('data-theme', 'dark');
                            localStorage.setItem('theme', 'dark');
                          }}
                          className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all hover:bg-muted/50"
                          style={{
                            borderColor: document.documentElement.getAttribute('data-theme') === 'dark' 
                              ? 'hsl(var(--border))' 
                              : 'hsl(var(--border))',
                            backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' 
                              ? 'hsl(var(--muted))' 
                              : 'transparent',
                          }}
                          title="Dark theme"
                        >
                          <Moon className="h-4 w-4 text-foreground" />
                          <span className="text-sm font-normal text-foreground">Dark</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Members */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => handleSectionClick('members')}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-normal text-foreground">Chat Members</span>
                    <Badge variant="secondary" className="ml-2">
                      {group.members.length}
                    </Badge>
                  </div>
                  <ChevronRight 
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      activeSection === 'members' ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {activeSection === 'members' && (
                  <div className="px-4 pb-4 space-y-2 border-t border-border pt-4">
                    {group.members.map((member) => (
                      <div
                        key={member.user._id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs font-normal text-foreground">
                              {member.user.username[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-normal text-foreground">
                              {member.user.username}
                              {member.user._id === user?._id && ' (You)'}
                            </p>
                            <p className="text-xs text-muted-foreground">{member.role}</p>
                          </div>
                        </div>
                        {member.role === 'owner' && (
                          <Badge variant="secondary" className="text-xs">Owner</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Media, Files & Links */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => handleSectionClick('files')}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-normal text-foreground">Media, Files & Links</span>
                    {files.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {files.length}
                      </Badge>
                    )}
                  </div>
                  <ChevronRight 
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      activeSection === 'files' ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {activeSection === 'files' && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                    {/* Upload button */}
                    <label className="block">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.docx,.txt"
                      />
                      <Button
                        asChild
                        disabled={isUploading}
                        className="w-full shadow-sm hover:shadow-md transition-shadow"
                      >
                        <span>
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Upload File
                            </>
                          )}
                        </span>
                      </Button>
                    </label>

                    {/* Files list */}
                    {filesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : files.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">No files uploaded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {files.map((file) => (
                          <Card key={file._id} className="border-border">
                            <CardContent className="p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-5 w-5 text-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-normal text-foreground truncate">
                                    {file.originalName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(file.createdAt), 'MMM d, yyyy')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onGenerateDocumentSummary(file._id)}
                                  disabled={isGenerating}
                                  className="h-8 w-8 p-0"
                                  title="Generate summary"
                                >
                                  <Sparkles className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onDeleteFile(file._id)}
                                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                  title="Delete file"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Privacy & Support */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => handleSectionClick('privacy')}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span className="font-normal text-foreground">Privacy & Support</span>
                  </div>
                  <ChevronRight 
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      activeSection === 'privacy' ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {activeSection === 'privacy' && (
                  <div className="px-4 pb-4 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">Privacy settings and support options coming soon</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
      </div>
    </div>
  );
}

