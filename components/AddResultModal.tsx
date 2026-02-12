
import React, { useState } from 'react';
import { useRanking } from '../context/RankingContext';
import { X, Search, ChevronRight, CheckCircle2 } from 'lucide-react';

interface AddResultModalProps {
  onClose: () => void;
}

const AddResultModal: React.FC<AddResultModalProps> = ({ onClose }) => {
  const { activeRanking, addWeeklyResult } = useRanking();
  const [searchTerm, setSearchTerm] = useState('');
  const [multiplier, setMultiplier] = useState(1);
  const [playerResults, setPlayerResults] = useState<{ [id: string]: number }>({});

  if (!activeRanking) return null;

  const filteredPlayers = activeRanking.players.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const handlePositionChange = (playerId: string, pos: string) => {
    const val = parseInt(pos);
    setPlayerResults(prev => ({
      ...prev,
      [playerId]: val
    }));
  };

  const handleSave = () => {
    const results = Object.entries(playerResults)
      .filter(([_, pos]) => pos > 0)
      .map(([playerId, position]) => ({ playerId, position }));
    
    if (results.length === 0) {
      alert('Selecione ao menos um jogador e sua posição.');
      return;
    }

    addWeeklyResult(results, multiplier);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111827] w-full max-w-xl rounded-[2.5rem] border border-emerald-900/30 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">Adicionar Resultado</h3>
            <p className="text-gray-500 text-xs uppercase font-bold tracking-widest mt-1">Lançamento de Etapa</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b border-gray-800 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                className="w-full bg-black/40 border border-gray-700 rounded-2xl pl-11 pr-4 py-3.5 text-gray-200 focus:border-emerald-500 outline-none transition-all placeholder:text-gray-600"
                placeholder="Buscar jogador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between bg-gray-900/40 p-3 rounded-2xl border border-gray-800">
              <label className="text-xs font-black text-gray-500 uppercase tracking-[0.15em] ml-2">Etapa Dobrada?</label>
              <div className="flex bg-black/30 p-1 rounded-xl border border-gray-700">
                {[1, 2].map(m => (
                  <button
                    key={m}
                    onClick={() => setMultiplier(m)}
                    className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${
                      multiplier === m ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'
                    }`}
                  >
                    {m === 1 ? 'NORMAL' : 'DOBRADA'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {filteredPlayers.map(p => (
            <div key={p.id} className="bg-gray-800/20 border border-gray-800/50 rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-500/40 transition-all hover:bg-emerald-600/[0.02]">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${
                  playerResults[p.id] ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-500'
                }`}>
                  {playerResults[p.id] ? <CheckCircle2 size={20} /> : p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-bold">{p.name}</p>
                  <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">{p.totalPoints} pts atuais</p>
                </div>
              </div>
              <div className="relative">
                <input 
                  type="number"
                  min="0"
                  placeholder="Pos"
                  className="bg-black/50 border border-gray-700 rounded-xl w-20 px-4 py-3 text-center text-emerald-400 font-black focus:ring-1 focus:ring-emerald-500 outline-none appearance-none transition-all"
                  value={playerResults[p.id] || ''}
                  onChange={(e) => handlePositionChange(p.id, e.target.value)}
                />
              </div>
            </div>
          ))}
          {filteredPlayers.length === 0 && (
            <div className="text-center py-8 text-gray-600 italic">Nenhum jogador encontrado.</div>
          )}
        </div>

        <div className="p-8 border-t border-gray-800 flex justify-end gap-4 bg-gray-900/50">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-white hover:bg-gray-800 transition-all text-sm uppercase tracking-widest"
          >
            Voltar
          </button>
          <button 
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-emerald-900/30 transition-all transform hover:scale-105 active:scale-95"
          >
            Confirmar
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddResultModal;
