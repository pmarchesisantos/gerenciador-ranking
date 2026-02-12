
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Lock, Mail, ArrowRight, X } from 'lucide-react';

const Login: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos. Verifique se seu acesso foi liberado pelo administrador master.');
      } else {
        setError('Erro ao tentar entrar. Tente novamente mais tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      <button 
        onClick={onBack}
        className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors p-2"
      >
        <X size={32} />
      </button>
      
      <div className="w-full max-w-md bg-gray-900 border border-emerald-900/30 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-600 to-amber-500"></div>
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mb-5 shadow-2xl shadow-emerald-900/40 transform rotate-3">
            <Trophy className="text-white w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Acesso Administrativo</h2>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 text-center">
            Apenas clubes autorizados podem gerenciar rankings
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input 
                type="email"
                required
                className="w-full bg-black/40 border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-white font-bold focus:border-emerald-500 outline-none transition-all placeholder:text-gray-700"
                placeholder="Ex: clube@pokerrank.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input 
                type="password"
                required
                className="w-full bg-black/40 border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-white font-bold focus:border-emerald-500 outline-none transition-all placeholder:text-gray-700"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-xs font-bold bg-red-400/10 border border-red-400/20 p-4 rounded-2xl text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-900/30 uppercase text-xs tracking-[0.2em]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Entrar no Painel
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest leading-relaxed">
            Seu clube ainda não tem acesso? <br/>
            Entre em contato com o suporte Master.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
