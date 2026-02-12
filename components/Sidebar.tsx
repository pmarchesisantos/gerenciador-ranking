
import React, { useState } from 'react';
import { useRanking } from '../context/RankingContext';
import { LayoutDashboard, Settings, History, Trophy, Edit2, Trash2, Plus, Check, X, ChevronLeft, MoreVertical } from 'lucide-react';

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
    updateRankingName
  } = useRanking();

  const [isEditingHouse, setIsEditingHouse] = useState(false);
  const [tempHouseName, setTempHouseName] = useState(house.name);
  
  const [editingRankingId, setEditingRankingId] = useState<string | null>(null);
  const [tempRankingName, setTempRankingName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newRankName, setNewRankName] = useState('');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard (Ranking)', icon: LayoutDashboard },
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'history', label: 'Histórico Semanal', icon: History },
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
    if (window.confirm(`ATENÇÃO: Deseja realmente excluir o ranking "${name}"? Todos os jogadores e o histórico deste ranking específico serão apagados permanentemente.`)) {
      deleteRanking(id);
    }
  };

  return (
    <div className="w-72 bg-[#111827] h-screen border-r border-emerald-900/30 flex flex-col sticky top-0 z-50 shrink-0 shadow-2xl">
      <div className="p-6 border-b border-emerald-900/30 bg-black/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <Trophy className="text-white w-6 h-6" />
            </div>
            <h1 className="font-black text-xl text-emerald-50 tracking-tighter">PokerRank</h1>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>
        
        <div className="space-y-1">
          <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.2em] ml-1">Sua Casa de Poker</label>
          <div className="group relative">
            {isEditingHouse ? (
              <div className="flex items-center gap-2">
                <input 
                  autoFocus
                  className="w-full px-3 py-2 bg-black/40 rounded-xl border border-emerald-500 text-sm font-bold text-white outline-none"
                  value={tempHouseName}
                  onChange={(e) => setTempHouseName(e.target.value)}
                  onBlur={handleHouseSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleHouseSave()}
                />
              </div>
            ) : (
              <div 
                onClick={() => setIsEditingHouse(true)}
                className="px-4 py-3 bg-emerald-950/20 rounded-xl border border-emerald-900/30 text-sm font-black text-emerald-50 cursor-pointer hover:border-emerald-500 transition-all flex justify-between items-center group"
              >
                <span className="truncate">{house.name || 'Definir Nome'}</span>
                <Edit2 size={12} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
        <section>
          <div className="flex justify-between items-center mb-3 px-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Rankings Ativos</label>
            <button 
              onClick={() => setIsCreating(true)}
              className="p-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-lg transition-all"
              title="Novo Ranking"
            >
              <Plus size={14} />
            </button>
          </div>
          
          {isCreating && (
            <form onSubmit={handleCreateRanking} className="mb-3 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-1 p-1 bg-emerald-600/10 rounded-xl border border-emerald-500/50">
                <input 
                  autoFocus
                  placeholder="Nome do ranking..."
                  className="flex-1 bg-transparent border-none text-white text-xs font-bold outline-none px-2 py-2"
                  value={newRankName}
                  onChange={(e) => setNewRankName(e.target.value)}
                />
                <button type="submit" className="p-1.5 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg transition-all">
                  <Check size={14} />
                </button>
                <button type="button" onClick={() => setIsCreating(false)} className="p-1.5 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all">
                  <X size={14} />
                </button>
              </div>
            </form>
          )}

          <div className="space-y-1.5">
            {house.rankings.map(r => (
              <div key={r.id} className="group relative">
                {editingRankingId === r.id ? (
                  <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-xl border border-emerald-500/50">
                    <input 
                      autoFocus
                      className="flex-1 bg-transparent border-none text-white text-xs font-bold outline-none px-2 py-1"
                      value={tempRankingName}
                      onChange={(e) => setTempRankingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRankingName(e, r.id)}
                    />
                    <button onClick={(e) => handleSaveRankingName(e, r.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg">
                      <Check size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative group">
                    <button
                      onClick={() => setActiveRankingId(r.id)}
                      className={`w-full text-left pl-4 pr-12 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative overflow-hidden ${
                        activeRanking?.id === r.id 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                        : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                      }`}
                    >
                      <span className="truncate block pr-4">{r.name}</span>
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => handleStartEditRanking(e, r.id, r.name)}
                        className={`p-1.5 rounded-lg transition-colors ${activeRanking?.id === r.id ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-700 text-gray-500'}`}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteRanking(e, r.id, r.name)}
                        className={`p-1.5 rounded-lg transition-colors ${activeRanking?.id === r.id ? 'hover:bg-red-500 text-white' : 'hover:bg-red-500/10 text-red-500'}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {house.rankings.length === 0 && !isCreating && (
              <div className="text-center py-8 border border-dashed border-gray-800 rounded-2xl">
                <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Nenhum ranking</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block ml-2">Navegação</label>
          <div className="space-y-1.5">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as any)}
                className={`w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all ${
                  currentView === item.id 
                  ? 'bg-amber-600/10 text-amber-500 border border-amber-600/30' 
                  : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                }`}
              >
                <item.icon size={18} className={currentView === item.id ? 'text-amber-500' : 'text-gray-600'} />
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="p-6 border-t border-emerald-900/20 bg-black/10">
        <p className="text-[9px] font-black text-gray-600 text-center uppercase tracking-[0.2em]">
          PokerRank Master • v1.2
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
