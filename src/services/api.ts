import { ApiResponse, Group, User, Message, FileDocument, Summary, PaginatedResponse } from '@/types';

// Configure your backend URL here
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`API Error [${response.status}]:`, data);
        return {
          success: false,
          error: data.message || data.error || 'An error occurred',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(username: string, email: string, password: string, institution?: string): Promise<ApiResponse<{ user: User; token: string }>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, institution }),
    });
  }



  async getProfile(): Promise<ApiResponse<User>> {
    return this.request('/auth/profile');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async uploadAvatar(file: File): Promise<ApiResponse<User>> {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = this.getToken();
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile/avatar`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Upload failed' };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Upload failed' };
    }
  }

  // Group endpoints
  async getGroups(): Promise<ApiResponse<Group[]>> {
    return this.request('/groups');
  }

  async getAllGroups(): Promise<ApiResponse<Group[]>> {
    return this.request('/groups/all');
  }

  async getGroup(id: string): Promise<ApiResponse<Group>> {
    return this.request(`/groups/${id}`);
  }

  async createGroup(name: string, description: string): Promise<ApiResponse<Group>> {
    return this.request('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async joinGroup(groupId: string): Promise<ApiResponse<Group>> {
    return this.request(`/groups/${groupId}/join`, {
      method: 'POST',
    });
  }

  async leaveGroup(groupId: string): Promise<ApiResponse<void>> {
    return this.request(`/groups/${groupId}/leave`, {
      method: 'POST',
    });
  }

  async updateMemberRole(groupId: string, userId: string, role: string): Promise<ApiResponse<Group>> {
    return this.request(`/groups/${groupId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async removeMember(groupId: string, userId: string): Promise<ApiResponse<void>> {
    return this.request(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // Message endpoints
  async getMessages(groupId: string, page = 1, limit = 50): Promise<ApiResponse<PaginatedResponse<Message>>> {
    return this.request(`/groups/${groupId}/messages?page=${page}&limit=${limit}`);
  }

  async sendMessage(groupId: string, content: string, replyTo?: string): Promise<ApiResponse<Message>> {
    return this.request(`/groups/${groupId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, replyTo }),
    });
  }

  async addMessageReaction(groupId: string, messageId: string, emoji: string): Promise<ApiResponse<Message>> {
    return this.request(`/groups/${groupId}/messages/${messageId}/reaction`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  // File endpoints
  async getFiles(groupId: string): Promise<ApiResponse<FileDocument[]>> {
    return this.request(`/groups/${groupId}/files`);
  }

  async uploadFile(groupId: string, file: File): Promise<ApiResponse<FileDocument>> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/files`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Upload failed' };
    }
  }

  async deleteFile(groupId: string, fileId: string): Promise<ApiResponse<void>> {
    return this.request(`/groups/${groupId}/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  // Summary endpoints
  async getSummaries(groupId: string): Promise<ApiResponse<Summary[]>> {
    return this.request(`/groups/${groupId}/summaries`);
  }

  async generateChatSummary(groupId: string, messageCount?: number): Promise<ApiResponse<Summary>> {
    return this.request(`/groups/${groupId}/summaries/chat`, {
      method: 'POST',
      body: JSON.stringify({ messageCount }),
    });
  }

  async generateDocumentSummary(groupId: string, fileId: string): Promise<ApiResponse<Summary>> {
    return this.request(`/groups/${groupId}/summaries/document`, {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  }

  async deleteSummary(groupId: string, summaryId: string): Promise<ApiResponse<void>> {
    return this.request(`/groups/${groupId}/summaries/${summaryId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
