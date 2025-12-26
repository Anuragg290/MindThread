import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthState } from '@/types';
import { api } from '@/services/api';
import { socketService } from '@/services/socket';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string, institution?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getProfile().then((response) => {
        if (response.success && response.data) {
          setAuthState({
            user: response.data,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          socketService.connect(token);
        } else {
          api.setToken(null);
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      });
    } else {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    if (response.success && response.data) {
      const { user, token } = response.data;
      api.setToken(token);
      socketService.connect(token);
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }
    return { success: false, error: response.error };
  }, []);

  const register = useCallback(async (username: string, email: string, password: string, institution?: string) => {
    const response = await api.register(username, email, password, institution);
    if (response.success && response.data) {
      const { user, token } = response.data;
      api.setToken(token);
      socketService.connect(token);
      setAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }
    return { success: false, error: response.error };
  }, []);

  const updateUser = useCallback((user: User) => {
    setAuthState((prev) => ({
      ...prev,
      user,
    }));
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    socketService.disconnect();
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
