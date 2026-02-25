
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useRanking } from '../context/RankingContext';
import { X, Search, ChevronRight, Wallet, Check, UserPlus, Trash2, Trophy, Loader2, Info, DollarSign, AlertTriangle, Save, ChevronDown, ChevronUp, Clock, ExternalLink } from 'lucide-react';
import { Player, PokerClockConfig } from '../types';

interface AddResultModalProps {
  onClose: () => void;
}

interface PlayerEntry {
  playerId: string;
  name: string;
  position: number;
  eliminatedOrder?: number;
  rebuys: number;
  doubleRebuys: number;
  addons: number; 
  paid: boolean;
  isNew?: boolean;
  phone?: string;
  birthDate?: string;
  favoriteTeam?: string;
}

const ITM_PERCENTAGES: Record<number, number[]> = {
  1: [100],
  2: [65, 35],
  3: [50, 30, 20],
  4: [44, 28, 18, 10],
  5: [36, 26, 19, 12, 7],
  6: [33, 21, 15, 11, 9, 7],
  7: [31.5, 21, 15, 11.5, 9, 7, 5],
  8: [30, 19.5, 14, 10.5, 8.5, 7, 5.5, 5],
  9: [29, 19, 14, 10, 8, 6.5, 5.5, 4.5, 3.5],
  10: [26, 18.5, 13.5, 9.5, 7.8, 6.3, 5, 4.1, 3.5, 2.9]
};

const AddResultModal: React.FC<AddResultModalProps> = ({ onClose }) => {
  const { activeRanking, addWeeklyResult, updatePokerClockConfig, house } = useRanking();
  const [searchTerm, setSearchTerm] = useState('');
  const [multiplier, setMultiplier] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showFinancialTooltip, setShowFinancialTooltip] = useState(false);
  const [showPrizeTooltip, setShowPrizeTooltip] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isClockActive, setIsClockActive] = useState(false);

  // Estados para novo jogador
  const [showExtraNewPlayer, setShowExtraNewPlayer] = useState(false);
  const [extraNewPlayer, setExtraNewPlayer] = useState({ phone: '', birthDate: '', favoriteTeam: '' });
  
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerEntry[]>([]);
  const [customPaidPlaces, setCustomPaidPlaces] = useState<number | ''>('');
  const [valorAdministrativo, setValorAdministrativo] = useState<number>(0);
  const [manualRankingValue, setManualRankingValue] = useState<number | null>(null);

  const financialRef = useRef<HTMLDivElement>(null);
  const prizeRef = useRef<HTMLDivElement>(null);

  const normalizeStr = (str: string) => 
    str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

  const formatPhone = (value: string) => {
    if (!value) return "";
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (financialRef.current && !financialRef.current.contains(event.target as Node)) {
        setShowFinancialTooltip(false);
      }
      if (prizeRef.current && !prizeRef.current.contains(event.target as Node)) {
        setShowPrizeTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeRanking) {
      const savedDraft = localStorage.getItem(`draft_${activeRanking.id}`);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setSelectedPlayers(parsed.selectedPlayers || []);
          setMultiplier(parsed.multiplier || 1);
          setSelectedCategoryId(parsed.selectedCategoryId || '');
        } catch (e) { console.error(e); }
      }
    }
  }, [activeRanking]);

  useEffect(() => {
    if (activeRanking && selectedPlayers.length > 0) {
      localStorage.setItem(`draft_${activeRanking.id}`, JSON.stringify({ selectedPlayers, multiplier, selectedCategoryId }));
    }
  }, [selectedPlayers, multiplier, selectedCategoryId, activeRanking]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  if (!activeRanking) return null;

  const categories = activeRanking.gameCategories || [];
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const sortedSelectedPlayers = useMemo(() => {
    return [...selectedPlayers].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [selectedPlayers]);

  const addPlayerToStage = (player: Player) => {
    if (selectedPlayers.some(p => p.playerId === player.id)) return;
    setSelectedPlayers(prev => [{ playerId: player.id, name: player.name, position: 0, rebuys: 0, doubleRebuys: 0, addons: 0, paid: false }, ...prev]);
    setSearchTerm('');
  };

  const addNewPlayerToStage = () => {
    setSelectedPlayers(prev => [{ 
      playerId: `temp-${Date.now()}`, 
      name: searchTerm.trim(), 
      position: 0, 
      rebuys: 0, 
      doubleRebuys: 0, 
      addons: 0, 
      paid: false, 
      isNew: true,
      ...extraNewPlayer
    }, ...prev]);
    setSearchTerm('');
    setExtraNewPlayer({ phone: '', birthDate: '', favoriteTeam: '' });
    setShowExtraNewPlayer(false);
  };

  const toggleElimination = (playerId: string) => {
    const player = selectedPlayers.find(p => p.playerId === playerId);
    if (!player) return;

    if (player.eliminatedOrder) {
      // Unchecking: remove elimination order and reset position
      setSelectedPlayers(prev => prev.map(p => p.playerId === playerId ? { ...p, eliminatedOrder: undefined, position: 0 } : p));
    } else {
      // Checking: assign next elimination order
      const maxOrder = Math.max(0, ...selectedPlayers.map(p => p.eliminatedOrder || 0));
      const newOrder = maxOrder + 1;
      
      // Trigger elimination update on TV
      updatePokerClockConfig({ lastEliminationTime: Date.now() });
      
      // Update all positions based on new elimination
      const totalPlayers = selectedPlayers.length;
      setSelectedPlayers(prev => prev.map(p => {
        if (p.playerId === playerId) {
          return { ...p, eliminatedOrder: newOrder, position: totalPlayers - newOrder + 1 };
        }
        if (p.eliminatedOrder) {
          return { ...p, position: totalPlayers - p.eliminatedOrder + 1 };
        }
        return p;
      }));
    }
  };

  const openExternalClock = () => {
    setIsClockActive(true);
    const width = 1200;
    const height = 800;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    const url = `/c/${house.slug || house.id}?view=poker-clock-external`;
    window.open(url, 'PokerClockWindow', `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`);
  };

  const handleEntryChange = (playerId: string, field: keyof PlayerEntry, value: any) => {
    setSelectedPlayers(prev => prev.map(p => p.playerId === playerId ? { ...p, [field]: value } : p));
  };

  const inputNumericProps = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
    inputMode: "numeric" as const,
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculatePlayerGross = (entry: PlayerEntry) => {
    if (!selectedCategory) return 0;
    const addonTotal = (entry.addons > 0) ? selectedCategory.addOn : 0;
    return selectedCategory.buyIn + (entry.rebuys * selectedCategory.reBuy) + (entry.doubleRebuys * selectedCategory.reBuyDuplo) + addonTotal;
  };

  const totalBruto = useMemo(() => selectedPlayers.reduce((acc, p) => acc + calculatePlayerGross(p), 0), [selectedPlayers, selectedCategory]);
  const valorRake = useMemo(() => totalBruto * ((selectedCategory?.rake || 0) / 100), [totalBruto, selectedCategory]);
  const valorPosRake = totalBruto - valorRake;
  
  const calculatedRanking = useMemo(() => valorPosRake * ((selectedCategory?.rankingPercent || 0) / 100), [valorPosRake, selectedCategory]);
  const valorRanking = manualRankingValue !== null ? manualRankingValue : calculatedRanking;
  
  const valorLiquido = totalBruto - valorRake - valorRanking - valorAdministrativo;

  const prizeSuggestions = useMemo(() => {
    const playerCount = selectedPlayers.length;
    if (playerCount === 0) return [];
    let placesToPay = customPaidPlaces !== '' ? Number(customPaidPlaces) : 0;
    if (placesToPay === 0) {
      if (playerCount >= 1 && playerCount <= 5) placesToPay = 2;
      else if (playerCount >= 6 && playerCount <= 17) placesToPay = 3;
      else if (playerCount >= 18 && playerCount <= 26) placesToPay = 4;
      else if (playerCount >= 27 && playerCount <= 35) placesToPay = 5;
      else if (playerCount >= 36 && playerCount <= 53) placesToPay = 7;
      else if (playerCount >= 54 && playerCount <= 62) placesToPay = 9;
      else placesToPay = 10;
    }
    const effectivePlaces = Math.min(Math.max(placesToPay, 1), 10);
    const percentages = ITM_PERCENTAGES[effectivePlaces] || [100];
    return percentages.map(p => ({ percent: p, value: (valorLiquido * p) / 100 }));
  }, [selectedPlayers.length, valorLiquido, customPaidPlaces]);

  useEffect(() => {
    if (isClockActive && activeRanking) {
      const timer = setTimeout(() => {
        const eliminatedCount = selectedPlayers.filter(p => p.eliminatedOrder).length;
        updatePokerClockConfig({
          playersRemaining: selectedPlayers.length - eliminatedCount,
          totalPlayers: selectedPlayers.length,
          totalPrize: valorLiquido,
          prizeDistribution: prizeSuggestions.map((p, idx) => ({
            position: idx + 1,
            percentage: p.percent,
            value: p.value
          }))
        });
      }, 1000); // 1 second debounce
      return () => clearTimeout(timer);
    }
  }, [selectedPlayers, valorLiquido, isClockActive, activeRanking, updatePokerClockConfig, prizeSuggestions]);

  const handleSave = async () => {
    // Se houver apenas um jogador sem posição definida, ele é o vencedor (1º lugar)
    const playersWithoutPosition = selectedPlayers.filter(p => !p.position || p.position === 0);
    let finalPlayers = [...selectedPlayers];
    
    if (playersWithoutPosition.length === 1) {
      finalPlayers = selectedPlayers.map(p => 
        p.playerId === playersWithoutPosition[0].playerId ? { ...p, position: 1 } : p
      );
    }

    const valid = finalPlayers.filter(p => p.position > 0).map(p => ({ 
      ...p, playerName: p.name, totalValue: p.position === 1 ? valorRanking : 0 
    }));
    
    if (valid.length === 0) return alert('Defina a posição de ao menos um jogador.');
    setIsSaving(true);
    try {
      await addWeeklyResult(valid, multiplier, selectedCategoryId);
      localStorage.removeItem(`draft_${activeRanking.id}`);
      onClose();
    } catch (err) { alert('Erro ao salvar'); } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300 overflow-hidden">
      <div className="bg-[#0b0f1a] w-full max-w-7xl rounded-t-[1.5rem] md:rounded-[2rem] border-t md:border border-emerald-900/30 shadow-2xl flex flex-col h-[98dvh] md:h-auto md:max-h-[92vh] overflow-hidden">
        
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/40 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Wallet className="text-emerald-500 hidden xs:block" size={16} />
              <h3 className="text-xs md:text-lg font-black text-white uppercase tracking-widest">Lançamento de Resultados</h3>
            </div>
            <button 
              onClick={openExternalClock}
              className="flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-cyan-500/20"
            >
              <Clock size={14} />
              Start Clock (TV)
            </button>
          </div>
          <button onClick={() => setShowExitConfirm(true)} className="p-2 text-gray-500 hover:text-white transition-all"><X size={20} /></button>
        </div>

        <div className="p-2 md:p-4 border-b border-gray-800 bg-black/40 shrink-0 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <div className="md:col-span-3">
               <select className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-gray-200 text-xs font-bold outline-none focus:border-emerald-500" value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}>
                 <option value="">Escolher Categoria...</option>
                 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
            </div>
            <div className="md:col-span-7 relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
               <input className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-gray-200 text-xs font-bold outline-none" placeholder="Buscar jogador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
               {searchTerm.length > 1 && (
                 <div className="absolute top-full left-0 w-full mt-1 bg-gray-900 border border-emerald-500/30 rounded-lg shadow-2xl z-[130] overflow-hidden">
                   {activeRanking.players.filter(p => normalizeStr(p.name).includes(normalizeStr(searchTerm))).slice(0, 5).map(p => (
                     <button key={p.id} onClick={() => addPlayerToStage(p)} className="w-full px-4 py-3 text-left hover:bg-emerald-600/10 border-b border-gray-800 text-white font-bold text-xs">{p.name}</button>
                   ))}
                   {!activeRanking.players.some(p => normalizeStr(p.name) === normalizeStr(searchTerm)) && (
                     <div className="bg-emerald-900/10 border-b border-emerald-500/20">
                        <div className="flex items-center justify-between px-4 py-3">
                           <span className="text-emerald-500 font-black text-[10px] uppercase">Novo: {searchTerm}</span>
                           <button 
                             onClick={() => setShowExtraNewPlayer(!showExtraNewPlayer)}
                             className="text-emerald-400 hover:text-emerald-200 transition-colors"
                           >
                             {showExtraNewPlayer ? <ChevronUp size={16} /> : <div className="flex items-center gap-1 text-[8px] font-black uppercase bg-emerald-500/20 px-2 py-1 rounded">Expandir Cadastro <ChevronDown size={12}/></div>}
                           </button>
                        </div>
                        {showExtraNewPlayer && (
                          <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                             <input className="bg-black/60 border border-emerald-500/30 rounded-lg px-3 py-2 text-[10px] text-white outline-none" placeholder="Celular" value={extraNewPlayer.phone} onChange={e => setExtraNewPlayer({...extraNewPlayer, phone: formatPhone(e.target.value)})} />
                             <input type="date" className="bg-black/60 border border-emerald-500/30 rounded-lg px-3 py-2 text-[10px] text-white outline-none" value={extraNewPlayer.birthDate} onChange={e => setExtraNewPlayer({...extraNewPlayer, birthDate: e.target.value})} />
                             <input className="bg-black/60 border border-emerald-500/30 rounded-lg px-3 py-2 text-[10px] text-white outline-none" placeholder="Time" value={extraNewPlayer.favoriteTeam} onChange={e => setExtraNewPlayer({...extraNewPlayer, favoriteTeam: e.target.value})} />
                          </div>
                        )}
                        <button onClick={addNewPlayerToStage} className="w-full px-4 py-2 bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest text-center hover:bg-emerald-500">Adicionar Jogador</button>
                     </div>
                   )}
                 </div>
               )}
            </div>
            <div className="md:col-span-2 flex bg-gray-900 p-0.5 rounded-lg border border-gray-800">
              {[1, 2].map(m => <button key={m} onClick={() => setMultiplier(m)} className={`flex-1 py-1 rounded-md text-[10px] font-black ${multiplier === m ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-600'}`}>{m}X</button>)}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#080b14] custom-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="sticky top-0 bg-[#080b14] z-20 border-b border-gray-800">
              <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                <th className="px-8 py-4">Jogador</th>
                <th className="px-2 py-4 text-center w-24">Eliminado</th>
                <th className="px-2 py-4 text-center w-28">Re-buy</th>
                <th className="px-2 py-4 text-center w-28">Re-buy Duplo</th>
                <th className="px-2 py-4 text-center w-28">Add-on</th>
                <th className="px-2 py-4 text-center w-20">Pago</th>
                <th className="px-4 py-4 text-right">Bruto</th>
                <th className="px-4 py-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {sortedSelectedPlayers.map(p => (
                <tr key={p.playerId} className="hover:bg-emerald-600/[0.03] group transition-colors">
                  <td className="px-8 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${p.position === 1 ? 'bg-amber-500 text-black' : p.position > 1 ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
                        {p.position === 1 ? <Trophy size={14} /> : p.position || p.name[0]}
                      </div>
                      <span className="text-white font-bold text-xs">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <button 
                      onClick={() => toggleElimination(p.playerId)} 
                      className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto border transition-all relative ${p.eliminatedOrder ? 'bg-red-500 text-white border-red-400 shadow-lg' : 'bg-black/40 border-gray-800 text-transparent hover:text-gray-600'}`}
                    >
                      {p.eliminatedOrder ? (
                        <span className="text-[12px] font-black">{p.position}</span>
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                  </td>
                  <td className="px-2 py-3"><input type="number" {...inputNumericProps} className="w-full bg-black/40 border border-gray-800 rounded-lg py-2 text-center text-white text-xs outline-none" value={p.rebuys || ''} onChange={(e) => handleEntryChange(p.playerId, 'rebuys', Number(e.target.value))} /></td>
                  <td className="px-2 py-3"><input type="number" {...inputNumericProps} className="w-full bg-black/40 border border-gray-800 rounded-lg py-2 text-center text-white text-xs outline-none" value={p.doubleRebuys || ''} onChange={(e) => handleEntryChange(p.playerId, 'doubleRebuys', Number(e.target.value))} /></td>
                  <td className="px-2 py-3 text-center">
                    <button onClick={() => handleEntryChange(p.playerId, 'addons', p.addons > 0 ? 0 : 1)} className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto border transition-all ${p.addons > 0 ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-black/40 border-gray-800 text-transparent'}`}><Check size={16} /></button>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <button onClick={() => handleEntryChange(p.playerId, 'paid', !p.paid)} className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto border transition-all ${p.paid ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-black/40 border-gray-800 text-transparent'}`}><Check size={16} /></button>
                  </td>
                  <td className="px-4 py-3 text-right text-amber-500 font-black text-xs">R$ {formatCurrency(calculatePlayerGross(p))}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => setSelectedPlayers(prev => prev.filter(x => x.playerId !== p.playerId))} className="text-gray-700 hover:text-red-500 transition-all opacity-40 hover:opacity-100"><Trash2 size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 md:px-8 md:py-5 border-t border-gray-800 bg-[#0f1422] shrink-0 overflow-visible relative">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-4 md:gap-12">
                
                <div className="flex flex-col relative overflow-visible" ref={financialRef}>
                   <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Valor Líquido</p>
                      <button onClick={() => { setShowFinancialTooltip(!showFinancialTooltip); setShowPrizeTooltip(false); }} className={`p-1 rounded transition-colors ${showFinancialTooltip ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-600 hover:text-emerald-500'}`}><Info size={14} /></button>
                      
                      {showFinancialTooltip && (
                        <div className="absolute bottom-full left-0 mb-4 w-72 bg-gray-900 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl z-[150] animate-in zoom-in-95">
                           <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-b border-gray-800 pb-2 mb-3">Resumo Financeiro</h4>
                           <div className="space-y-3 text-[11px] font-bold">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500">Valor Bruto:</span> 
                                <span className="text-white">R$ {formatCurrency(totalBruto)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500">Rake ({selectedCategory?.rake || 0}%):</span> 
                                <span className="text-red-500">- R$ {formatCurrency(valorRake)}</span>
                              </div>
                              
                              <div className="flex justify-between items-center group">
                                <span className="text-gray-500">Ranking ({selectedCategory?.rankingPercent || 0}%):</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 text-[10px]">- R$</span>
                                  <input 
                                    type="number" 
                                    {...inputNumericProps}
                                    className="w-20 bg-black/40 border border-gray-800 rounded px-2 py-1 text-amber-500 text-right outline-none focus:border-amber-500/50"
                                    value={manualRankingValue !== null ? manualRankingValue : calculatedRanking.toFixed(2)}
                                    onChange={(e) => setManualRankingValue(e.target.value === '' ? null : Number(e.target.value))}
                                  />
                                </div>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-gray-500">Administrativo:</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 text-[10px]">- R$</span>
                                  <input 
                                    type="number" 
                                    {...inputNumericProps}
                                    className="w-20 bg-black/40 border border-gray-800 rounded px-2 py-1 text-red-400 text-right outline-none focus:border-red-500/50"
                                    value={valorAdministrativo || ''}
                                    onChange={(e) => setValorAdministrativo(Number(e.target.value))}
                                    placeholder="0,00"
                                  />
                                </div>
                              </div>

                              <div className="pt-2 border-t border-gray-800 flex justify-between font-black">
                                 <span className="text-emerald-500 uppercase">Líquido Final:</span> 
                                 <span className="text-emerald-500">R$ {formatCurrency(valorLiquido)}</span>
                              </div>
                           </div>
                           <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-gray-900 border-r border-b border-emerald-500/40 rotate-45"></div>
                        </div>
                      )}
                   </div>
                   <span className="text-lg md:text-2xl font-black text-emerald-500">R$ {formatCurrency(valorLiquido)}</span>
                </div>
                
                <div className="flex flex-col border-l border-gray-800 pl-4 md:pl-12 relative overflow-visible" ref={prizeRef}>
                   <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Pote Ranking</p>
                      <button onClick={() => { setShowPrizeTooltip(!showPrizeTooltip); setShowFinancialTooltip(false); }} className={`p-1 rounded transition-colors ${showPrizeTooltip ? 'text-amber-500 bg-amber-500/10' : 'text-gray-600 hover:text-amber-500'}`}><DollarSign size={14} /></button>
                      
                      {showPrizeTooltip && (
                        <div className="absolute bottom-full left-0 mb-4 w-72 bg-gray-900 border border-amber-500/40 rounded-2xl p-5 shadow-2xl z-[150] animate-in zoom-in-95">
                           <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
                              <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Premiação ITM</h4>
                              <div className="flex items-center gap-2 bg-black/40 border border-gray-700 rounded-lg px-2 py-1">
                                 <span className="text-[8px] font-black text-gray-500 uppercase">Pagos:</span>
                                 <input 
                                   type="number" 
                                   {...inputNumericProps}
                                   className="w-10 bg-transparent text-white font-black text-xs text-center outline-none border-b border-amber-500/30 focus:border-amber-500" 
                                   value={customPaidPlaces} 
                                   onChange={(e) => setCustomPaidPlaces(e.target.value === '' ? '' : Number(e.target.value))} 
                                   placeholder={prizeSuggestions.length.toString()} 
                                 />
                              </div>
                           </div>

                           <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                              {prizeSuggestions.map((p, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[10px] bg-black/20 p-2.5 rounded-xl border border-gray-800/30">
                                   <span className="font-black text-gray-500">{idx + 1}º Lugar ({p.percent}%):</span>
                                   <span className="font-bold text-white tracking-tighter text-xs">R$ {formatCurrency(p.value)}</span>
                                </div>
                              ))}
                           </div>
                           <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-gray-900 border-r border-b border-emerald-500/40 rotate-45"></div>
                        </div>
                      )}
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="text-lg md:text-2xl font-black text-amber-500">R$</span>
                     <input 
                       type="number" 
                       {...inputNumericProps}
                       className="w-32 bg-transparent text-lg md:text-2xl font-black text-amber-500 outline-none border-b border-amber-500/20 focus:border-amber-500"
                       value={manualRankingValue !== null ? manualRankingValue : valorRanking.toFixed(2)}
                       onChange={(e) => setManualRankingValue(e.target.value === '' ? null : Number(e.target.value))}
                     />
                   </div>
                </div>
             </div>

             <button onClick={handleSave} disabled={!selectedCategoryId || selectedPlayers.length === 0 || isSaving} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><span>Finalizar Etapa</span><ChevronRight size={18} /></>}
             </button>
          </div>
        </div>
      </div>

      {showExitConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-[#111827] border border-gray-800 rounded-[2rem] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-500/20"><AlertTriangle size={32} /></div>
              <div><h4 className="text-white font-black text-xl tracking-tight">Deseja sair?</h4><p className="text-gray-500 text-sm mt-2">O rascunho será salvo para você continuar depois.</p></div>
              <div className="flex flex-col gap-3">
                 <button onClick={() => onClose()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-widest"><Save size={16} /> Salvar Rascunho</button>
                 <button onClick={() => { localStorage.removeItem(`draft_${activeRanking.id}`); onClose(); }} className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-black py-4 rounded-2xl transition-all text-xs uppercase tracking-widest border border-red-500/20">Excluir Tudo</button>
              </div>
              <button onClick={() => setShowExitConfirm(false)} className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors">Voltar</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AddResultModal;
