
import React, { useState, useEffect } from 'react';
import { useRanking } from '../context/RankingContext';
import { db, collection, onSnapshot } from '../services/firebase';
import { Trophy, Calendar, LogIn, ChevronRight, Search, Home, Instagram, Phone, User, X, MessageCircle } from 'lucide-react';

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
      setActiveTabId(house.rankings[0].id);
    }
  }, [house.rankings]);

  const isViewingSpecificHouse = !!house.id && house.id !== 'house_123';

  if (loadingData && isViewingSpecificHouse) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-emerald-500 font-bold animate-pulse text-xs tracking-widest uppercase">SINCRONIZANDO RANKINGS...</p>
      </div>
    );
  }

  if (!house.id || house.id === 'house_123') {
    const filteredHouses = allHouses.filter(h => h.name?.toLowerCase().includes(houseSearch.toLowerCase()));
    
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <header className="p-8 flex justify-between items-center border-b border-gray-800">
          <div className="flex items-center gap-3">
             <Trophy className="text-emerald-500" />
             <span className="text-xl font-black text-white tracking-tighter">Rank Manager</span>
          </div>
          <button onClick={onLoginClick} className="text-xs font-black text-gray-500 uppercase tracking-widest hover:text-white transition-all flex items-center gap-2">
            <LogIn size={16} /> Painel Administrativo
          </button>
        </header>

        <main className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-12 flex flex-col justify-center">
           <div className="text-center space-y-4">
             <h2 className="text-5xl font-black text-white tracking-tight">Visualize seu Ranking</h2>
             <p className="text-gray-500 font-medium">Selecione o clube de poker abaixo para ver a classificação em tempo real.</p>
           </div>

           <div className="relative max-w-lg mx-auto w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={20} />
              <input 
                className="w-full bg-gray-900 border border-gray-800 rounded-[2rem] pl-14 pr-6 py-5 text-white font-bold outline-none focus:border-emerald-500 transition-all shadow-2xl"
                placeholder="Buscar clube por nome..."
                value={houseSearch}
                onChange={(e) => setHouseSearch(e.target.value)}
              />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHouses.map(h => (
                <div 
                  key={h.id}
                  onClick={() => setViewingHouseId(h.slug || h.id)}
                  className="bg-gray-900 border border-gray-800 hover:border-emerald-500/50 p-8 rounded-[2.5rem] flex items-center justify-between group transition-all cursor-pointer relative"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 transition-all overflow-hidden border border-gray-700 group-hover:border-emerald-500">
                       {h.profile?.logoUrl ? (
                         <img src={h.profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                       ) : (
                         <Home className="text-gray-400 group-hover:text-black" size={24} />
                       )}
                    </div>
                    <div>
                      <h4 className="text-white font-black text-xl leading-none">{h.name}</h4>
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mt-2">Acessar Rankings</p>
                    </div>
                  </div>
                  <ChevronRight className="text-gray-700 group-hover:text-emerald-500 transition-all" />
                </div>
              ))}
           </div>
        </main>
      </div>
    );
  }

  const activeRanking = house.rankings.find(r => r.id === activeTabId);

  const getNameColor = (rank: number) => {
    if (rank >= 1 && rank <= 8) return 'text-emerald-400';
    if (rank === 9 || rank === 10) return 'text-blue-400';
    return 'text-white';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="min-h-[80px] h-auto border-b border-emerald-900/20 px-4 md:px-8 py-3 flex items-center justify-between bg-gray-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button 
            onClick={() => setViewingHouseId(null)} 
            className="p-1.5 md:p-2 text-gray-500 hover:text-emerald-500 transition-all"
          >
            <Home size={18} />
          </button>
          {house.profile?.logoUrl ? (
            <img src={house.profile.logoUrl} alt="Logo" className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl object-cover shadow-lg border border-emerald-500/20" />
          ) : (
            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/30 border border-emerald-500/20">
              <Trophy className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
          )}
          <div className="max-w-[100px] sm:max-w-[200px] md:max-w-none">
            <h1 className="font-bold text-sm md:text-xl text-white tracking-tight leading-none truncate">{house.name}</h1>
            <p className="text-emerald-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1">Live Rankings</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 ml-2">
          <button 
            onClick={() => setIsContactModalOpen(true)}
            title="Venha jogar conosco!"
            className="bg-amber-500 hover:bg-amber-400 text-black px-3 md:px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-900/20 shrink-0"
          >
            <MessageCircle size={16} />
            <span className="hidden sm:inline">Venha jogar conosco!</span>
          </button>
          <button 
            onClick={onLoginClick}
            title="Painel Administrativo"
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 border border-gray-700 transition-all active:scale-95 shrink-0"
          >
            <LogIn size={16} />
            <span className="hidden xs:inline">Painel</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-wrap gap-2 p-1.5 bg-gray-900/80 border border-gray-800 rounded-[2rem] shadow-xl overflow-x-auto no-scrollbar">
          {house.rankings.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveTabId(r.id)}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
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
                className={`pb-4 px-4 md:px-6 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${subView === 'ranking' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                Ranking Geral
              </button>
              <button 
                onClick={() => setSubView('history')}
                className={`pb-4 px-4 md:px-6 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${subView === 'history' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                Histórico
              </button>
            </div>

            {subView === 'ranking' ? (
              <div className="bg-gray-900 border border-gray-800 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left min-w-[1000px]">
                    <thead>
                      <tr className="bg-gray-800 text-gray-400 text-[10px] uppercase tracking-[0.2em] border-b border-gray-700">
                        <th className="px-6 py-6 font-bold">Posição</th>
                        <th className="px-6 py-6 font-bold">Nome</th>
                        <th className="px-6 py-6 font-bold text-emerald-500">Pontos Totais</th>
                        <th className="px-6 py-6 font-bold">Pontos Anterior</th>
                        <th className="px-6 py-6 font-bold">Presenças</th>
                        <th className="px-6 py-6 font-bold">Vitórias</th>
                        <th className="px-6 py-6 font-bold">Pontos no Dia</th>
                        <th className="px-6 py-6 font-bold text-amber-500">Valor Acumulado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {[...activeRanking.players].sort((a,b) => b.totalPoints - a.totalPoints).map((p, i) => {
                        const rank = i + 1;
                        const nameColor = getNameColor(rank);
                        
                        return (
                          <tr key={p.id} className="hover:bg-emerald-600/[0.02] transition-colors">
                            <td className="px-6 py-5">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${
                                rank === 1 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 
                                rank === 2 ? 'bg-gray-300 text-black' :
                                rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-400 font-bold'
                              }`}>
                                {rank}
                              </span>
                            </td>
                            <td className={`px-6 py-5 font-bold tracking-tight ${nameColor}`}>{p.name}</td>
                            <td className="px-6 py-5 text-emerald-400 font-black">{p.totalPoints}</td>
                            <td className="px-6 py-5 text-gray-500 font-bold text-xs">{p.prevPoints}</td>
                            <td className="px-6 py-5 text-gray-400 font-bold text-xs">{p.attendances}</td>
                            <td className="px-6 py-5 text-gray-400 font-bold text-xs">{p.wins}</td>
                            <td className="px-6 py-5">
                              <span className="text-emerald-500 font-black">+{p.dayPoints}</span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-amber-500 font-bold">R$ {p.accumulatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                              <span className="text-amber-500 font-black text-lg">
                                {activeRanking.players.reduce((acc, p) => acc + (p.accumulatedValue || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeRanking.history.map(entry => (
                  <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex flex-col gap-6 hover:border-emerald-900/40 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-emerald-600/10 text-emerald-500 p-3 rounded-2xl border border-emerald-900/20">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <h4 className="text-white font-black">{new Date(entry.date).toLocaleDateString('pt-BR')}</h4>
                        </div>
                      </div>
                      {entry.multiplier > 1 && (
                        <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[8px] font-black uppercase border border-amber-500/20">PONTOS 2X</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {entry.results.sort((a,b) => a.position - b.position).slice(0, 8).map(res => (
                        <div key={res.playerId} className="bg-black/30 border border-gray-800/40 px-4 py-3 rounded-2xl flex items-center justify-between">
                          <span className="text-gray-300 text-sm font-bold">{activeRanking.players.find(p => p.id === res.playerId)?.name || '...'}</span>
                          <span className="text-emerald-500 text-xs font-black">+{res.pointsEarned} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-20 text-center text-gray-600 italic">Carregando dados do ranking...</div>
        )}
      </main>

      {/* Modal de Contatos */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#111827] w-full max-w-md rounded-[2.5rem] border border-emerald-900/30 shadow-2xl relative overflow-hidden flex flex-col">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>
             
             <div className="p-8 pb-4 flex justify-between items-center">
                <div>
                   <h3 className="text-2xl font-black text-white tracking-tight">Vem pro Jogo!</h3>
                   <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Contatos e Redes Sociais</p>
                </div>
                <button onClick={() => setIsContactModalOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                   <X size={24} />
                </button>
             </div>

             <div className="p-8 pt-4 space-y-6 overflow-y-auto max-h-[70vh]">
                {house.profile?.contacts && house.profile.contacts.length > 0 ? (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest ml-1">Fale com nossos organizadores</label>
                    {house.profile.contacts.map((contact, idx) => (
                      <div key={idx} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-500/50 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                            <User size={18} />
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm leading-none mb-1">{contact.name}</p>
                            <p className="text-gray-500 text-xs font-medium">{contact.phone}</p>
                          </div>
                        </div>
                        <a 
                          href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-500 p-2.5 rounded-xl text-white transition-all transform hover:scale-110 active:scale-95"
                        >
                          <Phone size={18} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs italic text-center py-4">Nenhum contato cadastrado.</p>
                )}

                {house.profile?.instagramUrl && (
                  <div className="space-y-3 pt-4 border-t border-gray-800">
                    <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest ml-1">Siga no Instagram</label>
                    <a 
                      href={house.profile.instagramUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-2xl p-4 flex items-center justify-between group transition-all transform hover:scale-[1.02] shadow-xl shadow-pink-900/10"
                    >
                      <div className="flex items-center gap-3">
                        <Instagram className="text-white" size={24} />
                        <span className="text-white font-black text-sm uppercase tracking-widest">Acessar Perfil</span>
                      </div>
                      <ChevronRight className="text-white/50 group-hover:text-white transition-all" size={20} />
                    </a>
                  </div>
                )}
             </div>

             <div className="p-8 bg-gray-900/50 border-t border-gray-800 text-center">
                <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">© {house.name} • {new Date().getFullYear()}</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicView;
