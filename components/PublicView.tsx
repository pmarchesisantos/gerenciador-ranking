
import React, { useState, useEffect, useMemo } from 'react';
import { useRanking } from '../context/RankingContext';
import { db, collection, onSnapshot, handleFirestoreError, OperationType } from '../services/firebase';
import { Trophy, Calendar, LogIn, ChevronRight, Search, Home, Instagram, Phone, X, MessageCircle, ListOrdered } from 'lucide-react';
import StageValuesModal from './StageValuesModal';
import ScrollArea from './ScrollArea';
import { getStagesTotal, formatBRL } from '../services/stageValues';
import { getStageFinance } from '../services/stageFinance';
import Marca from './Marca';

const PublicView: React.FC<{ onLoginClick: () => void; onCadastroClick?: () => void }> = ({ onLoginClick, onCadastroClick }) => {
  const { house, loadingData, setViewingHouseId } = useRanking();
  const [allHouses, setAllHouses] = useState<any[]>([]);
  const [activeTabId, setActiveTabId] = useState('');
  const [subView, setSubView] = useState<'ranking' | 'history'>('ranking');
  const [houseSearch, setHouseSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isStageValuesOpen, setIsStageValuesOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string>('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'casas'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllHouses(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'casas');
    });
    return unsub;
  }, []);

  // Rankings que o admin marcou como ocultos não aparecem aqui.
  const visibleRankings = useMemo(
    () => house.rankings.filter(r => r.active !== false),
    [house.rankings]
  );

  useEffect(() => {
    if (visibleRankings.length > 0) {
      const currentActive = visibleRankings.find(r => r.id === activeTabId);
      if (!currentActive) {
        setActiveTabId(visibleRankings[0].id);
      }
    }
  }, [visibleRankings, activeTabId]);

  const activeRanking = visibleRankings.find(r => r.id === activeTabId);

  useEffect(() => {
    if (activeRanking && activeRanking.history.length > 0) {
      // Default to the most recent entry if none selected or if selected is not in current ranking
      const exists = activeRanking.history.some(h => h.id === selectedEntryId);
      if (!selectedEntryId || !exists) {
        setSelectedEntryId(activeRanking.history[0].id);
      }
    }
  }, [activeRanking, selectedEntryId]);

  const isViewingSpecificHouse = !!house.id && house.id !== 'house_123';

  if (loadingData && isViewingSpecificHouse) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-950 space-y-4 p-6">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-emerald-500 font-bold animate-pulse text-xs text-center">ATUALIZANDO DADOS...</p>
      </div>
    );
  }

  if (!house.id || house.id === 'house_123') {
    const filteredHouses = allHouses.filter(h => h.name?.toLowerCase().includes(houseSearch.toLowerCase()));
    
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <header className="p-6 md:p-8 flex justify-between items-center border-b border-gray-800">
          <div className="flex items-center gap-3">
             <Marca />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onLoginClick} className="text-xs font-semibold text-gray-500 hover:text-white transition-all flex items-center gap-2">
              <LogIn size={16} /> <span className="hidden sm:inline">Administração</span>
            </button>
            {onCadastroClick && (
              <button onClick={onCadastroClick}
                      className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ring-1 ring-inset ring-emerald-500/30">
                Criar meu clube
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8 md:space-y-12 flex flex-col justify-center py-12 md:py-24">
           <div className="text-center space-y-4">
             <h2 className="text-3xl md:text-5xl font-semibold text-white tracking-tight">Visualize seu Ranking</h2>
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
                  className="bg-gray-900 border border-gray-800 hover:border-emerald-500/50 p-6 md:p-8 rounded-xl flex items-center justify-between group transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/25 transition-all overflow-hidden border border-gray-700">
                       {h.profile?.logoUrl ? (
                         <img src={h.profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                       ) : (
                         <Home className="text-gray-400 group-hover:text-emerald-100" size={22} />
                       )}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-base md:text-lg leading-none">{h.name}</h4>
                      <p className="text-xs font-semibold text-gray-600 mt-2">Acessar Clube</p>
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

  const totalAccumulated = getStagesTotal(activeRanking || null);

  const selectedEntry = activeRanking?.history.find(h => h.id === selectedEntryId);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="border-b border-gray-800 px-4 md:px-8 py-4 flex items-center justify-between bg-gray-900/50 backdrop-blur-md sticky top-0 z-40">
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
              <p className="text-emerald-500 text-xs font-semibold mt-1">Live Rankings</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsContactModalOpen(true)}
            className="bg-emerald-500/15 text-emerald-200 p-2.5 rounded-xl transition-all active:scale-95 ring-1 ring-inset ring-emerald-500/30"
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
        <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 ${visibleRankings.length === 0 ? 'hidden' : ''}`}>
          <div className="w-full sm:w-80">
            <label className="text-xs font-semibold text-gray-600 block mb-2 ml-1">
              Ranking
            </label>
            <div className="relative">
              <Trophy size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
              <select
                value={activeTabId}
                onChange={(e) => {
                  setActiveTabId(e.target.value);
                  setSubView('ranking');
                }}
                className="w-full bg-gray-900 border border-gray-800 text-white text-xs font-bold py-3.5 pl-11 pr-10 rounded-xl outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
              >
                {visibleRankings.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 rotate-90 pointer-events-none" />
            </div>
          </div>

          <div className="flex bg-gray-900/80 border border-gray-800 rounded-xl p-1 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setSubView('ranking')}
              className={`px-6 py-2.5 rounded-lg text-xs font-semibold   transition-all ${subView === 'ranking' ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-500/30' : 'text-gray-500 hover:text-white'}`}
            >
              Ranking
            </button>
            <button
              onClick={() => setSubView('history')}
              className={`px-6 py-2.5 rounded-lg text-xs font-semibold   transition-all ${subView === 'history' ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-500/30' : 'text-gray-500 hover:text-white'}`}
            >
              Histórico
            </button>
          </div>
        </div>

        {activeRanking ? (
          <div className="space-y-6">

            {subView === 'ranking' ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl md:rounded-xl overflow-hidden shadow-2xl relative">
                <ScrollArea className="overflow-x-auto overflow-y-auto max-h-[600px]">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-800 text-gray-500 text-xs border-b border-gray-700">
                        <th className="px-6 py-6 font-semibold">Pos..</th>
                        <th className="px-6 py-6 font-semibold">Nome do Jogador</th>
                        <th className="px-6 py-6 font-semibold text-center text-emerald-500">Pts Totais</th>
                        <th className="px-6 py-6 font-semibold text-center">Pres.</th>
                        <th className="px-6 py-6 font-semibold text-center">Vit.</th>
                        <th className="px-6 py-6 font-semibold text-center">Dia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {[...activeRanking.players].sort((a,b) => b.totalPoints - a.totalPoints).map((p, i) => {
                        const rank = i + 1;
                        return (
                          <tr key={p.id} className="hover:bg-emerald-600/[0.02] transition-colors">
                            <td className="px-6 py-5">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-semibold text-xs ${
                                rank >= 1 && rank <= 3 ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-500/30' : 
                                rank >= 4 && rank <= 8 ? 'bg-gray-700 text-gray-100' :
                                rank === 9 ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400 font-bold'
                              }`}>
                                {rank}
                              </span>
                            </td>
                            <td className={`px-6 py-5 font-bold tracking-tight text-sm ${
                              rank >= 1 && rank <= 3 ? 'text-emerald-300' : 
                              rank >= 4 && rank <= 8 ? 'text-gray-100' :
                              rank === 9 ? 'text-red-400' : 'text-white'
                            }`}>{p.name}</td>
                            <td className="px-6 py-5 text-emerald-400 font-semibold text-center">{p.totalPoints}</td>
                            <td className="px-6 py-5 text-gray-500 font-bold text-xs text-center">{p.attendances}</td>
                            <td className="px-6 py-5 text-gray-500 font-bold text-xs text-center">{p.wins}</td>
                            <td className="px-6 py-5 text-center">
                              <span className="text-emerald-500 font-semibold text-xs">+{p.dayPoints}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10 bg-gray-800 border-t border-gray-700 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                      <tr>
                        <td colSpan={3} className="px-6 py-5 text-right text-xs font-semibold text-gray-500">
                          Total Acumulado do Ranking:
                        </td>
                        <td colSpan={3} className="px-6 py-5">
                          <div className="flex items-center justify-end gap-4">
                            <span className="font-semibold text-emerald-500 text-lg">
                              R$ {formatBRL(totalAccumulated, 0)}
                            </span>
                            <button
                              onClick={() => setIsStageValuesOpen(true)}
                              title="Ver valor de cada etapa e quem venceu"
                              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-500 active:bg-emerald-500/25 active:text-emerald-100 rounded-xl transition-all font-semibold text-xs border border-emerald-500/20"
                            >
                              <ListOrdered size={14} />
                              <span>Ver por Etapa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </ScrollArea>
              </div>
            ) : (
              <div className="space-y-6">
                {activeRanking.history.length > 0 ? (
                  <>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar size={20} className="text-emerald-500" />
                        <h3 className="text-white font-semibold text-lg tracking-tight">Histórico de Etapas</h3>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <div className="relative flex-1 sm:w-64">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                          <input 
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-white text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                            placeholder="Buscar jogador na etapa..."
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                          />
                        </div>

                        <div className="relative sm:w-64">
                          <select
                            value={selectedEntryId}
                            onChange={(e) => setSelectedEntryId(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 text-white text-xs font-bold py-3 px-4 rounded-xl outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                          >
                            {activeRanking.history.map(h => (
                              <option key={h.id} value={h.id}>
                                {h.name 
                                  ? `${h.name} (${new Date(h.date).toLocaleDateString('pt-BR')})` 
                                  : `${new Date(h.date).toLocaleDateString('pt-BR')} ${new Date(h.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                }
                              </option>
                            ))}
                          </select>
                          <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 rotate-90 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {selectedEntry ? (() => {
                      const finance = getStageFinance(activeRanking, selectedEntry);
                      const termo = historySearch.trim().toLowerCase();
                      const visiveis = finance.players.filter(p => p.name.toLowerCase().includes(termo));
                      const posClass = (pos: number) =>
                        pos >= 1 && pos <= 3 ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-500/30' :
                        pos >= 4 && pos <= 8 ? 'bg-gray-700 text-gray-100' :
                        pos === 9 ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-500';
                      const nameClass = (pos: number) =>
                        pos >= 1 && pos <= 3 ? 'text-emerald-300' :
                        pos >= 4 && pos <= 8 ? 'text-gray-100' :
                        pos === 9 ? 'text-red-400' : 'text-white';

                      return (
                      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
                        <div className="p-6 md:p-8 flex flex-wrap items-center justify-between gap-4 border-b border-gray-800">
                          <div className="space-y-1">
                            <h4 className="text-white font-semibold text-xl tracking-tight">
                              {selectedEntry.name || 'Etapa sem nome'}
                            </h4>
                            <p className="text-gray-500 text-xs font-semibold">
                              {new Date(selectedEntry.date).toLocaleDateString('pt-BR')}
                              {finance.category && <> &middot; {finance.category.name}</>}
                              {' '}&middot; {finance.players.length} jogadores
                            </p>
                          </div>
                          {selectedEntry.multiplier > 1 && (
                            <div className="bg-emerald-500/15 text-emerald-200 px-3 py-1 rounded-lg text-xs font-semibold ring-1 ring-inset ring-emerald-500/30">
                              Pontos {selectedEntry.multiplier}X
                            </div>
                          )}
                        </div>

                        {finance.category ? (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-800 border-b border-gray-800">
                            <div className="bg-gray-900 p-5">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Total Arrecadado</p>
                              <p className="text-white font-semibold text-lg tracking-tight">R$ {formatBRL(finance.totalBruto)}</p>
                            </div>
                            <div className="bg-gray-900 p-5">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Rake ({finance.rakePercent}%)</p>
                              <p className="text-red-500 font-semibold text-lg tracking-tight">- R$ {formatBRL(finance.rakeValue)}</p>
                            </div>
                            <div className="bg-gray-900 p-5">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Para o Ranking</p>
                              <p className="text-emerald-500 font-semibold text-lg tracking-tight">R$ {formatBRL(finance.rankingValue)}</p>
                            </div>
                            <div className="bg-gray-900 p-5">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Premiação</p>
                              <p className="text-emerald-500 font-semibold text-lg tracking-tight">R$ {formatBRL(finance.liquido)}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="px-6 md:px-8 py-4 bg-amber-500/[0.06] border-b border-amber-500/20 text-amber-500/90 text-xs">
                            Esta etapa foi lançada sem categoria de jogo, então os valores por jogador não podem ser calculados.
                          </div>
                        )}

                        {visiveis.length === 0 ? (
                          <div className="py-16 text-center text-gray-600 italic">
                            Nenhum jogador encontrado com este nome nesta etapa.
                          </div>
                        ) : (
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[760px]">
                              <thead>
                                <tr className="bg-gray-800/60 text-gray-500 text-xs border-b border-gray-800">
                                  <th className="px-6 py-4 font-semibold">Pos.</th>
                                  <th className="px-4 py-4 font-semibold">Jogador</th>
                                  <th className="px-4 py-4 font-semibold text-center">Pts</th>
                                  {finance.category && (
                                    <>
                                      <th className="px-3 py-4 font-semibold text-center">Re-buy</th>
                                      <th className="px-3 py-4 font-semibold text-center">Duplo</th>
                                      <th className="px-3 py-4 font-semibold text-center">Add-on</th>
                                      {finance.customFields.map(f => (
                                        <th key={f.id} className="px-3 py-4 font-semibold text-center">{f.name || 'Extra'}</th>
                                      ))}
                                      <th className="px-3 py-4 font-semibold text-center">Pago</th>
                                      <th className="px-6 py-4 font-semibold text-right">Gasto</th>
                                    </>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800/60">
                                {visiveis.map(p => (
                                  <tr key={p.playerId} className="hover:bg-emerald-600/[0.03] transition-colors">
                                    <td className="px-6 py-4">
                                      <span className={`inline-flex w-8 h-8 items-center justify-center rounded-xl text-xs font-semibold ${posClass(p.position)}`}>
                                        {p.position}º
                                      </span>
                                    </td>
                                    <td className={`px-4 py-4 font-bold text-sm ${nameClass(p.position)}`}>{p.name}</td>
                                    <td className="px-4 py-4 text-center">
                                      <span className="text-emerald-500 font-semibold text-xs">+{p.pointsEarned}</span>
                                    </td>
                                    {finance.category && (
                                      <>
                                        <td className="px-3 py-4 text-center text-gray-400 font-bold text-xs">{p.rebuys || '—'}</td>
                                        <td className="px-3 py-4 text-center text-gray-400 font-bold text-xs">{p.doubleRebuys || '—'}</td>
                                        <td className="px-3 py-4 text-center text-gray-400 font-bold text-xs">{p.addons || '—'}</td>
                                        {finance.customFields.map(f => (
                                          <td key={f.id} className="px-3 py-4 text-center text-gray-400 font-bold text-xs">
                                            {p.customValues[f.id] || '—'}
                                          </td>
                                        ))}
                                        <td className="px-3 py-4 text-center">
                                          <span className={`text-xs font-semibold   ${p.paid ? 'text-green-500' : 'text-amber-500'}`}>
                                            {p.paid ? 'Sim' : 'Pend.'}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-emerald-500 font-semibold text-xs">
                                          R$ {formatBRL(p.gross)}
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                              {finance.category && (
                                <tfoot className="bg-gray-800/60 border-t border-gray-700">
                                  <tr className="text-xs">
                                    <td colSpan={3} className="px-6 py-4 font-semibold text-gray-500 text-right">Totais da etapa:</td>
                                    <td className="px-3 py-4 text-center text-gray-300 font-semibold">{finance.totals.rebuys}</td>
                                    <td className="px-3 py-4 text-center text-gray-300 font-semibold">{finance.totals.doubleRebuys}</td>
                                    <td className="px-3 py-4 text-center text-gray-300 font-semibold">{finance.totals.addons}</td>
                                    {finance.customFields.map(f => (
                                      <td key={f.id} className="px-3 py-4 text-center text-gray-300 font-semibold">
                                        {finance.totals.customValues[f.id] || 0}
                                      </td>
                                    ))}
                                    <td></td>
                                    <td className="px-6 py-4 text-right text-emerald-500 font-semibold text-sm">
                                      R$ {formatBRL(finance.totalBruto)}
                                    </td>
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          </div>
                        )}
                      </div>
                      );
                    })() : (
                      <div className="py-20 text-center text-gray-600 italic">Etapa não encontrada...</div>
                    )}
                  </>
                ) : (
                  <div className="py-20 text-center text-gray-600 italic">Nenhum histórico disponível para este ranking.</div>
                )}
              </div>
            )}
          </div>
        ) : visibleRankings.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <div className="bg-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-gray-700 border border-gray-800">
              <Trophy size={28} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Nenhum ranking disponível</h3>
              <p className="text-gray-500 text-sm">Este clube ainda não publicou nenhum ranking.</p>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-gray-600 italic">Nenhum dado para exibir...</div>
        )}
      </main>

      {isStageValuesOpen && activeRanking && (
        <StageValuesModal ranking={activeRanking} onClose={() => setIsStageValuesOpen(false)} />
      )}

      {/* Modal Contatos */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 w-full max-w-md rounded-t-xl sm:rounded-xl border-t sm:border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
             <div className="p-8 pb-4 flex justify-between items-center">
                <div>
                   <h3 className="text-2xl font-semibold text-white tracking-tight">Vem pro Jogo!</h3>
                   <p className="text-gray-500 text-xs font-semibold">Contatos Oficiais</p>
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
                    className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between group hover:border-emerald-500 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                        <Phone size={20} />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm mb-0.5">{contact.name}</p>
                        <p className="text-gray-500 text-xs font-bold">{contact.phone}</p>
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
                    className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-5 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <Instagram className="text-white" size={24} />
                      <span className="text-white font-semibold text-xs">Siga no Instagram</span>
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
