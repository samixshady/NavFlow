import { create } from 'zustand';

export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  bio?: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User | null) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Initialize from localStorage if available
  const storedToken = typeof window !== 'undefined' 
    ? localStorage.getItem('access_token') 
    : null;

  return {
    user: null,
    token: storedToken,
    isAuthenticated: !!storedToken,
    
    login: (token: string, user: User | null) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', token);
      }
      set({
        token,
        user,
        isAuthenticated: true,
      });
    },
    
    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      set({
        token: null,
        user: null,
        isAuthenticated: false,
      });
    },
    
    setUser: (user: User) => {
      set({ user });
    },
    
    setToken: (token: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', token);
      }
      set({ token, isAuthenticated: true });
    },
  };
});
