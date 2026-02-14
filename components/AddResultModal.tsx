
import React, { useState, useMemo } from 'react';
import { useRanking } from '../context/RankingContext';
import { X, Search, ChevronRight, CheckCircle2, Wallet, Coins, Check, UserPlus, Trash2, Trophy, Eye, Loader2, AlertCircle } from 'lucide-react';
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
  const [showGrossTooltip, setShowGrossTooltip] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Lista de jogadores adicionados para esta etapa específica
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerEntry[]>([]);

  if (!activeRanking) return null;

  const categories = activeRanking.gameCategories || [];
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  // Sugestões de busca
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
    setSelectedPlayers(prev => [...prev, newEntry]);
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

  // Cálculo do valor BRUTO por jogador
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

  // Cálculo do valor recolhido de RAKE
  const rakeAmountCollected = useMemo(() => {
    if (!selectedCategory) return 0;
    return totalEventGrossValue * ((selectedCategory.rake || 0) / 100);
  }, [totalEventGrossValue, selectedCategory]);

  // Cálculo do Montante Pós-Rake (Base para o Ranking)
  const postRakeValue = useMemo(() => {
    return totalEventGrossValue - rakeAmountCollected;
  }, [totalEventGrossValue, rakeAmountCollected]);

  // Cálculo do Valor destinado ao Ranking (Arredondado para baixo conforme solicitado)
  const rankingPrizeValue = useMemo(() => {
    if (!selectedCategory) return 0;
    const rawRankingValue = postRakeValue * ((selectedCategory.rankingPercent || 0) / 100);
    return Math.floor(rawRankingValue);
  }, [postRakeValue, selectedCategory]);

  // Valor Total Final da Casa (Arredondado para cima conforme solicitado)
  const totalEventNetValue = useMemo(() => {
    const netHouseValue = postRakeValue - rankingPrizeValue;
    return Math.ceil(netHouseValue);
  }, [postRakeValue, rankingPrizeValue]);

  const handleSave = async () => {
    const validResults = selectedPlayers
      .filter(p => p.position > 0)
      .map(p => {
        // Conforme solicitado: Apenas o 1º colocado adiciona o Prêmio do Ranking ao valor acumulado.
        // Os demais não adicionam valor nenhum (0).
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
      alert('Selecione ao menos um jogador e defina sua posição.');
      return;
    }

    setIsSaving(true);
    try {
      await addWeeklyResult(validResults, multiplier, selectedCategoryId);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar os resultados. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f172a] w-full max-w-6xl rounded-[3rem] border border-emerald-900/30 shadow-[0_0_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[92vh] overflow-hidden scale-in-center">
        
        <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/40">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <Wallet className="text-emerald-500" />
              Lançamento de Etapa
            </h3>
            <p className="text-gray-500 text-[10px] uppercase font-black tracking-[0.2em] mt-1">Gestão Financeira e Pontuação</p>
          </div>
          <button onClick={onClose} className="p-3 text-gray-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b border-gray-800 space-y-6 bg-black/20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-2">
               <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-1">1. Categoria do Jogo</label>
               <select 
                 className="w-full bg-black/60 border border-gray-800 rounded-2xl px-4 py-4 text-gray-200 outline-none focus:border-emerald-500 transition-all font-bold text-sm shadow-inner"
                 value={selectedCategoryId}
                 onChange={(e) => setSelectedCategoryId(e.target.value)}
               >
                 <option value="">Selecione...</option>
                 {categories.map(c => (
                   <option key={c.id} value={c.id}>{c.name} (BI: R${c.buyIn})</option>
                 ))}
               </select>
               {categories.length === 0 && (
                 <div className="flex items-center gap-2 text-red-500 text-[9px] font-bold mt-1 ml-1 animate-pulse">
                   <AlertCircle size={12} />
                   Configure categorias nas Configurações primeiro.
                 </div>
               )}
            </div>

            <div className="lg:col-span-6 space-y-2 relative">
              <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-1">2. Buscar e Adicionar Jogador</label>
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input 
                  className="w-full bg-black/40 border border-gray-800 rounded-2xl pl-14 pr-6 py-4 text-gray-200 focus:border-emerald-500 outline-none transition-all placeholder:text-gray-700 text-sm font-bold shadow-inner"
                  placeholder="Digite o nome do jogador para adicionar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-gray-900 border border-emerald-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {searchSuggestions.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addPlayerToStage(p)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-emerald-600/10 text-left transition-colors border-b border-gray-800 last:border-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-600/20 rounded-lg flex items-center justify-center text-emerald-500 font-black text-xs">
                          {p.name.charAt(0)}
                        </div>
                        <span className="text-white font-bold text-sm">{p.name}</span>
                      </div>
                      <UserPlus size={16} className="text-emerald-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-3 space-y-2">
                <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest ml-1">3. Multiplicador</label>
                <div className="flex bg-black/60 p-1.5 rounded-2xl border border-gray-800 shadow-inner">
                  {[1, 2].map(m => (
                    <button
                      key={m}
                      onClick={() => setMultiplier(m)}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
                        multiplier === m 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' 
                        : 'text-gray-600 hover:text-gray-400'
                      }`}
                    >
                      {m === 1 ? 'Normal' : 'Etapa 2X'}
                    </button>
                  ))}
                </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-black/10">
          {selectedPlayers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4 py-20">
               <div className="w-20 h-20 bg-gray-900 rounded-[2rem] border border-gray-800 flex items-center justify-center">
                  <UserPlus size={32} className="text-gray-800" />
               </div>
               <div className="text-center">
                  <p className="font-black uppercase text-[10px] tracking-[0.3em]">Nenhum jogador selecionado</p>
                  <p className="text-xs font-medium mt-1">Utilize o campo de busca acima para montar a lista da etapa.</p>
               </div>
            </div>
          ) : (
            <table className="w-full text-left min-w-[1000px]">
               <thead>
                 <tr className="bg-gray-900/60 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800">
                   <th className="px-8 py-5">Jogador</th>
                   <th className="px-4 py-5 text-center w-24">Posição</th>
                   <th className="px-4 py-5 text-center w-24">Re-buy</th>
                   <th className="px-4 py-5 text-center w-24">Re-buy D.</th>
                   <th className="px-4 py-5 text-center w-24">Add-on</th>
                   <th className="px-4 py-5 text-center w-20">Pago</th>
                   <th className="px-8 py-5 text-right">Valor Bruto</th>
                   <th className="px-6 py-5 text-center w-16"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-800/50">
                 {selectedPlayers.map(p => {
                   const totalGross = calculatePlayerGrossTotal(p, selectedCategory);
                   return (
                     <tr key={p.playerId} className="hover:bg-emerald-600/[0.03] transition-colors group">
                       <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${p.position > 0 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-gray-800 text-gray-600'}`}>
                                {p.position > 0 ? (p.position === 1 ? <Trophy size={18} className="text-amber-500" /> : <CheckCircle2 size={18} />) : p.name.charAt(0)}
                             </div>
                             <div>
                                <p className="text-white font-bold text-sm tracking-tight">{p.name}</p>
                                <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Inscrito na etapa</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-4 py-4">
                          <input 
                             type="number"
                             min="0"
                             className="w-full bg-black/40 border border-gray-800 rounded-xl px-2 py-3 text-center text-emerald-400 font-black focus:border-emerald-500 outline-none transition-all placeholder:text-gray-800"
                             value={p.position || ''}
                             onChange={(e) => handleEntryChange(p.playerId, 'position', Number(e.target.value))}
                          />
                       </td>
                       <td className="px-4 py-4">
                          <input 
                             type="number"
                             min="0"
                             className="w-full bg-black/40 border border-gray-800 rounded-xl px-2 py-3 text-center text-white font-bold focus:border-emerald-500 outline-none transition-all"
                             value={p.rebuys || ''}
                             onChange={(e) => handleEntryChange(p.playerId, 'rebuys', Number(e.target.value))}
                          />
                       </td>
                       <td className="px-4 py-4">
                          <input 
                             type="number"
                             min="0"
                             className="w-full bg-black/40 border border-gray-800 rounded-xl px-2 py-3 text-center text-white font-bold focus:border-emerald-500 outline-none transition-all"
                             value={p.doubleRebuys || ''}
                             onChange={(e) => handleEntryChange(p.playerId, 'doubleRebuys', Number(e.target.value))}
                          />
                       </td>
                       <td className="px-4 py-4">
                          <input 
                             type="number"
                             min="0"
                             className="w-full bg-black/40 border border-gray-800 rounded-xl px-2 py-3 text-center text-white font-bold focus:border-emerald-500 outline-none transition-all"
                             value={p.addons || ''}
                             onChange={(e) => handleEntryChange(p.playerId, 'addons', Number(e.target.value))}
                          />
                       </td>
                       <td className="px-4 py-4 text-center">
                          <button 
                            onClick={() => handleEntryChange(p.playerId, 'paid', !p.paid)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto border transition-all ${
                              p.paid 
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30' 
                              : 'bg-black/40 border-gray-800 text-transparent hover:border-emerald-500/50'
                            }`}
                          >
                             <Check size={18} />
                          </button>
                       </td>
                       <td className="px-8 py-4 text-right">
                          <span className={`font-black text-sm tracking-tighter ${totalGross > 0 ? 'text-amber-500' : 'text-gray-800'}`}>
                             R$ {totalGross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => removePlayerFromStage(p.playerId)}
                            className="text-gray-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
            </table>
          )}
        </div>

        <div className="p-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-8 bg-gray-900/60 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-12">
             <div className="flex flex-col relative">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Valor Total</span>
                  <button 
                    onClick={() => setShowGrossTooltip(!showGrossTooltip)}
                    className={`p-1 rounded-md transition-all ${showGrossTooltip ? 'bg-emerald-500 text-black' : 'text-emerald-500/60 hover:text-emerald-500'}`}
                  >
                    <Eye size={12} />
                  </button>
                </div>
                
                <div className="flex items-center gap-3 mt-1">
                   <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                      <Coins size={20} />
                   </div>
                   <span className="text-3xl font-black text-emerald-500 tracking-tighter">
                     R$ {totalEventNetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </span>
                </div>

                {showGrossTooltip && (
                  <div className="absolute bottom-full left-0 mb-4 animate-in slide-in-from-bottom-2 duration-200 z-[110]">
                    <div className="bg-gray-800 border border-emerald-500/30 p-4 rounded-2xl shadow-2xl flex flex-col gap-1 min-w-[220px]">
                      <div className="pb-2 mb-2 border-b border-gray-700/50">
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Valor Bruto Arrecadado</p>
                        <p className="text-white font-black text-lg tracking-tight">R$ {totalEventGrossValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <p className="text-[9px] font-bold text-gray-400">Rake Recolhido:</p>
                          <p className="text-[9px] font-black text-amber-500">R$ {rakeAmountCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[9px] font-bold text-gray-400">Prêmio Ranking:</p>
                          <p className="text-[9px] font-black text-blue-500">R$ {rankingPrizeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        {selectedCategory && (
                          <div className="pt-1 mt-1 border-t border-gray-700/30 flex justify-between items-center">
                             <p className="text-[8px] text-gray-500 italic">Configs: {selectedCategory.rake}% R / {selectedCategory.rankingPercent}% RP</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-gray-800 border-r border-b border-emerald-500/30 rotate-45 -mt-1.5 ml-6"></div>
                  </div>
                )}
             </div>

             <div className="flex flex-col border-l border-gray-800 pl-12">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Prêmio do Ranking</span>
                <div className="flex items-center gap-3 mt-1">
                   <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                      <Trophy size={20} />
                   </div>
                   <span className="text-3xl font-black text-blue-500 tracking-tighter">R$ {rankingPrizeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                {selectedCategory && selectedCategory.rankingPercent > 0 && (
                   <span className="text-[9px] font-bold text-gray-500 mt-2">({selectedCategory.rankingPercent}% do valor pós-rake)</span>
                )}
             </div>

             <div className="flex flex-col border-l border-gray-800 pl-12">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Jogadores</span>
                <span className="text-3xl font-black text-white tracking-tighter mt-1">{selectedPlayers.length}</span>
             </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onClose} 
              disabled={isSaving}
              className="px-8 py-4 rounded-2xl font-black text-gray-500 hover:text-white hover:bg-white/5 transition-all text-[10px] uppercase tracking-widest disabled:opacity-30"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={!selectedCategoryId || selectedPlayers.length === 0 || isSaving}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed text-white px-12 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-4 shadow-2xl shadow-emerald-900/40 transition-all transform hover:scale-[1.02] active:scale-95 min-w-[240px] justify-center"
            >
              {isSaving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Salvando Etapa...
                </>
              ) : (
                <>
                  Finalizar Lançamento
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddResultModal;
