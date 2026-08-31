import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: string;
  hasGeminiApiKey?: boolean;
  geminiApiKeyMasked?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getInitialAuth = (): { token: string | null; user: User | null } => {
  const savedToken = localStorage.getItem('pagepulse_token');
  const savedUser = localStorage.getItem('pagepulse_user');
  
  if (savedToken && savedUser) {
    try {
      return { token: savedToken, user: JSON.parse(savedUser) };
    } catch {
      localStorage.removeItem('pagepulse_token');
      localStorage.removeItem('pagepulse_user');
    }
  }
  return { token: null, user: null };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<{ token: string | null; user: User | null }>(() => getInitialAuth());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (auth.token) {
      // Sync fresh profile data from server in background
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
        .then((res) => res.ok ? res.json() : null)
        .then((freshUser) => {
          if (freshUser && auth.token) {
            setAuth((prev) => {
              const merged = { ...prev.user, ...freshUser };
              localStorage.setItem('pagepulse_user', JSON.stringify(merged));
              return { ...prev, user: merged };
            });
          }
        })
        .catch(() => {});
    }
  }, [auth.token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('pagepulse_token', newToken);
    localStorage.setItem('pagepulse_user', JSON.stringify(newUser));
    setAuth({ token: newToken, user: newUser });
  };

  const logout = () => {
    localStorage.removeItem('pagepulse_token');
    localStorage.removeItem('pagepulse_user');
    setAuth({ token: null, user: null });
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setAuth((prev) => {
      if (!prev.user) return prev;
      const updated = { ...prev.user, ...updatedFields };
      localStorage.setItem('pagepulse_user', JSON.stringify(updated));
      return { ...prev, user: updated };
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user: auth.user, 
      token: auth.token, 
      login, 
      logout, 
      updateUser,
      isAuthenticated: !!auth.token, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};