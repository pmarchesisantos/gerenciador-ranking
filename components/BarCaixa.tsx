
import React, { useMemo, useState } from 'react';
import { Store, ExternalLink, Lock, Unlock, ChevronDown, ChevronUp, CheckCircle2, Receipt, Trash2, AlertTriangle } from 'lucide-react';
import { useBar, saldoComanda, somaItens, esperadoNoCaixa, recebidoNoCaixa, recebidoPokerNoCaixa, ehFiado, BarRegraError } from '../context/BarContext';
import ConfirmationModal from './ConfirmationModal';
import ScrollArea from './ScrollArea';
import { useRanking } from '../context/RankingContext';
import { BarCaixa as Caixa } from '../types';
import { formatBRL } from '../services/stageValues';

const brl = (v: number) => `R$ ${formatBRL(v)}`;
const dataHora = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const data = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
const hora = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
const normalizar = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Abre o PDV numa janela própria, para o restante do app seguir livre. */
export const abrirJanelaPDV = (slug: string) => {
  const largura = Math.min(1440, window.screen.availWidth);
  const altura = Math.min(900, window.screen.availHeight);
  const janela = window.open(
    `/c/${slug}?view=bar-pdv`,
    'BarPDV',
    `width=${largura},height=${altura},left=${(window.screen.availWidth - largura) / 2},top=${(window.screen.availHeight - altura) / 2},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
  );
  // Bloqueador de pop-up: cai para uma aba nova.
  if (!janela) window.open(`/c/${slug}?view=bar-pdv`, '_blank');
  else janela.focus();
};

const BarCaixa: React.FC = () => {
  const { house } = useRanking();
  const { caixas, comandas, caixaAberto, loading, excluirCaixa, excluirComandasSemCaixa } = useBar();
  const [expandido, setExpandido] = useState<string | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Caixa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [verOrfas, setVerOrfas] = useState(false);
  const [confirmarOrfas, setConfirmarOrfas] = useState(false);

  // Comandas de antes do controle de caixa: não pertencem a nenhum caixa, mas
  // o financeiro as conta. Ficam visíveis aqui para a casa decidir.
  const orfas = useMemo(() => {
    const existentes = new Set(caixas.map(c => c.id));
    return comandas.filter(c => !c.caixaId || !existentes.has(c.caixaId))
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [caixas, comandas]);
  const totalOrfas = orfas.filter(c => c.status !== 'cancelada').reduce((a, c) => a + somaItens(c.itens), 0);

  const excluirOrfas = async () => {
    setConfirmarOrfas(false);
    setErro(null);
    try {
      await excluirComandasSemCaixa();
      setVerOrfas(false);
    } catch (e) {
      setErro(e instanceof BarRegraError ? e.message : 'Não foi possível excluir as comandas. Verifique a conexão e tente novamente.');
    }
  };

  const confirmarExclusao = async () => {
    if (!paraExcluir) return;
    const alvo = paraExcluir;
    setParaExcluir(null);
    setErro(null);
    try {
      await excluirCaixa(alvo.id);
      setExpandido(null);
    } catch (e) {
      setErro(e instanceof BarRegraError ? e.message : 'Não foi possível excluir o caixa. Verifique a conexão e as regras do Firestore.');
    }
  };

  const slug = house.slug || house.id;

  // O recebido vem dos próprios pagamentos: é o que foi marcado como recebido.
  const resumoDe = (caixa: Caixa) => {
    const doCaixa = comandas.filter(c => c.caixaId === caixa.id && c.status !== 'cancelada');
    const porForma = recebidoNoCaixa(caixa.id, comandas);
    const porFormaPoker = recebidoPokerNoCaixa(caixa.id, comandas);
    const recebidoPoker = Object.values(porFormaPoker).reduce((a, v) => a + v, 0);
    return {
      vendido: doCaixa.reduce((a, c) => a + somaItens(c.itens), 0),
      recebido: Object.values(porForma).reduce((a, v) => a + v, 0) + recebidoPoker,
      porForma,
      porFormaPoker,
      recebidoPoker,
      comandas: doCaixa.length,
      canceladas: comandas.filter(c => c.caixaId === caixa.id && c.status === 'cancelada').length,
      dinheiroNaGaveta: esperadoNoCaixa(caixa, comandas).Dinheiro || 0,
    };
  };

  const fechados = useMemo(
    () => caixas.filter(c => c.status !== 'aberto').sort((a, b) => (b.abertoEm || '').localeCompare(a.abertoEm || '')),
    [caixas]
  );

  const devedores = useMemo(() => {
    const mapa = new Map<string, { nome: string; saldo: number; comandas: number; desde: string }>();
    for (const c of comandas) {
      if (!ehFiado(c)) continue;
      const k = normalizar(c.clienteNome);
      const atual = mapa.get(k) || { nome: c.clienteNome, saldo: 0, comandas: 0, desde: c.data };
      atual.saldo += saldoComanda(c);
      atual.comandas += 1;
      if (c.data < atual.desde) atual.desde = c.data;
      mapa.set(k, atual);
    }
    return [...mapa.values()].sort((a, b) => b.saldo - a.saldo);
  }, [comandas]);

  const totalFiado = devedores.reduce((a, d) => a + d.saldo, 0);
  const resumoAberto = caixaAberto ? resumoDe(caixaAberto) : null;
  const abertasAgora = comandas.filter(c => c.status === 'aberta').length;

  if (loading) return <div className="p-8 text-center text-gray-600 text-sm">Carregando o bar...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Caixa do Bar</h2>
        <p className="text-gray-500 text-sm mt-1">O PDV abre numa janela própria: você continua usando o app enquanto o bar funciona.</p>
      </header>

      {/* Situação do caixa */}
      <section className={`rounded-3xl border p-6 md:p-8 ${caixaAberto ? 'border-violet-500/30 bg-violet-600/[0.05]' : 'border-gray-800 bg-gray-900'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${caixaAberto ? 'bg-violet-600/20 text-violet-300' : 'bg-gray-800 text-gray-500'}`}>
              {caixaAberto ? <Unlock size={24} /> : <Lock size={24} />}
            </div>
            <div>
              <p className="text-white font-black text-lg">{caixaAberto ? 'Caixa aberto' : 'Caixa fechado'}</p>
              <p className="text-gray-500 text-sm">
                {caixaAberto
                  ? `Desde ${dataHora(caixaAberto.abertoEm)} · ${abertasAgora} comanda(s) aberta(s)`
                  : 'Abra o caixa no PDV para começar a lançar.'}
              </p>
            </div>
          </div>
          <button onClick={() => abrirJanelaPDV(slug)}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
            <Store size={16} /> {caixaAberto ? 'Abrir PDV' : 'Abrir caixa no PDV'} <ExternalLink size={13} className="opacity-60" />
          </button>
        </div>

        {resumoAberto && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
            <div><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Vendido</p><p className="text-white font-black text-lg tabular-nums">{brl(resumoAberto.vendido)}</p></div>
            <div><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Recebido</p><p className="text-emerald-400 font-black text-lg tabular-nums">{brl(resumoAberto.recebido)}</p></div>
            <div><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Dinheiro na gaveta</p><p className="text-white font-black text-lg tabular-nums">{brl(resumoAberto.dinheiroNaGaveta)}</p></div>
            <div><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Comandas</p><p className="text-white font-black text-lg tabular-nums">{resumoAberto.comandas}</p></div>
          </div>
        )}
      </section>

      {orfas.length > 0 && (
        <section className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.05] overflow-hidden">
          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-white font-black text-sm">{orfas.length} comanda(s) sem caixa · {brl(totalOrfas)}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Lançadas antes do controle de caixa. Não pertencem a nenhum caixa, mas aparecem no financeiro.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setVerOrfas(v => !v)}
                      className="px-4 py-2.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/5 transition-all">
                {verOrfas ? 'Ocultar' : 'Ver comandas'}
              </button>
              <button onClick={() => setConfirmarOrfas(true)}
                      className="px-4 py-2.5 rounded-xl border border-red-500/30 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 transition-all">
                <Trash2 size={13} /> Excluir todas
              </button>
            </div>
          </div>
          {verOrfas && (
            <ul className="divide-y divide-amber-500/10 border-t border-amber-500/10">
              {orfas.map(c => (
                <li key={c.id} className="px-5 py-2.5 flex items-center justify-between gap-4 text-xs">
                  <span className="min-w-0 truncate">
                    <span className="text-white font-bold">{c.clienteNome}</span>
                    <span className="text-gray-500"> · {dataHora(c.data)} · {c.itens.filter(i => !i.cancelado).map(i => `${i.quantidade}× ${i.nome}`).join(', ') || 'sem itens'}</span>
                  </span>
                  <span className={`font-black tabular-nums shrink-0 ${c.status === 'cancelada' ? 'text-gray-600 line-through' : 'text-gray-200'}`}>
                    {brl(somaItens(c.itens))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {erro && (
        <div className="flex items-start gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-red-300 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> <span>{erro}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quem deve */}
        <section className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden flex flex-col h-[460px] lg:h-[540px]">
          <div className="shrink-0 h-[60px] px-5 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-white font-black text-sm">Quem deve</h3>
            <span className="text-amber-500 font-black text-sm tabular-nums">{brl(totalFiado)}</span>
          </div>
          {devedores.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <CheckCircle2 size={24} className="text-emerald-500/60" />
              <p className="text-gray-500 text-sm">Ninguém devendo.</p>
            </div>
          ) : (
            <ScrollArea wrapperClassName="flex-1 min-h-0" className="h-full overflow-y-auto">
            <ul className="divide-y divide-gray-800">
              {devedores.map(d => (
                <li key={normalizar(d.nome)} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{d.nome}</p>
                    <p className="text-gray-600 text-[10px] font-bold">{d.comandas} conta(s) · desde {data(d.desde)}</p>
                  </div>
                  <span className="text-amber-500 font-black text-sm tabular-nums shrink-0">{brl(d.saldo)}</span>
                </li>
              ))}
            </ul>
            </ScrollArea>
          )}
          <p className="shrink-0 h-[42px] px-5 flex items-center border-t border-gray-800 text-[10px] text-gray-600">
            O recebimento é feito no PDV, na aba "A receber".
          </p>
        </section>

        {/* Histórico de caixas */}
        <section className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden flex flex-col h-[460px] lg:h-[540px]">
          <div className="shrink-0 h-[60px] px-5 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-white font-black text-sm">Caixas anteriores</h3>
            <span className="text-gray-500 font-black text-sm tabular-nums">{fechados.length}</span>
          </div>
          {fechados.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <Receipt size={24} className="text-gray-700" />
              <p className="text-gray-500 text-sm">Nenhum caixa fechado ainda.</p>
            </div>
          ) : (
            <ScrollArea wrapperClassName="flex-1 min-h-0" className="h-full overflow-y-auto">
            <ul className="divide-y divide-gray-800">
              {fechados.map(cx => {
                const r = resumoDe(cx);
                const aberto = expandido === cx.id;
                const formas = Object.entries(r.porForma).sort((a, b) => b[1] - a[1]);
                return (
                  <li key={cx.id}>
                    <button onClick={() => setExpandido(aberto ? null : cx.id)}
                            className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-bold text-sm">{data(cx.abertoEm)}</p>
                        <p className="text-gray-600 text-[10px] font-bold">
                          {hora(cx.abertoEm)} – {hora(cx.fechadoEm || cx.canceladoEm)} · {r.comandas} comanda(s)
                          {r.canceladas > 0 && ` · ${r.canceladas} cancelada(s)`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-black text-sm tabular-nums">{brl(r.vendido)}</p>
                        {cx.status === 'cancelado'
                          ? <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">cancelado</p>
                          : <p className="text-[10px] font-black text-emerald-500 tabular-nums">recebido {brl(r.recebido)}</p>}
                      </div>
                      {aberto ? <ChevronUp size={16} className="text-gray-500 shrink-0" /> : <ChevronDown size={16} className="text-gray-500 shrink-0" />}
                    </button>

                    {aberto && (
                      <div className="px-5 pb-5 space-y-4 animate-in fade-in duration-150">
                        {cx.status === 'cancelado' && (
                          <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                            Caixa cancelado em {dataHora(cx.canceladoEm)}{cx.motivoCancelamento ? ` — ${cx.motivoCancelamento}` : ''}. Comandas canceladas e pagamentos estornados.
                          </p>
                        )}
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">{r.recebidoPoker > 0 ? 'Bar por forma' : 'Recebido por forma'}</p>
                          {formas.length === 0 ? (
                            <p className="text-xs text-gray-600">Nenhum recebimento neste caixa.</p>
                          ) : (
                            <ul className="divide-y divide-gray-800 text-xs">
                              {formas.map(([forma, valor]) => (
                                <li key={forma} className="flex justify-between gap-3 py-1.5">
                                  <span className="text-gray-300 font-bold">{forma}</span>
                                  <span className="text-gray-200 font-bold tabular-nums">{brl(valor)}</span>
                                </li>
                              ))}
                              <li className="flex justify-between gap-3 py-1.5">
                                <span className="text-gray-500 font-black uppercase text-[10px] tracking-widest">Total</span>
                                <span className="text-emerald-400 font-black tabular-nums">{brl(r.recebido - r.recebidoPoker)}</span>
                              </li>
                            </ul>
                          )}
                        </div>
                        {r.recebidoPoker > 0 && (
                          <div>
                            <p className="text-[9px] font-black text-violet-300 uppercase tracking-widest mb-1.5">Poker recebido no bar</p>
                            <ul className="divide-y divide-gray-800 text-xs">
                              {Object.entries(r.porFormaPoker).map(([forma, valor]) => (
                                <li key={forma} className="flex justify-between gap-3 py-1.5">
                                  <span className="text-gray-300 font-bold">{forma}</span>
                                  <span className="text-gray-200 font-bold tabular-nums">{brl(valor)}</span>
                                </li>
                              ))}
                              <li className="flex justify-between gap-3 py-1.5">
                                <span className="text-gray-500 font-black uppercase text-[10px] tracking-widest">Total</span>
                                <span className="text-violet-200 font-black tabular-nums">{brl(r.recebidoPoker)}</span>
                              </li>
                            </ul>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <p className="text-gray-500">Fundo de troco: <span className="text-gray-300 font-bold">{brl(cx.fundoTroco)}</span></p>
                          <p className="text-gray-500">Dinheiro na gaveta: <span className="text-gray-300 font-bold">{brl(r.dinheiroNaGaveta)}</span></p>
                        </div>
                        {(cx.movimentos || []).length > 0 && (
                          <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Sangrias e suprimentos</p>
                            <ul className="space-y-1">
                              {cx.movimentos.map(m => (
                                <li key={m.id} className="flex justify-between gap-3 text-xs">
                                  <span className="text-gray-400">{hora(m.em)} · {m.tipo === 'sangria' ? 'Sangria' : 'Suprimento'} · {m.motivo}</span>
                                  <span className={`font-bold tabular-nums ${m.tipo === 'sangria' ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {m.tipo === 'sangria' ? '−' : '+'}{brl(m.valor)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {cx.observacao && <p className="text-xs text-gray-400 italic">"{cx.observacao}"</p>}
                        <div className="flex justify-end pt-1">
                          <button onClick={() => setParaExcluir(cx)}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all">
                            <Trash2 size={13} /> Excluir caixa
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            </ScrollArea>
          )}
          <p className="shrink-0 h-[42px] px-5 flex items-center border-t border-gray-800 text-[10px] text-gray-600">
            Clique num caixa para ver o detalhe. Caixas de teste podem ser excluídos.
          </p>
        </section>
      </div>

      <ConfirmationModal
        isOpen={confirmarOrfas}
        onClose={() => setConfirmarOrfas(false)}
        onConfirm={excluirOrfas}
        title="Excluir comandas sem caixa"
        message={`As ${orfas.length} comanda(s) sem caixa (${brl(totalOrfas)}) serão apagadas permanentemente, sem como desfazer, e deixam de aparecer no financeiro. O estoque do que foi vendido nelas volta.`}
        confirmLabel="Excluir de vez"
      />

      <ConfirmationModal
        isOpen={!!paraExcluir}
        onClose={() => setParaExcluir(null)}
        onConfirm={confirmarExclusao}
        title="Excluir caixa"
        message={paraExcluir ? (() => {
          const n = comandas.filter(c => c.caixaId === paraExcluir.id).length;
          return `O caixa de ${dataHora(paraExcluir.abertoEm)} ${n > 0 ? `e as ${n} comanda(s) dele serão apagados` : 'será apagado'} permanentemente, sem como desfazer. O estoque do que foi vendido nele volta. Use só para caixas de teste.`;
        })() : ''}
        confirmLabel="Excluir de vez"
      />
    </div>
  );
};

export default BarCaixa;
