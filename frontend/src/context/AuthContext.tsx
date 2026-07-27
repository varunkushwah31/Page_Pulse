import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
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

  return (
    <AuthContext.Provider value={{ 
      user: auth.user, 
      token: auth.token, 
      login, 
      logout, 
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