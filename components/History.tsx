
import React, { useState, useEffect } from 'react';
import { useRanking } from '../context/RankingContext';
import { Calendar, CheckCircle, AlertCircle, RefreshCcw, Edit2, Save, ChevronDown } from 'lucide-react';

const History: React.FC = () => {
  const { activeRanking, deleteHistoryEntry, updateHistoryEntryName } = useRanking();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  const historyEntries = activeRanking?.history || [];

  useEffect(() => {
    if (historyEntries.length > 0 && !selectedEntryId) {
      setSelectedEntryId(historyEntries[0].id);
    }
  }, [historyEntries, selectedEntryId]);

  // Reset selection when ranking changes
  useEffect(() => {
    if (historyEntries.length > 0) {
      setSelectedEntryId(historyEntries[0].id);
    } else {
      setSelectedEntryId(null);
    }
    setIsEditingName(false);
  }, [activeRanking?.id]);

  if (!activeRanking) return <div className="p-8 text-gray-500 text-center">Selecione um ranking...</div>;

  const selectedEntry = historyEntries.find(e => e.id === selectedEntryId) || (historyEntries.length > 0 ? historyEntries[0] : null);

  const handleStartEdit = () => {
    if (selectedEntry) {
      setTempName(selectedEntry.name || '');
      setIsEditingName(true);
    }
  };

  const handleSaveName = async () => {
    if (selectedEntry) {
      await updateHistoryEntryName(selectedEntry.id, tempName);
      setIsEditingName(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">Histórico de Etapas</h2>
          <p className="text-gray-400 text-sm">Registro cronológico de todas as etapas concluídas.</p>
        </div>

        {historyEntries.length > 0 && (
          <div className="relative group min-w-[240px]">
            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-2 ml-1">Selecionar Etapa</label>
            <div className="relative">
              <select 
                value={selectedEntryId || ''} 
                onChange={(e) => setSelectedEntryId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none appearance-none focus:border-emerald-500/50 transition-all cursor-pointer"
              >
                {historyEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name 
                      ? `${entry.name} (${new Date(entry.date).toLocaleDateString('pt-BR')})` 
                      : `${new Date(entry.date).toLocaleDateString('pt-BR')} ${new Date(entry.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                    }
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {historyEntries.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-[2rem] p-20 text-center space-y-4">
          <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-gray-600 border border-gray-700">
            <Calendar size={32} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Nenhuma etapa registrada</h3>
            <p className="text-gray-500 text-sm">Adicione resultados na Dashboard para começar o histórico.</p>
          </div>
        </div>
      ) : selectedEntry ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gray-900 border border-amber-500/30 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6 md:p-8 flex flex-wrap items-center justify-between gap-6 border-b border-gray-800 bg-gray-800/10">
              <div className="flex items-center gap-6">
                <div className="bg-amber-500/10 text-amber-500 p-4 rounded-2xl border border-amber-500/20 shadow-inner">
                  <Calendar size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          className="bg-black/40 border border-emerald-500/50 rounded-lg px-3 py-1 text-white font-black text-xl outline-none"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          autoFocus
                        />
                        <button onClick={handleSaveName} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">
                          <Save size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <h4 className="text-white font-black text-2xl tracking-tight">
                          {selectedEntry.name || 'Etapa sem nome'}
                        </h4>
                        <button onClick={handleStartEdit} className="p-1.5 text-gray-600 hover:text-emerald-500 transition-colors">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                      {new Date(selectedEntry.date).toLocaleDateString('pt-BR')} às {new Date(selectedEntry.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-800"></span>
                    <span className="text-emerald-500 text-xs font-black uppercase tracking-widest">
                      {selectedEntry.results.length} participantes • x{selectedEntry.multiplier}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {selectedEntry.multiplier > 1 && (
                  <span className="bg-amber-500/10 text-amber-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-amber-500/20 shadow-lg">
                    PONTUAÇÃO DOBRADA
                  </span>
                )}
                
                <button 
                  onClick={() => {
                    if(window.confirm('VOLTAR ETAPA: Deseja realmente excluir esta atualização? Todas as pontuações (posição + presença) e valores acumulados serão removidos, e o ranking voltará EXATAMENTE ao estado anterior.')) {
                      deleteHistoryEntry(selectedEntry.id);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-red-500/20 shadow-xl"
                  title="Excluir esta etapa e reverter pontuações"
                >
                  <RefreshCcw size={14} />
                  <span>Excluir Etapa</span>
                </button>
              </div>
            </div>

            <div className="p-6 md:p-8 bg-gray-900/40">
              <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-6 ml-1">Classificação Final</label>
              <div className="grid grid-cols-1 gap-3">
                {selectedEntry.results.sort((a, b) => a.position - b.position).map((res) => {
                  const playerName = activeRanking.players.find(p => p.id === res.playerId)?.name || 'Removido';
                  return (
                    <div key={res.playerId} className="bg-black/30 border border-gray-800/40 rounded-2xl p-4 flex items-center justify-between group/item hover:bg-emerald-600/[0.02] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                          res.position >= 1 && res.position <= 3 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 
                          res.position >= 4 && res.position <= 8 ? 'bg-blue-600 text-white' :
                          res.position === 9 ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-500'
                        }`}>
                          {res.position}º
                        </div>
                        <div className="flex items-center gap-3">
                           <p className={`font-bold text-sm tracking-tight ${
                             res.position >= 1 && res.position <= 3 ? 'text-amber-400' : 
                             res.position >= 4 && res.position <= 8 ? 'text-blue-400' :
                             res.position === 9 ? 'text-red-400' : 'text-gray-200'
                           }`}>{playerName}</p>
                           {res.paid ? (
                             <span title="Pago" className="bg-emerald-500/10 p-1 rounded-md"><CheckCircle size={12} className="text-emerald-500" /></span>
                           ) : (
                             <span title="Pendente" className="bg-amber-500/10 p-1 rounded-md"><AlertCircle size={12} className="text-amber-500" /></span>
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
      ) : null}
    </div>
  );
};

export default History;
