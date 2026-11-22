
import React, { useState, useEffect } from 'react';
import { RankingProvider, useRanking } from './context/RankingContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import History from './components/History';
import ProfileSettings from './components/ProfileSettings';
import PublicView from './components/PublicView';
import Login from './components/Login';
import PlayerData from './components/PlayerData';
import PokerClock from './components/PokerClock';
import PokerClockSettings from './components/PokerClockSettings';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import BarProdutos from './components/BarProdutos';
import BarCaixa from './components/BarCaixa';
import BarPDV from './components/BarPDV';
import Financeiro from './components/Financeiro';
import { BarProvider } from './context/BarContext';
import { LogOut, User, Menu, Shield, ArrowLeft, X } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const { currentView, loadingData, house, setViewingHouseId } = useRanking();
  const { logout, user, isSuperAdmin } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

  useEffect(() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }, [currentView]);

  if (isSuperAdmin && !house.id) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <header className="h-20 border-b border-gray-800 px-8 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
             <div className="bg-amber-500 p-2 rounded-lg shadow-lg shadow-amber-900/20"><Shield className="text-black" size={20} /></div>
             <span className="font-black text-white uppercase tracking-widest text-xs">Master Admin</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
               <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Super User</span>
               <span className="text-xs text-gray-400 font-bold">{user?.email}</span>
            </div>
            <button onClick={logout} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-lg"><LogOut size={18} /></button>
          </div>
        </header>
        <SuperAdminDashboard />
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'player-data': return <PlayerData />;
      case 'settings': return <Settings />;
      case 'history': return <History />;
      case 'profile': return <ProfileSettings />;
      case 'poker-clock': return <PokerClock />;
      case 'poker-clock-settings': return <PokerClockSettings />;
      case 'bar-produtos': return <BarProdutos />;
      case 'bar-caixa': return <BarCaixa />;
      case 'financeiro': return <Financeiro />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
      {/* No celular o menu desliza por cima do conteúdo; no desktop ele ocupa
          espaço na linha e some de vez quando fechado. Antes, o lg:translate-x-0
          forçava o menu visível no desktop e o botão de fechar não fazia nada. */}
      <div className={`fixed inset-y-0 left-0 z-[70] transition-transform duration-300 transform lg:sticky lg:top-0 lg:h-screen lg:transform-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'}`}><Sidebar onClose={() => setIsSidebarOpen(false)} /></div>

      <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
        <header className="h-16 border-b border-emerald-900/20 px-8 flex items-center justify-between bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors">{isSidebarOpen ? <X size={22} /> : <Menu size={22} />}</button>
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">{house.name || 'Painel Operacional'}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <button 
                onClick={() => setViewingHouseId(null)} 
                className="flex items-center gap-2 text-amber-500 hover:text-amber-400 font-black text-[10px] uppercase tracking-widest px-4 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20 transition-all shadow-lg active:scale-95"
              >
                <ArrowLeft size={14} /> <span>Voltar Master</span>
              </button>
            )}
            <div className="hidden xs:flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <User size={12} className="text-emerald-500" />
              <span className="text-[10px] text-gray-300 font-bold truncate max-w-[150px]">{user?.email}</span>
            </div>
            <button onClick={logout} className="p-2 text-gray-500 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
          </div>
        </header>
        <main className="flex-1 w-full overflow-x-hidden">
          {loadingData ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 p-8">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-emerald-500/60 font-black text-[9px] uppercase tracking-[0.3em] text-center">Sincronizando Dados...</p>
            </div>
          ) : renderView()}
        </main>
      </div>
    </div>
  );
};

/**
 * Janela externa pedida pela URL (?view=...). Lida uma vez, no carregamento:
 * o contexto reescreve o endereço para /c/{slug} logo depois, e a decisão de
 * qual tela mostrar não pode depender de quando o React voltar a renderizar.
 */
const VIEW_EXTERNA = new URLSearchParams(window.location.search).get('view');

const RootContent: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const isExternalClock = VIEW_EXTERNA === 'poker-clock-external';

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] space-y-4 p-6">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-emerald-500 font-black animate-pulse text-[10px] uppercase tracking-[0.4em] text-center">INICIALIZANDO SISTEMA...</p>
    </div>
  );

  if (isExternalClock) {
    return (
      <div className="h-screen bg-black">
        <PokerClock />
      </div>
    );
  }

  // PDV do bar em janela própria. Exige login: os dados do bar são privados.
  if (VIEW_EXTERNA === 'bar-pdv') {
    if (!isAdmin) return <Login onBack={() => { window.location.href = '/'; }} />;
    return <BarProvider><BarPDV /></BarProvider>;
  }

  // O bar só existe para o dono logado: as coleções dele são privadas.
  if (isAdmin) return <BarProvider><AdminLayout /></BarProvider>;
  return (
    <>
      <PublicView onLoginClick={() => setShowLogin(true)} />
      {showLogin && <Login onBack={() => setShowLogin(false)} />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RankingProvider>
          <RootContent />
        </RankingProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
