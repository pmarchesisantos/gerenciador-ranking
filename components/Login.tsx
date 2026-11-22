
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Simbolo } from './Marca';
import { Trophy, Lock, Mail, ArrowRight, ArrowLeft } from 'lucide-react';

const Login: React.FC<{ onBack: () => void; onCadastro?: () => void }> = ({ onBack, onCadastro }) => {
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
        setError('E-mail ou senha incorretos.');
      } else {
        setError('Erro ao tentar entrar. Tente novamente mais tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-10 shadow-2xl relative overflow-hidden">
        
        <div className="flex flex-col items-center mb-10">
          <Simbolo tamanho={64} className="mb-5" />
          <h2 className="text-2xl font-semibold text-white tracking-tight">Entrar no Stack Club</h2>
          <p className="text-gray-400 text-sm mt-1 text-center">
            Acesse o painel do seu clube
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 ml-1">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input 
                type="email"
                required
                className="w-full bg-black/40 border border-gray-800 rounded-xl pl-12 pr-4 py-4 text-white font-bold focus:border-emerald-500 outline-none transition-all placeholder:text-gray-700"
                placeholder="voce@seuclube.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 ml-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
              <input 
                type="password"
                required
                className="w-full bg-black/40 border border-gray-800 rounded-xl pl-12 pr-4 py-4 text-white font-bold focus:border-emerald-500 outline-none transition-all placeholder:text-gray-700"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-xs font-bold bg-red-400/10 border border-red-400/20 p-4 rounded-xl text-center">
              {error}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-50 text-emerald-200 font-semibold py-5 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95  text-xs ring-1 ring-inset ring-emerald-500/30"
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

            <button 
              type="button"
              onClick={onBack}
              className="w-full bg-transparent border border-gray-800 text-gray-500 hover:text-white hover:border-gray-600 font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all text-xs"
            >
              <ArrowLeft size={16} />
              Voltar para os Rankings
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600 text-xs font-bold leading-relaxed">
            Seu clube ainda não tem acesso?
          </p>
          {onCadastro && (
            <button type="button" onClick={onCadastro} className="mt-2 text-emerald-400 hover:text-emerald-300 text-xs font-semibold">
              Criar meu clube
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
