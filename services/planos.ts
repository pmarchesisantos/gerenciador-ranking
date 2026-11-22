/**
 * Planos de assinatura e o que cada um libera.
 *
 * O app checa sempre por RECURSO (`temRecurso(casa, 'bar')`), nunca pelo nome
 * do plano: assim um ajuste comercial mexe só neste arquivo. As regras do
 * Firestore repetem o mesmo mapa (função `temBar`, `temGestao`) — se mudar
 * aqui, mude lá também.
 *
 * Este arquivo é usado pelo app e pelas funções de servidor (pasta api/), então
 * não pode importar nada do navegador.
 */

/**
 * Identificadores internos, gravados no banco e nas regras do Firestore: não
 * mudam. O nome exibido fica em `nome` (Standard, Gold, Black).
 */
export type PlanoId = 'essencial' | 'profissional' | 'completo';
export type Periodo = 'mensal' | 'anual';
export type Recurso = 'ranking' | 'pokerClock' | 'financeiro' | 'bar';

export interface Plano {
  id: PlanoId;
  nome: string;
  resumo: string;
  /** Preço cheio por mês, em reais. */
  mensal: number;
  /**
   * Taxa única de implantação (configuração e cadastro feitos com o dono do
   * clube). Cobrada junto do primeiro mês; isenta no plano anual.
   */
  implantacao: number;
  recursos: Recurso[];
  /** Itens exibidos na tabela de preços. */
  inclui: string[];
  destaque?: boolean;
}

/** Desconto do plano anual sobre 12 meses do valor cheio. */
export const DESCONTO_ANUAL = 0.15;

export const PLANOS: Record<PlanoId, Plano> = {
  essencial: {
    id: 'essencial',
    nome: 'Standard',
    resumo: 'Ranking do clube com lançamento de resultados.',
    mensal: 49.99,
    implantacao: 149.90,
    recursos: ['ranking'],
    inclui: ['Rankings ilimitados', 'Lançamento de etapas', 'Cadastro de jogadores', 'Histórico e página pública'],
  },
  profissional: {
    id: 'profissional',
    nome: 'Gold',
    resumo: 'Tudo do Standard, mais poker clock e financeiro.',
    mensal: 79.90,
    implantacao: 199.90,
    recursos: ['ranking', 'pokerClock', 'financeiro'],
    inclui: ['Tudo do Standard', 'Poker clock para TV', 'Estruturas de blinds', 'Financeiro do poker'],
    destaque: true,
  },
  completo: {
    id: 'completo',
    nome: 'Black',
    resumo: 'O clube inteiro: poker, financeiro e bar.',
    mensal: 249.90,
    implantacao: 499.90,
    recursos: ['ranking', 'pokerClock', 'financeiro', 'bar'],
    inclui: ['Tudo do Gold', 'Bar com PDV e comandas', 'Caixa, fiado e estoque', 'Financeiro poker + bar'],
  },
};

export const LISTA_PLANOS: Plano[] = [PLANOS.essencial, PLANOS.profissional, PLANOS.completo];

const centavos = (v: number) => Math.round(v * 100) / 100;

/** Valor cobrado no período: anual = 12 meses com o desconto. */
export const precoDoPeriodo = (plano: PlanoId, periodo: Periodo): number =>
  periodo === 'anual' ? centavos(PLANOS[plano].mensal * 12 * (1 - DESCONTO_ANUAL)) : PLANOS[plano].mensal;

/** Implantação devida no cadastro: isenta no anual. */
export const taxaImplantacao = (plano: PlanoId, periodo: Periodo): number =>
  periodo === 'anual' ? 0 : PLANOS[plano].implantacao;

/** Primeira fatura do cadastro: o período + a implantação (quando houver). */
export const primeiraCobranca = (plano: PlanoId, periodo: Periodo): number =>
  centavos(precoDoPeriodo(plano, periodo) + taxaImplantacao(plano, periodo));

/**
 * Upgrade de plano cobra a diferença de implantação (o Black inclui cadastrar
 * o bar). Sem isso, assinar o Standard e trocar para o Black pularia essa taxa.
 */
export const diferencaImplantacao = (de: PlanoId, para: PlanoId): number =>
  Math.max(0, centavos(PLANOS[para].implantacao - PLANOS[de].implantacao));

/** Equivalente mensal do plano anual, para comparar na tabela. */
export const mensalEquivalente = (plano: PlanoId, periodo: Periodo): number =>
  periodo === 'anual' ? centavos(precoDoPeriodo(plano, 'anual') / 12) : PLANOS[plano].mensal;

export const ehPlano = (v: unknown): v is PlanoId => typeof v === 'string' && v in PLANOS;

// ─── Acesso da casa ─────────────────────────────────────────────────────────

export type StatusAssinatura = 'pendente' | 'ativa' | 'atrasada' | 'cancelada';

/**
 * Parte pública da assinatura, gravada no documento da casa SÓ pelo servidor.
 * Nada aqui é sensível: CPF/CNPJ, telefone e ids do gateway ficam fora.
 */
export interface AssinaturaPublica {
  status: StatusAssinatura;
  periodo: Periodo;
  /** Acesso liberado até (inclui a tolerância). Ausente enquanto não pagou. */
  ate?: string;
}

/** O que o app precisa saber de uma casa para decidir o acesso. */
export interface CasaComPlano {
  plano?: PlanoId;
  assinatura?: AssinaturaPublica;
}

/**
 * Casas criadas pelo administrador antes das assinaturas não têm plano nem
 * assinatura: continuam com tudo liberado (cortesia), como sempre tiveram.
 * O administrador pode atribuir um plano a elas a qualquer momento.
 */
export const recursosDaCasa = (casa: CasaComPlano): Set<Recurso> =>
  new Set(casa.plano && PLANOS[casa.plano] ? PLANOS[casa.plano].recursos : PLANOS.completo.recursos);

export const temRecurso = (casa: CasaComPlano, recurso: Recurso) => recursosDaCasa(casa).has(recurso);

/** Sem assinatura = cortesia (liberada). Com assinatura, vale até a data paga. */
export const acessoLiberado = (casa: CasaComPlano, agora = new Date()): boolean => {
  if (!casa.assinatura) return true;
  return !!casa.assinatura.ate && new Date(casa.assinatura.ate) > agora;
};

/** O plano mais barato que libera o recurso — para o aviso de "disponível no plano X". */
export const planoQueLibera = (recurso: Recurso): Plano =>
  LISTA_PLANOS.find(p => p.recursos.includes(recurso)) || PLANOS.completo;

/** Dias de tolerância depois do vencimento antes de bloquear o acesso. */
export const TOLERANCIA_DIAS = 3;
