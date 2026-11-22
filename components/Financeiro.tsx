
import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Table2, BarChart3, Spade, Beer, Landmark, Clock3 } from 'lucide-react';
import { useRanking } from '../context/RankingContext';
import { useBar, saldoComanda } from '../context/BarContext';
import {
  Periodo, Metrica, intervaloDe, deslocar, rotuloPeriodo, etapasNoIntervalo,
  resumoBar, seriePorDia, escalaEixo,
} from '../services/financeiro';
import { formatBRL } from '../services/stageValues';
import { temRecurso } from '../services/planos';

// Validadas no fundo do cartão (#111827): faixa de luminosidade, croma,
// separação para daltonismo e contraste — todas passam.
const COR = { poker: '#059669', bar: '#8b5cf6' };

const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const brl = (v: number) => `R$ ${formatBRL(v)}`;
const diaCurto = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const diaSemana = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');

const Financeiro: React.FC = () => {
  const { house } = useRanking();
  const { comandas: todasComandas } = useBar();
  // Plano sem bar (Profissional): o financeiro é só do poker.
  const temBar = temRecurso(house, 'bar');
  const comandas = useMemo(() => (temBar ? todasComandas : []), [temBar, todasComandas]);

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [referencia, setReferencia] = useState(() => new Date());
  const [metrica, setMetrica] = useState<Metrica>('receita');
  const [verTabela, setVerTabela] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const intervalo = useMemo(() => intervaloDe(periodo, referencia), [periodo, referencia]);
  const ehAtual = intervalo.inicio.getTime() === intervaloDe(periodo, new Date()).inicio.getTime();

  const etapas = useMemo(() => etapasNoIntervalo(house.rankings || [], intervalo), [house.rankings, intervalo]);
  const bar = useMemo(() => resumoBar(comandas, intervalo), [comandas, intervalo]);
  const serie = useMemo(() => seriePorDia(intervalo, etapas, comandas, metrica), [intervalo, etapas, comandas, metrica]);

  const poker = useMemo(() => etapas.reduce((acc, e) => ({
    bruto: acc.bruto + e.bruto,
    rake: acc.rake + e.rake,
    administrativo: acc.administrativo + e.administrativo,
    ranking: acc.ranking + e.ranking,
    premiacao: acc.premiacao + e.premiacao,
    casa: acc.casa + e.receitaCasa,
    jogadores: acc.jogadores + e.jogadores,
  }), { bruto: 0, rake: 0, administrativo: 0, ranking: 0, premiacao: 0, casa: 0, jogadores: 0 }), [etapas]);

  // Abertas (ainda consumindo) e fechadas com saldo (fiado).
  const aReceber = useMemo(
    () => comandas.filter(c => c.status === 'aberta' || c.status === 'fechada').reduce((acc, c) => acc + saldoComanda(c), 0),
    [comandas]
  );
  const etapasSemAdm = etapas.filter(e => e.administrativoDesconhecido).length;

  const maxDia = Math.max(0, ...serie.map(p => p.poker + p.bar));
  const { teto, passo } = escalaEixo(maxDia);
  const linhasGrade = Array.from({ length: Math.round(teto / passo) + 1 }, (_, k) => k * passo);
  const mostrarRotulo = (idx: number) => serie.length <= 7 || idx === 0 || (idx + 1) % 5 === 0;

  const topProdutos = bar.produtos.slice(0, 8);
  const maxQtd = Math.max(1, ...topProdutos.map(p => p.quantidade));

  const pontoHover = hover !== null ? serie[hover] : null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Cabeçalho e período */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Financeiro</h2>
          <p className="text-gray-500 text-sm mt-1">{temBar ? 'Movimentação da casa entre poker e bar.' : 'Movimentação do poker da casa.'}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex bg-gray-900/50 border border-gray-800 rounded-xl p-1">
            {(['dia', 'semana', 'mes'] as Periodo[]).map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                      className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${
                        periodo === p ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                      }`}>
                {p === 'dia' ? 'Dia' : p === 'semana' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-gray-900/50 border border-gray-800 rounded-xl p-1">
            <button onClick={() => setReferencia(r => deslocar(periodo, r, -1))} title="Período anterior"
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              <ChevronLeft size={16} />
            </button>
            <span className="flex-1 sm:w-48 text-center text-white text-xs font-black capitalize truncate px-1">
              {rotuloPeriodo(periodo, intervalo)}
            </span>
            <button onClick={() => setReferencia(r => deslocar(periodo, r, 1))} title="Próximo período"
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              <ChevronRight size={16} />
            </button>
          </div>

          {!ehAtual && (
            <button onClick={() => setReferencia(new Date())}
                    className="px-4 py-2.5 rounded-xl border border-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
              {periodo === 'dia' ? 'Hoje' : periodo === 'semana' ? 'Esta semana' : 'Este mês'}
            </button>
          )}
        </div>
      </header>

      {/* Indicadores */}
      <div className={`grid grid-cols-2 gap-3 ${temBar ? 'lg:grid-cols-4' : ''}`}>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Landmark size={13} className="text-gray-500" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Receita da casa</p>
          </div>
          <p className="text-white font-black text-xl md:text-2xl tracking-tight tabular-nums">{brl(poker.casa + bar.vendas)}</p>
          <p className="text-gray-600 text-[10px] font-bold mt-1">{temBar ? 'poker + vendas do bar' : 'rake + administrativo'}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ background: COR.poker }} />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Poker · casa</p>
          </div>
          <p className="text-white font-black text-xl md:text-2xl tracking-tight tabular-nums">{brl(poker.casa)}</p>
          <p className="text-gray-600 text-[10px] font-bold mt-1">
            {etapas.length} etapa(s) · {brl(poker.bruto)} na mesa
          </p>
        </div>
        {temBar && <>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ background: COR.bar }} />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Bar · vendas</p>
          </div>
          <p className="text-white font-black text-xl md:text-2xl tracking-tight tabular-nums">{brl(bar.vendas)}</p>
          <p className="text-gray-600 text-[10px] font-bold mt-1">recebido {brl(bar.recebido)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock3 size={13} className="text-gray-500" />
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Bar · a receber</p>
          </div>
          <p className="text-amber-500 font-black text-xl md:text-2xl tracking-tight tabular-nums">{brl(aReceber)}</p>
          <p className="text-gray-600 text-[10px] font-bold mt-1">todas as comandas abertas</p>
        </div>
        </>}
      </div>

      {etapasSemAdm > 0 && (
        <div className="flex items-start gap-3 bg-amber-500/[0.07] border border-amber-500/20 rounded-2xl p-4">
          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-500/90 text-xs leading-relaxed">
            <strong className="font-black">{etapasSemAdm} etapa(s)</strong> deste período foram lançadas antes de o
            valor administrativo passar a ser gravado. Nelas, a receita do poker considera só o rake
            {poker.rake === 0 ? ', que está em 0% nas categorias' : ''}. Etapas lançadas a partir de agora já entram completas.
          </p>
        </div>
      )}

      {/* Gráfico diário */}
      {periodo !== 'dia' && (
        <section className="bg-gray-900 border border-gray-800 rounded-3xl p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-white font-black text-sm tracking-tight">
                {metrica === 'receita' ? 'Receita da casa por dia' : 'Movimentação por dia'}
              </h3>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: COR.poker }} />
                  {metrica === 'receita' ? 'Poker (rake + adm.)' : 'Poker (na mesa)'}
                </span>
                {temBar && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: COR.bar }} />
                    Bar (vendas)
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex bg-black/30 border border-gray-800 rounded-lg p-0.5">
                {(['receita', 'movimento'] as Metrica[]).map(m => (
                  <button key={m} onClick={() => setMetrica(m)}
                          className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                            metrica === m ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
                          }`}>
                    {m === 'receita' ? 'Receita' : 'Movimento'}
                  </button>
                ))}
              </div>
              <button onClick={() => setVerTabela(v => !v)} title={verTabela ? 'Ver gráfico' : 'Ver tabela'}
                      className="p-2 rounded-lg border border-gray-800 text-gray-500 hover:text-white transition-all">
                {verTabela ? <BarChart3 size={15} /> : <Table2 size={15} />}
              </button>
            </div>
          </div>

          {verTabela ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[420px]">
                <thead>
                  <tr className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800">
                    <th className="py-2 pr-4">Dia</th>
                    <th className="py-2 pr-4 text-right">Poker</th>
                    <th className="py-2 pr-4 text-right">Bar</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {serie.filter(p => p.poker + p.bar > 0).map(p => (
                    <tr key={p.dia.toISOString()}>
                      <td className="py-2 pr-4 text-gray-400 font-bold capitalize">{diaSemana(p.dia)} {diaCurto(p.dia)}</td>
                      <td className="py-2 pr-4 text-right text-gray-300 tabular-nums">{brl(p.poker)}</td>
                      <td className="py-2 pr-4 text-right text-gray-300 tabular-nums">{brl(p.bar)}</td>
                      <td className="py-2 text-right text-white font-black tabular-nums">{brl(p.poker + p.bar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {serie.every(p => p.poker + p.bar === 0) && (
                <p className="py-10 text-center text-gray-600 text-sm">Sem movimentação neste período.</p>
              )}
            </div>
          ) : maxDia === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-600 text-sm">
              Sem movimentação neste período.
            </div>
          ) : (
            <div>
              <div className="relative h-56">
                {linhasGrade.map(v => (
                  <div key={v} className="absolute left-12 right-0 border-t border-white/[0.06]" style={{ bottom: `${(v / teto) * 100}%` }}>
                    <span className="absolute -left-12 -translate-y-1/2 w-10 text-right text-[9px] font-bold text-gray-600 tabular-nums">
                      {compacto.format(v)}
                    </span>
                  </div>
                ))}

                <div className="absolute inset-y-0 left-12 right-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
                  {serie.map((p, idx) => {
                    const total = p.poker + p.bar;
                    return (
                      <div key={idx} className="flex-1 h-full flex flex-col justify-end cursor-default"
                           onMouseEnter={() => setHover(idx)}>
                        <div className={`w-full flex flex-col justify-end gap-[2px] transition-opacity ${hover !== null && hover !== idx ? 'opacity-50' : ''}`}
                             style={{ height: `${(total / teto) * 100}%` }}>
                          {p.bar > 0 && (
                            <div className="rounded-t-[4px] min-h-[2px]" style={{ flex: p.bar, background: COR.bar }} />
                          )}
                          {p.poker > 0 && (
                            <div className={`min-h-[2px] ${p.bar > 0 ? '' : 'rounded-t-[4px]'}`} style={{ flex: p.poker, background: COR.poker }} />
                          )}
                        </div>
                      </div>
                    );
                  })}

                {pontoHover && hover !== null && (
                  <div
                    className="absolute z-10 top-0 pointer-events-none bg-gray-950 border border-gray-700 rounded-xl px-3 py-2.5 shadow-2xl min-w-[150px]"
                    style={{
                      left: `${((hover + 0.5) / serie.length) * 100}%`,
                      // Nas pontas o tooltip abre para dentro, para não sair do cartão.
                      transform: `translateX(${hover / serie.length > 0.6 ? '-100%' : hover / serie.length < 0.15 ? '0' : '-50%'})`,
                    }}
                  >
                    <p className="text-[10px] font-black text-gray-400 capitalize mb-1.5">
                      {diaSemana(pontoHover.dia)} {diaCurto(pontoHover.dia)}
                    </p>
                    <p className="flex items-center justify-between gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-gray-400"><span className="w-2 h-2 rounded-[2px]" style={{ background: COR.poker }} />Poker</span>
                      <span className="text-white font-bold tabular-nums">{brl(pontoHover.poker)}</span>
                    </p>
                    {temBar && (
                      <p className="flex items-center justify-between gap-4 text-xs mt-0.5">
                        <span className="flex items-center gap-1.5 text-gray-400"><span className="w-2 h-2 rounded-[2px]" style={{ background: COR.bar }} />Bar</span>
                        <span className="text-white font-bold tabular-nums">{brl(pontoHover.bar)}</span>
                      </p>
                    )}
                    <p className="flex items-center justify-between gap-4 text-xs mt-1.5 pt-1.5 border-t border-gray-800">
                      <span className="text-gray-500 font-bold">Total</span>
                      <span className="text-white font-black tabular-nums">{brl(pontoHover.poker + pontoHover.bar)}</span>
                    </p>
                  </div>
                )}
                </div>
              </div>

              <div className="flex gap-[2px] pl-12 mt-2">
                {serie.map((p, idx) => (
                  <span key={idx} className="flex-1 text-center text-[9px] font-bold text-gray-600 tabular-nums truncate">
                    {mostrarRotulo(idx) ? (serie.length <= 7 ? `${diaSemana(p.dia)} ${p.dia.getDate()}` : p.dia.getDate()) : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className={`grid grid-cols-1 gap-6 items-start ${temBar ? 'lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : ''}`}>
        {/* Poker */}
        <section className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden">
          <div className="p-5 md:p-6 border-b border-gray-800 flex items-center justify-between gap-3">
            <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
              <Spade size={15} className="text-gray-500" /> Etapas de poker
            </h3>
            <span className="text-[10px] font-bold text-gray-500">{poker.jogadores} entrada(s)</span>
          </div>

          {etapas.length === 0 ? (
            <p className="py-14 text-center text-gray-600 text-sm">Nenhuma etapa neste período.</p>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[640px]">
                <thead>
                  <tr className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800 bg-gray-800/30">
                    <th className="px-5 py-3">Etapa</th>
                    <th className="px-3 py-3 text-right">Na mesa</th>
                    <th className="px-3 py-3 text-right">Rake</th>
                    <th className="px-3 py-3 text-right">Adm.</th>
                    <th className="px-3 py-3 text-right">Ranking</th>
                    <th className="px-3 py-3 text-right">Prêmios</th>
                    <th className="px-5 py-3 text-right">Casa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-xs">
                  {etapas.map(e => (
                    <tr key={e.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <p className="text-white font-bold truncate max-w-[200px]">{e.nome || 'Etapa sem nome'}</p>
                        <p className="text-gray-600 text-[10px] font-bold mt-0.5">
                          {diaCurto(new Date(e.data))} · {e.rankingNome} · {e.jogadores} jog.
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-300 tabular-nums">{brl(e.bruto)}</td>
                      <td className="px-3 py-3 text-right text-gray-400 tabular-nums">{brl(e.rake)}</td>
                      <td className="px-3 py-3 text-right text-gray-400 tabular-nums"
                          title={e.administrativoDesconhecido ? 'Não gravado nesta etapa' : undefined}>
                        {e.administrativoDesconhecido ? <span className="text-gray-700">—</span> : brl(e.administrativo)}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-400 tabular-nums">{brl(e.ranking)}</td>
                      <td className="px-3 py-3 text-right text-gray-400 tabular-nums">{brl(e.premiacao)}</td>
                      <td className="px-5 py-3 text-right text-white font-black tabular-nums">{brl(e.receitaCasa)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-xs border-t border-gray-700 bg-gray-800/30">
                    <td className="px-5 py-3 text-[9px] font-black text-gray-500 uppercase tracking-widest">Total</td>
                    <td className="px-3 py-3 text-right text-white font-black tabular-nums">{brl(poker.bruto)}</td>
                    <td className="px-3 py-3 text-right text-gray-300 font-bold tabular-nums">{brl(poker.rake)}</td>
                    <td className="px-3 py-3 text-right text-gray-300 font-bold tabular-nums">{brl(poker.administrativo)}</td>
                    <td className="px-3 py-3 text-right text-gray-300 font-bold tabular-nums">{brl(poker.ranking)}</td>
                    <td className="px-3 py-3 text-right text-gray-300 font-bold tabular-nums">{brl(poker.premiacao)}</td>
                    <td className="px-5 py-3 text-right text-white font-black tabular-nums">{brl(poker.casa)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* Bar */}
        {temBar && <div className="space-y-6">
          <section className="bg-gray-900 border border-gray-800 rounded-3xl p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-2">
                <Beer size={15} className="text-gray-500" /> Mais vendidos
              </h3>
              <span className="text-[10px] font-bold text-gray-500">{bar.itensVendidos} item(ns) · {bar.clientes} cliente(s)</span>
            </div>
            {topProdutos.length === 0 ? (
              <p className="py-10 text-center text-gray-600 text-sm">Nenhuma venda neste período.</p>
            ) : (
              <ol className="space-y-3">
                {topProdutos.map((p, idx) => (
                  <li key={p.produtoId}>
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="text-gray-300 text-xs font-bold truncate">
                        <span className="text-gray-600 tabular-nums mr-1.5">{idx + 1}</span>{p.nome}
                      </span>
                      <span className="text-gray-500 text-[10px] font-bold tabular-nums shrink-0">
                        <span className="text-white">{p.quantidade}×</span> · {brl(p.valor)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(p.quantidade / maxQtd) * 100}%`, background: COR.bar }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-3xl p-5 md:p-6">
            <h3 className="text-white font-black text-sm tracking-tight mb-4">Recebido no bar</h3>
            {bar.porForma.length === 0 ? (
              <p className="py-6 text-center text-gray-600 text-sm">Nenhum pagamento neste período.</p>
            ) : (
              <ul className="space-y-2">
                {bar.porForma.map(f => (
                  <li key={f.forma} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-bold">{f.forma}</span>
                    <span className="text-white font-black tabular-nums">{brl(f.valor)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between text-xs pt-2 mt-1 border-t border-gray-800">
                  <span className="text-gray-500 font-black uppercase tracking-widest text-[9px]">Total</span>
                  <span className="text-emerald-400 font-black tabular-nums">{brl(bar.recebido)}</span>
                </li>
              </ul>
            )}
          </section>
        </div>}
      </div>
    </div>
  );
};

export default Financeiro;
