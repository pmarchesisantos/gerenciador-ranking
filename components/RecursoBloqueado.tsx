import React from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { useRanking } from '../context/RankingContext';
import { PLANOS, Recurso, planoQueLibera } from '../services/planos';
import { formatBRL } from '../services/stageValues';

const NOME: Record<Recurso, string> = {
  ranking: 'Ranking',
  pokerClock: 'Poker Clock',
  financeiro: 'Financeiro',
  bar: 'Gerenciamento do bar',
};

/** Ocupa o lugar de uma tela que o plano do clube não inclui. */
const RecursoBloqueado: React.FC<{ recurso: Recurso }> = ({ recurso }) => {
  const { house, setCurrentView } = useRanking();
  const plano = planoQueLibera(recurso);
  const atual = house.plano ? PLANOS[house.plano] : null;
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <section className="mt-6 md:mt-16 bg-gray-900 border border-gray-800 rounded-xl p-8 md:p-10 text-center space-y-5">
        <div className="w-14 h-14 rounded-xl bg-gray-800 text-gray-400 flex items-center justify-center mx-auto"><Lock size={24} /></div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white tracking-tight">{NOME[recurso]} está no plano {plano.nome}</h2>
          <p className="text-gray-500 text-sm">
            {atual ? `Seu clube está no plano ${atual.nome}. ` : ''}
            Mude para o {plano.nome} a partir de R$ {formatBRL(plano.mensal)}/mês e libere: {plano.inclui.slice(1).join(' · ')}.
          </p>
        </div>
        <button onClick={() => setCurrentView('assinatura')}
                className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 px-6 py-4 rounded-xl font-semibold text-xs inline-flex items-center gap-2 transition-all ring-1 ring-inset ring-emerald-500/30">
          Ver planos <ArrowRight size={14} />
        </button>
      </section>
    </div>
  );
};

export default RecursoBloqueado;
