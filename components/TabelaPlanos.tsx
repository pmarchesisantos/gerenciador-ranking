import React from 'react';
import { Check } from 'lucide-react';
import {
  DESCONTO_ANUAL, LISTA_PLANOS, Periodo, PlanoId, mensalEquivalente, precoDoPeriodo,
} from '../services/planos';
import { formatBRL } from '../services/stageValues';

const brl = (v: number) => `R$ ${formatBRL(v)}`;

/** Alternador Mensal / Anual, com o desconto do anual à vista. */
export const SeletorPeriodo: React.FC<{ periodo: Periodo; onChange: (p: Periodo) => void }> = ({ periodo, onChange }) => (
  <div role="radiogroup" aria-label="Período de cobrança"
       className="inline-flex p-1 rounded-2xl bg-black/40 border border-gray-800">
    {(['mensal', 'anual'] as Periodo[]).map(p => (
      <button key={p} role="radio" aria-checked={periodo === p} onClick={() => onChange(p)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                periodo === p ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
        {p === 'mensal' ? 'Mensal' : 'Anual'}
        {p === 'anual' && (
          <span className={`rounded-md px-1.5 py-0.5 text-[9px] ${periodo === p ? 'bg-white/20' : 'bg-emerald-500/10 text-emerald-400'}`}>
            −{Math.round(DESCONTO_ANUAL * 100)}%
          </span>
        )}
      </button>
    ))}
  </div>
);

interface TabelaPlanosProps {
  periodo: Periodo;
  /** Plano atual do clube: o cartão dele fica marcado e sem botão. */
  atual?: PlanoId;
  rotuloAcao?: (plano: PlanoId) => string;
  onEscolher: (plano: PlanoId) => void;
  desabilitado?: boolean;
}

/** Os três planos lado a lado (empilhados no celular). */
const TabelaPlanos: React.FC<TabelaPlanosProps> = ({ periodo, atual, rotuloAcao, onEscolher, desabilitado }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {LISTA_PLANOS.map(p => {
      const ehAtual = atual === p.id;
      const total = precoDoPeriodo(p.id, periodo);
      return (
        <article key={p.id}
                 className={`relative rounded-3xl border p-6 flex flex-col gap-5 ${
                   p.destaque ? 'border-emerald-500/40 bg-emerald-600/[0.06]' : 'border-gray-800 bg-gray-900'}`}>
          {p.destaque && (
            <span className="absolute -top-3 left-6 rounded-full bg-emerald-600 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white">
              Mais escolhido
            </span>
          )}
          <header>
            <h3 className="text-white font-black text-lg">{p.nome}</h3>
            <p className="text-gray-500 text-xs mt-1 min-h-[32px]">{p.resumo}</p>
          </header>

          <div>
            <p className="text-white font-black text-3xl tracking-tight tabular-nums">
              {brl(mensalEquivalente(p.id, periodo))}<span className="text-gray-500 text-sm font-bold">/mês</span>
            </p>
            <p className="text-gray-500 text-[11px] font-bold mt-1 h-4">
              {periodo === 'anual'
                ? <>{brl(total)} por ano · <span className="line-through">{brl(p.mensal * 12)}</span></>
                : 'cobrado todo mês'}
            </p>
          </div>

          <ul className="space-y-2 flex-1">
            {p.inclui.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                <Check size={15} className="text-emerald-500 shrink-0 mt-0.5" /> {item}
              </li>
            ))}
          </ul>

          {ehAtual ? (
            <div className="w-full py-3.5 rounded-xl text-center text-[10px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/30">
              Seu plano atual
            </div>
          ) : (
            <button onClick={() => onEscolher(p.id)} disabled={desabilitado}
                    className={`w-full py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 ${
                      p.destaque ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>
              {rotuloAcao ? rotuloAcao(p.id) : `Assinar ${p.nome}`}
            </button>
          )}
        </article>
      );
    })}
  </div>
);

export default TabelaPlanos;
