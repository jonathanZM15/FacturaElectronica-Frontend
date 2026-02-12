import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
import { User } from '../types/user';

type UserContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const clearAuth = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setUser(null);
  };

  // fetchMe removed; logic inlined in useEffect

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const res = await auth.me();
          setUser(res.data);
        } catch (e) {
          clearAuth();
        }
      }
      setLoading(false);
    };

    init();

    // Listen for storage events (other tabs) to react to token removal
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'authToken' && e.newValue == null) {
        // token removed in another tab - force logout here
        clearAuth();
        navigate('/');
      }
    };
    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, [navigate]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await auth.login(email, password);
      const { token, user: u } = res.data;
      if (token) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('authUser', JSON.stringify(u));
        setUser(u);
        navigate('/emisores'); // ← ir directo a Emisores
      }
    } catch (error) {
      // Propagar el error para que el componente Login lo maneje
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const res = await auth.register(name, email, password);
      const { token, user: u } = res.data;
      if (token) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('authUser', JSON.stringify(u));
        setUser(u);
        navigate('/emisores'); // ← ir directo a Emisores
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await auth.logout();
    } catch (e) {
      // ignore
    }
    clearAuth();
    navigate('/');
  };

  return (
    <UserContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};

export default UserContext;
export {};

