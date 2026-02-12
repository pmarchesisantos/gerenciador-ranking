
import React, { useState, useEffect } from 'react';
import { useRanking } from '../context/RankingContext';
import { db, collection, onSnapshot } from '../services/firebase';
import { Trophy, Calendar, LogIn, ChevronRight, Search, Home } from 'lucide-react';

const PublicView: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => {
  const { house, loadingData, setActiveRankingId, setViewingHouseId } = useRanking();
  const [allHouses, setAllHouses] = useState<any[]>([]);
  const [activeTabId, setActiveTabId] = useState('');
  const [subView, setSubView] = useState<'ranking' | 'history'>('ranking');
  const [houseSearch, setHouseSearch] = useState('');

  // Busca todas as casas disponíveis no Firestore
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

  // Se o usuário está carregando uma casa específica via URL
  const isViewingSpecificHouse = !!house.id && house.id !== 'house_123';

  if (loadingData && isViewingSpecificHouse) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-emerald-500 font-bold animate-pulse text-xs tracking-widest uppercase">SINCRONIZANDO RANKINGS...</p>
      </div>
    );
  }

  // Se a URL é a raiz e não há casa selecionada
  if (!house.id || house.id === 'house_123') {
    const filteredHouses = allHouses.filter(h => h.name?.toLowerCase().includes(houseSearch.toLowerCase()));
    
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <header className="p-8 flex justify-between items-center border-b border-gray-800">
          <div className="flex items-center gap-3">
             <Trophy className="text-emerald-500" />
             <span className="text-xl font-black text-white tracking-tighter">PokerRank Master</span>
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
                  onClick={() => setViewingHouseId(h.id)}
                  className="bg-gray-900 border border-gray-800 hover:border-emerald-500/50 p-8 rounded-[2.5rem] flex items-center justify-between group transition-all cursor-pointer relative"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 transition-all">
                       <Home className="text-gray-400 group-hover:text-black" size={24} />
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="h-20 border-b border-emerald-900/20 px-4 md:px-8 flex items-center justify-between bg-gray-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewingHouseId(null)} 
            className="p-2 text-gray-500 hover:text-emerald-500 transition-all"
          >
            <Home size={20} />
          </button>
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/30 border border-emerald-500/20">
            <Trophy className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-white tracking-tight leading-none truncate max-w-[150px] md:max-w-none">{house.name}</h1>
            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5">Live Rankings</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onLoginClick}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 border border-gray-700 transition-all active:scale-95"
          >
            <LogIn size={16} />
            Painel
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-wrap gap-2 p-1.5 bg-gray-900/80 border border-gray-800 rounded-[2rem] shadow-xl">
          {house.rankings.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveTabId(r.id)}
              className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
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
                Ranking Geral
              </button>
              <button 
                onClick={() => setSubView('history')}
                className={`pb-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all ${subView === 'history' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                Histórico
              </button>
            </div>

            {subView === 'ranking' ? (
              <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-800/80 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-gray-700">
                        <th className="px-6 py-6">Posição</th>
                        <th className="px-6 py-6">Nome</th>
                        <th className="px-6 py-6 text-emerald-500">Pontos</th>
                        <th className="px-6 py-6">Anterior</th>
                        <th className="px-6 py-6">Vitórias</th>
                        <th className="px-6 py-6">Dia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {[...activeRanking.players].sort((a,b) => b.totalPoints - a.totalPoints).map((p, i) => (
                        <tr key={p.id} className="hover:bg-emerald-600/[0.02] transition-colors">
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${
                              i === 0 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 
                              i === 1 ? 'bg-gray-300 text-black' :
                              i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-400'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-white font-bold tracking-tight">{p.name}</td>
                          <td className="px-6 py-5 text-emerald-400 font-black">{p.totalPoints}</td>
                          <td className="px-6 py-5 text-gray-600 font-bold text-xs">{p.prevPoints}</td>
                          <td className="px-6 py-5 text-gray-400 font-bold text-xs">{p.wins}</td>
                          <td className="px-6 py-5">
                            <span className="text-amber-500 font-black">+{p.dayPoints}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
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
                        <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[8px] font-black uppercase border border-amber-500/20">DOBRADA</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {entry.results.sort((a,b) => a.position - b.position).slice(0, 5).map(res => (
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
    </div>
  );
};

export default PublicView;
