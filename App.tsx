
import React, { useState } from 'react';
import { RankingProvider, useRanking } from './context/RankingContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import History from './components/History';
import PublicView from './components/PublicView';
import Login from './components/Login';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { LogOut, User, Menu, Shield, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const { currentView, unauthorized, loadingData, house, setViewingHouseId } = useRanking();
  const { logout, user, isSuperAdmin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Se o Master está apenas no Dashboard Global (sem visualizar uma casa específica)
  if (isSuperAdmin && !house.id) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <header className="h-20 border-b border-gray-800 px-8 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
             <div className="bg-amber-500 p-2 rounded-lg">
               <Shield className="text-black" size={20} />
             </div>
             <span className="font-black text-white uppercase tracking-widest text-sm">Painel Master</span>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-gray-500 hover:text-white font-bold transition-all">
            <span className="text-xs">{user?.email}</span>
            <LogOut size={18} />
          </button>
        </header>
        <SuperAdminDashboard />
      </div>
    );
  }

  // Se o usuário logou mas o Master não autorizou o e-mail dele
  if (unauthorized && !loadingData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center justify-center text-red-500">
          <AlertTriangle size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Clube Não Autorizado</h2>
          <p className="text-gray-500 max-w-md">O e-mail <strong>{user?.email}</strong> está registrado no sistema, mas não possui autorização ativa para gerenciar um clube.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={logout}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} /> Tentar Outra Conta
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-2xl font-bold transition-all"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'settings': return <Settings />;
      case 'history': return <History />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      {isSidebarOpen && <Sidebar onClose={() => setIsSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
        <header className="h-16 border-b border-emerald-900/20 px-4 md:px-8 flex items-center justify-between bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
              >
                <Menu size={24} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest hidden sm:inline">Painel Administrativo</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <button 
                onClick={() => setViewingHouseId(null)}
                className="flex items-center gap-2 text-amber-500 hover:text-amber-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20 transition-all"
              >
                <ArrowLeft size={14} /> Voltar Master
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700">
              <User size={14} className="text-emerald-500" />
              <span className="text-xs text-gray-300 font-medium truncate max-w-[120px] sm:max-w-none">{user?.email}</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-gray-500 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <main className="flex-1">
          {loadingData ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Sincronizando dados...</p>
            </div>
          ) : renderView()}
        </main>
      </div>
    </div>
  );
};

const RootContent: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-emerald-500 font-bold animate-pulse text-xs uppercase tracking-widest">CARREGANDO...</p>
      </div>
    );
  }

  if (isAdmin) {
    return <AdminLayout />;
  }

  return (
    <>
      <PublicView onLoginClick={() => setShowLogin(true)} />
      {showLogin && <Login onBack={() => setShowLogin(false)} />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <RankingProvider>
        <RootContent />
      </RankingProvider>
    </AuthProvider>
  );
};

export default App;
