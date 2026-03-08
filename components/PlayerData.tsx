
import React, { useState } from 'react';
import { useRanking } from '../context/RankingContext';
import { Search, Edit2, Check, X, Phone, Calendar, Heart, Trash2, User, MessageCircle } from 'lucide-react';

const PlayerData: React.FC = () => {
  const { activeRanking, updatePlayer, removePlayer } = useRanking();
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPlayer, setTempPlayer] = useState<any>(null);

  if (!activeRanking) return null;

  const MONTHS = [
    { value: '', label: 'Mês de Nascimento' },
    { value: '0', label: 'Janeiro' },
    { value: '1', label: 'Fevereiro' },
    { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Maio' },
    { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' },
    { value: '10', label: 'Novembro' },
    { value: '11', label: 'Dezembro' },
  ];

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

  const filteredPlayers = activeRanking.players.filter(p => {
    const nameMatch = normalizeStr(p.name).includes(normalizeStr(searchTerm.trim()));
    
    const monthMatch = !monthFilter || (p.birthDate && new Date(p.birthDate + 'T00:00:00').getMonth().toString() === monthFilter);
    
    const teamMatch = normalizeStr(p.favoriteTeam || "").includes(normalizeStr(teamFilter.trim()));

    return nameMatch && monthMatch && teamMatch;
  }).sort((a, b) => (a.name || "").localeCompare(b.name || "", 'pt-BR'));

  const handleStartEdit = (player: any) => {
    setEditingId(player.id);
    setTempPlayer({ ...player });
  };

  const handleSave = async () => {
    if (editingId && tempPlayer) {
      await updatePlayer(editingId, {
        name: tempPlayer.name,
        phone: tempPlayer.phone,
        birthDate: tempPlayer.birthDate,
        favoriteTeam: tempPlayer.favoriteTeam
      });
      setEditingId(null);
      setTempPlayer(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">Dados Jogadores</h2>
          <p className="text-gray-500 text-xs md:text-sm">Gerenciamento centralizado de perfis e CRM.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative group flex-1 lg:min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors" size={16} />
            <input 
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-xs text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
              placeholder="Nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative group flex-1 lg:min-w-[180px]">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors" size={16} />
            <select 
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-xs text-white font-bold outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              {MONTHS.map(m => <option key={m.value} value={m.value} className="bg-gray-900">{m.label}</option>)}
            </select>
          </div>

          <div className="relative group flex-1 lg:min-w-[180px]">
            <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors" size={16} />
            <input 
              className="w-full bg-gray-900/50 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-xs text-white font-bold outline-none focus:border-emerald-500/50 transition-all"
              placeholder="Time..."
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead>
            <tr className="bg-gray-800 text-gray-500 text-[10px] uppercase tracking-widest border-b border-gray-700">
              <th className="px-8 py-5 text-left">Nome</th>
              <th className="px-6 py-5 text-left">Celular</th>
              <th className="px-6 py-5 text-left">Nascimento</th>
              <th className="px-6 py-5 text-left">Time</th>
              <th className="px-6 py-5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/40">
            {filteredPlayers.map(p => (
              <tr key={p.id} className="hover:bg-emerald-600/[0.02] group transition-colors">
                {editingId === p.id ? (
                  <>
                    <td className="px-8 py-4">
                      <input className="bg-black/40 border border-emerald-500/50 rounded-xl px-4 py-2 w-full text-white font-bold text-left" value={tempPlayer.name} onChange={e => setTempPlayer({...tempPlayer, name: e.target.value})} />
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        className="bg-black/40 border border-emerald-500/50 rounded-xl px-4 py-2 w-full text-white font-bold" 
                        placeholder="(00) 00000-0000" 
                        value={tempPlayer.phone || ""} 
                        onChange={e => setTempPlayer({...tempPlayer, phone: formatPhone(e.target.value)})} 
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input type="date" className="bg-black/40 border border-emerald-500/50 rounded-xl px-4 py-2 w-full text-white font-bold" value={tempPlayer.birthDate || ""} onChange={e => setTempPlayer({...tempPlayer, birthDate: e.target.value})} />
                    </td>
                    <td className="px-6 py-4">
                      <input className="bg-black/40 border border-emerald-500/50 rounded-xl px-4 py-2 w-full text-white font-bold" placeholder="Ex: Palmeiras" value={tempPlayer.favoriteTeam || ""} onChange={e => setTempPlayer({...tempPlayer, favoriteTeam: e.target.value})} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={handleSave} className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg"><Check size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="p-2.5 bg-gray-800 text-gray-400 rounded-xl"><X size={16} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3 font-bold text-white">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-500 shrink-0"><User size={14} /></div>
                        <span className="truncate">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 font-mono text-sm">
                       {p.phone ? (
                         <div className="flex items-center gap-2">
                           <a 
                             href={`https://wa.me/${p.phone.replace(/\D/g, '')}`} 
                             target="_blank" 
                             rel="noreferrer"
                             className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                             title="Conversar no WhatsApp"
                           >
                             <MessageCircle size={14} />
                           </a>
                           <span>{p.phone}</span>
                         </div>
                       ) : (
                         <span className="text-gray-700 italic">Não inf.</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                       {p.birthDate ? (
                         <div className="flex items-center gap-2">
                           <Calendar size={12} className="text-gray-600" /> 
                           {new Date(p.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                         </div>
                       ) : (
                         <span className="text-gray-700 italic">Não inf.</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                       {p.favoriteTeam ? <div className="flex items-center gap-2"><Heart size={12} className="text-pink-500" /> {p.favoriteTeam}</div> : <span className="text-gray-700 italic">Não inf.</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleStartEdit(p)} className="p-2 text-gray-500 hover:text-emerald-500"><Edit2 size={16} /></button>
                        <button onClick={() => removePlayer(p.id)} className="p-2 text-gray-500 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerData;
