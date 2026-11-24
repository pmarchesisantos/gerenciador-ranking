
import React, { useState } from 'react';
import { useRanking } from '../context/RankingContext';
import { LayoutDashboard, Settings, History, Trophy, Edit2, Trash2, Plus, Check, X, ChevronLeft, UserCircle, Users, Timer, Clock, Settings2, ChevronDown, ChevronUp, Eye, EyeOff, Beer, Receipt, Package, BarChart3, Lock, CreditCard } from 'lucide-react';
import { Recurso, temRecurso } from '../services/planos';
import ConfirmationModal from './ConfirmationModal';
import Marca from './Marca';

interface SidebarProps {
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { 
    house, 
    activeRanking, 
    setActiveRankingId, 
    currentView, 
    setCurrentView,
    updateHouseName,
    addRanking,
    deleteRanking,
    updateRankingName,
    updateRankingActive
  } = useRanking();

  const [isEditingHouse, setIsEditingHouse] = useState(false);
  const [tempHouseName, setTempHouseName] = useState(house.name);
  
  const [editingRankingId, setEditingRankingId] = useState<string | null>(null);
  const [tempRankingName, setTempRankingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newRankName, setNewRankName] = useState('');
  const [isClockMenuOpen, setIsClockMenuOpen] = useState(currentView.startsWith('poker-clock'));
  const [isBarMenuOpen, setIsBarMenuOpen] = useState(currentView.startsWith('bar-'));
  const [rankingToDelete, setRankingToDelete] = useState<{ id: string, name: string } | null>(null);

  // Itens fora do plano continuam no menu, com cadeado: a tela mostra a oferta de upgrade.
  const bloqueado = (r: Recurso) => !temRecurso(house, r);
  const Cadeado = () => <Lock size={12} className="text-gray-600 ml-auto shrink-0" aria-label="Fora do seu plano" />;

  const menuItems: { id: string; label: string; icon: typeof LayoutDashboard; recurso?: Recurso }[] = [
    { id: 'dashboard', label: 'Dashboard (Ranking)', icon: LayoutDashboard },
    { id: 'player-data', label: 'Dados Jogadores', icon: Users },
    { id: 'history', label: 'Histórico Semanal', icon: History },
    { id: 'financeiro', label: 'Financeiro', icon: BarChart3, recurso: 'financeiro' },
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'profile', label: 'Dados do Perfil', icon: UserCircle },
    { id: 'assinatura', label: 'Minha Assinatura', icon: CreditCard },
  ];

  const handleHouseSave = () => {
    if (tempHouseName.trim() !== house.name) {
      updateHouseName(tempHouseName.trim());
    }
    setIsEditingHouse(false);
  };

  const handleCreateRanking = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRankName.trim()) {
      addRanking(newRankName.trim());
      setNewRankName('');
      setIsCreating(false);
    }
  };

  const handleStartEditRanking = (e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    setEditingRankingId(id);
    setTempRankingName(currentName);
  };

  const handleSaveRankingName = (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    if (tempRankingName.trim() && tempRankingName.trim() !== house.rankings.find(r => r.id === id)?.name) {
      updateRankingName(id, tempRankingName.trim());
    }
    setEditingRankingId(null);
  };

  const handleDeleteRanking = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setRankingToDelete({ id, name });
  };

  const handleToggleRankingActive = (e: React.MouseEvent, id: string, isActive: boolean) => {
    e.stopPropagation();
    updateRankingActive(id, !isActive);
  };

  return (
    <div className="w-72 bg-gray-900 h-screen border-r border-gray-800 flex flex-col z-50 shrink-0 shadow-2xl relative">
      <div className="p-6 border-b border-gray-800 bg-black/20 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <Marca tamanho="sm" />
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-gray-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-semibold text-emerald-500/60 ml-1">Sua Casa de Poker</label>
          {isEditingHouse ? (
            <input 
              autoFocus
              className="w-full px-3 py-2 bg-black/40 rounded-xl border border-emerald-500 text-sm font-bold text-white outline-none"
              value={tempHouseName}
              onChange={(e) => setTempHouseName(e.target.value)}
              onBlur={handleHouseSave}
              onKeyDown={(e) => e.key === 'Enter' && handleHouseSave()}
            />
          ) : (
            <div 
              onClick={() => setIsEditingHouse(true)}
              className="px-4 py-3 bg-gray-800/40 rounded-xl border border-gray-800 text-sm font-semibold text-white cursor-pointer hover:border-emerald-500 transition-all flex justify-between items-center group"
            >
              <span className="truncate">{house.name || 'Definir Nome'}</span>
              <Edit2 size={12} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
        <section>
          <div className="flex justify-between items-center mb-3 px-2">
            <label className="text-xs font-semibold text-gray-500 block">Rankings</label>
            <button 
              onClick={() => setIsCreating(true)}
              className="p-1.5 bg-emerald-600/10 hover:bg-emerald-500/25 text-emerald-500 hover:text-emerald-100 rounded-lg transition-all"
            >
              <Plus size={14} />
            </button>
          </div>
          
          {isCreating && (
            <form onSubmit={handleCreateRanking} className="mb-3">
              <div className="flex items-center gap-1 p-1 bg-emerald-600/10 rounded-xl border border-emerald-500/50">
                <input 
                  autoFocus
                  className="flex-1 bg-transparent border-none text-white text-xs font-bold outline-none px-2 py-2"
                  value={newRankName}
                  onChange={(e) => setNewRankName(e.target.value)}
                />
                <button type="submit" className="p-1.5 text-emerald-500"><Check size={14} /></button>
                <button type="button" onClick={() => setIsCreating(false)} className="p-1.5 text-red-500"><X size={14} /></button>
              </div>
            </form>
          )}

          <div className="space-y-1">
            {house.rankings.map(r => (
              <div key={r.id} className="relative group">
                {editingRankingId === r.id ? (
                  <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-xl border border-emerald-500/50">
                    <input autoFocus className="flex-1 bg-transparent text-white text-xs font-bold outline-none px-2 py-1" value={tempRankingName} onChange={(e) => setTempRankingName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveRankingName(e, r.id)} />
                    <button onClick={(e) => handleSaveRankingName(e, r.id)} className="p-1.5 text-emerald-500"><Check size={14} /></button>
                  </div>
                ) : (() => {
                  const isHidden = r.active === false;
                  return (
                  <div className="relative group">
                    <button
                      onClick={() => setActiveRankingId(r.id)}
                      className={`w-full text-left pl-3 pr-20 py-2.5 rounded-lg text-sm font-medium transition-all relative overflow-hidden truncate ${
                        activeRanking?.id === r.id
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : isHidden
                          ? 'text-gray-700 hover:bg-gray-800'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className={isHidden ? 'line-through decoration-gray-700' : ''}>{r.name}</span>
                      {isHidden && (
                        <span className="block text-xs font-semibold text-amber-600/70 mt-1 no-underline">
                          Oculto no público
                        </span>
                      )}
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5">
                      <button
                        onClick={(e) => handleToggleRankingActive(e, r.id, !isHidden)}
                        title={isHidden ? 'Exibir este ranking na página pública' : 'Ocultar este ranking da página pública'}
                        className={`p-1.5 transition-all ${
                          isHidden
                          ? 'text-amber-500 hover:text-amber-400'
                          : 'text-white/40 hover:text-white opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button onClick={(e) => handleStartEditRanking(e, r.id, r.name)} className="p-1.5 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-all"><Edit2 size={12} /></button>
                      <button onClick={(e) => handleDeleteRanking(e, r.id, r.name)} className="p-1.5 text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </section>

        <section>
          <label className="text-xs font-semibold text-gray-500 mb-3 block ml-2">Menu</label>
          <div className="space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as any)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-all ${
                  currentView === item.id 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={18} className={currentView === item.id ? 'text-emerald-400' : 'text-gray-500'} />
                {item.label}
                {item.recurso && bloqueado(item.recurso) && <Cadeado />}
              </button>
            ))}

            <div className="pt-2">
              <button 
                onClick={() => setIsClockMenuOpen(!isClockMenuOpen)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between transition-all ${
                  currentView.startsWith('poker-clock') 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Timer size={18} className={currentView.startsWith('poker-clock') ? 'text-emerald-400' : 'text-gray-500'} />
                  Poker Clock
                  {bloqueado('pokerClock') && <Lock size={12} className="text-gray-600" aria-label="Fora do seu plano" />}
                </div>
                {isClockMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              
              {isClockMenuOpen && (
                <div className="mt-1 ml-4 space-y-1 border-l border-gray-800 pl-4 animate-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => { setCurrentView('poker-clock'); if (onClose) onClose(); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-all ${
                      currentView === 'poker-clock' ? 'text-emerald-400 bg-emerald-400/5' : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    <Clock size={14} />
                    Poker Clock
                  </button>
                  <button
                    onClick={() => { setCurrentView('poker-clock-settings'); if (onClose) onClose(); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-all ${
                      currentView === 'poker-clock-settings' ? 'text-emerald-400 bg-emerald-400/5' : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    <Settings2 size={14} />
                    Configurações Clock
                  </button>
                </div>
              )}
            </div>

            <div className="pt-1">
              <button
                onClick={() => setIsBarMenuOpen(!isBarMenuOpen)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between transition-all ${
                  currentView.startsWith('bar-')
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Beer size={18} className={currentView.startsWith('bar-') ? 'text-emerald-400' : 'text-gray-500'} />
                  Bar
                  {bloqueado('bar') && <Lock size={12} className="text-gray-600" aria-label="Fora do seu plano" />}
                </div>
                {isBarMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {isBarMenuOpen && (
                <div className="mt-1 ml-4 space-y-1 border-l border-gray-800 pl-4 animate-in slide-in-from-top-2 duration-200">
                  <button
                    onClick={() => { setCurrentView('bar-caixa'); if (onClose) onClose(); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-all ${
                      currentView === 'bar-caixa' ? 'text-emerald-400 bg-emerald-400/5' : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    <Receipt size={14} />
                    Caixa / PDV
                  </button>
                  <button
                    onClick={() => { setCurrentView('bar-produtos'); if (onClose) onClose(); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-all ${
                      currentView === 'bar-produtos' ? 'text-emerald-400 bg-emerald-400/5' : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    <Package size={14} />
                    Produtos
                  </button>
                  <button
                    onClick={() => { setCurrentView('bar-vendas'); if (onClose) onClose(); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-all ${
                      currentView === 'bar-vendas' ? 'text-emerald-400 bg-emerald-400/5' : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    <BarChart3 size={14} />
                    Vendas e repasses
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="p-6 border-t border-gray-800 bg-black/10 shrink-0">
        <p className="text-xs font-semibold text-gray-700 text-center">Stack Club · {new Date().getFullYear()}</p>
      </div>

      <ConfirmationModal 
        isOpen={!!rankingToDelete}
        onClose={() => setRankingToDelete(null)}
        onConfirm={() => rankingToDelete && deleteRanking(rankingToDelete.id)}
        title="Excluir Ranking"
        message={`ATENÇÃO: Deseja realmente excluir o ranking "${rankingToDelete?.name}"? Esta ação removerá permanentemente todos os jogadores, pontuações e histórico deste ranking.`}
      />
    </div>
  );
};

export default Sidebar;
