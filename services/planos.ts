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

export type PlanoId = 'essencial' | 'profissional' | 'completo';
export type Periodo = 'mensal' | 'anual';
export type Recurso = 'ranking' | 'pokerClock' | 'financeiro' | 'bar';

export interface Plano {
  id: PlanoId;
  nome: string;
  resumo: string;
  /** Preço cheio por mês, em reais. */
  mensal: number;
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
    nome: 'Essencial',
    resumo: 'Ranking do clube com lançamento de resultados.',
    mensal: 49.99,
    recursos: ['ranking'],
    inclui: ['Rankings ilimitados', 'Lançamento de etapas', 'Cadastro de jogadores', 'Histórico e página pública'],
  },
  profissional: {
    id: 'profissional',
    nome: 'Profissional',
    resumo: 'Tudo do Essencial, mais poker clock e financeiro.',
    mensal: 79.90,
    recursos: ['ranking', 'pokerClock', 'financeiro'],
    inclui: ['Tudo do Essencial', 'Poker clock para TV', 'Estruturas de blinds', 'Financeiro do poker'],
    destaque: true,
  },
  completo: {
    id: 'completo',
    nome: 'Completo',
    resumo: 'O clube inteiro: poker, financeiro e bar.',
    mensal: 249.90,
    recursos: ['ranking', 'pokerClock', 'financeiro', 'bar'],
    inclui: ['Tudo do Profissional', 'Bar com PDV e comandas', 'Caixa, fiado e estoque', 'Financeiro poker + bar'],
  },
};

export const LISTA_PLANOS: Plano[] = [PLANOS.essencial, PLANOS.profissional, PLANOS.completo];

const centavos = (v: number) => Math.round(v * 100) / 100;

/** Valor cobrado no período: anual = 12 meses com o desconto. */
export const precoDoPeriodo = (plano: PlanoId, periodo: Periodo): number =>
  periodo === 'anual' ? centavos(PLANOS[plano].mensal * 12 * (1 - DESCONTO_ANUAL)) : PLANOS[plano].mensal;

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
