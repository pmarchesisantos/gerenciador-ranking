import React, { useState } from 'react';
import { RankingProvider, useRanking } from './context/RankingContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import History from './components/History';
import ProfileSettings from './components/ProfileSettings';
import PublicView from './components/PublicView';
import Login from './components/Login';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { LogOut, User, Menu, Shield, RefreshCw, ArrowLeft } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const { currentView, loadingData, house, setViewingHouseId } = useRanking();
  const { logout, user, isSuperAdmin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // PRIORIDADE: Se for Super Admin (admin@pokerrank.com) e não estiver visualizando uma casa específica, 
  // mostra o Dashboard Global de Gerenciamento.
  if (isSuperAdmin && !house.id) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <header className="h-20 border-b border-gray-800 px-8 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
             <div className="bg-amber-500 p-2 rounded-lg shadow-lg shadow-amber-900/20">
               <Shield className="text-black" size={20} />
             </div>
             <span className="font-black text-white uppercase tracking-widest text-xs">Painel Administrativo Master</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Master Admin</span>
               <span className="text-xs text-gray-400 font-bold">{user?.email}</span>
            </div>
            <button onClick={logout} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-lg">
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <SuperAdminDashboard />
      </div>
    );
  }

  // Visualização de um Clube (Operacional)
  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'settings': return <Settings />;
      case 'history': return <History />;
      case 'profile': return <ProfileSettings />;
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
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] hidden sm:inline">
                Painel Operacional {house.name ? `- ${house.name}` : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <button 
                onClick={() => setViewingHouseId(null)}
                className="flex items-center gap-2 text-amber-500 hover:text-amber-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20 transition-all shadow-lg shadow-amber-900/10"
              >
                <ArrowLeft size={14} /> Voltar ao Master
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <User size={14} className="text-emerald-500" />
              <span className="text-xs text-gray-300 font-bold truncate max-w-[120px] sm:max-w-none">{user?.email}</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-gray-500 hover:text-red-500 transition-colors"
              title="Sair do Sistema"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <main className="flex-1">
          {loadingData ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-emerald-900/20"></div>
              <p className="text-emerald-500/60 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Sincronizando Ranking...</p>
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
        <div className="w-14 h-14 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-emerald-500 font-black animate-pulse text-[10px] uppercase tracking-[0.4em]">INICIALIZANDO...</p>
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