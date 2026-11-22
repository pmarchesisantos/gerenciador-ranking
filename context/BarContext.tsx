
import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import {
  writeBatch, arrayUnion, increment, deleteField,
} from 'firebase/firestore';
import {
  BarCaixa, BarComanda, BarComandaItem, BarEvento, BarMovimentoCaixa, BarPagamento, BarPagamentoPoker, BarProduto, Ranking,
} from '../types';
import { GastoPoker, historicoComPago, marcarPagoNoRascunho } from '../services/pokerDoDia';
import { acessoLiberado, temRecurso } from '../services/planos';
import { useRanking } from './RankingContext';
import { useAuth } from './AuthContext';
import {
  db, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  OperationType, handleFirestoreError,
} from '../services/firebase';

// ─── Regras de cálculo, exportadas para as telas e o financeiro ─────────────

/** Soma dos itens que não foram cancelados. */
export const somaItens = (itens: BarComandaItem[]): number =>
  itens.filter(i => !i.cancelado).reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0);

export const somaPagamentos = (pagamentos: BarPagamento[] = []): number =>
  pagamentos.filter(p => !p.estornado).reduce((acc, p) => acc + p.valor, 0);

/** Saldo devedor de uma comanda. Nunca negativo. */
export const saldoComanda = (c: Pick<BarComanda, 'total' | 'valorPago' | 'status'>): number =>
  c.status === 'cancelada' ? 0 : Math.max(0, round2((c.total || 0) - (c.valorPago || 0)));

export const mesmoDia = (a: string | Date, b: string | Date = new Date()): boolean => {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
};

const round2 = (v: number) => Math.round(v * 100) / 100;
const novoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const agoraISO = () => new Date().toISOString();

/** Fiado: conta fechada que ficou com saldo. */
export const ehFiado = (c: BarComanda) => c.status === 'fechada' && saldoComanda(c) > 0;

/**
 * O que o sistema espera encontrar no caixa ao fechar, por forma de pagamento.
 * Dinheiro = fundo de troco + recebido em dinheiro + suprimentos - sangrias.
 */
export const esperadoNoCaixa = (caixa: BarCaixa, comandas: BarComanda[]): Record<string, number> => {
  const esperado: Record<string, number> = { Dinheiro: caixa.fundoTroco || 0 };
  for (const c of comandas) {
    for (const p of c.pagamentos || []) {
      if (p.caixaId !== caixa.id || p.estornado) continue;
      const forma = p.forma || 'Não informado';
      esperado[forma] = (esperado[forma] || 0) + p.valor;
    }
  }
  for (const [forma, valor] of Object.entries(recebidoPokerNoCaixa(caixa.id, comandas))) {
    esperado[forma] = (esperado[forma] || 0) + valor;
  }
  for (const m of caixa.movimentos || []) {
    esperado.Dinheiro += m.tipo === 'suprimento' ? m.valor : -m.valor;
  }
  for (const k of Object.keys(esperado)) esperado[k] = round2(esperado[k]);
  return esperado;
};

/** Quanto o caixa recebeu em cada forma de pagamento (pagamentos não estornados). */
export const recebidoNoCaixa = (caixaId: string, comandas: BarComanda[]): Record<string, number> => {
  const recebido: Record<string, number> = {};
  for (const c of comandas) {
    for (const p of c.pagamentos || []) {
      if (p.caixaId !== caixaId || p.estornado) continue;
      const forma = p.forma || 'Não informado';
      recebido[forma] = round2((recebido[forma] || 0) + p.valor);
    }
  }
  return recebido;
};

/** Poker recebido no bar, por forma de pagamento (recebimentos não estornados). */
export function recebidoPokerNoCaixa(caixaId: string, comandas: BarComanda[]): Record<string, number> {
  const recebido: Record<string, number> = {};
  for (const c of comandas) {
    for (const p of c.pagamentosPoker || []) {
      if (p.caixaId !== caixaId || p.estornado) continue;
      for (const parte of p.partes) recebido[parte.forma] = round2((recebido[parte.forma] || 0) + parte.valor);
    }
  }
  return recebido;
}

const pokerAtivo = (c: BarComanda) => (c.pagamentosPoker || []).filter(p => !p.estornado);

/**
 * Divide as partes do pagamento: o poker de cada etapa é quitado inteiro
 * primeiro, na ordem das partes; o que sobra vai para o consumo do bar.
 */
export const distribuir = (partes: { valor: number; forma: string }[], poker: GastoPoker[]) => {
  const fila = partes.map(p => ({ ...p }));
  const tirar = (valor: number) => {
    const usadas: { forma: string; valor: number }[] = [];
    let falta = round2(valor);
    for (const p of fila) {
      if (falta <= 0) break;
      const v = round2(Math.min(p.valor, falta));
      if (v <= 0) continue;
      p.valor = round2(p.valor - v);
      falta = round2(falta - v);
      const igual = usadas.find(u => u.forma === p.forma);
      if (igual) igual.valor = round2(igual.valor + v); else usadas.push({ forma: p.forma, valor: v });
    }
    return usadas;
  };
  const porGasto = poker.map(g => ({ gasto: g, partes: tirar(g.total) }));
  const bar = fila.filter(p => p.valor > 0.004);
  return { porGasto, bar };
};

// ─── Normalização de dados antigos ──────────────────────────────────────────

/** Comandas gravadas antes deste fluxo não tinham ids nos itens e pagamentos. */
const normalizarComanda = (id: string, d: any): BarComanda => ({
  ...d,
  id,
  status: d.status || 'aberta',
  itens: (d.itens || []).map((i: any, idx: number) => ({ ...i, id: i.id || `legado-${idx}` })),
  pagamentos: (d.pagamentos || []).map((p: any, idx: number) => ({ ...p, id: p.id || `legado-${idx}` })),
  pagamentosPoker: d.pagamentosPoker || [],
  total: d.total || 0,
  valorPago: d.valorPago || 0,
});

/**
 * O Firestore rejeita `undefined`. Em criação o campo é omitido; em edição,
 * vira deleteField() para apagar o valor que existia.
 */
const paraCriacao = <T extends object>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
const paraEdicao = <T extends object>(obj: T) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === undefined ? deleteField() : v]));

// ─── Contexto ───────────────────────────────────────────────────────────────

interface BarContextType {
  produtos: BarProduto[];
  comandas: BarComanda[];
  caixas: BarCaixa[];
  caixaAberto: BarCaixa | null;
  loading: boolean;

  addProduto: (dados: Omit<BarProduto, 'id' | 'criadoEm'>) => Promise<void>;
  addProdutos: (lista: Omit<BarProduto, 'id' | 'criadoEm'>[]) => Promise<void>;
  updateProduto: (id: string, dados: Partial<BarProduto>) => Promise<void>;
  removeProduto: (id: string) => Promise<void>;

  abrirCaixa: (fundoTroco: number) => Promise<void>;
  registrarMovimento: (tipo: BarMovimentoCaixa['tipo'], valor: number, motivo: string) => Promise<void>;
  fecharCaixa: () => Promise<void>;
  cancelarCaixa: (motivo: string) => Promise<void>;
  excluirCaixa: (caixaId: string) => Promise<void>;
  /** Exclui comandas que não pertencem a nenhum caixa (anteriores ao controle de caixa). */
  excluirComandasSemCaixa: () => Promise<void>;

  abrirComanda: (clienteNome: string, playerId?: string) => Promise<string>;
  lancarItem: (comandaId: string, produto: BarProduto, quantidade: number) => Promise<void>;
  cancelarItem: (comandaId: string, itemId: string, motivo: string) => Promise<void>;
  fecharConta: (comandaId: string) => Promise<void>;
  reabrirComanda: (comandaId: string, motivo: string) => Promise<void>;
  registrarPagamento: (comandaId: string, valor: number, forma: string) => Promise<void>;
  /** `poker`: etapas do dia a quitar junto. Cada uma é paga inteira, antes do bar. */
  registrarPagamentos: (comandaId: string, partes: { valor: number; forma: string }[], poker?: GastoPoker[]) => Promise<void>;
  estornarPagamento: (comandaId: string, pagamentoId: string, motivo: string) => Promise<void>;
  estornarPagamentoPoker: (comandaId: string, pagamentoId: string, motivo: string) => Promise<void>;
  cancelarComanda: (comandaId: string, motivo: string) => Promise<void>;
}

/** Exportado para permitir montar as telas do bar com dados de teste. */
export const BarContext = createContext<BarContextType | undefined>(undefined);

/** Erro de regra de negócio: a mensagem é para o usuário ler. */
export class BarRegraError extends Error {}

export const BarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { house } = useRanking();
  const { user } = useAuth();
  const rankings = house.rankings;
  const houseId = house.id || null;
  const operador = user?.email || undefined;

  const [produtos, setProdutos] = useState<BarProduto[]>([]);
  const [comandas, setComandas] = useState<BarComanda[]>([]);
  const [caixas, setCaixas] = useState<BarCaixa[]>([]);
  // Só sai do carregamento quando as três coleções chegaram. Antes disso o
  // "caixa aberto" aparece vazio, e a tela ofereceria abrir um segundo caixa.
  const [carregadas, setCarregadas] = useState<Set<string>>(new Set());
  const loading = !houseId || carregadas.size < 3;
  // Fora do plano (ou sem pagamento) as regras negam a leitura do bar: nem tenta.
  const barLiberado = temRecurso(house, 'bar') && acessoLiberado(house);

  useEffect(() => {
    setProdutos([]); setComandas([]); setCaixas([]);
    setCarregadas(new Set());
    if (!houseId) return;
    if (!barLiberado) { setCarregadas(new Set(['produtos', 'comandas', 'caixas'])); return; }

    const caminho = (sub: string) => collection(db, 'casas', houseId, sub);
    const marcar = (nome: string) => setCarregadas(prev => (prev.has(nome) ? prev : new Set(prev).add(nome)));

    const unsubs = [
      onSnapshot(caminho('bar_produtos'), snap => {
        setProdutos(snap.docs.map(d => ({ id: d.id, ...d.data() } as BarProduto)));
        marcar('produtos');
      }, error => { handleFirestoreError(error, OperationType.LIST, `casas/${houseId}/bar_produtos`); marcar('produtos'); }),
      onSnapshot(caminho('bar_comandas'), snap => {
        setComandas(snap.docs.map(d => normalizarComanda(d.id, d.data())));
        marcar('comandas');
      }, error => { handleFirestoreError(error, OperationType.LIST, `casas/${houseId}/bar_comandas`); marcar('comandas'); }),
      onSnapshot(caminho('bar_caixas'), snap => {
        setCaixas(snap.docs.map(d => ({ id: d.id, movimentos: [], ...d.data() } as BarCaixa)));
        marcar('caixas');
      }, error => { handleFirestoreError(error, OperationType.LIST, `casas/${houseId}/bar_caixas`); marcar('caixas'); }),
    ];
    return () => unsubs.forEach(u => u());
  }, [houseId, barLiberado]);

  const caixaAberto = useMemo(
    () => caixas.find(c => c.status === 'aberto') || null,
    [caixas]
  );

  const ref = useCallback((sub: string, id: string) => doc(db, 'casas', houseId!, sub, id), [houseId]);

  /** Envolve a gravação com o tratamento de erro padrão do app. */
  const gravar = useCallback(async (caminho: string, op: OperationType, acao: () => Promise<unknown>) => {
    try {
      await acao();
    } catch (error) {
      handleFirestoreError(error, op, caminho);
      throw error;
    }
  }, []);

  const exigirComanda = useCallback((comandaId: string): BarComanda => {
    const c = comandas.find(x => x.id === comandaId);
    if (!c) throw new BarRegraError('Comanda não encontrada.');
    return c;
  }, [comandas]);

  const evento = (tipo: BarEvento['tipo'], descricao: string): BarEvento => ({ em: agoraISO(), tipo, descricao });

  /**
   * Troca o "pago" do poker no lote: etapa salva vai no mesmo lote da comanda;
   * etapa ainda em rascunho é marcada no navegador depois que o lote grava.
   */
  const prepararPago = useCallback((alvos: { rankingId: string; dia: string; playerId: string; nome: string }[], pago: boolean) => {
    const historicos = new Map<string, Ranking['history']>();
    const rascunhos: typeof alvos = [];
    for (const a of alvos) {
      const ranking = rankings.find(r => r.id === a.rankingId);
      if (!ranking) continue;
      const base = { ...ranking, history: historicos.get(a.rankingId) || ranking.history };
      const novo = historicoComPago(base, a.dia, a.playerId, a.nome, pago);
      if (novo) historicos.set(a.rankingId, novo); else rascunhos.push(a);
    }
    return {
      aplicar: (lote: ReturnType<typeof writeBatch>) => {
        for (const [rankingId, history] of historicos) lote.update(doc(db, 'casas', houseId!, 'rankings', rankingId), { history });
      },
      depois: () => { for (const a of rascunhos) marcarPagoNoRascunho(a.rankingId, a.playerId, a.nome, pago); },
    };
  }, [rankings, houseId]);

  // ── Produtos ──

  const addProduto = useCallback(async (dados: Omit<BarProduto, 'id' | 'criadoEm'>) => {
    if (!houseId) return;
    await gravar(`casas/${houseId}/bar_produtos`, OperationType.CREATE, () =>
      addDoc(collection(db, 'casas', houseId, 'bar_produtos'), paraCriacao({
        ...dados,
        ativo: dados.ativo !== false,
        criadoEm: agoraISO(),
      }))
    );
  }, [houseId, gravar]);

  /** Cadastro em lote (catálogo padrão): entram todos ou nenhum. */
  const addProdutos = useCallback(async (lista: Omit<BarProduto, 'id' | 'criadoEm'>[]) => {
    if (!houseId || lista.length === 0) return;
    const em = agoraISO();
    // Um lote do Firestore aceita até 500 operações.
    for (let i = 0; i < lista.length; i += 450) {
      const lote = writeBatch(db);
      for (const dados of lista.slice(i, i + 450)) {
        lote.set(doc(collection(db, 'casas', houseId, 'bar_produtos')), paraCriacao({
          ...dados,
          ativo: dados.ativo !== false,
          criadoEm: em,
        }));
      }
      await gravar(`casas/${houseId}/bar_produtos`, OperationType.CREATE, () => lote.commit());
    }
  }, [houseId, gravar]);

  const updateProduto = useCallback(async (id: string, dados: Partial<BarProduto>) => {
    if (!houseId) return;
    await gravar(`casas/${houseId}/bar_produtos/${id}`, OperationType.UPDATE, () =>
      updateDoc(ref('bar_produtos', id), paraEdicao({ ...dados, atualizadoEm: agoraISO() }))
    );
  }, [houseId, gravar, ref]);

  const removeProduto = useCallback(async (id: string) => {
    if (!houseId) return;
    await gravar(`casas/${houseId}/bar_produtos/${id}`, OperationType.DELETE, () => deleteDoc(ref('bar_produtos', id)));
  }, [houseId, gravar, ref]);

  // ── Caixa ──

  const abrirCaixa = useCallback(async (fundoTroco: number) => {
    if (!houseId) return;
    if (caixaAberto) throw new BarRegraError('Já existe um caixa aberto.');
    if (!(fundoTroco >= 0)) throw new BarRegraError('Informe o fundo de troco (pode ser zero).');
    await gravar(`casas/${houseId}/bar_caixas`, OperationType.CREATE, () =>
      addDoc(collection(db, 'casas', houseId, 'bar_caixas'), paraCriacao({
        status: 'aberto',
        abertoEm: agoraISO(),
        abertoPor: operador,
        fundoTroco: round2(fundoTroco),
        movimentos: [],
      }))
    );
  }, [houseId, caixaAberto, operador, gravar]);

  const registrarMovimento = useCallback(async (tipo: BarMovimentoCaixa['tipo'], valor: number, motivo: string) => {
    if (!houseId || !caixaAberto) throw new BarRegraError('Abra o caixa primeiro.');
    if (!(valor > 0)) throw new BarRegraError('Informe um valor maior que zero.');
    if (!motivo.trim()) throw new BarRegraError('Informe o motivo.');
    if (tipo === 'sangria') {
      const dinheiro = esperadoNoCaixa(caixaAberto, comandas).Dinheiro || 0;
      if (valor > dinheiro + 0.009) {
        throw new BarRegraError(`Sangria maior que o dinheiro em caixa (R$ ${dinheiro.toFixed(2)}).`);
      }
    }
    const movimento: BarMovimentoCaixa = { id: novoId(), tipo, valor: round2(valor), motivo: motivo.trim(), em: agoraISO() };
    await gravar(`casas/${houseId}/bar_caixas/${caixaAberto.id}`, OperationType.UPDATE, () =>
      updateDoc(ref('bar_caixas', caixaAberto.id), { movimentos: arrayUnion(movimento) })
    );
  }, [houseId, caixaAberto, comandas, gravar, ref]);

  /**
   * Fecha o caixa. Não há contagem: o que foi recebido já está registrado em
   * cada pagamento, então o fechamento só guarda o total por forma.
   */
  const fecharCaixa = useCallback(async () => {
    if (!houseId || !caixaAberto) throw new BarRegraError('Não há caixa aberto.');
    const abertas = comandas.filter(c => c.status === 'aberta');
    if (abertas.length > 0) {
      throw new BarRegraError(
        `Ainda há ${abertas.length} comanda(s) aberta(s). Feche a conta de cada uma — o que ficar sem pagar vira fiado.`
      );
    }
    await gravar(`casas/${houseId}/bar_caixas/${caixaAberto.id}`, OperationType.UPDATE, () =>
      updateDoc(ref('bar_caixas', caixaAberto.id), paraCriacao({
        status: 'fechado',
        fechadoEm: agoraISO(),
        fechadoPor: operador,
        recebido: recebidoNoCaixa(caixaAberto.id, comandas),
        recebidoPoker: recebidoPokerNoCaixa(caixaAberto.id, comandas),
      }))
    );
  }, [houseId, caixaAberto, comandas, operador, gravar, ref]);

  /**
   * Cancela o caixa aberto por engano. Nada é apagado: as comandas abertas
   * nele são canceladas (devolvendo o estoque), os pagamentos recebidos nele
   * são estornados e o caixa fica registrado como cancelado, com o motivo.
   * Fiado de outro caixa recebido aqui volta a ficar em aberto.
   */
  const cancelarCaixa = useCallback(async (motivo: string) => {
    if (!houseId || !caixaAberto) throw new BarRegraError('Não há caixa aberto.');
    const m = motivo.trim();
    if (!m) throw new BarRegraError('Informe o motivo do cancelamento.');
    const caixaId = caixaAberto.id;
    const em = agoraISO();

    const lote = writeBatch(db);
    const devolver = new Map<string, number>();

    // Poker recebido neste caixa: estorna e devolve o jogador para "a pagar".
    const pokerAqui = comandas.flatMap(c => pokerAtivo(c).filter(p => p.caixaId === caixaId).map(p => ({ c, p })));
    const pagoPoker = prepararPago(pokerAqui.map(({ p }) => p), false);
    pagoPoker.aplicar(lote);
    const pokerPorComanda = new Map<string, BarPagamentoPoker[]>();
    for (const { c } of pokerAqui) {
      pokerPorComanda.set(c.id, (c.pagamentosPoker || []).map(p => p.caixaId === caixaId && !p.estornado
        ? { ...p, estornado: true, estornadoEm: em, motivoEstorno: `Caixa cancelado: ${m}` } : p));
    }
    for (const [comandaId, pagamentosPoker] of pokerPorComanda) {
      if (!comandas.find(c => c.id === comandaId && (c.caixaId === caixaId || (c.pagamentos || []).some(p => p.caixaId === caixaId && !p.estornado)))) {
        lote.update(ref('bar_comandas', comandaId), { pagamentosPoker });
      }
    }

    for (const c of comandas) {
      const doCaixa = c.caixaId === caixaId;
      const pagamentosAqui = (c.pagamentos || []).filter(p => p.caixaId === caixaId && !p.estornado);
      if (c.status === 'cancelada' || (!doCaixa && pagamentosAqui.length === 0)) continue;

      const pagamentos = (c.pagamentos || []).map(p => p.caixaId === caixaId && !p.estornado
        ? { ...p, estornado: true, estornadoEm: em, motivoEstorno: `Caixa cancelado: ${m}` }
        : p);
      const historico: BarEvento[] = pagamentosAqui.map(p =>
        ({ em, tipo: 'estorno', descricao: `Estorno de R$ ${p.valor.toFixed(2)} (${p.forma || '—'}): caixa cancelado` }));

      if (doCaixa) {
        historico.push({ em, tipo: 'cancelamento', descricao: `Comanda cancelada com o caixa: ${m}` });
        lote.update(ref('bar_comandas', c.id), {
          pagamentos,
          ...(pokerPorComanda.has(c.id) ? { pagamentosPoker: pokerPorComanda.get(c.id) } : {}),
          valorPago: round2(somaPagamentos(pagamentos)),
          status: 'cancelada',
          canceladaEm: em,
          motivoCancelamento: `Caixa cancelado: ${m}`,
          historico: arrayUnion(...historico),
        });
        for (const i of c.itens) if (!i.cancelado) devolver.set(i.produtoId, (devolver.get(i.produtoId) || 0) + i.quantidade);
      } else {
        // Fiado de outro caixa: só o recebimento é desfeito; a dívida volta.
        lote.update(ref('bar_comandas', c.id), {
          pagamentos,
          ...(pokerPorComanda.has(c.id) ? { pagamentosPoker: pokerPorComanda.get(c.id) } : {}),
          valorPago: round2(somaPagamentos(pagamentos)),
          ...(c.status === 'paga' ? { status: 'fechada', pagoEm: deleteField() } : {}),
          historico: arrayUnion(...historico),
        });
      }
    }

    for (const [produtoId, qtd] of devolver) {
      if (produtos.find(p => p.id === produtoId)?.controlaEstoque) {
        lote.update(ref('bar_produtos', produtoId), { estoque: increment(qtd) });
      }
    }

    lote.update(ref('bar_caixas', caixaId), paraCriacao({
      status: 'cancelado',
      canceladoEm: em,
      canceladoPor: operador,
      motivoCancelamento: m,
    }));
    await gravar(`casas/${houseId}/bar_caixas/${caixaId}`, OperationType.UPDATE, () => lote.commit());
    pagoPoker.depois();
  }, [houseId, caixaAberto, comandas, produtos, operador, gravar, ref, prepararPago]);

  /**
   * Exclui de vez um caixa encerrado e as comandas abertas nele — para caixas
   * de teste. O estoque do que contava como vendido volta. Recusa quando o
   * caixa se cruza com outro (fiado recebido em outro caixa, ou recebido aqui),
   * porque apagar um lado deixaria o outro caixa com números sem origem.
   */
  const excluirCaixa = useCallback(async (caixaId: string) => {
    if (!houseId) return;
    const caixa = caixas.find(c => c.id === caixaId);
    if (!caixa) throw new BarRegraError('Caixa não encontrado.');
    if (caixa.status === 'aberto') throw new BarRegraError('Feche ou cancele o caixa antes de excluir.');

    const doCaixa = comandas.filter(c => c.caixaId === caixaId);
    const cruzaOutro =
      doCaixa.some(c => (c.pagamentos || []).some(p => !p.estornado && p.caixaId && p.caixaId !== caixaId)) ||
      comandas.some(c => c.caixaId !== caixaId && (c.pagamentos || []).some(p => !p.estornado && p.caixaId === caixaId));
    if (cruzaOutro) {
      throw new BarRegraError('Este caixa tem pagamentos ligados a outro caixa (fiado). Não dá para excluir sem bagunçar o outro.');
    }
    if (comandas.some(c => pokerAtivo(c).some(p => p.caixaId === caixaId))) {
      throw new BarRegraError('Este caixa recebeu poker que ainda consta como pago no lançamento. Estorne esse recebimento antes de excluir.');
    }

    const lote = writeBatch(db);
    const devolver = new Map<string, number>();
    for (const c of doCaixa) {
      if (c.status !== 'cancelada') {
        for (const i of c.itens) if (!i.cancelado) devolver.set(i.produtoId, (devolver.get(i.produtoId) || 0) + i.quantidade);
      }
      lote.delete(ref('bar_comandas', c.id));
    }
    for (const [produtoId, qtd] of devolver) {
      if (produtos.find(p => p.id === produtoId)?.controlaEstoque) {
        lote.update(ref('bar_produtos', produtoId), { estoque: increment(qtd) });
      }
    }
    lote.delete(ref('bar_caixas', caixaId));
    await gravar(`casas/${houseId}/bar_caixas/${caixaId}`, OperationType.DELETE, () => lote.commit());
  }, [houseId, caixas, comandas, produtos, gravar, ref]);

  const excluirComandasSemCaixa = useCallback(async () => {
    if (!houseId) return;
    const existentes = new Set(caixas.map(c => c.id));
    const orfas = comandas.filter(c => !c.caixaId || !existentes.has(c.caixaId));
    if (orfas.length === 0) return;
    if (orfas.some(c => pokerAtivo(c).length > 0)) {
      throw new BarRegraError('Há poker recebido numa dessas comandas. Estorne-o antes de excluir.');
    }
    const devolver = new Map<string, number>();
    for (const c of orfas) {
      if (c.status === 'cancelada') continue;
      for (const i of c.itens) if (!i.cancelado) devolver.set(i.produtoId, (devolver.get(i.produtoId) || 0) + i.quantidade);
    }
    // Lotes de até 450 operações (o limite do Firestore é 500).
    const ops: ((l: ReturnType<typeof writeBatch>) => void)[] = [
      ...orfas.map(c => (l: ReturnType<typeof writeBatch>) => { l.delete(ref('bar_comandas', c.id)); }),
      ...[...devolver].filter(([id]) => produtos.find(p => p.id === id)?.controlaEstoque)
        .map(([id, qtd]) => (l: ReturnType<typeof writeBatch>) => { l.update(ref('bar_produtos', id), { estoque: increment(qtd) }); }),
    ];
    for (let i = 0; i < ops.length; i += 450) {
      const lote = writeBatch(db);
      ops.slice(i, i + 450).forEach(op => op(lote));
      await gravar(`casas/${houseId}/bar_comandas`, OperationType.DELETE, () => lote.commit());
    }
  }, [houseId, caixas, comandas, produtos, gravar, ref]);

  // ── Comandas ──

  const abrirComanda = useCallback(async (clienteNome: string, playerId?: string) => {
    if (!houseId) throw new BarRegraError('Clube não carregado.');
    if (!caixaAberto) throw new BarRegraError('Abra o caixa antes de abrir comandas.');
    const nome = clienteNome.trim();
    if (!nome) throw new BarRegraError('Informe o nome do cliente.');

    const doCaixa = comandas.filter(c => c.caixaId === caixaAberto.id);
    const numero = doCaixa.reduce((max, c) => Math.max(max, c.numero || 0), 0) + 1;

    let novo = '';
    await gravar(`casas/${houseId}/bar_comandas`, OperationType.CREATE, async () => {
      const r = await addDoc(collection(db, 'casas', houseId, 'bar_comandas'), paraCriacao({
        numero,
        clienteNome: nome,
        playerId,
        data: agoraISO(),
        caixaId: caixaAberto.id,
        status: 'aberta',
        itens: [],
        total: 0,
        valorPago: 0,
        pagamentos: [],
        historico: [evento('abertura', `Comanda #${numero} aberta`)],
      }));
      novo = r.id;
    });
    return novo;
  }, [houseId, caixaAberto, comandas, gravar]);

  const lancarItem = useCallback(async (comandaId: string, produto: BarProduto, quantidade: number) => {
    if (!houseId) return;
    const c = exigirComanda(comandaId);
    if (c.status !== 'aberta') throw new BarRegraError('Só é possível lançar em comanda aberta. Reabra a conta primeiro.');
    if (!(quantidade > 0) || !Number.isInteger(quantidade)) throw new BarRegraError('Quantidade inválida.');

    const item: BarComandaItem = paraCriacao({
      id: novoId(),
      produtoId: produto.id,
      nome: produto.nome,
      precoUnitario: produto.preco,
      custoUnitario: produto.custo,
      quantidade,
      lancadoEm: agoraISO(),
    }) as BarComandaItem;

    // Lote: comanda e estoque mudam juntos ou não mudam. arrayUnion e increment
    // são atômicos no servidor, então dois lançamentos simultâneos não se anulam.
    const lote = writeBatch(db);
    lote.update(ref('bar_comandas', comandaId), {
      itens: arrayUnion(item),
      total: increment(round2(produto.preco * quantidade)),
    });
    if (produto.controlaEstoque) {
      lote.update(ref('bar_produtos', produto.id), { estoque: increment(-quantidade) });
    }
    await gravar(`casas/${houseId}/bar_comandas/${comandaId}`, OperationType.UPDATE, () => lote.commit());
  }, [houseId, exigirComanda, gravar, ref]);

  const cancelarItem = useCallback(async (comandaId: string, itemId: string, motivo: string) => {
    if (!houseId) return;
    const c = exigirComanda(comandaId);
    if (c.status !== 'aberta') throw new BarRegraError('Só é possível cancelar itens de comanda aberta.');
    if (!motivo.trim()) throw new BarRegraError('Informe o motivo do cancelamento.');
    const item = c.itens.find(i => i.id === itemId);
    if (!item || item.cancelado) throw new BarRegraError('Item não encontrado ou já cancelado.');

    const itens = c.itens.map(i => i.id === itemId
      ? { ...i, cancelado: true, canceladoEm: agoraISO(), motivoCancelamento: motivo.trim() }
      : i);
    const total = round2(somaItens(itens));
    if (total < (c.valorPago || 0) - 0.009) {
      throw new BarRegraError('O cancelamento deixaria o pago maior que o consumo. Estorne o pagamento antes.');
    }

    const lote = writeBatch(db);
    lote.update(ref('bar_comandas', comandaId), {
      itens,
      total,
      historico: arrayUnion(evento('cancelamento-item', `${item.quantidade}× ${item.nome} cancelado: ${motivo.trim()}`)),
    });
    const produto = produtos.find(p => p.id === item.produtoId);
    if (produto?.controlaEstoque) {
      lote.update(ref('bar_produtos', produto.id), { estoque: increment(item.quantidade) });
    }
    await gravar(`casas/${houseId}/bar_comandas/${comandaId}`, OperationType.UPDATE, () => lote.commit());
  }, [houseId, exigirComanda, produtos, gravar, ref]);

  const fecharConta = useCallback(async (comandaId: string) => {
    if (!houseId) return;
    const c = exigirComanda(comandaId);
    if (c.status !== 'aberta') throw new BarRegraError('A conta já está fechada.');
    if ((c.total || 0) <= 0) throw new BarRegraError('Comanda sem consumo. Se foi aberta por engano, cancele-a.');
    const quitada = saldoComanda(c) <= 0;
    await gravar(`casas/${houseId}/bar_comandas/${comandaId}`, OperationType.UPDATE, () =>
      updateDoc(ref('bar_comandas', comandaId), paraCriacao({
        status: quitada ? 'paga' : 'fechada',
        fechadaEm: agoraISO(),
        pagoEm: quitada ? agoraISO() : undefined,
        historico: arrayUnion(evento('fechamento', quitada ? 'Conta fechada e quitada' : `Conta fechada com saldo de R$ ${saldoComanda(c).toFixed(2)}`)),
      }))
    );
  }, [houseId, exigirComanda, gravar, ref]);

  const reabrirComanda = useCallback(async (comandaId: string, motivo: string) => {
    if (!houseId) return;
    const c = exigirComanda(comandaId);
    if (c.status !== 'fechada') {
      throw new BarRegraError(c.status === 'paga'
        ? 'Comanda paga não pode ser reaberta. Para corrigir, estorne o pagamento.'
        : 'Só é possível reabrir uma conta fechada.');
    }
    if (!motivo.trim()) throw new BarRegraError('Informe o motivo da reabertura.');
    await gravar(`casas/${houseId}/bar_comandas/${comandaId}`, OperationType.UPDATE, () =>
      updateDoc(ref('bar_comandas', comandaId), {
        status: 'aberta',
        fechadaEm: deleteField(),
        historico: arrayUnion(evento('reabertura', `Conta reaberta: ${motivo.trim()}`)),
      })
    );
  }, [houseId, exigirComanda, gravar, ref]);

  /**
   * Recebe um ou mais pagamentos numa única gravação: dividir a conta entre
   * Pix e dinheiro, por exemplo. Ou entram todas as partes, ou nenhuma — uma
   * queda de conexão no meio nunca deixa metade do pagamento registrada.
   */
  const registrarPagamentos = useCallback(async (comandaId: string, partes: { valor: number; forma: string }[], poker: GastoPoker[] = []) => {
    if (!houseId) return;
    if (!caixaAberto) throw new BarRegraError('Abra o caixa para receber pagamentos.');
    const c = exigirComanda(comandaId);
    if (c.status === 'cancelada') throw new BarRegraError('Esta comanda não aceita pagamentos.');

    const validas = partes.map(p => ({ ...p, valor: round2(p.valor) }));
    if (validas.length === 0 || validas.some(p => !(p.valor > 0))) {
      throw new BarRegraError('Cada forma de pagamento precisa de um valor maior que zero.');
    }
    const total = round2(validas.reduce((acc, p) => acc + p.valor, 0));

    const aQuitar = poker.filter(g => !g.pago && g.total > 0);
    const totalPoker = round2(aQuitar.reduce((a, g) => a + g.total, 0));
    if (totalPoker > 0 && total < totalPoker - 0.009) {
      throw new BarRegraError(`O poker é quitado inteiro: receba ao menos ${totalPoker.toFixed(2).replace('.', ',')} ou tire o poker deste recebimento.`);
    }
    const saldo = saldoComanda(c);
    const totalBar = round2(total - totalPoker);
    if (totalBar > saldo + 0.009) {
      throw new BarRegraError(`O total informado passa do que falta receber (R$ ${(saldo + totalPoker).toFixed(2)}).`);
    }
    if (totalBar > 0.009 && c.status === 'paga') throw new BarRegraError('O consumo do bar já está quitado.');

    const { porGasto, bar } = distribuir(validas, aQuitar);
    const em = agoraISO();
    const pagamentos: BarPagamento[] = bar.map(p => ({ id: novoId(), valor: round2(p.valor), forma: p.forma, em, caixaId: caixaAberto.id }));
    const pagamentosPoker: BarPagamentoPoker[] = porGasto.map(({ gasto, partes: pp }) => ({
      id: novoId(), valor: gasto.total, partes: pp, em, caixaId: caixaAberto.id,
      rankingId: gasto.rankingId, rankingNome: gasto.rankingNome, dia: gasto.dia, playerId: gasto.playerId, nome: gasto.nome,
    }));

    const eventos: BarEvento[] = [];
    if (pagamentos.length > 0) {
      const descricao = pagamentos.map(p => `R$ ${p.valor.toFixed(2)} em ${p.forma}`).join(' + ');
      eventos.push({ em, tipo: 'pagamento', descricao: pagamentos.length > 1 ? `Pagamento dividido: ${descricao}` : descricao });
    }
    for (const p of pagamentosPoker) {
      eventos.push({ em, tipo: 'pagamento', descricao: `Poker ${p.rankingNome} quitado: R$ ${p.valor.toFixed(2)} (${p.partes.map(x => x.forma).join(' + ')})` });
    }

    // Conta fechada que zera o saldo está quitada. Comanda aberta continua
    // aberta mesmo quitada: o cliente pode seguir consumindo.
    const quitou = c.status === 'fechada' && totalBar >= saldo - 0.009;
    const pago = prepararPago(pagamentosPoker, true);
    const lote = writeBatch(db);
    lote.update(ref('bar_comandas', comandaId), paraCriacao({
      pagamentos: pagamentos.length ? arrayUnion(...pagamentos) : undefined,
      pagamentosPoker: pagamentosPoker.length ? arrayUnion(...pagamentosPoker) : undefined,
      valorPago: pagamentos.length ? increment(round2(totalBar)) : undefined,
      status: quitou ? 'paga' : undefined,
      pagoEm: quitou ? em : undefined,
      historico: arrayUnion(...eventos),
    }));
    pago.aplicar(lote);
    await gravar(`casas/${houseId}/bar_comandas/${comandaId}`, OperationType.UPDATE, () => lote.commit());
    pago.depois();
  }, [houseId, caixaAberto, exigirComanda, gravar, ref, prepararPago]);

  const registrarPagamento = useCallback(
    (comandaId: string, valor: number, forma: string) => registrarPagamentos(comandaId, [{ valor, forma }]),
    [registrarPagamentos]
  );

  const estornarPagamento = useCallback(async (comandaId: string, pagamentoId: string, motivo: string) => {
    if (!houseId) return;
    if (!caixaAberto) throw new BarRegraError('Abra o caixa para estornar: o dinheiro sai da gaveta atual.');
    const c = exigirComanda(comandaId);
    if (!motivo.trim()) throw new BarRegraError('Informe o motivo do estorno.');
    const pag = (c.pagamentos || []).find(p => p.id === pagamentoId);
    if (!pag || pag.estornado) throw new BarRegraError('Pagamento não encontrado ou já estornado.');

    const pagamentos = (c.pagamentos || []).map(p => p.id === pagamentoId
      ? { ...p, estornado: true, estornadoEm: agoraISO(), motivoEstorno: motivo.trim() }
      : p);
    await gravar(`casas/${houseId}/bar_comandas/${comandaId}`, OperationType.UPDATE, () =>
      updateDoc(ref('bar_comandas', comandaId), {
        pagamentos,
        valorPago: round2(somaPagamentos(pagamentos)),
        // Paga com estorno volta a ter saldo: fica fechada, aguardando pagamento.
        ...(c.status === 'paga' ? { status: 'fechada', pagoEm: deleteField() } : {}),
        historico: arrayUnion(evento('estorno', `Estorno de R$ ${pag.valor.toFixed(2)} (${pag.forma || '—'}): ${motivo.trim()}`)),
      })
    );
  }, [houseId, caixaAberto, exigirComanda, gravar, ref]);

  const estornarPagamentoPoker = useCallback(async (comandaId: string, pagamentoId: string, motivo: string) => {
    if (!houseId) return;
    if (!caixaAberto) throw new BarRegraError('Abra o caixa para estornar: o dinheiro sai da gaveta atual.');
    const c = exigirComanda(comandaId);
    if (!motivo.trim()) throw new BarRegraError('Informe o motivo do estorno.');
    const pag = (c.pagamentosPoker || []).find(p => p.id === pagamentoId);
    if (!pag || pag.estornado) throw new BarRegraError('Recebimento não encontrado ou já estornado.');

    const pagamentosPoker = (c.pagamentosPoker || []).map(p => p.id === pagamentoId
      ? { ...p, estornado: true, estornadoEm: agoraISO(), motivoEstorno: motivo.trim() }
      : p);
    const pago = prepararPago([pag], false);
    const lote = writeBatch(db);
    lote.update(ref('bar_comandas', comandaId), {
      pagamentosPoker,
      historico: arrayUnion(evento('estorno', `Estorno do poker ${pag.rankingNome} (R$ ${pag.valor.toFixed(2)}): ${motivo.trim()}`)),
    });
    pago.aplicar(lote);
    await gravar(`casas/${houseId}/bar_comandas/${comandaId}`, OperationType.UPDATE, () => lote.commit());
    pago.depois();
  }, [houseId, caixaAberto, exigirComanda, gravar, ref, prepararPago]);

  const cancelarComanda = useCallback(async (comandaId: string, motivo: string) => {
    if (!houseId) return;
    const c = exigirComanda(comandaId);
    if (c.status === 'paga' || c.status === 'cancelada') throw new BarRegraError('Esta comanda não pode ser cancelada.');
    if (somaPagamentos(c.pagamentos) > 0 || pokerAtivo(c).length > 0) {
      throw new BarRegraError('Há pagamentos nesta comanda. Estorne-os antes de cancelar.');
    }
    if (!motivo.trim()) throw new BarRegraError('Informe o motivo do cancelamento.');

    const lote = writeBatch(db);
    lote.update(ref('bar_comandas', comandaId), {
      status: 'cancelada',
      canceladaEm: agoraISO(),
      motivoCancelamento: motivo.trim(),
      historico: arrayUnion(evento('cancelamento', `Comanda cancelada: ${motivo.trim()}`)),
    });
    // Devolve ao estoque o que ainda contava como vendido.
    const devolver = new Map<string, number>();
    for (const i of c.itens) if (!i.cancelado) devolver.set(i.produtoId, (devolver.get(i.produtoId) || 0) + i.quantidade);
    for (const [produtoId, qtd] of devolver) {
      if (produtos.find(p => p.id === produtoId)?.controlaEstoque) {
        lote.update(ref('bar_produtos', produtoId), { estoque: increment(qtd) });
      }
    }
    await gravar(`casas/${houseId}/bar_comandas/${comandaId}`, OperationType.UPDATE, () => lote.commit());
  }, [houseId, exigirComanda, produtos, gravar, ref]);

  const value = useMemo(() => ({
    produtos, comandas, caixas, caixaAberto, loading,
    addProduto, addProdutos, updateProduto, removeProduto,
    abrirCaixa, registrarMovimento, fecharCaixa, cancelarCaixa, excluirCaixa, excluirComandasSemCaixa,
    abrirComanda, lancarItem, cancelarItem, fecharConta, reabrirComanda,
    registrarPagamento, registrarPagamentos, estornarPagamento, estornarPagamentoPoker, cancelarComanda,
  }), [produtos, comandas, caixas, caixaAberto, loading,
       addProduto, addProdutos, updateProduto, removeProduto,
       abrirCaixa, registrarMovimento, fecharCaixa, cancelarCaixa, excluirCaixa, excluirComandasSemCaixa,
       abrirComanda, lancarItem, cancelarItem, fecharConta, reabrirComanda,
       registrarPagamento, registrarPagamentos, estornarPagamento, estornarPagamentoPoker, cancelarComanda]);

  return <BarContext.Provider value={value}>{children}</BarContext.Provider>;
};

export const useBar = () => {
  const ctx = useContext(BarContext);
  if (!ctx) throw new Error('useBar precisa estar dentro de BarProvider');
  return ctx;
};
