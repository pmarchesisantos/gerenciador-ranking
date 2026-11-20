
import React, { useMemo, useState } from 'react';
import { X, Trophy, Calendar, AlertCircle } from 'lucide-react';
import { Ranking } from '../types';
import { useRanking } from '../context/RankingContext';
import { getStageValues, formatBRL } from '../services/stageValues';
import ScrollArea from './ScrollArea';

interface StageValuesModalProps {
  ranking: Ranking;
  /** Admin edita valor e campeão; a visão pública é somente leitura. */
  editable?: boolean;
  onClose: () => void;
}

interface StageValueInputProps {
  value: number;
  onSave: (val: number) => void;
}

const StageValueInput: React.FC<StageValueInputProps> = ({ value, onSave }) => {
  const [localValue, setLocalValue] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  React.useEffect(() => {
    if (!isFocused) setLocalValue(value.toString());
  }, [value, isFocused]);

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="text-gray-600 text-[10px] font-black">R$</span>
      <input
        type="number"
        inputMode="numeric"
        className="bg-black/30 border border-gray-800 focus:border-emerald-500/50 rounded-lg px-2 py-1.5 w-24 text-right font-black text-sm text-amber-500 outline-none transition-all"
        value={localValue}
        onFocus={(e) => { setIsFocused(true); e.target.select(); }}
        onWheel={(e) => e.currentTarget.blur()}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          setIsFocused(false);
          const num = Number(localValue);
          if (!isNaN(num) && num !== value) onSave(num);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
    </div>
  );
};

const StageValuesModal: React.FC<StageValuesModalProps> = ({ ranking, editable = false, onClose }) => {
  const { updateHistoryEntryStage } = useRanking();

  const stages = useMemo(() => getStageValues(ranking), [ranking]);
  const total = useMemo(() => stages.reduce((acc, s) => acc + s.value, 0), [stages]);
  const pendingCount = useMemo(() => stages.filter(s => s.value === 0).length, [stages]);

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#111827] w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="flex justify-between items-center p-6 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-none">Valores por Etapa</h3>
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1.5">
                {ranking.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {editable && pendingCount > 0 && (
          <div className="mx-6 mt-6 flex items-start gap-3 bg-amber-500/[0.07] border border-amber-500/20 rounded-2xl p-4 shrink-0">
            <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-amber-500/90 text-xs leading-relaxed">
              <strong className="font-black">{pendingCount}</strong> etapa(s) ainda sem valor.
              As marcadas com <strong className="font-black">~</strong> tiveram o valor recuperado do acumulado
              do jogador — confira e ajuste digitando no campo.
            </p>
          </div>
        )}

        <ScrollArea wrapperClassName="flex-1 min-h-0" className="h-full overflow-y-auto p-6 space-y-3">
          {stages.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-gray-600 border border-gray-700">
                <Calendar size={28} />
              </div>
              <p className="text-gray-500 text-sm">Nenhuma etapa registrada ainda.</p>
            </div>
          ) : (
            stages.map((stage, index) => (
              <div
                key={stage.id}
                className="bg-black/30 border border-gray-800/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-emerald-600/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-gray-800 text-gray-500 flex items-center justify-center font-black text-xs">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-white tracking-tight truncate">
                      {stage.name || `Etapa de ${formatDate(stage.date)}`}
                    </p>
                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-1">
                      {formatDate(stage.date)}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-60 shrink-0">
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className={`shrink-0 ${stage.championIds.length > 0 ? 'text-amber-500' : 'text-gray-700'}`} />
                    {editable ? (
                      <select
                        value={stage.isManualChampion ? stage.championIds[0] : ''}
                        onChange={(e) => updateHistoryEntryStage(stage.id, { championIds: e.target.value ? [e.target.value] : [] })}
                        className="w-full min-w-0 bg-black/30 border border-gray-800 focus:border-emerald-500/50 rounded-lg px-2 py-1.5 text-xs text-amber-400 font-bold outline-none cursor-pointer transition-all"
                      >
                        <option value="">{stage.valueRecipientName || 'Definir campeão...'}</option>
                        {stage.participants.map(p => (
                          <option key={p.id} value={p.id}>{p.position}º — {p.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`min-w-0 truncate text-xs font-bold ${stage.valueRecipientName ? 'text-amber-400' : 'text-gray-600'}`}>
                        {stage.valueRecipientName || 'Não informado'}
                      </span>
                    )}
                  </div>
                  {stage.isChop && (
                    <p className="text-[9px] text-gray-500 leading-snug mt-1.5 pl-6">
                      <span className="font-black uppercase tracking-widest text-gray-600">Acordo:</span>{' '}
                      {stage.championNames.join(', ')}
                    </p>
                  )}
                </div>

                <div
                  className="flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                  title={stage.isInferred ? 'Valor recuperado do acumulado do jogador. Confira e ajuste se precisar.' : undefined}
                >
                  <span className="w-3 shrink-0 text-center text-amber-500/60 text-sm font-black leading-none">
                    {stage.isInferred ? '~' : ''}
                  </span>
                  {editable ? (
                    <StageValueInput
                      value={stage.value}
                      onSave={(val) => updateHistoryEntryStage(stage.id, { rankingValue: val })}
                    />
                  ) : (
                    <span className="text-amber-500 font-black text-sm tracking-tight w-24 text-right">
                      R$ {formatBRL(stage.value, 0)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </ScrollArea>

        <div className="border-t border-gray-800 bg-gray-800/40 p-6 flex items-center justify-between gap-4 shrink-0">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Total Acumulado do Ranking
          </span>
          <div className="flex items-center gap-2">
            <span className="text-amber-500/50 text-[10px] font-black">R$</span>
            <span className="text-amber-500 font-black text-2xl tracking-tighter">{formatBRL(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageValuesModal;
