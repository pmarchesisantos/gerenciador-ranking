
import React, { useState } from 'react';
import { useRanking } from '../context/RankingContext';
import { Plus, Trash2, Save, Clock, Trophy, Check, Star } from 'lucide-react';
import { BlindLevel, BlindStructure } from '../types';

const PokerClockSettings: React.FC = () => {
  const { pokerClockConfig, updatePokerClockConfig } = useRanking();
  const [tempConfig, setTempConfig] = useState(pokerClockConfig);
  const [selectedStructureId, setSelectedStructureId] = useState(pokerClockConfig.activeStructureId);

  const activeStructure = tempConfig.structures.find(s => s.id === selectedStructureId) || tempConfig.structures[0];

  const handleAddStructure = () => {
    const newStructure: BlindStructure = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Nova Estrutura ${tempConfig.structures.length + 1}`,
      levels: [...tempConfig.structures[0].levels] // Copy from first as template
    };
    setTempConfig({
      ...tempConfig,
      structures: [...tempConfig.structures, newStructure]
    });
    setSelectedStructureId(newStructure.id);
  };

  const handleRemoveStructure = (id: string) => {
    if (tempConfig.structures.length <= 1) return;
    const newStructures = tempConfig.structures.filter(s => s.id !== id);
    setTempConfig({
      ...tempConfig,
      structures: newStructures,
      activeStructureId: tempConfig.activeStructureId === id ? newStructures[0].id : tempConfig.activeStructureId
    });
    if (selectedStructureId === id) setSelectedStructureId(newStructures[0].id);
  };

  const handleUpdateStructureName = (id: string, name: string) => {
    setTempConfig({
      ...tempConfig,
      structures: tempConfig.structures.map(s => s.id === id ? { ...s, name } : s)
    });
  };

  const handleAddLevel = () => {
    const levels = activeStructure.levels;
    const lastLevel = levels[levels.length - 1];
    const newLevel: BlindLevel = {
      id: Math.random().toString(36).substr(2, 9),
      smallBlind: lastLevel ? lastLevel.smallBlind * 2 : 100,
      bigBlind: lastLevel ? lastLevel.bigBlind * 2 : 200,
      ante: lastLevel ? lastLevel.ante : 0,
      durationMinutes: lastLevel ? lastLevel.durationMinutes : 15,
    };
    
    setTempConfig({
      ...tempConfig,
      structures: tempConfig.structures.map(s => 
        s.id === selectedStructureId ? { ...s, levels: [...s.levels, newLevel] } : s
      )
    });
  };

  const handleRemoveLevel = (levelId: string) => {
    setTempConfig({
      ...tempConfig,
      structures: tempConfig.structures.map(s => 
        s.id === selectedStructureId ? { ...s, levels: s.levels.filter(l => l.id !== levelId) } : s
      )
    });
  };

  const handleUpdateLevel = (levelId: string, updates: Partial<BlindLevel>) => {
    setTempConfig({
      ...tempConfig,
      structures: tempConfig.structures.map(s => 
        s.id === selectedStructureId ? { 
          ...s, 
          levels: s.levels.map(l => l.id === levelId ? { ...l, ...updates } : l) 
        } : s
      )
    });
  };

  const handleSave = async () => {
    await updatePokerClockConfig(tempConfig);
    alert('Configurações salvas com sucesso!');
  };

  const handleSetActive = (id: string) => {
    setTempConfig({ ...tempConfig, activeStructureId: id });
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">Configurações do Clock</h2>
          <p className="text-gray-500 text-sm">Gerencie múltiplas estruturas de blinds e defina a principal.</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
        >
          <Save size={18} /> Salvar Tudo
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Structures List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Estruturas</label>
            <button 
              onClick={handleAddStructure}
              className="p-1.5 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div className="space-y-2">
            {tempConfig.structures.map(s => (
              <div 
                key={s.id}
                onClick={() => setSelectedStructureId(s.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all relative group ${
                  selectedStructureId === s.id 
                  ? 'bg-emerald-600/10 border-emerald-500/50' 
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <input 
                    className="bg-transparent border-none text-white font-bold text-sm outline-none w-full"
                    value={s.name}
                    onChange={(e) => handleUpdateStructureName(s.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {s.levels.length} Níveis
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSetActive(s.id); }}
                        className={`p-1.5 rounded-lg transition-all ${tempConfig.activeStructureId === s.id ? 'bg-amber-500 text-black' : 'text-gray-600 hover:text-amber-500'}`}
                        title="Definir como Principal"
                      >
                        <Star size={12} fill={tempConfig.activeStructureId === s.id ? "currentColor" : "none"} />
                      </button>
                      {tempConfig.structures.length > 1 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleRemoveStructure(s.id); }}
                          className="p-1.5 text-gray-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {tempConfig.activeStructureId === s.id && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    Principal
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content: Selected Structure Levels */}
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
              <Trophy className="text-emerald-500" size={20} />
              <h3 className="text-white font-black text-sm uppercase tracking-widest">Configuração do Torneio</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome do Torneio</label>
                <input 
                  className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-emerald-500 transition-all"
                  value={tempConfig.tournamentName}
                  onChange={(e) => setTempConfig({ ...tempConfig, tournamentName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Jogadores Restantes</label>
                <input 
                  type="number"
                  className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-emerald-500 transition-all"
                  value={tempConfig.playersRemaining || 0}
                  onChange={(e) => setTempConfig({ ...tempConfig, playersRemaining: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Total de Entradas</label>
                <input 
                  type="number"
                  className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-emerald-500 transition-all"
                  value={tempConfig.totalPlayers || 0}
                  onChange={(e) => setTempConfig({ ...tempConfig, totalPlayers: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Premiação Total (R$)</label>
                <input 
                  type="number"
                  className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-emerald-500 transition-all"
                  value={tempConfig.totalPrize || 0}
                  onChange={(e) => setTempConfig({ ...tempConfig, totalPrize: Number(e.target.value) })}
                />
              </div>
            </div>
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <Clock className="text-emerald-500" size={20} />
                <h3 className="text-white font-black text-sm uppercase tracking-widest">
                  Estrutura: <span className="text-emerald-400">{activeStructure.name}</span>
                </h3>
              </div>
              <button 
                onClick={handleAddLevel}
                className="p-2 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4"
              >
                <Plus size={16} /> Adicionar Nível
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {activeStructure.levels.map((level, index) => (
                <div key={level.id} className={`flex flex-wrap items-center gap-4 p-4 rounded-2xl border transition-all ${level.isBreak ? 'bg-amber-500/5 border-amber-500/20' : 'bg-black/20 border-gray-800 hover:border-gray-700'}`}>
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-[10px] font-black text-gray-500 shrink-0">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-[300px] grid grid-cols-2 md:grid-cols-4 gap-4">
                    {!level.isBreak ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Small Blind</label>
                          <input 
                            type="number"
                            className="w-full bg-transparent border-b border-gray-800 focus:border-emerald-500 text-xs font-bold text-white outline-none py-1"
                            value={level.smallBlind}
                            onChange={(e) => handleUpdateLevel(level.id, { smallBlind: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Big Blind</label>
                          <input 
                            type="number"
                            className="w-full bg-transparent border-b border-gray-800 focus:border-emerald-500 text-xs font-bold text-white outline-none py-1"
                            value={level.bigBlind}
                            onChange={(e) => handleUpdateLevel(level.id, { bigBlind: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Ante</label>
                          <input 
                            type="number"
                            className="w-full bg-transparent border-b border-gray-800 focus:border-emerald-500 text-xs font-bold text-white outline-none py-1"
                            value={level.ante}
                            onChange={(e) => handleUpdateLevel(level.id, { ante: Number(e.target.value) })}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-3 flex items-center text-amber-500 font-black text-[10px] uppercase tracking-widest">
                        Intervalo / Break
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Duração (min)</label>
                      <input 
                        type="number"
                        className="w-full bg-transparent border-b border-gray-800 focus:border-emerald-500 text-xs font-bold text-white outline-none py-1"
                        value={level.durationMinutes}
                        onChange={(e) => handleUpdateLevel(level.id, { durationMinutes: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleUpdateLevel(level.id, { isBreak: !level.isBreak })}
                      className={`p-2 rounded-lg transition-all ${level.isBreak ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-500 hover:text-amber-500'}`}
                      title="Alternar Intervalo"
                    >
                      <Clock size={14} />
                    </button>
                    <button 
                      onClick={() => handleRemoveLevel(level.id)}
                      className="p-2 bg-gray-800 text-gray-500 hover:text-red-500 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PokerClockSettings;
