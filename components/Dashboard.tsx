
import React, { useState, useEffect } from 'react';
import { useRanking } from '../context/RankingContext';
import { Trash2, UserPlus, Download, Search, PlayCircle, ChevronDown, ChevronUp } from 'lucide-react';
import AddResultModal from './AddResultModal';

const Dashboard: React.FC = () => {
  const { activeRanking, addPlayer, removePlayer, updatePlayer } = useRanking();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [extraData, setExtraData] = useState({ phone: '', birthDate: '', favoriteTeam: '' });
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (activeRanking) {
      const draft = localStorage.getItem(`draft_${activeRanking.id}`);
      setHasDraft(!!draft);
    }
  }, [activeRanking, isAddModalOpen]);

  if (!activeRanking) return (
    <div className="h-full flex items-center justify-center p-8 text-gray-500 text-center">
      Selecione um ranking no menu lateral para começar.
    </div>
  );

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

  const sortedPlayers = [...activeRanking.players].sort((a, b) => b.totalPoints - a.totalPoints);
  
  const filteredPlayers = sortedPlayers.filter(p => {
    const normalizedName = normalizeStr(p.name);
    const normalizedSearch = normalizeStr(searchTerm.trim());
    return normalizedName.includes(normalizedSearch);
  });

  const totalAccumulated = sortedPlayers.reduce((acc, p) => acc + (p.accumulatedValue || 0), 0);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    await addPlayer(newPlayerName, showExtraFields ? extraData : {});
    setNewPlayerName('');
    setExtraData({ phone: '', birthDate: '', favoriteTeam: '' });
    setShowExtraFields(false);
  };

  const getRank = (playerId: string) => sortedPlayers.findIndex(p => p.id === playerId) + 1;

  const getNameColor = (rank: number) => {
    if (rank >= 1 && rank <= 8) return 'text-emerald-400';
    if (rank === 9 || rank === 10) return 'text-blue-400';
    return 'text-white';
  };

  const inputNumericProps = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
    inputMode: "numeric" as const,
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight truncate">{activeRanking.name}</h2>
          <p className="text-gray-500 text-xs md:text-sm">Gerenciamento de pontuação e jogadores em tempo real.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative group flex-1 sm:flex-none sm:min-w-[240px]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Filtrar jogadores..."
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-200 outline-none focus:border-emerald-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className={`px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-lg shrink-0 ${
              hasDraft 
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20 animate-pulse' 
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
            }`}
          >
            {hasDraft ? <><PlayCircle size={16} /> Continuar Lançamento</> : <>Adicionar Resultado</>}
          </button>
        </div>
      </div>

      <div className="bg-gray-900/30 border border-gray-800/50 p-3 rounded-2xl">
        <form onSubmit={handleAddPlayer} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-3 bg-black/20 rounded-xl px-4 border border-gray-800 focus-within:border-emerald-500/50 transition-all">
              <UserPlus size={16} className="text-gray-500 shrink-0" />
              <input 
                type="text" 
                placeholder="Cadastrar novo jogador..."
                className="bg-transparent border-none outline-none w-full py-2.5 text-gray-200 text-xs font-medium"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowExtraFields(!showExtraFields)}
                className={`p-1.5 rounded-lg transition-all ${showExtraFields ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {showExtraFields ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            <button type="submit" className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-md shrink-0">
              Cadastrar
            </button>
          </div>

          {showExtraFields && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 animate-in slide-in-from-top-2 duration-200">
               <input 
                 className="bg-black/20 border border-gray-800 rounded-xl px-4 py-2 text-[10px] text-white outline-none focus:border-emerald-500/50" 
                 placeholder="Celular (DDD + Número)" 
                 value={extraData.phone} 
                 onChange={e => setExtraData({...extraData, phone: formatPhone(e.target.value)})}
               />
               <input 
                 type="date"
                 className="bg-black/20 border border-gray-800 rounded-xl px-4 py-2 text-[10px] text-white outline-none focus:border-emerald-500/50" 
                 value={extraData.birthDate} 
                 onChange={e => setExtraData({...extraData, birthDate: e.target.value})}
               />
               <input 
                 className="bg-black/20 border border-gray-800 rounded-xl px-4 py-2 text-[10px] text-white outline-none focus:border-emerald-500/50" 
                 placeholder="Time do Coração" 
                 value={extraData.favoriteTeam} 
                 onChange={e => setExtraData({...extraData, favoriteTeam: e.target.value})}
               />
            </div>
          )}
        </form>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-[1.5rem] md:rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] md:max-h-[600px] custom-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 text-gray-500 text-[9px] md:text-[10px] uppercase tracking-[0.2em] border-b border-gray-700">
                <th className="px-6 py-5 font-black">Pos..</th>
                <th className="px-6 py-5 font-black">Nome do Jogador</th>
                <th className="px-6 py-5 font-black text-center">Pontos Totais</th>
                <th className="px-6 py-5 font-black text-center">Ant.</th>
                <th className="px-6 py-5 font-black text-center">Pres.</th>
                <th className="px-6 py-5 font-black text-center">Vit.</th>
                <th className="px-6 py-5 font-black text-center">Dia</th>
                <th className="px-6 py-5 font-black text-right">Valor Acumulado</th>
                <th className="px-6 py-5 font-black text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-gray-900/50">
              {filteredPlayers.map((player) => {
                const rank = getRank(player.id);
                const nameColor = getNameColor(rank);
                
                return (
                  <tr key={player.id} className="hover:bg-emerald-600/[0.03] transition-colors group">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-[10px] ${
                        rank === 1 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 
                        rank === 2 ? 'bg-gray-300 text-black' :
                        rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-500'
                      }`}>
                        {rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        className={`bg-transparent border-none focus:ring-1 focus:ring-emerald-500/50 rounded px-1 -ml-1 w-full font-bold text-sm ${nameColor}`}
                        value={player.name}
                        onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="number"
                        {...inputNumericProps}
                        className="bg-transparent border-none text-emerald-400 focus:ring-1 focus:ring-emerald-500/50 rounded px-1 w-full max-w-[80px] text-center font-black"
                        value={player.totalPoints}
                        onChange={(e) => updatePlayer(player.id, { totalPoints: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 font-mono text-xs">{player.prevPoints}</td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="number"
                        {...inputNumericProps}
                        className="bg-transparent border-none text-gray-400 focus:ring-1 focus:ring-emerald-500/50 rounded px-1 w-full max-w-[50px] text-center font-medium"
                        value={player.attendances}
                        onChange={(e) => updatePlayer(player.id, { attendances: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="number"
                        {...inputNumericProps}
                        className="bg-transparent border-none text-gray-400 focus:ring-1 focus:ring-emerald-500/50 rounded px-1 w-full max-w-[50px] text-center font-medium"
                        value={player.wins}
                        onChange={(e) => updatePlayer(player.id, { wins: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-emerald-600/10 text-emerald-500 px-2 py-1 rounded-md text-[9px] font-black uppercase">
                        +{player.dayPoints}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-gray-600 text-[10px] font-black">R$</span>
                        <input 
                          type="number"
                          {...inputNumericProps}
                          className="bg-transparent border-none text-amber-500 focus:ring-1 focus:ring-emerald-500/50 rounded px-1 w-24 text-right font-black text-sm"
                          value={player.accumulatedValue}
                          onChange={(e) => updatePlayer(player.id, { accumulatedValue: Number(e.target.value) })}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => removePlayer(player.id)}
                        className="text-gray-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-800/50 border-t border-gray-700">
              <tr>
                <td colSpan={7} className="px-6 py-5 text-right text-[9px] font-black text-gray-500 uppercase tracking-widest">Total Acumulado do Ranking:</td>
                <td className="px-6 py-5 text-right">
                   <div className="flex items-center justify-end gap-2">
                      <span className="text-amber-500/50 text-[10px] font-black">R$</span>
                      <span className="text-amber-500 font-black text-lg tracking-tighter">{totalAccumulated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {isAddModalOpen && <AddResultModal onClose={() => setIsAddModalOpen(false)} />}
    </div>
  );
};

export default Dashboard;
