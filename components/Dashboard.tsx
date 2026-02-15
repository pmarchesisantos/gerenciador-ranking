
import React, { useState } from 'react';
import { useRanking } from '../context/RankingContext';
import { Trash2, UserPlus, Download, Search } from 'lucide-react';
import AddResultModal from './AddResultModal';

const Dashboard: React.FC = () => {
  const { activeRanking, addPlayer, removePlayer, updatePlayer } = useRanking();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!activeRanking) return (
    <div className="h-full flex items-center justify-center p-8 text-gray-500 text-center">
      Selecione um ranking no menu lateral para começar.
    </div>
  );

  const sortedPlayers = [...activeRanking.players].sort((a, b) => b.totalPoints - a.totalPoints);
  
  const filteredPlayers = sortedPlayers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAccumulated = sortedPlayers.reduce((acc, p) => acc + (p.accumulatedValue || 0), 0);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    addPlayer(newPlayerName);
    setNewPlayerName('');
  };

  const getRank = (playerId: string) => sortedPlayers.findIndex(p => p.id === playerId) + 1;

  const getNameColor = (rank: number) => {
    if (rank >= 1 && rank <= 8) return 'text-emerald-400';
    if (rank === 9 || rank === 10) return 'text-blue-400';
    return 'text-white';
  };

  const exportCSV = () => {
    const headers = ["Posição", "Nome", "Pontos Totais", "Pontos Anterior", "Presenças", "Vitórias", "Pontos no Dia", "Valor Acumulado"];
    const rows = sortedPlayers.map((p, i) => [
      i + 1,
      p.name,
      p.totalPoints,
      p.prevPoints,
      p.attendances,
      p.wins,
      p.dayPoints,
      p.accumulatedValue
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ranking_${activeRanking.name.replace(/\s+/g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">{activeRanking.name}</h2>
          <p className="text-gray-500 text-xs md:text-sm">Gerenciamento de pontuação e jogadores em tempo real.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-lg shadow-emerald-900/20"
        >
          Adicionar Resultado
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <form onSubmit={handleAddPlayer} className="lg:col-span-3 bg-gray-900 border border-gray-800 p-2 rounded-2xl flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-3 bg-black/30 rounded-xl px-4 border border-gray-700 focus-within:border-emerald-500 transition-all">
            <UserPlus size={18} className="text-gray-500 shrink-0" />
            <input 
              type="text" 
              placeholder="Nome do novo jogador..."
              className="bg-transparent border-none outline-none w-full py-3 text-gray-200 text-sm font-medium"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
            />
          </div>
          <button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-md">
            Cadastrar
          </button>
        </form>

        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 p-2 rounded-2xl">
          <div className="flex items-center gap-3 bg-black/30 rounded-xl px-4 border border-gray-700 focus-within:border-emerald-500 transition-all h-full">
            <Search size={18} className="text-gray-500 shrink-0" />
            <input 
              type="text" 
              placeholder="Filtrar jogadores..."
              className="bg-transparent border-none outline-none w-full py-3 text-gray-200 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-[1.5rem] md:rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] md:max-h-[600px] custom-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 text-gray-500 text-[9px] md:text-[10px] uppercase tracking-[0.2em] border-b border-gray-700">
                <th className="px-6 py-5 font-black">Pos.</th>
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
                        className="bg-transparent border-none text-emerald-400 focus:ring-1 focus:ring-emerald-500/50 rounded px-1 w-full max-w-[80px] text-center font-black"
                        value={player.totalPoints}
                        onChange={(e) => updatePlayer(player.id, { totalPoints: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 font-mono text-xs">{player.prevPoints}</td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="number"
                        className="bg-transparent border-none text-gray-400 focus:ring-1 focus:ring-emerald-500/50 rounded px-1 w-full max-w-[50px] text-center font-medium"
                        value={player.attendances}
                        onChange={(e) => updatePlayer(player.id, { attendances: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="number"
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
        {/* Scroll helper indicator */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 p-1 bg-emerald-500/20 text-emerald-500 rounded-l-md lg:hidden animate-pulse pointer-events-none">
           <Search size={14} className="rotate-90" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-start gap-4 pb-12">
        <button 
          onClick={exportCSV}
          className="w-full sm:w-auto flex items-center justify-center gap-3 text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 border border-gray-800 rounded-2xl hover:bg-gray-800 transition-all active:scale-95"
        >
          <Download size={16} />
          Exportar Ranking (CSV)
        </button>
      </div>

      {isAddModalOpen && <AddResultModal onClose={() => setIsAddModalOpen(false)} />}
    </div>
  );
};

export default Dashboard;
