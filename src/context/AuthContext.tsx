import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Seller } from '../types';

interface RegisterData {
  username: string;
  password: string;
  name: string;
  storeName?: string;
  email?: string;
}

interface AuthContextType {
  seller: Seller | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateCurrentSeller: (updated: Partial<Seller>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'seller_auth_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY) || null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check current session on mount or token change
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setSeller(null);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.seller) {
            setSeller(data.seller);
            setToken(storedToken);
          } else {
            // Invalid session
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setSeller(null);
          }
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setSeller(null);
        }
      } catch (err) {
        console.error('[AuthContext] Error verifying session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Error al iniciar sesión' };
      }

      if (data.token && data.seller) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setSeller(data.seller);
        return { success: true };
      }

      return { success: false, error: 'Respuesta inválida del servidor' };
    } catch (err: any) {
      console.error('[AuthContext] Login error:', err);
      return { success: false, error: 'Error de conexión con el servidor' };
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json();

      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || 'Error al registrar vendedor' };
      }

      if (resData.token && resData.seller) {
        localStorage.setItem(TOKEN_KEY, resData.token);
        setToken(resData.token);
        setSeller(resData.seller);
        return { success: true };
      }

      return { success: false, error: 'Respuesta inválida del servidor' };
    } catch (err: any) {
      console.error('[AuthContext] Register error:', err);
      return { success: false, error: 'Error de conexión con el servidor' };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.warn('Logout network notice:', err);
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setSeller(null);
  };

  const updateCurrentSeller = (updated: Partial<Seller>) => {
    if (seller) {
      setSeller({ ...seller, ...updated });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        seller,
        token,
        isLoading,
        login,
        register,
        logout,
        updateCurrentSeller,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
