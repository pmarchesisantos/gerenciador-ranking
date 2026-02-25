
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  updatePassword,
  User 
} from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
}

// DEFINIÇÃO DO SEU E-MAIL DE ADMINISTRADOR MESTRE
const SUPER_ADMIN_EMAIL = 'admin@gmail.com';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), pass);
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.clear();
  };

  const updateUserPassword = async (newPassword: string) => {
    if (user) {
      await updatePassword(user, newPassword);
    } else {
      throw new Error("Usuário não está logado.");
    }
  };

  // VERIFICAÇÃO DE PODERES
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isAdmin = !!user; // Qualquer um logado é considerado um admin de clube (ou super admin)

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isSuperAdmin, login, logout, updateUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
