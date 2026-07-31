import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, LoginResponse } from '../services/auth.service';
import { apiClient } from '../services/api';

interface UserSession {
  id: number;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'SUPERVISOR' | 'TECNICO' | 'USUARIO';
  must_change_password: boolean;
  has_inventory_access: boolean;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateMustChangePassword: (val: boolean) => void;
  userPrivateKey: CryptoKey | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userPrivateKey, setUserPrivateKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session
  useEffect(() => {
    const initializeSession = async () => {
      const savedToken = localStorage.getItem('smo_token');
      const savedUser = localStorage.getItem('smo_user');
      
      if (savedToken && savedUser) {
        setToken(savedToken);
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        // Try to restore private key from sessionStorage or fetch from server
        let savedKeyJwk = sessionStorage.getItem(`smo_priv_key_${parsedUser.id}`);
        
        if (!savedKeyJwk) {
          try {
            const keys = await apiClient.get<any>(`/usuarios/${parsedUser.id}/keys`, {
              headers: { Authorization: `Bearer ${savedToken}` }
            });
            if (keys && keys.private_key) {
              savedKeyJwk = JSON.stringify(keys.private_key);
              sessionStorage.setItem(`smo_priv_key_${parsedUser.id}`, savedKeyJwk);
            }
          } catch (fetchErr) {
            console.error('Failed to fetch E2EE keys on session init:', fetchErr);
          }
        }

        if (savedKeyJwk) {
          try {
            const importedPrivKey = await window.crypto.subtle.importKey(
              'jwk',
              JSON.parse(savedKeyJwk),
              { name: 'RSA-OAEP', hash: 'SHA-256' },
              false,
              ['decrypt']
            );
            setUserPrivateKey(importedPrivKey);
          } catch (err) {
            console.error('Failed to import private key:', err);
          }
        }
      }
      setLoading(false);
    };

    initializeSession();

    // Dynamic logout handler for token expiration (401 response in apiClient)
    const handleAuthChange = () => {
      const activeToken = localStorage.getItem('smo_token');
      if (!activeToken) {
        setUser(null);
        setToken(null);
        setUserPrivateKey(null);
      }
    };

    window.addEventListener('auth_change', handleAuthChange);
    return () => window.removeEventListener('auth_change', handleAuthChange);
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const data: LoginResponse = await authService.login(email, pass);
      const userSession: UserSession = {
        id: data.user_id,
        nombre: data.nombre,
        email: email,
        rol: data.rol,
        must_change_password: data.must_change_password,
        has_inventory_access: data.has_inventory_access
      };
      
      localStorage.setItem('smo_token', data.access_token);
      localStorage.setItem('smo_user', JSON.stringify(userSession));
      
      // Fetch E2EE keys from backend (decrypted automatically by the server!)
      let privateKey: CryptoKey | null = null;
      try {
        const keys = await apiClient.get<any>(`/usuarios/${data.user_id}/keys`, {
          headers: { Authorization: `Bearer ${data.access_token}` }
        });
        
        if (keys && keys.private_key) {
          privateKey = await window.crypto.subtle.importKey(
            'jwk',
            keys.private_key,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['decrypt']
          );
          
          // Store private key JWK string in sessionStorage
          sessionStorage.setItem(`smo_priv_key_${data.user_id}`, JSON.stringify(keys.private_key));
        }
      } catch (err) {
        console.error("Failed to load/import E2EE keys on login:", err);
      }

      setToken(data.access_token);
      setUser(userSession);
      setUserPrivateKey(privateKey);
    } catch (error) {
      localStorage.removeItem('smo_token');
      localStorage.removeItem('smo_user');
      setToken(null);
      setUser(null);
      setUserPrivateKey(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (user) {
      sessionStorage.removeItem(`smo_priv_key_${user.id}`);
    }
    localStorage.removeItem('smo_token');
    localStorage.removeItem('smo_user');
    setToken(null);
    setUser(null);
    setUserPrivateKey(null);
  };

  const updateMustChangePassword = (val: boolean) => {
    if (user) {
      const updated = { ...user, must_change_password: val };
      setUser(updated);
      localStorage.setItem('smo_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateMustChangePassword, userPrivateKey }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
