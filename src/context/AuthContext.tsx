import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';
import { User, AuthResponse } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>; // Useful for updating credits after a purchase
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. On App Start: Check if we have a saved token
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('crosscast_token');
      const savedUser = localStorage.getItem('crosscast_user');

      if (token && savedUser) {
        try {
          // Optional: Verify token with backend here if needed
          // For now, we trust the local storage to speed up load time
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Failed to parse user data", e);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // 2. Login Action
  const login = (token: string, userData: User) => {
    localStorage.setItem('crosscast_token', token);
    localStorage.setItem('crosscast_user', JSON.stringify(userData));
    setUser(userData);
  };

  // 3. Logout Action
  const logout = () => {
    localStorage.removeItem('crosscast_token');
    localStorage.removeItem('crosscast_user');
    setUser(null);
    // Optional: window.location.href = '/'; 
  };

  // 4. Refresh User (e.g. update credits)
  const refreshUser = async () => {
    // We haven't built a specific "get me" endpoint yet, 
    // but usually, you'd hit /me here.
    // For now, we will just rely on the local state updates.
    console.log("Refreshing user data..."); 
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      logout,
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook for easy access
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};