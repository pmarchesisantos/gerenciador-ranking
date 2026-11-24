import { BarComanda, Ranking } from '../types';
import { calculateResultGross } from './stageFinance';
import { getStageValues } from './stageValues';

export type Periodo = 'dia' | 'semana' | 'mes';

/** Intervalo [inicio, fim) em horário local. */
export interface Intervalo {
  inicio: Date;
  fim: Date;
}

export const normalizar = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const somarDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const chaveDia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** A semana vai de segunda a domingo. */
export const intervaloDe = (periodo: Periodo, ref: Date): Intervalo => {
  const base = inicioDoDia(ref);
  if (periodo === 'dia') return { inicio: base, fim: somarDias(base, 1) };
  if (periodo === 'semana') {
    const desdeSegunda = (base.getDay() + 6) % 7;
    const inicio = somarDias(base, -desdeSegunda);
    return { inicio, fim: somarDias(inicio, 7) };
  }
  return {
    inicio: new Date(base.getFullYear(), base.getMonth(), 1),
    fim: new Date(base.getFullYear(), base.getMonth() + 1, 1),
  };
};

export const deslocar = (periodo: Periodo, ref: Date, passos: number): Date => {
  if (periodo === 'dia') return somarDias(ref, passos);
  if (periodo === 'semana') return somarDias(ref, passos * 7);
  return new Date(ref.getFullYear(), ref.getMonth() + passos, 1);
};

export const dentro = (iso: string | undefined, i: Intervalo): boolean => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= i.inicio.getTime() && t < i.fim.getTime();
};

export const rotuloPeriodo = (periodo: Periodo, i: Intervalo): string => {
  const curta = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  if (periodo === 'dia') {
    return i.inicio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }
  if (periodo === 'semana') return `${curta(i.inicio)} – ${curta(somarDias(i.fim, -1))}`;
  return i.inicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// ─── Poker ──────────────────────────────────────────────────────────────────

export interface EtapaFinanceira {
  id: string;
  rankingNome: string;
  nome: string;
  data: string;
  jogadores: number;
  /** Tudo o que entrou na mesa: buy-ins, re-buys, add-ons e extras. */
  bruto: number;
  rake: number;
  administrativo: number;
  /** Destinado ao bolo do ranking. */
  ranking: number;
  premiacao: number;
  /** O que fica com a casa: rake + administrativo. */
  receitaCasa: number;
  /** Etapa lançada antes de o administrativo passar a ser gravado. */
  administrativoDesconhecido: boolean;
}

/**
 * Etapas de todos os rankings dentro do intervalo, com o fechamento de cada uma.
 *
 * Usa os valores gravados no lançamento quando existem. Para etapas antigas,
 * o bruto e o rake são reconstruídos pela categoria e o administrativo fica
 * zerado — e marcado como desconhecido, para a tela avisar.
 */
export const etapasNoIntervalo = (rankings: Ranking[], i: Intervalo): EtapaFinanceira[] => {
  const etapas: EtapaFinanceira[] = [];

  for (const r of rankings) {
    const doPeriodo = (r.history || []).filter(h => dentro(h.date, i));
    if (doPeriodo.length === 0) continue;

    // Calculado uma vez por ranking: a distribuição de valores percorre o histórico todo.
    const valorRanking = new Map(getStageValues(r).map(s => [s.id, s.value]));

    for (const h of doPeriodo) {
      const categoria = (r.gameCategories || []).find(c => c.id === h.categoryId);
      const bruto = h.totalBruto ??
        (h.results || []).reduce((acc, res) => acc + calculateResultGross(res, categoria), 0);
      const rake = h.rakeValue ?? bruto * ((categoria?.rake || 0) / 100);
      const administrativo = h.valorAdministrativo ?? 0;
      const ranking = valorRanking.get(h.id) || 0;

      etapas.push({
        id: h.id,
        rankingNome: r.name,
        nome: h.name || '',
        data: h.date,
        jogadores: (h.results || []).length,
        bruto,
        rake,
        administrativo,
        ranking,
        premiacao: Math.max(0, bruto - rake - ranking - administrativo),
        receitaCasa: rake + administrativo,
        administrativoDesconhecido: h.valorAdministrativo === undefined,
      });
    }
  }

  return etapas.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
};

// ─── Bar ────────────────────────────────────────────────────────────────────

export interface VendaProduto {
  produtoId: string;
  nome: string;
  quantidade: number;
  valor: number;
}

export interface ResumoBar {
  /** Consumo lançado no período (competência). */
  vendas: number;
  /** Pagamentos recebidos no período (caixa). */
  recebido: number;
  itensVendidos: number;
  clientes: number;
  porForma: { forma: string; valor: number }[];
  produtos: VendaProduto[];
}

/**
 * Vendas contam pela data de lançamento de cada item e recebimentos pela data
 * de cada pagamento — uma comanda aberta segunda e paga quarta aparece em cada
 * dia pelo que de fato aconteceu nele.
 */
export const resumoBar = (comandas: BarComanda[], i: Intervalo): ResumoBar => {
  let vendas = 0, recebido = 0, itensVendidos = 0;
  const formas = new Map<string, number>();
  const produtos = new Map<string, VendaProduto>();
  const clientes = new Set<string>();

  for (const c of comandas) {
    // Comanda cancelada e item cancelado não são venda; pagamento estornado não é recebimento.
    if (c.status === 'cancelada') continue;
    for (const item of c.itens || []) {
      if (item.cancelado || !dentro(item.lancadoEm, i)) continue;
      const valor = item.precoUnitario * item.quantidade;
      vendas += valor;
      itensVendidos += item.quantidade;
      clientes.add(normalizar(c.clienteNome));
      const atual = produtos.get(item.produtoId) || { produtoId: item.produtoId, nome: item.nome, quantidade: 0, valor: 0 };
      atual.quantidade += item.quantidade;
      atual.valor += valor;
      produtos.set(item.produtoId, atual);
    }
    for (const p of c.pagamentos || []) {
      if (p.estornado || !dentro(p.em, i)) continue;
      // Prêmio do jogo e crédito na casa abatem a conta, mas não são dinheiro entrando.
      if (p.forma === 'Prêmio do jogo' || p.forma === 'Crédito na casa') continue;
      recebido += p.valor;
      const forma = p.forma || 'Não informado';
      formas.set(forma, (formas.get(forma) || 0) + p.valor);
    }
  }

  return {
    vendas,
    recebido,
    itensVendidos,
    clientes: clientes.size,
    porForma: [...formas.entries()].map(([forma, valor]) => ({ forma, valor })).sort((a, b) => b.valor - a.valor),
    produtos: [...produtos.values()].sort((a, b) => b.quantidade - a.quantidade || b.valor - a.valor),
  };
};

// ─── Série diária ───────────────────────────────────────────────────────────

export type Metrica = 'receita' | 'movimento';

export interface PontoDia {
  dia: Date;
  poker: number;
  bar: number;
}

/**
 * Um ponto por dia do intervalo.
 * - receita: o que fica com a casa (rake + administrativo) e as vendas do bar.
 * - movimento: tudo que entrou na mesa de poker e as vendas do bar.
 */
export const seriePorDia = (
  i: Intervalo,
  etapas: EtapaFinanceira[],
  comandas: BarComanda[],
  metrica: Metrica,
  /** Parte de cada item que vai para parceiros: na receita, ela não é da casa. */
  repasseDoItem?: (item: BarComanda['itens'][number]) => number,
): PontoDia[] => {
  const pontos = new Map<string, PontoDia>();
  for (let d = new Date(i.inicio); d < i.fim; d = somarDias(d, 1)) {
    pontos.set(chaveDia(d), { dia: d, poker: 0, bar: 0 });
  }

  for (const e of etapas) {
    const p = pontos.get(chaveDia(new Date(e.data)));
    if (p) p.poker += metrica === 'receita' ? e.receitaCasa : e.bruto;
  }
  for (const c of comandas) {
    if (c.status === 'cancelada') continue;
    for (const item of c.itens || []) {
      if (item.cancelado || !dentro(item.lancadoEm, i)) continue;
      const p = pontos.get(chaveDia(new Date(item.lancadoEm)));
      if (p) p.bar += item.precoUnitario * item.quantidade - (metrica === 'receita' && repasseDoItem ? repasseDoItem(item) : 0);
    }
  }
  return [...pontos.values()];
};

/** Teto "redondo" do eixo e o passo entre as linhas de grade. */
export const escalaEixo = (maximo: number, linhas = 4): { teto: number; passo: number } => {
  if (maximo <= 0) return { teto: linhas, passo: 1 };
  const bruto = maximo / linhas;
  const magnitude = Math.pow(10, Math.floor(Math.log10(bruto)));
  const frac = bruto / magnitude;
  const passo = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10) * magnitude;
  return { teto: passo * linhas, passo };
};
