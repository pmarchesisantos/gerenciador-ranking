import React, { useMemo, useState } from 'react';
import { X, Printer, Download, Wallet, Spade, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useBar, BarRegraError } from '../context/BarContext';
import { useRanking } from '../context/RankingContext';
import { extratoDe, exportarExtrato, imprimirExtrato } from '../services/extrato';
import { formatBRL } from '../services/stageValues';

const brl = (v: number) => `R$ ${formatBRL(v)}`;
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const FORMAS = ['Dinheiro', 'Pix', 'Débito', 'Crédito'];

/**
 * Extrato de quem deve: cada conta em aberto (fiado de vários dias), item a
 * item, com os pagamentos parciais e o poker em aberto. Imprime, exporta e
 * permite o acerto de tudo de uma vez no caixa aberto.
 */
const ExtratoCliente: React.FC<{ nome: string; onClose: () => void }> = ({ nome, onClose }) => {
  const { house } = useRanking();
  const { comandas, caixas, caixaAberto, receberTudo } = useBar();
  const extrato = useMemo(() => extratoDe(nome, comandas, house.rankings, caixas), [nome, comandas, house.rankings, caixas]);

  const [forma, setForma] = useState('Pix');
  const [confirmar, setConfirmar] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [quitado, setQuitado] = useState<number | null>(null);

  const receber = async () => {
    setProcessando(true);
    setErro(null);
    try {
      const total = await receberTudo(extrato.contas.map(c => c.comanda.id), forma);
      setQuitado(total);
      setConfirmar(false);
    } catch (e) {
      setErro(e instanceof BarRegraError ? e.message : 'Não foi possível concluir o recebimento. Nada foi gravado.');
    } finally {
      setProcessando(false);
    }
  };

  const cartao = (rotulo: string, valor: number, cor = 'text-white', destaque = false) => (
    <div className={`rounded-xl p-4 ${destaque ? 'bg-amber-500/[0.07] border border-amber-500/30' : 'bg-black/30 border border-gray-800'}`}>
      <p className="text-xs font-semibold text-gray-500">{rotulo}</p>
      <p className={`font-semibold text-lg tabular-nums mt-0.5 ${cor}`}>{brl(valor)}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-gray-900 w-full max-w-3xl max-h-[95dvh] flex flex-col border border-gray-800 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-4 px-6 py-5 border-b border-gray-800 shrink-0">
          <div>
            <p className="text-xs font-semibold text-gray-500">Extrato de conta</p>
            <h3 className="text-xl font-bold text-white">{extrato.nome}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {quitado != null ? 'Tudo quitado.' : `${extrato.contas.length} conta(s) em aberto${extrato.desde ? ` desde ${new Date(extrato.desde).toLocaleDateString('pt-BR')}` : ''} · ${extrato.itens} item(ns)`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1"><X size={20} /></button>
        </div>

        {quitado != null ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-12 text-center">
            <CheckCircle2 size={36} className="text-green-400" />
            <p className="text-white font-semibold text-lg">Recebido {brl(quitado)} em {forma}</p>
            <p className="text-gray-500 text-sm max-w-sm">Todas as contas de {extrato.nome || nome} foram quitadas neste caixa. O poker incluído já consta como pago no lançamento.</p>
            <button onClick={onClose} className="mt-2 px-6 py-3 rounded-xl bg-gray-800 text-white text-xs font-semibold hover:bg-gray-700">Fechar</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 pt-5 shrink-0">
              {cartao('Consumo', extrato.consumo)}
              {cartao('Já pago', extrato.pago, 'text-green-400')}
              {cartao('Poker em aberto', extrato.saldoPoker, 'text-emerald-300')}
              {cartao('Total a pagar', extrato.total, 'text-amber-500', true)}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-4">
              {extrato.contas.length === 0 && <p className="text-center text-gray-500 text-sm py-10">Nada em aberto.</p>}
              {extrato.contas.map(c => (
                <section key={c.comanda.id} className="rounded-xl border border-gray-800 overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3 bg-black/30">
                    <p className="text-sm font-semibold text-white first-letter:uppercase">
                      {dia(c.comanda.data)}
                      {c.comanda.numero != null && <span className="text-gray-500 font-normal"> · comanda #{c.comanda.numero}</span>}
                    </p>
                    <p className="text-sm font-semibold text-amber-500 tabular-nums">{brl(c.total)}</p>
                  </div>
                  <ul className="divide-y divide-gray-800/70 text-sm">
                    {c.itens.map(i => (
                      <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-xs text-gray-600 tabular-nums w-11 shrink-0">{hora(i.lancadoEm)}</span>
                        <span className="font-bold text-gray-300 w-8 shrink-0 tabular-nums">{i.quantidade}×</span>
                        <span className="flex-1 min-w-0 text-white truncate">{i.nome}<span className="text-gray-600 text-xs"> · {brl(i.precoUnitario)}</span></span>
                        <span className="text-white tabular-nums">{brl(i.precoUnitario * i.quantidade)}</span>
                      </li>
                    ))}
                    {c.pagamentos.map(p => (
                      <li key={p.id || p.em} className="flex items-center gap-3 px-4 py-2.5 text-green-400">
                        <span className="text-xs tabular-nums w-11 shrink-0">{new Date(p.em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                        <span className="flex-1">Pagamento parcial · {p.forma || 'Não informado'}</span>
                        <span className="tabular-nums">− {brl(p.valor)}</span>
                      </li>
                    ))}
                    {c.poker.map(g => (
                      <li key={`${g.rankingId}-${g.dia}`} className="px-4 py-2.5">
                        <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5"><Spade size={12} /> Poker · {g.rankingNome}{g.etapaNome ? ` · ${g.etapaNome}` : ''}</p>
                        {g.linhas.map(l => (
                          <div key={l.rotulo} className="flex items-center gap-3 mt-1 text-sm">
                            <span className="w-11 shrink-0" />
                            <span className="font-bold text-gray-300 w-8 shrink-0 tabular-nums">{l.quantidade}×</span>
                            <span className="flex-1 text-white">{l.rotulo}{l.unitario != null && <span className="text-gray-600 text-xs"> · {brl(l.unitario)}</span>}</span>
                            <span className="text-white tabular-nums">{brl(l.total)}</span>
                          </div>
                        ))}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="border-t border-gray-800 px-6 py-4 space-y-3 shrink-0">
              {erro && <p className="text-red-400 text-xs font-semibold flex items-center gap-2"><AlertCircle size={14} /> {erro}</p>}
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex gap-2">
                  <button onClick={() => imprimirExtrato(extrato, house.name)} disabled={!extrato.contas.length}
                          className="px-4 py-2.5 rounded-xl border border-gray-800 text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-2 disabled:opacity-40">
                    <Printer size={14} /> Imprimir
                  </button>
                  <button onClick={() => exportarExtrato(extrato, house.name)} disabled={!extrato.contas.length}
                          className="px-4 py-2.5 rounded-xl border border-gray-800 text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-2 disabled:opacity-40">
                    <Download size={14} /> Planilha
                  </button>
                </div>

                {extrato.total > 0 && (caixaAberto ? (
                  <div className="md:ml-auto flex flex-col sm:flex-row gap-2 sm:items-center">
                    {!confirmar ? (
                      <>
                        <div className="flex bg-black/30 border border-gray-800 rounded-xl p-1">
                          {FORMAS.map(f => (
                            <button key={f} onClick={() => setForma(f)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${forma === f ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{f}</button>
                          ))}
                        </div>
                        <button onClick={() => setConfirmar(true)}
                                className="px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25">
                          <Wallet size={14} /> Receber tudo · {brl(extrato.total)}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-300">Receber <b className="text-white">{brl(extrato.total)}</b> em <b className="text-white">{forma}</b> e quitar as {extrato.contas.length} conta(s)?</p>
                        <button onClick={() => setConfirmar(false)} disabled={processando} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white">Voltar</button>
                        <button onClick={receber} disabled={processando}
                                className="px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 bg-emerald-500/20 text-emerald-100 ring-1 ring-inset ring-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-50">
                          {processando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Confirmar
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="md:ml-auto text-xs text-gray-500">Para receber, abra o caixa no PDV.</p>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExtratoCliente;
