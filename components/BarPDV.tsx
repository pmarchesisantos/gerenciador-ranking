
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Minus, Search, Receipt, X, Package, Lock, Unlock, ArrowDownCircle, ArrowUpCircle, Ban,
  RotateCcw, Wallet, CheckCircle2, AlertTriangle, History, Store, UserRound, ChevronDown, ChevronUp,
  Eye, EyeOff, PanelRightClose, PanelRightOpen, Printer,
} from 'lucide-react';
import {
  useBar, saldoComanda, somaItens, esperadoNoCaixa, recebidoNoCaixa, recebidoPokerNoCaixa, ehFiado, BarRegraError,
} from '../context/BarContext';
import { useRanking } from '../context/RankingContext';
import { BarComanda, BarFormaPagamento, BarProduto } from '../types';
import { formatBRL } from '../services/stageValues';
import { situacaoEstoque } from './BarProdutos';
import { consolidarPessoas } from '../services/jogadores';
import InputMoeda from './InputMoeda';
import { imprimirPreConta } from '../services/preConta';
import { GastoPoker, diaOperacional, diasDoPeriodo, gastosDaPessoa, gastosPokerNosDias } from '../services/pokerDoDia';

const FORMAS: BarFormaPagamento[] = ['Dinheiro', 'Pix', 'Débito', 'Crédito'];

const normalizar = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const brl = (v: number) => `R$ ${formatBRL(v)}`;
const hora = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
const dataHora = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

/** localStorage pode estar bloqueado (aba anônima, dados limpos): nunca deixa o PDV quebrar por isso. */
const lerPreferencia = (chave: string): boolean => {
  try { return localStorage.getItem(chave) === '1'; } catch { return false; }
};
const gravarPreferencia = (chave: string, valor: boolean) => {
  try { localStorage.setItem(chave, valor ? '1' : '0'); } catch { /* sem persistência, segue só na sessão */ }
};

type Aba = 'abertas' | 'receber' | 'encerradas';
type Painel = 'comandas' | 'produtos' | 'conta';

const STATUS_ROTULO: Record<BarComanda['status'], { texto: string; cls: string }> = {
  aberta: { texto: 'Aberta', cls: 'bg-sky-500/10 text-sky-300' },
  fechada: { texto: 'Aguardando pagamento', cls: 'bg-amber-500/10 text-amber-500' },
  paga: { texto: 'Paga', cls: 'bg-emerald-500/10 text-emerald-400' },
  cancelada: { texto: 'Cancelada', cls: 'bg-red-500/10 text-red-400' },
};

// ─── Diálogos ────────────────────────────────────────────────────────────────

const Dialogo: React.FC<{ titulo: string; onClose: () => void; children: React.ReactNode; largura?: string }> =
  ({ titulo, onClose, children, largura = 'max-w-md' }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-150"
         onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-[#111827] w-full ${largura} border border-gray-800 rounded-3xl shadow-2xl overflow-hidden`}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800">
          <h3 className="text-base font-bold text-white">{titulo}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

const DialogoMotivo: React.FC<{
  titulo: string; descricao: string; confirmar: string; perigo?: boolean;
  onClose: () => void; onConfirm: (motivo: string) => Promise<boolean>;
}> = ({ titulo, descricao, confirmar, perigo, onClose, onConfirm }) => {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const enviar = async () => {
    if (!motivo.trim()) return;
    setEnviando(true);
    const ok = await onConfirm(motivo.trim());
    setEnviando(false);
    if (ok) onClose();
  };
  return (
    <Dialogo titulo={titulo} onClose={onClose}>
      <p className="text-gray-400 text-sm leading-relaxed mb-4">{descricao}</p>
      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Motivo *</label>
      <textarea autoFocus rows={2} value={motivo} onChange={e => setMotivo(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                className="mt-1.5 w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500 resize-none" />
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-800 hover:bg-gray-700 transition-all">Voltar</button>
        <button onClick={enviar} disabled={!motivo.trim() || enviando}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-40 transition-all ${perigo ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
          {enviando ? 'Salvando...' : confirmar}
        </button>
      </div>
    </Dialogo>
  );
};

// ─── Tela principal ──────────────────────────────────────────────────────────

const BarPDV: React.FC = () => {
  const { house, jogadores } = useRanking();
  const pessoas = useMemo(() => consolidarPessoas(jogadores, house.rankings), [jogadores, house.rankings]);
  const bar = useBar();
  const { produtos, comandas, caixas, caixaAberto, loading } = bar;

  const [aba, setAba] = useState<Aba>('abertas');
  const [painel, setPainel] = useState<Painel>('comandas');
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [buscaComanda, setBuscaComanda] = useState('');

  const [categoria, setCategoria] = useState<string | null>(null);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [quantidade, setQuantidade] = useState(1);

  const [forma, setForma] = useState<BarFormaPagamento>('Pix');
  const [parcelas, setParcelas] = useState<{ id: string; forma: BarFormaPagamento; valor: number }[]>([]);
  const [valor, setValor] = useState<number | undefined>(undefined);
  const [recebidoDinheiro, setRecebidoDinheiro] = useState<number | undefined>(undefined);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [incluirPoker, setIncluirPoker] = useState(true);

  // Preferências do operador neste navegador: valores ocultos (o PDV costuma
  // ficar virado para o balcão) e painel da comanda recolhido.
  const [ocultarValores, setOcultarValores] = useState(() => lerPreferencia('pdv:ocultar-valores'));
  const [contaMinimizada, setContaMinimizada] = useState(() => lerPreferencia('pdv:conta-minimizada'));
  useEffect(() => { gravarPreferencia('pdv:ocultar-valores', ocultarValores); }, [ocultarValores]);
  useEffect(() => { gravarPreferencia('pdv:conta-minimizada', contaMinimizada); }, [contaMinimizada]);
  const valorCaixa = (v: number) => (ocultarValores ? 'R$ ••••••' : brl(v));

  const [toast, setToast] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [dialogo, setDialogo] = useState<
    | { tipo: 'motivo'; titulo: string; descricao: string; confirmar: string; perigo?: boolean; acao: (m: string) => Promise<void> }
    | { tipo: 'movimento'; mov: 'sangria' | 'suprimento' }
    | { tipo: 'fechar-caixa' }
    | null
  >(null);

  const selecionada = comandas.find(c => c.id === selecionadaId) || null;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const avisar = (tipo: 'ok' | 'erro', texto: string) => {
    setToast({ tipo, texto });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), tipo === 'erro' ? 5000 : 2500);
  };

  /** Executa uma ação do bar mostrando o motivo de qualquer recusa. Retorna se deu certo. */
  const executar = async (acao: () => Promise<unknown>, sucesso?: string): Promise<boolean> => {
    try {
      await acao();
      if (sucesso) avisar('ok', sucesso);
      return true;
    } catch (e) {
      avisar('erro', e instanceof BarRegraError ? e.message : 'Não foi possível salvar. Verifique a conexão e tente novamente.');
      return false;
    }
  };

  // Ao trocar de comanda, ou quando o saldo dela muda, o valor sugerido para
  // receber volta a ser o saldo e as partes separadas são descartadas.
  useEffect(() => {
    setIncluirPoker(true);
    setMostrarHistorico(false);
  }, [selecionadaId]);

  // ── Listas ──

  const listas = useMemo(() => {
    const termo = normalizar(buscaComanda);
    const filtra = (c: BarComanda) => !termo || normalizar(c.clienteNome).includes(termo) || String(c.numero || '') === termo;
    return {
      abertas: comandas.filter(c => c.status === 'aberta' && filtra(c))
        .sort((a, b) => (a.numero || 0) - (b.numero || 0)),
      // Inclui fiado de caixas anteriores: dívida não some quando o dia acaba.
      receber: comandas.filter(c => ehFiado(c) && filtra(c))
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()),
      encerradas: comandas.filter(c => (c.status === 'paga' || c.status === 'cancelada') && c.caixaId === caixaAberto?.id && filtra(c))
        .sort((a, b) => new Date(b.pagoEm || b.canceladaEm || b.data).getTime() - new Date(a.pagoEm || a.canceladaEm || a.data).getTime()),
    };
  }, [comandas, buscaComanda, caixaAberto?.id]);

  // ── Poker do dia ──
  // O rascunho do lançamento muda em outra janela: o evento storage avisa.
  const [versaoRascunho, setVersaoRascunho] = useState(0);
  useEffect(() => {
    const aoMudar = (e: StorageEvent) => { if (!e.key || e.key.startsWith('draft_')) setVersaoRascunho(v => v + 1); };
    window.addEventListener('storage', aoMudar);
    return () => window.removeEventListener('storage', aoMudar);
  }, []);

  /** Dias de operação de uma comanda: os do caixa em que ela foi aberta. */
  const diasDaComanda = (c: BarComanda) => {
    const cx = caixas.find(x => x.id === c.caixaId);
    return cx ? diasDoPeriodo(cx.abertoEm, cx.fechadoEm || cx.canceladoEm) : new Set([diaOperacional(c.data)]);
  };

  const pokerDoCaixa = useMemo(
    () => (caixaAberto ? gastosPokerNosDias(house.rankings, diasDoPeriodo(caixaAberto.abertoEm)) : []),
    [caixaAberto, house.rankings, versaoRascunho]
  );

  const pokerDaSelecionada = useMemo(
    () => (selecionada
      ? gastosDaPessoa(gastosPokerNosDias(house.rankings, diasDaComanda(selecionada)), selecionada.clienteNome, selecionada.playerId)
      : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selecionada, caixas, house.rankings, versaoRascunho]
  );

  const resumoCaixa = useMemo(() => {
    if (!caixaAberto) return null;
    const doCaixa = comandas.filter(c => c.caixaId === caixaAberto.id && c.status !== 'cancelada');
    const vendido = doCaixa.reduce((acc, c) => acc + somaItens(c.itens), 0);
    let recebido = 0;
    for (const c of comandas) for (const p of c.pagamentos || []) if (p.caixaId === caixaAberto.id && !p.estornado) recebido += p.valor;
    recebido += Object.values(recebidoPokerNoCaixa(caixaAberto.id, comandas)).reduce((a, v) => a + v, 0);
    const esperado = esperadoNoCaixa(caixaAberto, comandas);
    return { vendido, recebido, dinheiro: esperado.Dinheiro || 0, esperado };
  }, [caixaAberto, comandas]);

  // ── A receber: bar + poker do dia ──

  const pokerPendente = pokerDaSelecionada.filter(g => !g.pago && g.total > 0);
  const totalPokerPendente = Math.round(pokerPendente.reduce((a, g) => a + g.total, 0) * 100) / 100;
  const saldoBar = selecionada && (selecionada.status === 'aberta' || selecionada.status === 'fechada') ? saldoComanda(selecionada) : 0;
  const podeReceberPoker = !!selecionada && selecionada.status !== 'cancelada' && totalPokerPendente > 0;
  const pokerNoRecebimento = podeReceberPoker && (incluirPoker || saldoBar <= 0);
  const aReceber = Math.round((saldoBar + (pokerNoRecebimento ? totalPokerPendente : 0)) * 100) / 100;

  // Ao trocar de comanda, ou quando o que falta receber muda, o valor sugerido
  // volta a ser o total e as partes separadas são descartadas.
  useEffect(() => {
    setValor(aReceber || undefined);
    setRecebidoDinheiro(undefined);
    setParcelas([]);
  }, [selecionadaId, aReceber]);

  // ── Impressão ──

  const imprimir = (c: BarComanda) => {
    const pessoa = c.playerId ? pessoas.find(p => p.jogador?.id === c.playerId) : undefined;
    imprimirPreConta({
      casa: {
        nome: house.name,
        logoUrl: house.profile?.logoUrl,
        contato: house.profile?.contacts?.find(x => x.phone)?.phone,
        instagram: house.profile?.instagramUrl,
      },
      cliente: { nome: c.clienteNome, telefone: pessoa?.telefone },
      comanda: c,
      poker: gastosDaPessoa(gastosPokerNosDias(house.rankings, diasDaComanda(c)), c.clienteNome, c.playerId),
    });
  };

  // ── Sugestões de nome ──

  const sugestoes = useMemo(() => {
    const termo = normalizar(novoNome);
    if (!termo) return [];
    // Base: o cadastro geral de jogadores (sem os arquivados). Depois, clientes
    // do bar que não são jogadores, vindos de comandas anteriores.
    const mapa = new Map<string, { nome: string; playerId?: string; jogador: boolean }>();
    for (const p of pessoas) {
      if (p.ativo && !mapa.has(p.chave)) mapa.set(p.chave, { nome: p.nome, playerId: p.jogador?.id, jogador: true });
    }
    for (const c of comandas) {
      const k = normalizar(c.clienteNome);
      if (k && !mapa.has(k)) mapa.set(k, { nome: c.clienteNome, playerId: c.playerId, jogador: false });
    }
    return [...mapa.values()]
      .filter(s => normalizar(s.nome).includes(termo))
      .sort((a, b) => Number(!normalizar(a.nome).startsWith(termo)) - Number(!normalizar(b.nome).startsWith(termo)) || a.nome.localeCompare(b.nome))
      .slice(0, 7);
  }, [novoNome, pessoas, comandas]);

  const abrirComanda = async (sugestao?: { nome: string; playerId?: string }) => {
    const nome = (sugestao?.nome || novoNome).trim();
    if (!nome) return;
    const existente = comandas.find(c => c.status === 'aberta' && normalizar(c.clienteNome) === normalizar(nome));
    setNovoNome('');
    setMostrarSugestoes(false);
    if (existente) {
      setAba('abertas');
      setSelecionadaId(existente.id);
      setPainel('produtos');
      avisar('ok', `${existente.clienteNome} já tem a comanda #${existente.numero ?? ''} aberta.`);
      return;
    }
    let id = '';
    const ok = await executar(async () => { id = await bar.abrirComanda(nome, sugestao?.playerId); });
    if (ok && id) {
      setAba('abertas');
      setSelecionadaId(id);
      setPainel('produtos');
    }
  };

  // ── Produtos ──

  const categorias = useMemo(
    () => [...new Set(produtos.filter(p => p.ativo !== false).map(p => p.categoria).filter(Boolean) as string[])].sort(),
    [produtos]
  );
  const produtosVisiveis = useMemo(() => {
    const termo = normalizar(buscaProduto);
    return produtos
      .filter(p => p.ativo !== false)
      .filter(p => !categoria || p.categoria === categoria)
      .filter(p => !termo || normalizar(p.nome).includes(termo) || normalizar(p.codigo || '') === termo)
      .sort((a, b) => Number(!!b.destaque) - Number(!!a.destaque) || a.nome.localeCompare(b.nome));
  }, [produtos, categoria, buscaProduto]);

  const lancar = async (p: BarProduto) => {
    if (!selecionada) return avisar('erro', 'Selecione ou abra uma comanda primeiro.');
    const qtd = quantidade;
    const ok = await executar(() => bar.lancarItem(selecionada.id, p, qtd), `${qtd}× ${p.nome} lançado`);
    if (ok) setQuantidade(1);
  };

  // ── Pagamento ──

  const valorNum = valor || 0;
  const recebidoNum = recebidoDinheiro || 0;
  const troco = forma === 'Dinheiro' && recebidoNum > valorNum ? recebidoNum - valorNum : 0;

  // Partes já separadas para um pagamento dividido, ainda não gravadas.
  const totalParcelas = parcelas.reduce((acc, p) => acc + p.valor, 0);
  const restante = Math.max(0, Math.round((aReceber - totalParcelas) * 100) / 100);
  const totalAReceber = totalParcelas + valorNum;

  /** Separa a parte digitada e deixa o campo pronto com o que falta. */
  const dividir = () => {
    if (!(valorNum > 0)) return avisar('erro', 'Informe o valor desta forma de pagamento.');
    if (valorNum > restante + 0.009) return avisar('erro', `Passa do que falta receber (${brl(restante)}).`);
    if (forma === 'Dinheiro' && recebidoDinheiro != null && recebidoNum < valorNum - 0.009) {
      return avisar('erro', 'O dinheiro entregue é menor que a parte em dinheiro.');
    }
    const novoRestante = Math.round((restante - valorNum) * 100) / 100;
    setParcelas(p => [...p, { id: `${Date.now()}`, forma, valor: valorNum }]);
    setValor(novoRestante > 0 ? novoRestante : undefined);
    setRecebidoDinheiro(undefined);
  };

  const receber = async () => {
    if (!selecionada) return;
    if (forma === 'Dinheiro' && valorNum > 0 && recebidoDinheiro != null && recebidoNum < valorNum - 0.009) {
      return avisar('erro', 'O dinheiro recebido é menor que o valor a pagar.');
    }
    // Parcelas separadas + o que estiver no campo agora, tudo numa gravação só.
    const partes = [...parcelas.map(p => ({ valor: p.valor, forma: p.forma })), ...(valorNum > 0 ? [{ valor: valorNum, forma }] : [])];
    if (partes.length === 0) return avisar('erro', 'Informe o valor a receber.');
    const total = partes.reduce((acc, p) => acc + p.valor, 0);
    const resumo = partes.length > 1
      ? `${brl(total)} recebido em ${partes.length} formas`
      : `${brl(total)} recebido em ${partes[0].forma}${troco > 0 ? ` · troco ${brl(troco)}` : ''}`;
    const ok = await executar(() => bar.registrarPagamentos(selecionada.id, partes, pokerNoRecebimento ? pokerPendente : []), resumo);
    if (ok) setParcelas([]);
  };

  // ── Sem caixa aberto ──

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-[#07090d] text-gray-500 text-sm">Carregando o bar...</div>;
  }
  if (!caixaAberto) {
    return <TelaAbrirCaixa casa={house.name} ultimo={caixas.filter(c => c.status === 'fechado').sort((a, b) => (b.fechadoEm || '').localeCompare(a.fechadoEm || ''))[0]}
                           onAbrir={fundo => executar(() => bar.abrirCaixa(fundo), 'Caixa aberto')}
                           toast={toast} />;
  }

  const ativos = listas[aba];
  const podeLancar = selecionada?.status === 'aberta';

  return (
    <div className="h-screen flex flex-col bg-[#07090d] text-white overflow-hidden">
      {/* Barra do caixa */}
      <header className="shrink-0 border-b border-white/10 bg-black/40 px-3 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-300 shrink-0">
            <Store size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm truncate">PDV · {house.name}</p>
            <p className="text-[10px] font-bold text-gray-500">Caixa aberto às {hora(caixaAberto.abertoEm)} · {new Date(caixaAberto.abertoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
          </div>
        </div>
        {resumoCaixa && (
          <div className="flex items-center gap-4 md:gap-6 text-right">
            <div><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Vendido</p><p className="font-black text-sm tabular-nums">{valorCaixa(resumoCaixa.vendido)}</p></div>
            <div><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Recebido</p><p className={`font-black text-sm tabular-nums ${ocultarValores ? '' : 'text-emerald-400'}`}>{valorCaixa(resumoCaixa.recebido)}</p></div>
            <div className="hidden sm:block"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Dinheiro na gaveta</p><p className="font-black text-sm tabular-nums">{valorCaixa(resumoCaixa.dinheiro)}</p></div>
            <button onClick={() => setOcultarValores(v => !v)}
                    title={ocultarValores ? 'Mostrar valores do caixa' : 'Ocultar valores do caixa'}
                    aria-pressed={ocultarValores}
                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
              {ocultarValores ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => setDialogo({ tipo: 'movimento', mov: 'suprimento' })} title="Colocar dinheiro na gaveta"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/5">
            <ArrowDownCircle size={14} /> <span className="hidden lg:inline">Suprimento</span>
          </button>
          <button onClick={() => setDialogo({ tipo: 'movimento', mov: 'sangria' })} title="Retirar dinheiro da gaveta"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/5">
            <ArrowUpCircle size={14} /> <span className="hidden lg:inline">Sangria</span>
          </button>
          <button onClick={() => setDialogo({ tipo: 'fechar-caixa' })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600/15 border border-red-500/30 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-600/25">
            <Lock size={14} /> Fechar caixa
          </button>
        </div>
      </header>

      {/* Navegação mobile */}
      <div className="lg:hidden shrink-0 flex border-b border-white/10">
        {(['comandas', 'produtos', 'conta'] as Painel[]).map(p => (
          <button key={p} onClick={() => setPainel(p)}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${painel === p ? 'text-white border-b-2 border-violet-500' : 'text-gray-500'}`}>
            {p === 'comandas' ? 'Comandas' : p === 'produtos' ? 'Produtos' : selecionada ? `#${selecionada.numero ?? ''} Conta` : 'Conta'}
          </button>
        ))}
      </div>

      <div className={`flex-1 min-h-0 grid grid-cols-1 transition-[grid-template-columns] duration-200 ${
        contaMinimizada ? 'lg:grid-cols-[300px_minmax(0,1fr)_72px]' : 'lg:grid-cols-[300px_minmax(0,1fr)_380px]'
      }`}>
        {/* Comandas */}
        <section className={`${painel === 'comandas' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0 border-r border-white/10`}>
          <div className="p-3 space-y-2 shrink-0 border-b border-white/10">
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <UserRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input value={novoNome} placeholder="Nova comanda: nome do cliente"
                         onChange={e => { setNovoNome(e.target.value); setMostrarSugestoes(true); }}
                         onFocus={() => setMostrarSugestoes(true)}
                         onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
                         onKeyDown={e => {
                           if (e.key === 'Enter') { e.preventDefault(); abrirComanda(sugestoes.find(s => normalizar(s.nome) === normalizar(novoNome))); }
                           if (e.key === 'Escape') setMostrarSugestoes(false);
                         }}
                         className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold outline-none focus:border-violet-500/60" />
                </div>
                <button onClick={() => abrirComanda(sugestoes.find(s => normalizar(s.nome) === normalizar(novoNome)))} disabled={!novoNome.trim()}
                        className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-xl px-3 transition-all" title="Abrir comanda">
                  <Plus size={18} />
                </button>
              </div>
              {mostrarSugestoes && sugestoes.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                  {sugestoes.map(s => (
                    <button key={normalizar(s.nome)} onMouseDown={e => e.preventDefault()} onClick={() => abrirComanda(s)}
                            className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-violet-600/10 transition-colors">
                      <span className="text-sm font-bold truncate">{s.nome}</span>
                      {s.jogador && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest shrink-0">Jogador</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex bg-white/[0.03] border border-white/10 rounded-xl p-1">
              {([['abertas', 'Abertas'], ['receber', 'A receber'], ['encerradas', 'Encerradas']] as [Aba, string][]).map(([id, rot]) => (
                <button key={id} onClick={() => setAba(id)}
                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${aba === id ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  {rot}{listas[id].length > 0 && <span className="opacity-70"> {listas[id].length}</span>}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input value={buscaComanda} onChange={e => setBuscaComanda(e.target.value)} placeholder="Buscar nome ou número"
                     className="w-full bg-transparent border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-violet-500/50" />
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
            {ativos.length === 0 ? (
              <li className="py-14 text-center text-gray-600 text-xs px-6">
                {aba === 'abertas' ? 'Nenhuma comanda aberta. Digite um nome acima.' : aba === 'receber' ? 'Ninguém devendo.' : 'Nada encerrado neste caixa.'}
              </li>
            ) : ativos.map(c => {
              const saldo = saldoComanda(c);
              const ativa = c.id === selecionadaId;
              const deOutroCaixa = c.caixaId !== caixaAberto.id;
              return (
                <li key={c.id}>
                  <button onClick={() => { setSelecionadaId(c.id); setPainel(c.status === 'aberta' ? 'produtos' : 'conta'); }}
                          className={`w-full text-left px-3 py-3 flex items-center gap-3 border-l-2 transition-colors ${ativa ? 'bg-violet-600/10 border-violet-500' : 'border-transparent hover:bg-white/[0.03]'}`}>
                    <span className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black tabular-nums shrink-0">
                      {c.numero ?? '—'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold truncate">{c.clienteNome}</span>
                      <span className="block text-[10px] text-gray-500 font-bold">
                        {deOutroCaixa ? `desde ${dataHora(c.data)}` : `aberta ${hora(c.data)}`}
                        {c.status === 'cancelada' && ' · cancelada'}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className={`block text-sm font-black tabular-nums ${c.status === 'paga' ? 'text-emerald-400' : c.status === 'cancelada' ? 'text-gray-600 line-through' : saldo > 0 && c.status === 'fechada' ? 'text-amber-500' : 'text-white'}`}>
                        {brl(c.status === 'fechada' ? saldo : c.total)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Produtos */}
        <section className={`${painel === 'produtos' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0 border-r border-white/10`}>
          <div className="p-3 space-y-2 shrink-0 border-b border-white/10">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={buscaProduto} onChange={e => setBuscaProduto(e.target.value)} placeholder="Buscar produto ou código"
                       className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-violet-500/60" />
              </div>
              <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl">
                <button onClick={() => setQuantidade(q => Math.max(1, q - 1))} className="px-2.5 h-full text-gray-400 hover:text-white"><Minus size={14} /></button>
                <span className="w-10 text-center text-sm font-black tabular-nums" title="Quantidade do próximo lançamento">{quantidade}×</span>
                <button onClick={() => setQuantidade(q => Math.min(99, q + 1))} className="px-2.5 h-full text-gray-400 hover:text-white"><Plus size={14} /></button>
              </div>
            </div>
            {categorias.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {[null, ...categorias].map(c => (
                  <button key={c ?? 'todas'} onClick={() => setCategoria(c)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${categoria === c ? 'bg-violet-600 border-violet-500' : 'border-white/10 text-gray-500 hover:text-gray-300'}`}>
                    {c ?? 'Todos'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
            {!podeLancar && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-gray-400">
                <Receipt size={14} className="shrink-0" />
                {selecionada
                  ? `A comanda #${selecionada.numero ?? ''} está ${STATUS_ROTULO[selecionada.status].texto.toLowerCase()} — não aceita novos itens.`
                  : 'Selecione uma comanda aberta para lançar produtos.'}
              </div>
            )}
            {produtosVisiveis.length === 0 ? (
              <div className="py-16 text-center text-gray-600 text-sm">
                <Package size={26} className="mx-auto mb-2" />
                {produtos.length === 0 ? 'Nenhum produto cadastrado. Cadastre em Bar › Produtos.' : 'Nenhum produto encontrado.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {produtosVisiveis.map(p => {
                  const est = situacaoEstoque(p);
                  return (
                    <button key={p.id} onClick={() => lancar(p)} disabled={!podeLancar}
                            className="group text-left rounded-xl border border-white/10 bg-white/[0.02] hover:border-violet-500/50 hover:bg-violet-600/[0.06] disabled:opacity-30 disabled:grayscale disabled:hover:border-white/10 disabled:hover:bg-white/[0.02] disabled:cursor-not-allowed overflow-hidden transition-all active:scale-[0.97]">
                      <div className="relative aspect-[4/3] bg-black/40">
                        {p.imagem
                          ? <img src={p.imagem} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-gray-700"><Package size={22} /></div>}
                        {est === 'zerado' && <span className="absolute top-1.5 right-1.5 bg-red-600 text-[8px] font-black uppercase rounded px-1.5 py-0.5">Sem estoque</span>}
                        {est === 'baixo' && <span className="absolute top-1.5 right-1.5 bg-amber-500 text-black text-[8px] font-black uppercase rounded px-1.5 py-0.5">{p.estoque} rest.</span>}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-bold leading-tight line-clamp-2 min-h-[2rem]">{p.nome}</p>
                        <p className="text-amber-500 text-sm font-black mt-1 tabular-nums">{brl(p.preco)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Conta */}
        <section className={`${painel === 'conta' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0`}>
          {/* Recolhida (só no desktop): barra estreita com o essencial, para a
              grade de produtos ganhar espaço enquanto se lança. */}
          {contaMinimizada && (
            <div className="hidden lg:flex flex-col items-center gap-4 py-4 h-full min-h-0">
              <button onClick={() => setContaMinimizada(false)} title="Expandir a comanda"
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                <PanelRightOpen size={18} />
              </button>
              {selecionada ? (
                <button onClick={() => setContaMinimizada(false)} title={`Comanda #${selecionada.numero ?? ''} — ${selecionada.clienteNome}`}
                        className="flex-1 min-h-0 flex flex-col items-center gap-3 w-full px-1 hover:bg-white/[0.02] rounded-xl transition-colors">
                  <span className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-sm font-black tabular-nums shrink-0">
                    {selecionada.numero ?? '—'}
                  </span>
                  <span className="flex-1 min-h-0 overflow-hidden font-black text-sm text-gray-300 [writing-mode:vertical-rl] rotate-180 truncate">
                    {selecionada.clienteNome}
                  </span>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    selecionada.status === 'paga' ? 'bg-emerald-400' : selecionada.status === 'fechada' ? 'bg-amber-500' : selecionada.status === 'cancelada' ? 'bg-red-400' : 'bg-sky-400'
                  }`} title={STATUS_ROTULO[selecionada.status].texto} />
                  <span className="text-[10px] font-black tabular-nums text-amber-500 [writing-mode:vertical-rl] rotate-180 shrink-0">
                    {brl(selecionada.status === 'aberta' ? selecionada.total : saldoComanda(selecionada))}
                  </span>
                </button>
              ) : (
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">
                  Nenhuma comanda
                </span>
              )}
            </div>
          )}

          <div className={`flex-1 min-h-0 flex flex-col ${contaMinimizada ? 'lg:hidden' : ''}`}>
          {!selecionada ? (
            <div className="flex-1 flex flex-col relative">
              <button onClick={() => setContaMinimizada(true)} title="Recolher o painel"
                      className="hidden lg:block absolute top-3 right-3 p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-all">
                <PanelRightClose size={16} />
              </button>
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 text-gray-600">
                <Receipt size={30} />
                <p className="text-sm">Selecione uma comanda.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="shrink-0 p-4 border-b border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Comanda #{selecionada.numero ?? '—'}</p>
                    <h3 className="font-black text-lg truncate">{selecionada.clienteNome}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[9px] font-black uppercase tracking-widest rounded-md px-2 py-1 mr-1 ${STATUS_ROTULO[selecionada.status].cls}`}>
                      {ehFiado(selecionada) && selecionada.caixaId !== caixaAberto.id ? 'Fiado' : STATUS_ROTULO[selecionada.status].texto}
                    </span>
                    <button onClick={() => imprimir(selecionada)} title="Imprimir conferência de consumo"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                      <Printer size={16} />
                    </button>
                    <button onClick={() => setContaMinimizada(true)} title="Recolher a comanda"
                            className="hidden lg:block p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                      <PanelRightClose size={16} />
                    </button>
                    <button onClick={() => { setSelecionadaId(null); setPainel('comandas'); }} title="Fechar a comanda (só sai da tela, nada é alterado)"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 font-bold mt-1">Aberta em {dataHora(selecionada.data)}</p>
              </div>

              <ul className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
                {selecionada.itens.length === 0 ? (
                  <li className="py-10 text-center text-gray-600 text-xs">Nada lançado ainda.</li>
                ) : selecionada.itens.map(i => (
                  <li key={i.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${i.cancelado ? 'bg-red-500/[0.04]' : 'bg-white/[0.03]'}`}>
                    <span className={`w-7 text-sm font-black tabular-nums shrink-0 ${i.cancelado ? 'text-gray-600' : ''}`}>{i.quantidade}×</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-bold truncate ${i.cancelado ? 'line-through text-gray-600' : ''}`}>{i.nome}</span>
                      <span className="block text-[10px] text-gray-500">
                        {i.cancelado ? `cancelado: ${i.motivoCancelamento}` : `${brl(i.precoUnitario)} · ${hora(i.lancadoEm)}`}
                      </span>
                    </span>
                    <span className={`text-sm font-black tabular-nums shrink-0 ${i.cancelado ? 'text-gray-600 line-through' : 'text-amber-500'}`}>
                      {brl(i.precoUnitario * i.quantidade)}
                    </span>
                    {!i.cancelado && selecionada.status === 'aberta' && (
                      <button title="Cancelar item"
                              onClick={() => setDialogo({
                                tipo: 'motivo', titulo: 'Cancelar item', perigo: true, confirmar: 'Cancelar item',
                                descricao: `${i.quantidade}× ${i.nome} (${brl(i.precoUnitario * i.quantidade)}) sai da conta e fica registrado como cancelado.`,
                                acao: m => bar.cancelarItem(selecionada.id, i.id, m),
                              })}
                              className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 shrink-0">
                        <Ban size={13} />
                      </button>
                    )}
                  </li>
                ))}
                {pokerDaSelecionada.map(g => <CartaoPoker key={`${g.rankingId}-${g.dia}-${g.playerId}`} gasto={g} />)}
              </ul>

              <div className="shrink-0 border-t border-white/10 bg-black/30 p-4 space-y-3">
                <div className="grid grid-cols-3 text-center">
                  <div><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Consumo</p><p className="font-black tabular-nums">{brl(selecionada.total)}</p></div>
                  <div><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Pago</p><p className="font-black text-emerald-400 tabular-nums">{brl(selecionada.valorPago)}</p></div>
                  <div><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Saldo</p><p className="font-black text-amber-500 tabular-nums">{brl(saldoComanda(selecionada))}</p></div>
                </div>
                {podeReceberPoker && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-500/20 bg-violet-600/[0.06] px-3 py-2">
                    <div>
                      <p className="text-[9px] font-black text-violet-300 uppercase tracking-widest">Poker a pagar</p>
                      <p className="font-black tabular-nums text-sm">{brl(totalPokerPendente)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total a receber</p>
                      <p className="font-black tabular-nums text-lg text-amber-500">{brl(saldoBar + totalPokerPendente)}</p>
                    </div>
                  </div>
                )}

                {/* Ações por estado: cada estado só oferece o que é permitido nele. */}
                {selecionada.status === 'aberta' && (
                  <button onClick={() => executar(() => bar.fecharConta(selecionada.id), 'Conta fechada')}
                          disabled={selecionada.total <= 0}
                          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                    <Lock size={14} /> Fechar conta
                  </button>
                )}

                {aReceber > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {selecionada.status === 'aberta' && saldoBar > 0 ? 'Receber agora (a comanda segue aberta)' : 'Receber'}
                      </p>
                      {parcelas.length > 0 && (
                        <p className="text-[10px] font-black text-gray-500 tabular-nums shrink-0">
                          falta <span className="text-amber-500">{brl(restante)}</span>
                        </p>
                      )}
                    </div>

                    {/* Partes já separadas de um pagamento dividido */}
                    {parcelas.length > 0 && (
                      <ul className="space-y-1">
                        {parcelas.map(p => (
                          <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2">
                            <span className="text-xs font-black text-gray-300">{p.forma}</span>
                            <span className="flex items-center gap-2">
                              <span className="text-xs font-black tabular-nums">{brl(p.valor)}</span>
                              <button onClick={() => {
                                        setParcelas(ps => ps.filter(x => x.id !== p.id));
                                        setValor(Math.round(((valor || 0) + p.valor) * 100) / 100);
                                      }}
                                      title="Remover esta parte" className="text-gray-600 hover:text-red-400"><X size={13} /></button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {podeReceberPoker && saldoBar > 0 && (
                      <label className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2 cursor-pointer select-none">
                        <input type="checkbox" checked={incluirPoker} onChange={e => setIncluirPoker(e.target.checked)}
                               className="accent-violet-500 w-4 h-4" />
                        <span className="text-xs font-bold text-gray-300 flex-1">Incluir o poker</span>
                        <span className="text-xs font-black tabular-nums text-violet-200">{brl(totalPokerPendente)}</span>
                      </label>
                    )}
                    {pokerNoRecebimento && (
                      <p className="text-[10px] text-gray-500 leading-snug">
                        O poker é quitado inteiro primeiro e marcado como pago no lançamento; o restante vai para o bar.
                      </p>
                    )}

                    <div className="grid grid-cols-4 gap-1">
                      {FORMAS.map(f => (
                        <button key={f} onClick={() => setForma(f)}
                                className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${forma === f ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
                          {f}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <InputMoeda className="flex-1 text-white" value={valor} onChange={setValor} onEnter={receber} ariaLabel="Valor nesta forma de pagamento" />
                      <button onClick={dividir} disabled={!(valorNum > 0) || valorNum >= restante - 0.009}
                              title="Separar este valor e receber o restante em outra forma"
                              className="shrink-0 rounded-xl px-3 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-1 transition-all">
                        <Plus size={13} /> Dividir
                      </button>
                    </div>
                    {forma === 'Dinheiro' && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Dinheiro entregue (opcional, para calcular o troco)</p>
                        <div className="flex items-center gap-2">
                          <InputMoeda className="flex-1 text-white" value={recebidoDinheiro} onChange={setRecebidoDinheiro} ariaLabel="Dinheiro entregue" />
                          {troco > 0 && <span className="text-sm font-black text-amber-400 shrink-0">Troco {brl(troco)}</span>}
                        </div>
                      </div>
                    )}

                    <button onClick={receber} disabled={!(totalAReceber > 0)}
                            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                      <Wallet size={14} />
                      Receber {brl(totalAReceber)}
                      {parcelas.length > 0 && valorNum > 0 && <span className="opacity-70 normal-case font-bold">· {parcelas.length + 1} formas</span>}
                      {parcelas.length > 0 && !(valorNum > 0) && <span className="opacity-70 normal-case font-bold">· {parcelas.length} {parcelas.length > 1 ? 'formas' : 'forma'}</span>}
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {selecionada.status === 'fechada' && (
                    <button onClick={() => setDialogo({
                              tipo: 'motivo', titulo: 'Reabrir conta', confirmar: 'Reabrir',
                              descricao: 'A comanda volta a aceitar consumo. A reabertura fica registrada no histórico.',
                              acao: m => bar.reabrirComanda(selecionada.id, m),
                            })}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white flex items-center gap-1.5">
                      <Unlock size={12} /> Reabrir conta
                    </button>
                  )}
                  {(selecionada.status === 'aberta' || selecionada.status === 'fechada') && (selecionada.valorPago || 0) <= 0
                    && !(selecionada.pagamentosPoker || []).some(p => !p.estornado) && (
                    <button onClick={() => setDialogo({
                              tipo: 'motivo', titulo: 'Cancelar comanda', confirmar: 'Cancelar comanda', perigo: true,
                              descricao: 'A comanda inteira é anulada e deixa de contar nas vendas. Itens com controle de estoque voltam ao estoque.',
                              acao: m => bar.cancelarComanda(selecionada.id, m),
                            })}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 flex items-center gap-1.5">
                      <Ban size={12} /> Cancelar comanda
                    </button>
                  )}
                  {selecionada.status === 'paga' && (
                    <span className="text-[10px] font-bold text-emerald-500/80 flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> Quitada às {hora(selecionada.pagoEm)}. Somente leitura.
                    </span>
                  )}
                </div>

                {((selecionada.pagamentos || []).length > 0 || (selecionada.pagamentosPoker || []).length > 0) && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Pagamentos</p>
                    <ul className="space-y-1">
                      {(selecionada.pagamentosPoker || []).map(p => (
                        <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className={`font-bold min-w-0 truncate ${p.estornado ? 'text-gray-600 line-through' : 'text-gray-400'}`}>
                            {dataHora(p.em)} · <span className="text-violet-300">Poker</span> · {p.partes.map(x => x.forma).join(' + ')}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className={`font-black tabular-nums ${p.estornado ? 'text-gray-600 line-through' : 'text-violet-200'}`}>{brl(p.valor)}</span>
                            {!p.estornado && (
                              <button title="Estornar o poker"
                                      onClick={() => setDialogo({
                                        tipo: 'motivo', titulo: 'Estornar poker', confirmar: 'Estornar', perigo: true,
                                        descricao: `${brl(p.valor)} do poker (${p.rankingNome}) é devolvido e o jogador volta a constar como "a pagar" no lançamento. Se foi em dinheiro, o valor sai da gaveta do caixa atual.`,
                                        acao: m => bar.estornarPagamentoPoker(selecionada.id, p.id, m),
                                      })}
                                      className="text-gray-600 hover:text-red-400"><RotateCcw size={12} /></button>
                            )}
                          </span>
                        </li>
                      ))}
                      {selecionada.pagamentos!.map(p => (
                        <li key={p.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className={`font-bold ${p.estornado ? 'text-gray-600 line-through' : 'text-gray-400'}`}>
                            {dataHora(p.em)} · {p.forma || '—'}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={`font-black tabular-nums ${p.estornado ? 'text-gray-600 line-through' : 'text-emerald-400'}`}>{brl(p.valor)}</span>
                            {!p.estornado && selecionada.status !== 'cancelada' && (
                              <button title="Estornar pagamento"
                                      onClick={() => setDialogo({
                                        tipo: 'motivo', titulo: 'Estornar pagamento', confirmar: 'Estornar', perigo: true,
                                        descricao: `${brl(p.valor)} em ${p.forma || '—'} volta a ficar em aberto na comanda. Se foi em dinheiro, o valor sai da gaveta do caixa atual.`,
                                        acao: m => bar.estornarPagamento(selecionada.id, p.id!, m),
                                      })}
                                      className="text-gray-600 hover:text-red-400"><RotateCcw size={12} /></button>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(selecionada.historico || []).length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <button onClick={() => setMostrarHistorico(v => !v)}
                            className="w-full flex items-center justify-between text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-gray-300">
                      <span className="flex items-center gap-1.5"><History size={11} /> Histórico</span>
                      {mostrarHistorico ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {mostrarHistorico && (
                      <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                        {[...selecionada.historico!].reverse().map((ev, idx) => (
                          <li key={idx} className="text-[10px] text-gray-500"><span className="text-gray-600 tabular-nums">{dataHora(ev.em)}</span> · {ev.descricao}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          </div>
        </section>
      </div>

      {/* Diálogos */}
      {dialogo?.tipo === 'motivo' && (
        <DialogoMotivo titulo={dialogo.titulo} descricao={dialogo.descricao} confirmar={dialogo.confirmar} perigo={dialogo.perigo}
                       onClose={() => setDialogo(null)}
                       onConfirm={m => executar(() => dialogo.acao(m), `${dialogo.titulo} concluído`)} />
      )}
      {dialogo?.tipo === 'movimento' && (
        <DialogoMovimento tipo={dialogo.mov} dinheiro={resumoCaixa?.dinheiro || 0} onClose={() => setDialogo(null)}
                          onConfirm={(v, m) => executar(() => bar.registrarMovimento(dialogo.mov, v, m),
                            dialogo.mov === 'sangria' ? 'Sangria registrada' : 'Suprimento registrado')} />
      )}
      {dialogo?.tipo === 'fechar-caixa' && resumoCaixa && (
        <DialogoFecharCaixa recebido={recebidoNoCaixa(caixaAberto.id, comandas)} abertas={comandas.filter(c => c.status === 'aberta').length}
                            recebidoPoker={recebidoPokerNoCaixa(caixaAberto.id, comandas)}
                            poker={pokerDoCaixa}
                            onClose={() => setDialogo(null)}
                            onConfirm={() => executar(() => bar.fecharCaixa(), 'Caixa fechado')}
                            onCancelarCaixa={() => {
                              const doCaixa = comandas.filter(c => c.caixaId === caixaAberto.id && c.status !== 'cancelada').length;
                              const recebido = Object.values(recebidoNoCaixa(caixaAberto.id, comandas)).reduce((a, v) => a + v, 0)
                                + Object.values(recebidoPokerNoCaixa(caixaAberto.id, comandas)).reduce((a, v) => a + v, 0);
                              setDialogo({
                                tipo: 'motivo',
                                titulo: 'Cancelar caixa',
                                descricao: `Use quando o caixa foi aberto por engano. ${doCaixa > 0 ? `${doCaixa} comanda(s) deste caixa serão canceladas` : 'Nenhuma comanda será afetada'}${recebido > 0 ? ` e ${brl(recebido)} em pagamentos serão estornados` : ''}. O estoque volta e nada entra no financeiro. Fica tudo registrado com o motivo.`,
                                confirmar: 'Cancelar caixa',
                                perigo: true,
                                acao: m => bar.cancelarCaixa(m),
                              });
                            }} />
      )}

      {toast && <Toast {...toast} />}
    </div>
  );
};

// ─── Peças auxiliares ────────────────────────────────────────────────────────

const quantos = (n: number) => (n > 0 ? `${n}×` : '—');

/** Gasto de poker do jogador no dia, exibido na comanda — separado do consumo do bar. */
const CartaoPoker: React.FC<{ gasto: GastoPoker }> = ({ gasto }) => (
  <li className="mt-3 rounded-xl border border-violet-500/20 bg-violet-600/[0.06] px-3 py-2.5">
    <div className="flex items-center justify-between gap-2 mb-1.5">
      <p className="text-[10px] font-black uppercase tracking-widest text-violet-300 truncate">
        Poker · {gasto.rankingNome}{gasto.etapaNome ? ` · ${gasto.etapaNome}` : ''}
      </p>
      <span className={`text-[9px] font-black uppercase tracking-widest rounded-md px-1.5 py-0.5 shrink-0 ${
        gasto.pago ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'}`}>
        {gasto.pago ? 'Pago' : 'A pagar'}
      </span>
    </div>
    {gasto.linhas.map(l => (
      <div key={l.rotulo} className="flex items-center gap-2 py-0.5 text-sm">
        <span className="w-7 font-black tabular-nums shrink-0">{l.quantidade}×</span>
        <span className="flex-1 min-w-0 truncate font-bold">
          {l.rotulo}
          {l.unitario != null && <span className="text-[10px] text-gray-500 font-bold"> · {brl(l.unitario)}</span>}
        </span>
        <span className="font-black tabular-nums text-violet-200 shrink-0">{l.unitario != null ? brl(l.total) : '—'}</span>
      </div>
    ))}
    <div className="flex justify-between gap-2 border-t border-white/10 mt-1.5 pt-1.5 text-sm">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 self-center">
        Total poker{gasto.rascunho ? ' · lançamento em andamento' : ''}
      </span>
      <span className="font-black tabular-nums">{brl(gasto.total)}</span>
    </div>
  </li>
);

const COLUNAS_FIXAS = ['Buy-in', 'Rebuy', 'Rebuy duplo', 'Add-on'];

/** Gastos de poker de cada jogador nas etapas do dia, agrupados por etapa. */
const TabelaPokerDoDia: React.FC<{ gastos: GastoPoker[] }> = ({ gastos }) => {
  const grupos = new Map<string, GastoPoker[]>();
  for (const g of gastos) {
    const k = `${g.rankingId}|${g.dia}|${g.rascunho}`;
    grupos.set(k, [...(grupos.get(k) || []), g]);
  }
  const extras = (g: GastoPoker) =>
    g.linhas.filter(l => !COLUNAS_FIXAS.includes(l.rotulo)).reduce((a, l) => a + l.total, 0);
  const valor = (g: GastoPoker, rotulo: string) => g.linhas.find(l => l.rotulo === rotulo)?.total || 0;
  const celula = (qtd: number, total: number) => qtd > 0
    ? <><span className="font-black text-white">{quantos(qtd)}</span> <span className="text-gray-400">{formatBRL(total)}</span></>
    : <span className="text-gray-700">—</span>;
  const dia = (d: string) => d.split('-').reverse().slice(0, 2).join('/');

  return (
    <div className="space-y-5">
      {[...grupos.entries()].sort((a, b) => a[1][0].dia.localeCompare(b[1][0].dia)).map(([chave, lista]) => {
        const g0 = lista[0];
        const temExtras = lista.some(g => extras(g) > 0);
        const soma = (f: (g: GastoPoker) => number) => lista.reduce((a, g) => a + f(g), 0);
        return (
          <section key={chave}>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <p className="text-[10px] font-black text-violet-300 uppercase tracking-widest">
                Poker do dia · {g0.rankingNome}{g0.etapaNome ? ` · ${g0.etapaNome}` : ''} · {dia(g0.dia)}
              </p>
              {g0.rascunho && <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 shrink-0">lançamento em andamento</span>}
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs tabular-nums whitespace-nowrap">
                <thead>
                  <tr className="text-[9px] font-black text-gray-500 uppercase tracking-widest text-right">
                    <th className="text-left pb-2 pr-3">Jogador</th>
                    <th className="pb-2 px-2">Buy-in</th>
                    <th className="pb-2 px-2">Rebuy</th>
                    <th className="pb-2 px-2">Rebuy duplo</th>
                    <th className="pb-2 px-2">Add-on</th>
                    {temExtras && <th className="pb-2 px-2">Extras</th>}
                    <th className="pb-2 px-2">Total</th>
                    <th className="pb-2 pl-2 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {lista.map(g => (
                    <tr key={g.playerId} className="text-right">
                      <td className="py-1.5 pr-3 text-left font-bold text-gray-200 truncate max-w-[180px]">{g.nome}</td>
                      <td className="py-1.5 px-2">{celula(g.buyIns, valor(g, 'Buy-in'))}</td>
                      <td className="py-1.5 px-2">{celula(g.rebuys, valor(g, 'Rebuy'))}</td>
                      <td className="py-1.5 px-2">{celula(g.rebuysDuplos, valor(g, 'Rebuy duplo'))}</td>
                      <td className="py-1.5 px-2">{celula(g.addons, valor(g, 'Add-on'))}</td>
                      {temExtras && <td className="py-1.5 px-2 text-gray-400">{extras(g) > 0 ? formatBRL(extras(g)) : '—'}</td>}
                      <td className="py-1.5 px-2 font-black text-white">{formatBRL(g.total)}</td>
                      <td className="py-1.5 pl-2 text-center">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${g.pago ? 'text-emerald-400' : 'text-amber-500'}`}>
                          {g.pago ? 'Pago' : 'A pagar'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-right border-t border-gray-600">
                    <td className="pt-2 pr-3 text-left text-[9px] font-black text-gray-500 uppercase tracking-widest">{lista.length} jogador(es)</td>
                    <td className="pt-2 px-2">{celula(soma(g => g.buyIns), soma(g => valor(g, 'Buy-in')))}</td>
                    <td className="pt-2 px-2">{celula(soma(g => g.rebuys), soma(g => valor(g, 'Rebuy')))}</td>
                    <td className="pt-2 px-2">{celula(soma(g => g.rebuysDuplos), soma(g => valor(g, 'Rebuy duplo')))}</td>
                    <td className="pt-2 px-2">{celula(soma(g => g.addons), soma(g => valor(g, 'Add-on')))}</td>
                    {temExtras && <td className="pt-2 px-2 text-gray-400">{formatBRL(soma(extras))}</td>}
                    <td className="pt-2 px-2 font-black text-violet-200">{formatBRL(soma(g => g.total))}</td>
                    <td className="pt-2 pl-2 text-center text-[9px] font-black text-amber-500 uppercase tracking-widest">
                      {formatBRL(soma(g => (g.pago ? 0 : g.total)))} a pagar
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
};


const Toast: React.FC<{ tipo: 'ok' | 'erro'; texto: string }> = ({ tipo, texto }) => (
  <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[400] max-w-[92vw] flex items-center gap-2 rounded-xl px-4 py-3 shadow-2xl text-sm font-bold animate-in slide-in-from-bottom-2 duration-200 ${
    tipo === 'ok' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
  }`}>
    {tipo === 'ok' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
    {texto}
  </div>
);

const TelaAbrirCaixa: React.FC<{
  casa: string; ultimo?: { fechadoEm?: string };
  onAbrir: (fundo: number) => Promise<boolean>; toast: { tipo: 'ok' | 'erro'; texto: string } | null;
}> = ({ casa, ultimo, onAbrir, toast }) => {
  const [fundo, setFundo] = useState<number | undefined>(undefined);
  const [enviando, setEnviando] = useState(false);
  const abrir = async () => {
    if (enviando) return;
    setEnviando(true);
    await onAbrir(fundo || 0);
    setEnviando(false);
  };
  return (
    <div className="h-screen flex items-center justify-center bg-[#07090d] text-white p-4">
      <div className="w-full max-w-sm bg-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-300 mx-auto"><Store size={26} /></div>
          <h1 className="text-xl font-black">Abrir caixa do bar</h1>
          <p className="text-gray-500 text-sm">{casa}</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fundo de troco (dinheiro na gaveta)</label>
          <InputMoeda autoFocus className="text-white text-lg" value={fundo} onChange={setFundo} onEnter={abrir} ariaLabel="Fundo de troco" />
          <p className="text-[10px] text-gray-600 ml-1">O dinheiro que já está na gaveta antes da primeira venda.</p>
        </div>
        <button onClick={abrir} disabled={enviando}
                className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
          <Unlock size={15} /> {enviando ? 'Abrindo...' : 'Abrir caixa'}
        </button>
        {ultimo?.fechadoEm && (
          <p className="text-center text-[10px] text-gray-600">Último caixa fechado em {dataHora(ultimo.fechadoEm)}.</p>
        )}
      </div>
      {toast && <Toast {...toast} />}
    </div>
  );
};

const DialogoMovimento: React.FC<{
  tipo: 'sangria' | 'suprimento'; dinheiro: number; onClose: () => void; onConfirm: (valor: number, motivo: string) => Promise<boolean>;
}> = ({ tipo, dinheiro, onClose, onConfirm }) => {
  const [valor, setValor] = useState<number | undefined>(undefined);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const v = valor || 0;
  const enviar = async () => {
    setEnviando(true);
    const ok = await onConfirm(v, motivo);
    setEnviando(false);
    if (ok) onClose();
  };
  return (
    <Dialogo titulo={tipo === 'sangria' ? 'Sangria — retirar dinheiro' : 'Suprimento — colocar dinheiro'} onClose={onClose}>
      <p className="text-gray-400 text-sm mb-4">
        {tipo === 'sangria'
          ? `Retirada da gaveta para cofre, depósito ou pagamento. Há ${brl(dinheiro)} em dinheiro no caixa.`
          : 'Entrada de dinheiro na gaveta que não é venda — reforço de troco, por exemplo.'}
      </p>
      <div className="space-y-3">
        <InputMoeda autoFocus className="text-white" value={valor} onChange={setValor} ariaLabel="Valor" />
        <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo *"
               onKeyDown={e => e.key === 'Enter' && v > 0 && motivo.trim() && enviar()}
               className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500" />
      </div>
      <button onClick={enviar} disabled={!(v > 0) || !motivo.trim() || enviando}
              className="w-full mt-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-[10px] font-black uppercase tracking-widest text-white transition-all">
        {enviando ? 'Salvando...' : 'Registrar'}
      </button>
    </Dialogo>
  );
};

/**
 * Fechamento sem contagem: o recebido já está registrado em cada pagamento,
 * então a janela só mostra o resumo e fecha com um clique.
 */
const DialogoFecharCaixa: React.FC<{
  recebido: Record<string, number>; recebidoPoker: Record<string, number>; abertas: number; poker: GastoPoker[];
  onClose: () => void; onConfirm: () => Promise<boolean>; onCancelarCaixa: () => void;
}> = ({ recebido, recebidoPoker, abertas, poker, onClose, onConfirm, onCancelarCaixa }) => {
  const [enviando, setEnviando] = useState(false);
  const ordenar = (r: Record<string, number>) => Object.entries(r).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const formasBar = ordenar(recebido);
  const formasPoker = ordenar(recebidoPoker);
  const totalBar = formasBar.reduce((acc, [, v]) => acc + v, 0);
  const totalPoker = formasPoker.reduce((acc, [, v]) => acc + v, 0);
  const total = totalBar + totalPoker;

  const enviar = async () => {
    setEnviando(true);
    const ok = await onConfirm();
    setEnviando(false);
    if (ok) onClose();
  };

  return (
    <Dialogo titulo="Fechar caixa" onClose={onClose} largura={poker.length > 0 ? 'max-w-4xl' : 'max-w-md'}>
      <div className={poker.length > 0 ? 'max-h-[75vh] overflow-y-auto custom-scrollbar space-y-6' : ''}>
      <div className={poker.length > 0 ? 'max-w-md mx-auto w-full' : ''}>
      {abertas > 0 ? (
        <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-400 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>Ainda há <strong>{abertas} comanda(s) aberta(s)</strong>. Feche a conta de cada uma antes — o que ficar sem pagar vira fiado e continua em "A receber".</span>
        </div>
      ) : (
        <>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
            {formasPoker.length > 0 ? `Bar · ${brl(totalBar)}` : 'Recebido neste caixa'}
          </p>
          {formasBar.length === 0 ? (
            <p className="text-gray-500 text-sm py-3">Nenhum pagamento do bar.</p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {formasBar.map(([forma, valor]) => (
                <li key={forma} className="flex justify-between py-2 text-sm">
                  <span className="font-bold text-gray-300">{forma}</span>
                  <span className="tabular-nums text-white font-bold">{brl(valor)}</span>
                </li>
              ))}
            </ul>
          )}
          {formasPoker.length > 0 && (
            <>
              <p className="text-[10px] font-black text-violet-300 uppercase tracking-widest mt-4 mb-2">Poker recebido no bar · {brl(totalPoker)}</p>
              <ul className="divide-y divide-gray-800">
                {formasPoker.map(([forma, valor]) => (
                  <li key={forma} className="flex justify-between py-2 text-sm">
                    <span className="font-bold text-gray-300">{forma}</span>
                    <span className="tabular-nums text-white font-bold">{brl(valor)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="flex justify-between pt-3 mt-1 border-t border-gray-700">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</span>
            <span className="tabular-nums font-black text-emerald-400">{brl(total)}</span>
          </div>
          <button onClick={enviar} disabled={enviando}
                  className="w-full mt-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-[10px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 transition-all">
            <Lock size={14} /> {enviando ? 'Fechando...' : 'Fechar caixa'}
          </button>
        </>
      )}
      <button onClick={onCancelarCaixa}
              className="w-full mt-4 text-[11px] text-gray-500 hover:text-red-400 transition-colors">
<span className="underline underline-offset-2">Cancelar caixa</span>
      </button>
      </div>
      {poker.length > 0 && (
        <div className="border-t border-gray-800 pt-5">
          <TabelaPokerDoDia gastos={poker} />
        </div>
      )}
      </div>
    </Dialogo>
  );
};

export default BarPDV;
