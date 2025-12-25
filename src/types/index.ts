// User Types
export type UserRole = 'admin' | 'owner' | 'member';

export interface User {
  _id: string;
  email: string;
  username: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Group Types
export interface GroupMember {
  user: User;
  role: UserRole;
  joinedAt: string;
}

export interface Group {
  _id: string;
  name: string;
  description: string;
  members: GroupMember[];
  owner: User;
  createdAt: string;
  updatedAt: string;
  isMember?: boolean; // Optional flag to indicate if current user is a member
}

// Message Types
export interface Message {
  _id: string;
  content: string;
  sender: User;
  group: string;
  createdAt: string;
  updatedAt: string;
}

// File Types
export interface FileDocument {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploader: User;
  group: string;
  url: string;
  createdAt: string;
}

// Summary Types
export interface Summary {
  _id: string;
  type: 'chat' | 'document';
  content: string;
  keyTopics: string[];
  actionItems: string[];
  group: string;
  sourceDocument?: string;
  messageRange?: {
    from: string;
    to: string;
    count: number;
  };
  generatedBy: User;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
