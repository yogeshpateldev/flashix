import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authService } from "@/services/api";

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("flashix_token");
    const storedUser = localStorage.getItem("flashix_user");
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("flashix_token");
        localStorage.removeItem("flashix_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, password);
      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name || email.split("@")[0],
        role: data.user.role,
      };
      setUser(userData);
      setToken(data.token);
      localStorage.setItem("flashix_token", data.token);
      localStorage.setItem("flashix_user", JSON.stringify(userData));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authService.register(name, email, password);
      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        name: name || data.user.name || email.split("@")[0],
        role: data.user.role,
      };
      setUser(userData);
      setToken(data.token);
      localStorage.setItem("flashix_token", data.token);
      localStorage.setItem("flashix_user", JSON.stringify(userData));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("flashix_token");
    localStorage.removeItem("flashix_user");
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
