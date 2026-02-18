
import React, { useState, useEffect } from 'react';
import { useRanking } from '../context/RankingContext';
import { db, collection, onSnapshot } from '../services/firebase';
import { Trophy, Calendar, LogIn, ChevronRight, Search, Home, Instagram, Phone, X, MessageCircle } from 'lucide-react';

const PublicView: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => {
  const { house, loadingData, setViewingHouseId } = useRanking();
  const [allHouses, setAllHouses] = useState<any[]>([]);
  const [activeTabId, setActiveTabId] = useState('');
  const [subView, setSubView] = useState<'ranking' | 'history'>('ranking');
  const [houseSearch, setHouseSearch] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'casas'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllHouses(data);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (house.rankings.length > 0) {
      const currentActive = house.rankings.find(r => r.id === activeTabId);
      if (!currentActive) {
        setActiveTabId(house.rankings[0].id);
      }
    }
  }, [house.rankings, activeTabId]);

  const isViewingSpecificHouse = !!house.id && house.id !== 'house_123';

  if (loadingData && isViewingSpecificHouse) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] space-y-4 p-6">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-emerald-500 font-bold animate-pulse text-[10px] tracking-widest uppercase text-center">ATUALIZANDO DADOS...</p>
      </div>
    );
  }

  if (!house.id || house.id === 'house_123') {
    const filteredHouses = allHouses.filter(h => h.name?.toLowerCase().includes(houseSearch.toLowerCase()));
    
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <header className="p-6 md:p-8 flex justify-between items-center border-b border-gray-800">
          <div className="flex items-center gap-3">
             <Trophy className="text-emerald-500" />
             <span className="text-lg md:text-xl font-black text-white tracking-tighter">Rank Manager</span>
          </div>
          <button onClick={onLoginClick} className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-all flex items-center gap-2">
            <LogIn size={16} /> <span className="hidden sm:inline">Administração</span>
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8 md:space-y-12 flex flex-col justify-center py-12 md:py-24">
           <div className="text-center space-y-4">
             <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Visualize seu Ranking</h2>
             <p className="text-gray-500 text-sm md:text-base font-medium">Acompanhe a classificação em tempo real do seu clube.</p>
           </div>

           <div className="relative max-w-lg mx-auto w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
              <input 
                className="w-full bg-gray-900 border border-gray-800 rounded-full pl-14 pr-6 py-4 md:py-5 text-white font-bold outline-none focus:border-emerald-500 transition-all shadow-2xl"
                placeholder="Buscar clube..."
                value={houseSearch}
                onChange={(e) => setHouseSearch(e.target.value)}
              />
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredHouses.map(h => (
                <div 
                  key={h.id}
                  onClick={() => setViewingHouseId(h.slug || h.id)}
                  className="bg-gray-900 border border-gray-800 hover:border-emerald-500/50 p-6 md:p-8 rounded-[2rem] flex items-center justify-between group transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 transition-all overflow-hidden border border-gray-700">
                       {h.profile?.logoUrl ? (
                         <img src={h.profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                       ) : (
                         <Home className="text-gray-400 group-hover:text-black" size={22} />
                       )}
                    </div>
                    <div>
                      <h4 className="text-white font-black text-base md:text-lg leading-none">{h.name}</h4>
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-2">Acessar Clube</p>
                    </div>
                  </div>
                  <ChevronRight className="text-gray-700 group-hover:text-emerald-500 transition-all shrink-0" />
                </div>
              ))}
           </div>
        </main>
      </div>
    );
  }

  const activeRanking = house.rankings.find(r => r.id === activeTabId);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="border-b border-emerald-900/20 px-4 md:px-8 py-4 flex items-center justify-between bg-gray-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setViewingHouseId(null)} 
            className="p-2 text-gray-500 hover:text-emerald-500 transition-all"
          >
            <Home size={20} />
          </button>
          <div className="flex items-center gap-3">
            {house.profile?.logoUrl && (
              <img src={house.profile.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover hidden xs:block" />
            )}
            <div className="truncate max-w-[120px] xs:max-w-[200px] md:max-w-none">
              <h1 className="font-bold text-sm md:text-lg text-white tracking-tight leading-none truncate">{house.name}</h1>
              <p className="text-emerald-500 text-[8px] font-black uppercase tracking-[0.2em] mt-1">Live Rankings</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsContactModalOpen(true)}
            className="bg-amber-500 text-black p-2.5 rounded-xl transition-all active:scale-95 shadow-lg"
          >
            <MessageCircle size={18} />
          </button>
          <button 
            onClick={onLoginClick}
            className="bg-gray-800 text-gray-400 p-2.5 rounded-xl border border-gray-700 transition-all active:scale-95"
          >
            <LogIn size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Rankings Horizontal Scroll */}
        <div className="flex gap-2 p-1.5 bg-gray-900/80 border border-gray-800 rounded-2xl overflow-x-auto no-scrollbar">
          {house.rankings.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveTabId(r.id)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTabId === r.id 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' 
                : 'text-gray-500 hover:text-white hover:bg-gray-800'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        {activeRanking ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-800">
              <button 
                onClick={() => setSubView('ranking')}
                className={`pb-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${subView === 'ranking' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                Ranking
              </button>
              <button 
                onClick={() => setSubView('history')}
                className={`pb-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${subView === 'history' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                Histórico
              </button>
            </div>

            {subView === 'ranking' ? (
              <div className="bg-gray-900 border border-gray-800 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-800 text-gray-500 text-[10px] uppercase tracking-[0.2em] border-b border-gray-700">
                        <th className="px-6 py-6 font-black">Pos..</th>
                        <th className="px-6 py-6 font-black">Nome do Jogador</th>
                        <th className="px-6 py-6 font-black text-center text-emerald-500">Pts Totais</th>
                        <th className="px-6 py-6 font-black text-center">Pres.</th>
                        <th className="px-6 py-6 font-black text-center">Vit.</th>
                        <th className="px-6 py-6 font-black text-center">Dia</th>
                        <th className="px-6 py-6 font-black text-right text-amber-500">Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {[...activeRanking.players].sort((a,b) => b.totalPoints - a.totalPoints).map((p, i) => {
                        const rank = i + 1;
                        return (
                          <tr key={p.id} className="hover:bg-emerald-600/[0.02] transition-colors">
                            <td className="px-6 py-5">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-[10px] ${
                                rank === 1 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 
                                rank === 2 ? 'bg-gray-300 text-black' :
                                rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-400 font-bold'
                              }`}>
                                {rank}
                              </span>
                            </td>
                            <td className="px-6 py-5 font-bold tracking-tight text-white text-sm">{p.name}</td>
                            <td className="px-6 py-5 text-emerald-400 font-black text-center">{p.totalPoints}</td>
                            <td className="px-6 py-5 text-gray-500 font-bold text-xs text-center">{p.attendances}</td>
                            <td className="px-6 py-5 text-gray-500 font-bold text-xs text-center">{p.wins}</td>
                            <td className="px-6 py-5 text-center">
                              <span className="text-emerald-500 font-black text-xs">+{p.dayPoints}</span>
                            </td>
                            <td className="px-6 py-5 text-right font-black text-amber-500 text-sm">
                              R$ {p.accumulatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {activeRanking.history.map(entry => (
                  <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-emerald-500" />
                        <h4 className="text-white font-black text-sm">{new Date(entry.date).toLocaleDateString('pt-BR')}</h4>
                      </div>
                      {entry.multiplier > 1 && (
                        <span className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-500/20">2X</span>
                      )}
                    </div>
                    {/* Exibição de todos os participantes da etapa no Histórico Público */}
                    <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                      {entry.results.sort((a,b) => a.position - b.position).map(res => (
                        <div key={res.playerId} className="bg-black/30 border border-gray-800/40 px-4 py-2.5 rounded-xl flex items-center justify-between group hover:bg-emerald-600/[0.05] transition-colors">
                          <div className="flex items-center gap-3">
                            <span className={`w-5 h-5 flex items-center justify-center rounded text-[9px] font-black ${
                                res.position === 1 ? 'bg-amber-500 text-black' : 
                                res.position === 2 ? 'bg-gray-300 text-black' :
                                res.position === 3 ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-500'
                            }`}>
                              {res.position}º
                            </span>
                            <span className="text-gray-300 text-[11px] font-bold">{activeRanking.players.find(p => p.id === res.playerId)?.name || 'Removido'}</span>
                          </div>
                          <span className="text-emerald-500 text-[10px] font-black">+{res.pointsEarned} <span className="text-gray-600 text-[8px] uppercase">pts</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center text-gray-600 italic">Nenhum dado para exibir...</div>
        )}
      </main>

      {/* Modal Contatos */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#111827] w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] border-t sm:border border-emerald-900/30 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
             <div className="p-8 pb-4 flex justify-between items-center">
                <div>
                   <h3 className="text-2xl font-black text-white tracking-tight">Vem pro Jogo!</h3>
                   <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Contatos Oficiais</p>
                </div>
                <button onClick={() => setIsContactModalOpen(false)} className="p-2.5 text-gray-500 hover:text-white transition-colors">
                   <X size={24} />
                </button>
             </div>
             <div className="p-8 pt-4 space-y-4 overflow-y-auto">
                {house.profile?.contacts?.map((contact, idx) => (
                  <a 
                    key={idx}
                    href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between group hover:border-emerald-500 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                        <Phone size={20} />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm mb-0.5">{contact.name}</p>
                        <p className="text-gray-500 text-[10px] font-bold">{contact.phone}</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-700 group-hover:text-emerald-500" />
                  </a>
                ))}
                {house.profile?.instagramUrl && (
                  <a 
                    href={house.profile.instagramUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-5 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <Instagram className="text-white" size={24} />
                      <span className="text-white font-black text-xs uppercase tracking-widest">Siga no Instagram</span>
                    </div>
                    <ChevronRight className="text-white/50 group-hover:text-white" size={20} />
                  </a>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicView;
