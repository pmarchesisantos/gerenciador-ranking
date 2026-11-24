import { BarComanda, BarComandaItem, BarProduto } from '../types';
import { Intervalo, dentro } from './financeiro';

const round2 = (v: number) => Math.round(v * 100) / 100;

// ─── Repasse a parceiros ────────────────────────────────────────────────────

export interface RepasseItem {
  parceiro: string;
  percentual: number;
  valor: number;
  /**
   * 'venda': o percentual congelado no lançamento do item.
   * 'cadastro': item vendido antes de o produto ter a regra; usa a regra atual.
   */
  origem: 'venda' | 'cadastro';
}

/** Valor vendido de um item (preço congelado × quantidade). */
export const valorDoItem = (i: Pick<BarComandaItem, 'precoUnitario' | 'quantidade'>) => round2(i.precoUnitario * i.quantidade);

/**
 * Quanto de um item vai para o parceiro. Vale o percentual gravado na venda;
 * itens vendidos antes da regra existir usam a regra atual do produto.
 */
export const repasseDoItem = (item: BarComandaItem, produtos: Map<string, BarProduto>): RepasseItem | null => {
  if (item.repasseParceiro && item.repassePercentual != null) {
    return { parceiro: item.repasseParceiro, percentual: item.repassePercentual, valor: round2(valorDoItem(item) * item.repassePercentual / 100), origem: 'venda' };
  }
  const regra = produtos.get(item.produtoId)?.repasse;
  if (!regra) return null;
  return { parceiro: regra.parceiro, percentual: regra.percentual, valor: round2(valorDoItem(item) * regra.percentual / 100), origem: 'cadastro' };
};

export const mapaProdutos = (produtos: BarProduto[]) => new Map(produtos.map(p => [p.id, p]));

/** Nomes de parceiros já usados, para sugerir no cadastro e filtrar no relatório. */
export const parceirosDe = (produtos: BarProduto[], comandas: BarComanda[] = []): string[] => {
  const nomes = new Set<string>();
  for (const p of produtos) if (p.repasse?.parceiro) nomes.add(p.repasse.parceiro);
  for (const c of comandas) for (const i of c.itens || []) if (i.repasseParceiro) nomes.add(i.repasseParceiro);
  return [...nomes].sort((a, b) => a.localeCompare(b));
};

// ─── Linhas de venda ────────────────────────────────────────────────────────

export type SituacaoVenda = 'paga' | 'em-aberto' | 'fiado';

export interface LinhaVenda {
  itemId: string;
  comandaId: string;
  comandaNumero?: number;
  cliente: string;
  data: string;
  produtoId: string;
  produto: string;
  categoria?: string;
  quantidade: number;
  unitario: number;
  total: number;
  custo?: number;
  repasse: RepasseItem | null;
  /** O que fica com a casa: total − repasse. */
  casa: number;
  situacao: SituacaoVenda;
}

const situacaoDa = (c: BarComanda): SituacaoVenda =>
  c.status === 'paga' ? 'paga' : c.status === 'fechada' ? 'fiado' : 'em-aberto';

export const ROTULO_SITUACAO: Record<SituacaoVenda, string> = {
  paga: 'Paga',
  'em-aberto': 'Comanda aberta',
  fiado: 'Fiado',
};

/**
 * Cada item vendido no intervalo, pela data de lançamento (competência), como
 * no financeiro. Itens e comandas cancelados não são venda.
 */
export const linhasDeVenda = (comandas: BarComanda[], produtos: BarProduto[], i: Intervalo): LinhaVenda[] => {
  const mapa = mapaProdutos(produtos);
  const linhas: LinhaVenda[] = [];
  for (const c of comandas) {
    if (c.status === 'cancelada') continue;
    for (const item of c.itens || []) {
      if (item.cancelado || !dentro(item.lancadoEm, i)) continue;
      const total = valorDoItem(item);
      const repasse = repasseDoItem(item, mapa);
      linhas.push({
        itemId: item.id,
        comandaId: c.id,
        comandaNumero: c.numero,
        cliente: c.clienteNome,
        data: item.lancadoEm,
        produtoId: item.produtoId,
        produto: item.nome,
        categoria: mapa.get(item.produtoId)?.categoria,
        quantidade: item.quantidade,
        unitario: item.precoUnitario,
        total,
        custo: item.custoUnitario != null ? round2(item.custoUnitario * item.quantidade) : undefined,
        repasse,
        casa: round2(total - (repasse?.valor || 0)),
        situacao: situacaoDa(c),
      });
    }
  }
  return linhas.sort((a, b) => b.data.localeCompare(a.data));
};

export interface ResumoRepasse {
  parceiro: string;
  itens: number;
  vendido: number;
  repasse: number;
  /** Do repasse, a parte de comandas já pagas pelo cliente. */
  repasseRecebido: number;
}

export const repassesPorParceiro = (linhas: LinhaVenda[]): ResumoRepasse[] => {
  const mapa = new Map<string, ResumoRepasse>();
  for (const l of linhas) {
    if (!l.repasse) continue;
    const r = mapa.get(l.repasse.parceiro) || { parceiro: l.repasse.parceiro, itens: 0, vendido: 0, repasse: 0, repasseRecebido: 0 };
    r.itens += l.quantidade;
    r.vendido = round2(r.vendido + l.total);
    r.repasse = round2(r.repasse + l.repasse.valor);
    if (l.situacao === 'paga') r.repasseRecebido = round2(r.repasseRecebido + l.repasse.valor);
    mapa.set(r.parceiro, r);
  }
  return [...mapa.values()].sort((a, b) => b.repasse - a.repasse);
};

export interface VendaAgrupada {
  produtoId: string;
  produto: string;
  categoria?: string;
  quantidade: number;
  total: number;
  repasse: number;
  casa: number;
  parceiro?: string;
}

export const agruparPorProduto = (linhas: LinhaVenda[]): VendaAgrupada[] => {
  const mapa = new Map<string, VendaAgrupada>();
  for (const l of linhas) {
    const g = mapa.get(l.produtoId) || { produtoId: l.produtoId, produto: l.produto, categoria: l.categoria, quantidade: 0, total: 0, repasse: 0, casa: 0, parceiro: l.repasse?.parceiro };
    g.quantidade += l.quantidade;
    g.total = round2(g.total + l.total);
    g.repasse = round2(g.repasse + (l.repasse?.valor || 0));
    g.casa = round2(g.casa + l.casa);
    mapa.set(l.produtoId, g);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total);
};

/** Total repassado a parceiros num intervalo (para o financeiro). */
export const repasseNoIntervalo = (comandas: BarComanda[], produtos: BarProduto[], i: Intervalo): number =>
  round2(linhasDeVenda(comandas, produtos, i).reduce((a, l) => a + (l.repasse?.valor || 0), 0));

// ─── Planilha ───────────────────────────────────────────────────────────────

export const dataHoraPlanilha = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const nomeArquivo = (...partes: string[]) =>
  partes.filter(Boolean).join('-').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
