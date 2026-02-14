
import React, { useState, useMemo, useEffect } from 'react';
import { useRanking } from '../context/RankingContext';
import { X, Search, ChevronRight, Wallet, Coins, Check, UserPlus, Trash2, Trophy, Loader2, Info } from 'lucide-react';
import { GameCategory, Player } from '../types';

interface AddResultModalProps {
  onClose: () => void;
}

interface PlayerEntry {
  playerId: string;
  name: string;
  position: number;
  rebuys: number;
  doubleRebuys: number;
  addons: number;
  paid: boolean;
}

const AddResultModal: React.FC<AddResultModalProps> = ({ onClose }) => {
  const { activeRanking, addWeeklyResult } = useRanking();
  const [searchTerm, setSearchTerm] = useState('');
  const [multiplier, setMultiplier] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerEntry[]>([]);

  useEffect(() => {
    // Bloqueia scroll externo
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!activeRanking) return null;

  const categories = activeRanking.gameCategories || [];
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return (activeRanking.players || []).filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedPlayers.some(sp => sp.playerId === p.id)
    ).slice(0, 5);
  }, [searchTerm, activeRanking.players, selectedPlayers]);

  const addPlayerToStage = (player: Player) => {
    const newEntry: PlayerEntry = {
      playerId: player.id,
      name: player.name,
      position: 0,
      rebuys: 0,
      doubleRebuys: 0,
      addons: 0,
      paid: false
    };
    setSelectedPlayers(prev => [newEntry, ...prev]);
    setSearchTerm('');
  };

  const removePlayerFromStage = (playerId: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.playerId !== playerId));
  };

  const handleEntryChange = (playerId: string, field: keyof PlayerEntry, value: any) => {
    setSelectedPlayers(prev => prev.map(p => 
      p.playerId === playerId ? { ...p, [field]: value } : p
    ));
  };

  const calculatePlayerGrossTotal = (entry: PlayerEntry, category: GameCategory | undefined) => {
    if (!category) return 0;
    return category.buyIn + 
           (entry.rebuys * category.reBuy) + 
           (entry.doubleRebuys * category.reBuyDuplo) + 
           (entry.addons * category.addOn);
  };

  const totalEventGrossValue = useMemo(() => {
    return selectedPlayers.reduce((acc, p) => acc + calculatePlayerGrossTotal(p, selectedCategory), 0);
  }, [selectedPlayers, selectedCategory]);

  const rakeAmountCollected = useMemo(() => {
    if (!selectedCategory) return 0;
    return totalEventGrossValue * ((selectedCategory.rake || 0) / 100);
  }, [totalEventGrossValue, selectedCategory]);

  const postRakeValue = useMemo(() => {
    return totalEventGrossValue - rakeAmountCollected;
  }, [totalEventGrossValue, rakeAmountCollected]);

  const rankingPrizeValue = useMemo(() => {
    if (!selectedCategory) return 0;
    const rawRankingValue = postRakeValue * ((selectedCategory.rankingPercent || 0) / 100);
    return Math.floor(rawRankingValue);
  }, [postRakeValue, selectedCategory]);

  const totalEventNetValue = useMemo(() => {
    const netHouseValue = postRakeValue - rankingPrizeValue;
    return Math.ceil(netHouseValue);
  }, [postRakeValue, rankingPrizeValue]);

  const handleSave = async () => {
    const validResults = selectedPlayers
      .filter(p => p.position > 0)
      .map(p => {
        const totalToAccumulate = p.position === 1 ? rankingPrizeValue : 0;
        return { 
          playerId: p.playerId, 
          position: p.position,
          rebuys: p.rebuys,
          doubleRebuys: p.doubleRebuys,
          addons: p.addons,
          paid: p.paid,
          totalValue: totalToAccumulate
        };
      });
    
    if (validResults.length === 0) {
      alert('Defina a posição de ao menos um jogador.');
      return;
    }

    setIsSaving(true);
    try {
      await addWeeklyResult(validResults, multiplier, selectedCategoryId);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300 overflow-hidden">
      <div className="bg-[#0b0f1a] w-full max-w-7xl rounded-t-[1.5rem] md:rounded-[2rem] border-t md:border border-emerald-900/30 shadow-2xl flex flex-col h-[98dvh] md:h-auto md:max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/40 shrink-0">
          <div className="flex items-center gap-2">
            <Wallet className="text-emerald-500 hidden xs:block" size={16} />
            <h3 className="text-xs md:text-lg font-black text-white uppercase tracking-widest">Lançamento de Resultados</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="p-2 md:p-4 border-b border-gray-800 bg-black/40 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            
            <div className="md:col-span-3">
               <select 
                 className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 outline-none focus:border-emerald-500 text-[10px] md:text-xs font-bold"
                 value={selectedCategoryId}
                 onChange={(e) => setSelectedCategoryId(e.target.value)}
               >
                 <option value="">Escolher Categoria...</option>
                 {categories.map(c => (
                   <option key={c.id} value={c.id}>{c.name}</option>
                 ))}
               </select>
            </div>

            <div className="md:col-span-7 relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
               <input 
                 className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-gray-200 focus:border-emerald-500 outline-none text-[10px] md:text-xs font-bold"
                 placeholder="Pesquisar e adicionar jogador..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
               {searchSuggestions.length > 0 && (
                 <div className="absolute top-full left-0 w-full mt-1 bg-gray-900 border border-emerald-500/30 rounded-lg shadow-2xl z-[110] overflow-hidden">
                   {searchSuggestions.map(p => (
                     <button
                       key={p.id}
                       onClick={() => addPlayerToStage(p)}
                       className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-600/10 text-left border-b border-gray-800 last:border-none"
                     >
                       <span className="text-white font-bold text-xs">{p.name}</span>
                       <UserPlus size={14} className="text-emerald-500" />
                     </button>
                   ))}
                 </div>
               )}
            </div>

            <div className="md:col-span-2 flex bg-gray-900 p-0.5 rounded-lg border border-gray-800">
              {[1, 2].map(m => (
                <button
                  key={m}
                  onClick={() => setMultiplier(m)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-black transition-all ${
                    multiplier === m ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600'
                  }`}
                >
                  {m}X
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ÁREA DE JOGADORES - TABELA UNIFICADA */}
        <div className="flex-1 overflow-x-auto overflow-y-auto bg-[#080b14] custom-scrollbar">
          {selectedPlayers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-700 py-10 opacity-30">
               <UserPlus size={40} className="mb-2" />
               <p className="text-[10px] font-black uppercase tracking-widest text-center px-8">A lista está vazia. Adicione jogadores acima.</p>
            </div>
          ) : (
            <table className="w-full text-left min-w-[1000px]">
              <thead className="sticky top-0 bg-[#080b14] z-20 shadow-sm">
                <tr className="text-[10px] md:text-[11px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800">
                  <th className="px-4 md:px-8 py-4">Nome do Jogador</th>
                  <th className="px-2 py-4 text-center w-24">Posição</th>
                  <th className="px-2 py-4 text-center w-28">Re-buy</th>
                  <th className="px-2 py-4 text-center w-28">Re-buy Duplo</th>
                  <th className="px-2 py-4 text-center w-28">Add-on</th>
                  <th className="px-2 py-4 text-center w-20">Pago</th>
                  <th className="px-4 py-4 text-right">Bruto</th>
                  <th className="px-4 py-4 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {selectedPlayers.map(p => (
                  <tr key={p.playerId} className="hover:bg-emerald-600/[0.03] group transition-colors">
                    <td className="px-4 md:px-8 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${p.position > 0 ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-600'}`}>
                          {p.position > 0 ? (p.position === 1 ? <Trophy size={14} className="text-amber-500" /> : p.position) : p.name.charAt(0)}
                        </div>
                        <span className="text-white font-bold text-xs truncate">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <input 
                        type="number" 
                        inputMode="numeric"
                        className="w-full bg-black/40 border border-gray-800 rounded-lg py-2.5 text-center text-emerald-400 font-black text-xs focus:border-emerald-500 outline-none" 
                        value={p.position || ''} 
                        onChange={(e) => handleEntryChange(p.playerId, 'position', Number(e.target.value))} 
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input 
                        type="number" 
                        inputMode="numeric"
                        className="w-full bg-black/40 border border-gray-800 rounded-lg py-2.5 text-center text-white text-xs focus:border-emerald-500 outline-none" 
                        value={p.rebuys || ''} 
                        onChange={(e) => handleEntryChange(p.playerId, 'rebuys', Number(e.target.value))} 
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input 
                        type="number" 
                        inputMode="numeric"
                        className="w-full bg-black/40 border border-gray-800 rounded-lg py-2.5 text-center text-white text-xs focus:border-emerald-500 outline-none" 
                        value={p.doubleRebuys || ''} 
                        onChange={(e) => handleEntryChange(p.playerId, 'doubleRebuys', Number(e.target.value))} 
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input 
                        type="number" 
                        inputMode="numeric"
                        className="w-full bg-black/40 border border-gray-800 rounded-lg py-2.5 text-center text-white text-xs focus:border-emerald-500 outline-none" 
                        value={p.addons || ''} 
                        onChange={(e) => handleEntryChange(p.playerId, 'addons', Number(e.target.value))} 
                      />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <button 
                        onClick={() => handleEntryChange(p.playerId, 'paid', !p.paid)} 
                        className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto border transition-all ${p.paid ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-black/40 border-gray-800 text-transparent'}`}
                      >
                        <Check size={16} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                       <span className={`font-black text-xs ${calculatePlayerGrossTotal(p, selectedCategory) > 0 ? 'text-amber-500' : 'text-gray-800'}`}>
                         R$ {calculatePlayerGrossTotal(p, selectedCategory).toFixed(0)}
                       </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => removePlayerFromStage(p.playerId)} 
                        className="text-gray-700 hover:text-red-500 p-2 transition-all opacity-40 hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé Compacto */}
        <div className="px-4 py-3 md:px-8 md:py-5 border-t border-gray-800 bg-[#0f1422] shrink-0">
          <div className="flex flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-4 md:gap-12">
                <div className="flex flex-col relative group">
                   <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-[7px] md:text-[9px] font-black text-gray-600 uppercase tracking-widest">Valor Total</p>
                      <div className="relative cursor-help">
                        <Info size={10} className="text-gray-600 hover:text-emerald-500 transition-colors" />
                        
                        {/* TOOLTIP DESKTOP/MOBILE */}
                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-900 border border-emerald-500/30 rounded-xl p-3 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                           <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                 <span className="text-[8px] font-black text-gray-500 uppercase">Bruto:</span>
                                 <span className="text-[10px] font-bold text-white">R$ {totalEventGrossValue.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between items-center border-t border-gray-800 pt-1">
                                 <span className="text-[8px] font-black text-gray-500 uppercase">Rake ({selectedCategory?.rake || 0}%):</span>
                                 <span className="text-[10px] font-bold text-red-500">- R$ {rakeAmountCollected.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between items-center border-t border-gray-800 pt-1">
                                 <span className="text-[8px] font-black text-gray-500 uppercase">Ranking ({selectedCategory?.rankingPercent || 0}%):</span>
                                 <span className="text-[10px] font-bold text-amber-500">- R$ {rankingPrizeValue.toFixed(0)}</span>
                              </div>
                           </div>
                           <div className="absolute -bottom-1 left-3 w-2 h-2 bg-gray-900 border-r border-b border-emerald-500/30 rotate-45"></div>
                        </div>
                      </div>
                   </div>
                   <span className="text-[11px] md:text-xl font-black text-emerald-500">R$ {totalEventNetValue.toFixed(0)}</span>
                </div>
                <div className="flex flex-col border-l border-gray-800 pl-4 md:pl-12">
                   <p className="text-[7px] md:text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Ranking</p>
                   <span className="text-[11px] md:text-xl font-black text-amber-500">R$ {rankingPrizeValue.toFixed(0)}</span>
                </div>
             </div>

             <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  disabled={!selectedCategoryId || selectedPlayers.length === 0 || isSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white px-6 md:px-10 py-2.5 md:py-4 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : (
                    <>
                      <span>Finalizar Etapa</span> 
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddResultModal;
