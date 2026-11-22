
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
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
  /** Cria a conta de um dono de clube novo (cadastro com assinatura). */
  cadastrar: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
}

// E-mails de administrador mestre. Com o cadastro aberto ao público, qualquer
// um pode criar conta com um e-mail ainda não usado: por isso a lista só tem
// contas que já existem e são suas. A segurança de verdade está nas regras do
// Firestore (isSuperAdmin), que só reconhecem pmarchesi.santos@gmail.com.
const SUPER_ADMIN_EMAILS = ['pedro.marchesi2000@gmail.com', 'pmarchesi.santos@gmail.com'];

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

  const cadastrar = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email.toLowerCase().trim(), pass);
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
  const userEmail = user?.email?.toLowerCase() || '';
  const isSuperAdmin = SUPER_ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);
  const isAdmin = !!user; // Qualquer um logado é considerado um admin de clube (ou super admin)

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isSuperAdmin, login, cadastrar, logout, updateUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
