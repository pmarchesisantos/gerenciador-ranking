
import React from 'react';
import { useRanking } from '../context/RankingContext';
import { Calendar, Trash2, Trophy, Users, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

const History: React.FC = () => {
  const { activeRanking, deleteHistoryEntry } = useRanking();

  if (!activeRanking) return <div className="p-8 text-gray-500 text-center">Selecione um ranking...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">Histórico Semanal</h2>
        <p className="text-gray-400 text-sm">Registro cronológico de todas as etapas concluídas.</p>
      </div>

      {activeRanking.history.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-[2rem] p-20 text-center space-y-4">
          <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-gray-600 border border-gray-700">
            <Calendar size={32} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Nenhuma etapa registrada</h3>
            <p className="text-gray-500 text-sm">Adicione resultados na Dashboard para começar o histórico.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {activeRanking.history.map((entry) => (
            <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl group transition-all hover:border-emerald-900/40">
              <div className="p-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 bg-gray-800/10">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-600/10 text-emerald-500 p-3 rounded-2xl border border-emerald-900/20">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h4 className="text-white font-black text-lg">{new Date(entry.date).toLocaleDateString('pt-BR')}</h4>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{entry.results.length} participantes • x{entry.multiplier}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {entry.multiplier > 1 && (
                    <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-amber-500/20">
                      PONTUAÇÃO DOBRADA
                    </span>
                  )}
                  <button 
                    onClick={() => {
                      if(window.confirm('Excluir esta etapa irá reverter os pontos de todos os jogadores. Confirmar?')) {
                        deleteHistoryEntry(entry.id);
                      }
                    }}
                    className="p-3 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Excluir Etapa"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="p-6 bg-gray-900/40">
                <div className="space-y-2 max-w-lg">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-4 ml-1">Classificação da Etapa</label>
                  <div className="flex flex-col gap-2">
                    {entry.results.sort((a, b) => a.position - b.position).map((res, i) => {
                      const playerName = activeRanking.players.find(p => p.id === res.playerId)?.name || 'Removido';
                      return (
                        <div key={res.playerId} className="bg-black/30 border border-gray-800/40 rounded-2xl p-4 flex items-center justify-between group/item hover:bg-emerald-600/[0.02] transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                              res.position === 1 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 
                              res.position === 2 ? 'bg-gray-300 text-black' :
                              res.position === 3 ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-500'
                            }`}>
                              {res.position}º
                            </div>
                            <div className="flex items-center gap-2">
                               <p className="text-gray-200 font-bold text-sm tracking-tight">{playerName}</p>
                               {res.paid ? (
                                 // Fix: Moved title to span to avoid TS error on Lucide component
                                 <span title="Pago"><CheckCircle size={14} className="text-emerald-500" /></span>
                               ) : (
                                 // Fix: Moved title to span to avoid TS error on Lucide component
                                 <span title="Pendente"><AlertCircle size={14} className="text-amber-500" /></span>
                               )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-emerald-500 font-black text-sm tracking-tight">+{res.pointsEarned} <span className="text-[10px] text-gray-600 uppercase">pts</span></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
