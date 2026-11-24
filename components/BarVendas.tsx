import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Handshake, Search, ShoppingBag, Store, Receipt, List, Package } from 'lucide-react';
import { useRanking } from '../context/RankingContext';
import { useBar } from '../context/BarContext';
import { Intervalo, Periodo, deslocar, intervaloDe, rotuloPeriodo, normalizar } from '../services/financeiro';
import {
  LinhaVenda, ROTULO_SITUACAO, SituacaoVenda, agruparPorProduto, dataHoraPlanilha, linhasDeVenda,
  nomeArquivo, parceirosDe, repassesPorParceiro,
} from '../services/vendas';
import { Aba, agora, baixarXlsx } from '../services/planilha';
import { formatBRL } from '../services/stageValues';

const brl = (v: number) => `R$ ${formatBRL(v)}`;
const pct = (v: number) => `${String(Math.round(v * 100) / 100).replace('.', ',')}%`;
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const isoDia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type PeriodoVendas = Periodo | 'personalizado';
/** Filtro de parceiro: todos, só da casa (sem repasse), só de parceiros, ou um parceiro. */
type FiltroParceiro = 'todos' | 'casa' | 'parceiros' | `p:${string}`;

const COR_SITUACAO: Record<SituacaoVenda, string> = {
  paga: 'text-green-400',
  'em-aberto': 'text-gray-400',
  fiado: 'text-amber-500',
};

const selectCls = 'bg-gray-900/50 border border-gray-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-300 outline-none focus:border-emerald-500/60';

/**
 * Vendas do bar item a item, com o repasse a parceiros (cozinha terceirizada,
 * por exemplo). Filtra por período, produto, cliente, categoria, parceiro e
 * situação, e exporta exatamente o que está na tela.
 */
const BarVendas: React.FC = () => {
  const { house } = useRanking();
  const { comandas, produtos, loading } = useBar();

  const [periodo, setPeriodo] = useState<PeriodoVendas>('mes');
  const [referencia, setReferencia] = useState(() => new Date());
  const [de, setDe] = useState(() => isoDia(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [ate, setAte] = useState(() => isoDia(new Date()));
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [parceiro, setParceiro] = useState<FiltroParceiro>('todos');
  const [situacao, setSituacao] = useState<SituacaoVenda | ''>('');
  const [visao, setVisao] = useState<'itens' | 'produtos'>('itens');

  const intervalo: Intervalo = useMemo(() => {
    if (periodo !== 'personalizado') return intervaloDe(periodo, referencia);
    const [a, b] = [de, ate].sort();
    const [ya, ma, da] = a.split('-').map(Number);
    const [yb, mb, db] = b.split('-').map(Number);
    return { inicio: new Date(ya, ma - 1, da), fim: new Date(yb, mb - 1, db + 1) };
  }, [periodo, referencia, de, ate]);

  const rotulo = periodo === 'personalizado'
    ? `${intervalo.inicio.toLocaleDateString('pt-BR')} a ${new Date(intervalo.fim.getTime() - 1).toLocaleDateString('pt-BR')}`
    : rotuloPeriodo(periodo, intervalo);

  const todas = useMemo(() => linhasDeVenda(comandas, produtos, intervalo), [comandas, produtos, intervalo]);
  const categorias = useMemo(() => [...new Set(todas.map(l => l.categoria).filter(Boolean) as string[])].sort(), [todas]);
  const parceiros = useMemo(() => parceirosDe(produtos, comandas), [produtos, comandas]);

  const linhas = useMemo(() => {
    const termo = normalizar(busca);
    return todas.filter(l =>
      (!termo || normalizar(l.produto).includes(termo) || normalizar(l.cliente).includes(termo) || String(l.comandaNumero ?? '') === termo) &&
      (!categoria || l.categoria === categoria) &&
      (!situacao || l.situacao === situacao) &&
      (parceiro === 'todos' ? true
        : parceiro === 'casa' ? !l.repasse
        : parceiro === 'parceiros' ? !!l.repasse
        : l.repasse?.parceiro === parceiro.slice(2)));
  }, [todas, busca, categoria, situacao, parceiro]);

  const totais = useMemo(() => linhas.reduce((a, l) => ({
    vendido: a.vendido + l.total,
    itens: a.itens + l.quantidade,
    repasse: a.repasse + (l.repasse?.valor || 0),
    casa: a.casa + l.casa,
  }), { vendido: 0, itens: 0, repasse: 0, casa: 0 }), [linhas]);

  const repasses = useMemo(() => repassesPorParceiro(linhas), [linhas]);
  const agrupado = useMemo(() => agruparPorProduto(linhas), [linhas]);
  const temRepasse = todas.some(l => l.repasse);
  const regraAtual = linhas.some(l => l.repasse?.origem === 'cadastro');

  // ── Planilhas ──
  const arquivoBase = nomeArquivo('vendas', house.name || 'clube', rotulo);

  const soma = (lista: LinhaVenda[], f: (l: LinhaVenda) => number) => Math.round(lista.reduce((a, l) => a + f(l), 0) * 100) / 100;
  const subtitulo = (extra = '') => `${rotulo.charAt(0).toUpperCase()}${rotulo.slice(1)} · exportado em ${agora()}${extra}`;

  /** Aba "Repasse" (quanto passar a cada parceiro), quando há produto de parceiro. */
  const abaRepasse = (lista: LinhaVenda[]): Aba[] => {
    const r = repassesPorParceiro(lista);
    if (!r.length) return [];
    return [{
      nome: 'Repasse por parceiro',
      titulo: `${house.name} · Repasse a parceiros`,
      subtitulo: subtitulo(),
      colunas: [
        { titulo: 'Parceiro', largura: 28 }, { titulo: 'Itens', tipo: 'inteiro', largura: 9 },
        { titulo: 'Vendido', tipo: 'moeda', largura: 15 }, { titulo: 'A repassar', tipo: 'moeda', largura: 15 },
        { titulo: 'Repasse de comandas já pagas', tipo: 'moeda', largura: 18 },
      ],
      linhas: r.map(x => [x.parceiro, x.itens, x.vendido, x.repasse, x.repasseRecebido]),
      totais: ['Total', r.reduce((a, x) => a + x.itens, 0), soma(lista.filter(l => l.repasse), l => l.total),
        Math.round(r.reduce((a, x) => a + x.repasse, 0) * 100) / 100, Math.round(r.reduce((a, x) => a + x.repasseRecebido, 0) * 100) / 100],
    }];
  };

  const exportarItens = (lista: LinhaVenda[], sufixo = '') => baixarXlsx(
    `${arquivoBase}${sufixo ? `-${nomeArquivo(sufixo)}` : ''}`,
    [{
      nome: 'Vendas',
      titulo: `${house.name} · Vendas do bar${sufixo ? ` · ${sufixo}` : ''}`,
      subtitulo: subtitulo(` · ${lista.length} lançamento(s)`),
      colunas: [
        { titulo: 'Data', largura: 17 }, { titulo: 'Comanda', tipo: 'inteiro', largura: 10 }, { titulo: 'Cliente', largura: 22 },
        { titulo: 'Produto', largura: 28 }, { titulo: 'Categoria', largura: 15 }, { titulo: 'Qtd', tipo: 'inteiro', largura: 7 },
        { titulo: 'Preço unitário', tipo: 'moeda', largura: 14 }, { titulo: 'Total', tipo: 'moeda', largura: 14 },
        { titulo: 'Parceiro', largura: 22 }, { titulo: '% repasse', tipo: 'percentual', largura: 11 },
        { titulo: 'Repasse', tipo: 'moeda', largura: 13 }, { titulo: 'Fica com a casa', tipo: 'moeda', largura: 15 },
        { titulo: 'Situação', largura: 16 },
      ],
      linhas: [...lista].reverse().map(l => [
        dataHoraPlanilha(l.data), l.comandaNumero ?? null, l.cliente, l.produto, l.categoria || '', l.quantidade,
        l.unitario, l.total, l.repasse?.parceiro || '', l.repasse ? l.repasse.percentual : null,
        l.repasse?.valor ?? null, l.casa, ROTULO_SITUACAO[l.situacao],
      ]),
      totais: ['Total', null, '', '', '', lista.reduce((a, l) => a + l.quantidade, 0), null, soma(lista, l => l.total),
        '', null, soma(lista, l => l.repasse?.valor || 0), soma(lista, l => l.casa), ''],
    }, ...abaRepasse(lista)],
  );

  const exportarProdutos = () => baixarXlsx(`${arquivoBase}-por-produto`, [{
    nome: 'Por produto',
    titulo: `${house.name} · Vendas por produto`,
    subtitulo: subtitulo(),
    colunas: [
      { titulo: 'Produto', largura: 30 }, { titulo: 'Categoria', largura: 16 }, { titulo: 'Parceiro', largura: 22 },
      { titulo: 'Quantidade', tipo: 'inteiro', largura: 11 }, { titulo: 'Total vendido', tipo: 'moeda', largura: 15 },
      { titulo: 'Repasse', tipo: 'moeda', largura: 13 }, { titulo: 'Fica com a casa', tipo: 'moeda', largura: 15 },
    ],
    linhas: agrupado.map(g => [g.produto, g.categoria || '', g.parceiro || 'Casa', g.quantidade, g.total, g.repasse || null, g.casa]),
    totais: ['Total', '', '', totais.itens, Math.round(totais.vendido * 100) / 100, Math.round(totais.repasse * 100) / 100, Math.round(totais.casa * 100) / 100],
  }, ...abaRepasse(linhas)]);

  if (loading) return <div className="p-8 text-center text-gray-600 text-sm">Carregando o bar...</div>;

  const cartao = (icone: React.ReactNode, rotuloCartao: string, valor: string, detalhe: string, cor = 'text-white') => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs font-semibold text-gray-500 flex items-center gap-2">{icone}{rotuloCartao}</p>
      <p className={`font-semibold text-xl md:text-2xl tracking-tight tabular-nums mt-1 ${cor}`}>{valor}</p>
      <p className="text-xs text-gray-600 mt-0.5">{detalhe}</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Cabeçalho e período */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Vendas do bar</h2>
          <p className="text-gray-500 text-sm mt-1">Cada item vendido, com o repasse a parceiros. Exporte para planilha.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex bg-gray-900/50 border border-gray-800 rounded-xl p-1">
            {(['dia', 'semana', 'mes', 'personalizado'] as PeriodoVendas[]).map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        periodo === p ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-500/30' : 'text-gray-500 hover:text-gray-300'}`}>
                {p === 'dia' ? 'Dia' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Período'}
              </button>
            ))}
          </div>
          {periodo === 'personalizado' ? (
            <div className="flex items-center gap-2">
              <input type="date" value={de} onChange={e => setDe(e.target.value)} className={`${selectCls} [color-scheme:dark]`} />
              <span className="text-gray-600 text-xs">até</span>
              <input type="date" value={ate} onChange={e => setAte(e.target.value)} className={`${selectCls} [color-scheme:dark]`} />
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-gray-900/50 border border-gray-800 rounded-xl p-1">
              <button onClick={() => setReferencia(r => deslocar(periodo, r, -1))} title="Período anterior"
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"><ChevronLeft size={16} /></button>
              <span className="flex-1 sm:w-48 text-center text-white text-sm font-medium first-letter:uppercase truncate px-1">{rotulo}</span>
              <button onClick={() => setReferencia(r => deslocar(periodo, r, 1))} title="Próximo período"
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </header>

      {/* Números do que está filtrado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cartao(<ShoppingBag size={14} />, 'Vendido', brl(totais.vendido), `${linhas.length} lançamento(s)`)}
        {cartao(<Package size={14} />, 'Itens', String(totais.itens), `${agrupado.length} produto(s)`)}
        {cartao(<Handshake size={14} />, 'Repasse a parceiros', brl(totais.repasse), temRepasse ? 'a pagar aos parceiros' : 'nenhum produto de parceiro', totais.repasse > 0 ? 'text-amber-500' : 'text-white')}
        {cartao(<Store size={14} />, 'Fica com a casa', brl(totais.casa), 'vendido − repasse', 'text-green-400')}
      </div>

      {/* Repasse por parceiro */}
      {repasses.length > 0 && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Handshake size={16} className="text-emerald-400" /> Repasse por parceiro · {rotulo}</h3>
            {regraAtual && <p className="text-xs text-gray-500">Itens vendidos antes da regra existir usam o percentual atual do produto.</p>}
          </div>
          <ul className="divide-y divide-gray-800">
            {repasses.map(r => (
              <li key={r.parceiro} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold">{r.parceiro}</p>
                  <p className="text-xs text-gray-500 font-semibold">{r.itens} item(ns) · {brl(r.vendido)} vendidos</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-xs text-gray-500">A repassar</p>
                  <p className="text-amber-500 font-semibold text-xl tabular-nums">{brl(r.repasse)}</p>
                  <p className="text-xs text-gray-600">{brl(r.repasseRecebido)} de comandas já pagas</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setParceiro(`p:${r.parceiro}`); setVisao('itens'); }}
                          className="px-3 py-2 rounded-lg border border-gray-800 text-xs font-semibold text-gray-400 hover:text-white">Ver itens</button>
                  <button onClick={() => exportarItens(linhas.filter(l => l.repasse?.parceiro === r.parceiro), `repasse ${r.parceiro}`)}
                          className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25">
                    <Download size={13} /> Planilha
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Filtros */}
      <section className="flex flex-col lg:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto, cliente ou nº da comanda"
                 className="w-full bg-gray-900/50 border border-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500/60" />
        </div>
        <select value={categoria} onChange={e => setCategoria(e.target.value)} className={selectCls}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={parceiro} onChange={e => setParceiro(e.target.value as FiltroParceiro)} className={selectCls}>
          <option value="todos">Casa e parceiros</option>
          <option value="casa">Só produtos da casa</option>
          <option value="parceiros">Só produtos de parceiros</option>
          {parceiros.map(p => <option key={p} value={`p:${p}`}>{p}</option>)}
        </select>
        <select value={situacao} onChange={e => setSituacao(e.target.value as SituacaoVenda | '')} className={selectCls}>
          <option value="">Qualquer situação</option>
          <option value="paga">Pagas</option>
          <option value="fiado">Fiado</option>
          <option value="em-aberto">Comanda aberta</option>
        </select>
      </section>

      {/* Tabela */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex bg-black/30 border border-gray-800 rounded-xl p-1 self-start">
            {([['itens', 'Item a item', <List key="i" size={13} />], ['produtos', 'Por produto', <Receipt key="p" size={13} />]] as const).map(([id, r, ic]) => (
              <button key={id} onClick={() => setVisao(id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${visao === id ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                {ic}{r}
              </button>
            ))}
          </div>
          <button onClick={() => (visao === 'itens' ? exportarItens(linhas) : exportarProdutos())} disabled={linhas.length === 0}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-40">
            <Download size={14} /> Exportar planilha
          </button>
        </div>

        {linhas.length === 0 ? (
          <p className="py-16 text-center text-gray-600 text-sm">Nenhuma venda {todas.length ? 'com esses filtros' : 'neste período'}.</p>
        ) : visao === 'itens' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="px-5 py-3 font-semibold">Data</th>
                  <th className="px-3 py-3 font-semibold">Comanda</th>
                  <th className="px-3 py-3 font-semibold">Produto</th>
                  <th className="px-3 py-3 font-semibold text-right">Qtd</th>
                  <th className="px-3 py-3 font-semibold text-right">Total</th>
                  <th className="px-3 py-3 font-semibold">Repasse</th>
                  <th className="px-3 py-3 font-semibold text-right">Casa</th>
                  <th className="px-5 py-3 font-semibold">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/70">
                {linhas.slice(0, 500).map(l => (
                  <tr key={`${l.comandaId}-${l.itemId}`} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-gray-400 tabular-nums whitespace-nowrap">{dataHora(l.data)}</td>
                    <td className="px-3 py-3"><span className="text-white font-semibold">{l.cliente}</span>{l.comandaNumero != null && <span className="text-gray-600 text-xs"> · #{l.comandaNumero}</span>}</td>
                    <td className="px-3 py-3"><span className="text-white">{l.produto}</span><span className="block text-xs text-gray-600">{brl(l.unitario)} un{l.categoria ? ` · ${l.categoria}` : ''}</span></td>
                    <td className="px-3 py-3 text-right text-white tabular-nums">{l.quantidade}</td>
                    <td className="px-3 py-3 text-right text-white font-semibold tabular-nums whitespace-nowrap">{brl(l.total)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {l.repasse ? (
                        <span title={l.repasse.origem === 'cadastro' ? 'Vendido antes da regra: usa o percentual atual do produto' : 'Percentual gravado na venda'}>
                          <span className="text-amber-500 font-semibold tabular-nums">{brl(l.repasse.valor)}</span>
                          <span className="block text-xs text-gray-500">{l.repasse.parceiro} · {pct(l.repasse.percentual)}{l.repasse.origem === 'cadastro' ? ' *' : ''}</span>
                        </span>
                      ) : <span className="text-gray-700">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-green-400 tabular-nums whitespace-nowrap">{brl(l.casa)}</td>
                    <td className={`px-5 py-3 text-xs font-semibold whitespace-nowrap ${COR_SITUACAO[l.situacao]}`}>{ROTULO_SITUACAO[l.situacao]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {linhas.length > 500 && (
              <p className="px-5 py-3 text-xs text-gray-500 border-t border-gray-800">Mostrando os 500 lançamentos mais recentes de {linhas.length}. A planilha leva todos.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                  <th className="px-5 py-3 font-semibold">Produto</th>
                  <th className="px-3 py-3 font-semibold">Parceiro</th>
                  <th className="px-3 py-3 font-semibold text-right">Qtd</th>
                  <th className="px-3 py-3 font-semibold text-right">Vendido</th>
                  <th className="px-3 py-3 font-semibold text-right">Repasse</th>
                  <th className="px-5 py-3 font-semibold text-right">Casa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/70">
                {agrupado.map(g => (
                  <tr key={g.produtoId} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-3"><span className="text-white font-semibold">{g.produto}</span>{g.categoria && <span className="block text-xs text-gray-600">{g.categoria}</span>}</td>
                    <td className="px-3 py-3 text-gray-400">{g.parceiro || <span className="text-gray-700">Casa</span>}</td>
                    <td className="px-3 py-3 text-right text-white tabular-nums">{g.quantidade}</td>
                    <td className="px-3 py-3 text-right text-white font-semibold tabular-nums">{brl(g.total)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{g.repasse > 0 ? <span className="text-amber-500">{brl(g.repasse)}</span> : <span className="text-gray-700">—</span>}</td>
                    <td className="px-5 py-3 text-right text-green-400 tabular-nums">{brl(g.casa)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700 text-white font-semibold">
                  <td className="px-5 py-3" colSpan={2}>Total</td>
                  <td className="px-3 py-3 text-right tabular-nums">{totais.itens}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{brl(totais.vendido)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-amber-500">{brl(totais.repasse)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-green-400">{brl(totais.casa)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default BarVendas;
