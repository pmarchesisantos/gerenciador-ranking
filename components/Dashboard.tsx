
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
    <div className="h-full flex items-center justify-center p-8 text-gray-500">
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">{activeRanking.name}</h2>
          <p className="text-gray-400 text-sm">Gerenciamento de pontuação e jogadores em tempo real.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg shadow-emerald-900/20 active:scale-95 whitespace-nowrap"
        >
          Adicionar Resultado da Semana
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <form onSubmit={handleAddPlayer} className="lg:col-span-3 bg-gray-900 border border-gray-800 p-2 rounded-2xl flex gap-2">
          <div className="flex-1 flex items-center gap-3 bg-black/30 rounded-xl px-4 border border-gray-700 focus-within:border-emerald-500 transition-all">
            <UserPlus size={18} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="Nome do novo jogador..."
              className="bg-transparent border-none outline-none w-full py-2.5 text-gray-200 text-sm"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
            />
          </div>
          <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-emerald-500 transition-all text-sm shadow-md">
            Cadastrar
          </button>
        </form>

        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 p-2 rounded-2xl">
          <div className="flex items-center gap-3 bg-black/30 rounded-xl px-4 border border-gray-700 focus-within:border-emerald-500 transition-all h-full">
            <Search size={18} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="Filtrar jogadores..."
              className="bg-transparent border-none outline-none w-full py-2.5 text-gray-200 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left min-w-[1100px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-800 text-gray-400 text-[10px] uppercase tracking-[0.2em] border-b border-gray-700">
                <th className="px-6 py-5 font-bold">Posição</th>
                <th className="px-6 py-5 font-bold">Nome</th>
                <th className="px-6 py-5 font-bold">Pontos Totais</th>
                <th className="px-6 py-5 font-bold">Pontos Anterior</th>
                <th className="px-6 py-5 font-bold">Presenças</th>
                <th className="px-6 py-5 font-bold">Vitórias</th>
                <th className="px-6 py-5 font-bold">Pontos no Dia</th>
                <th className="px-6 py-5 font-bold">Valor Acumulado</th>
                <th className="px-6 py-5 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-gray-900/50">
              {filteredPlayers.map((player) => {
                const rank = getRank(player.id);
                const nameColor = getNameColor(rank);
                
                return (
                  <tr key={player.id} className="hover:bg-emerald-600/[0.03] transition-colors group">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${
                        rank === 1 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 
                        rank === 2 ? 'bg-gray-300 text-black' :
                        rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-400 font-bold'
                      }`}>
                        {rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        className={`bg-transparent border-none focus:ring-1 focus:ring-emerald-500/50 rounded px-1 -ml-1 w-full font-bold ${nameColor}`}
                        value={player.name}
                        onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        className="bg-transparent border-none text-emerald-400 focus:ring-1 focus:ring-emerald-500/50 rounded px-1 -ml-1 w-20 font-black"
                        value={player.totalPoints}
                        onChange={(e) => updatePlayer(player.id, { totalPoints: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-sm">{player.prevPoints}</td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        className="bg-transparent border-none text-gray-300 focus:ring-1 focus:ring-emerald-500/50 rounded px-1 -ml-1 w-16"
                        value={player.attendances}
                        onChange={(e) => updatePlayer(player.id, { attendances: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number"
                        className="bg-transparent border-none text-gray-300 focus:ring-1 focus:ring-emerald-500/50 rounded px-1 -ml-1 w-16"
                        value={player.wins}
                        onChange={(e) => updatePlayer(player.id, { wins: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-amber-600/10 text-amber-500 px-2 py-1 rounded text-xs font-black">
                        +{player.dayPoints}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-xs font-bold">R$</span>
                        <input 
                          type="number"
                          className="bg-transparent border-none text-amber-500 focus:ring-1 focus:ring-emerald-500/50 rounded px-1 -ml-1 w-24 font-bold"
                          value={player.accumulatedValue}
                          onChange={(e) => updatePlayer(player.id, { accumulatedValue: Number(e.target.value) })}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => removePlayer(player.id)}
                        className="text-gray-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-800/50 border-t border-gray-700">
              <tr>
                <td colSpan={7} className="px-6 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Soma Total Acumulada:</td>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-1">
                      <span className="text-amber-500/50 text-xs font-bold">R$</span>
                      <span className="text-amber-500 font-black text-lg">{totalAccumulated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex justify-start">
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-widest px-6 py-3 border border-gray-800 rounded-xl hover:bg-gray-800 transition-all"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {isAddModalOpen && <AddResultModal onClose={() => setIsAddModalOpen(false)} />}
    </div>
  );
};

export default Dashboard;
