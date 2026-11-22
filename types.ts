
export interface Player {
  id: string;
  name: string;
  /** Pessoa do cadastro geral a que esta participação no ranking pertence. */
  jogadorId?: string;
  totalPoints: number;
  prevPoints: number;
  attendances: number;
  wins: number;
  dayPoints: number;
  accumulatedValue: number;
  /**
   * Dados pessoais gravados no ranking antes do cadastro geral. Continuam como
   * estão; participações novas guardam esses dados só no cadastro (privado),
   * porque rankings têm leitura pública.
   */
  phone?: string;
  birthDate?: string;
  favoriteTeam?: string;
  active?: boolean;
}

/**
 * Pessoa do cadastro geral da casa: a fonte única de quem joga e de quem
 * consome no bar. Fica em casas/{id}/jogadores, com leitura só para o dono.
 */
export interface Jogador {
  id: string;
  nome: string;
  /** Nome sem acento, minúsculo e com espaços únicos — a chave contra duplicidade. */
  nomeNormalizado: string;
  telefone?: string;
  /** Data de nascimento em ISO (AAAA-MM-DD). */
  nascimento?: string;
  time?: string;
  ativo?: boolean;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface ScoringConfig {
  [position: number]: number;
  baseAttendance: number;
}

export interface CustomValueField {
  id: string;
  name: string;
  value: number;
  /** Fichas entregues por este extra. */
  chips?: number;
}

export interface GameCategory {
  id: string;
  name: string;
  buyIn: number;
  reBuy: number;
  reBuyDuplo: number;
  addOn: number;
  customValues?: CustomValueField[];
  rake: number;
  rankingPercent: number;
  /** Fichas entregues em cada tipo de compra desta categoria. */
  buyInChips?: number;
  reBuyChips?: number;
  reBuyDuploChips?: number;
  addOnChips?: number;
}

export interface WeeklyHistoryEntry {
  id: string;
  date: string;
  name?: string;
  multiplier: number;
  categoryId?: string;
  /** Valor que esta etapa acrescentou ao bolo do ranking. */
  rankingValue?: number;
  /** Campeão(ões) da etapa. Usado quando não há resultado em 1º lugar registrado. */
  championIds?: string[];
  /**
   * Fechamento financeiro gravado no lançamento. Etapas antigas não têm estes
   * campos: o bruto e o rake são reconstruídos pela categoria, e o
   * administrativo é desconhecido.
   */
  totalBruto?: number;
  rakeValue?: number;
  valorAdministrativo?: number;
  results: {
    playerId: string;
    position: number;
    pointsEarned: number;
    rebuys?: number;
    doubleRebuys?: number;
    addons?: number;
    customValues?: { [fieldId: string]: number };
    totalValue?: number;
    paid?: boolean;
  }[];
}

/** Valores financeiros do lançamento, gravados na etapa. */
export interface StageFinanceiro {
  totalBruto: number;
  rakeValue: number;
  valorAdministrativo: number;
}

export interface Ranking {
  id: string;
  name: string;
  players: Player[];
  scoringConfig: ScoringConfig;
  history: WeeklyHistoryEntry[];
  gameCategories?: GameCategory[];
  /** Ranking oculto na visão pública quando false. Ausente significa ativo. */
  active?: boolean;
}

export interface Contact {
  name: string;
  phone: string;
}

export interface ProfileData {
  logoUrl?: string;
  contacts: Contact[];
  instagramUrl?: string;
}

export interface PokerHouse {
  id: string;
  slug: string;
  name: string;
  rankings: Ranking[];
  profile?: ProfileData;
}

export interface BlindLevel {
  id: string;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
  isBreak?: boolean;
}

export interface BlindStructure {
  id: string;
  name: string;
  levels: BlindLevel[];
}

export interface PrizeDistribution {
  position: number;
  percentage: number;
  value: number;
}

export interface PokerClockConfig {
  tournamentName: string;
  activeStructureId: string;
  structures: BlindStructure[];
  playersRemaining?: number;
  totalPlayers?: number;
  totalPrize?: number;
  prizeDistribution?: PrizeDistribution[];
  lastEliminationTime?: number;

  /** Fichas entregues em cada tipo de entrada. Base do total de fichas em jogo. */
  startingStack?: number;
  rebuyStack?: number;
  doubleRebuyStack?: number;
  addonStack?: number;

  /** Total exato de fichas da etapa, calculado pela categoria no lançamento. */
  totalChips?: number;

  /** Contagens da etapa em andamento, enviadas pelo lançamento. */
  entries?: number;
  rebuys?: number;
  doubleRebuys?: number;
  addons?: number;

  /** Exibir a premiação no clock. Definido ao iniciar a etapa. */
  showPrize?: boolean;
}

export type BarUnidade = 'un' | 'dose' | 'lata' | 'long neck' | 'garrafa' | 'copo' | 'porção' | 'kg' | 'L';

export interface BarProduto {
  id: string;
  nome: string;
  descricao?: string;
  categoria?: string;
  /** Código interno ou de barras. */
  codigo?: string;
  unidade?: BarUnidade;
  preco: number;
  /** Custo de compra por unidade de venda — base da margem e do CMV. */
  custo?: number;
  /** Miniatura redimensionada no navegador e gravada como data URL. */
  imagem?: string;
  /** Com controle ligado, cada venda baixa o estoque e cada cancelamento devolve. */
  controlaEstoque?: boolean;
  estoque?: number;
  estoqueMinimo?: number;
  /** Aparece primeiro no PDV. */
  destaque?: boolean;
  /** Classificação fiscal (8 dígitos). Opcional: só importa para emissão de nota. */
  ncm?: string;
  /** Produto fora de linha fica oculto no PDV. Ausente significa ativo. */
  ativo?: boolean;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface BarComandaItem {
  /** Identifica o lançamento: cada lançamento é uma linha, nunca editada. */
  id: string;
  produtoId: string;
  /** Nome, preço e custo são congelados no lançamento: mudar o produto não reescreve o passado. */
  nome: string;
  precoUnitario: number;
  custoUnitario?: number;
  quantidade: number;
  lancadoEm: string;
  /** Item cancelado continua na comanda, riscado, com motivo — nunca é apagado. */
  cancelado?: boolean;
  canceladoEm?: string;
  motivoCancelamento?: string;
}

/**
 * Ciclo de vida, que só anda para frente:
 * - aberta: aceita consumo e pagamento parcial.
 * - fechada: conta pedida. Não aceita mais consumo; só pagamento. Se sobrar
 *   saldo, é fiado e aparece em "quem deve".
 * - paga: quitada. Somente leitura; a única saída é estornar um pagamento.
 * - cancelada: anulada com motivo. Não conta no financeiro.
 */
export type BarComandaStatus = 'aberta' | 'fechada' | 'paga' | 'cancelada';

export interface BarComanda {
  id: string;
  /** Número sequencial dentro do caixa, como o cartão de comanda de um bar. */
  numero?: number;
  clienteNome: string;
  /** Preenchido quando o cliente é um jogador cadastrado em algum ranking. */
  playerId?: string;
  /** Data de abertura, em ISO. */
  data: string;
  /** Caixa em que a comanda foi aberta. */
  caixaId?: string;
  status: BarComandaStatus;
  itens: BarComandaItem[];
  /** Soma dos itens não cancelados, gravada para o dashboard não recalcular tudo. */
  total: number;
  /** Soma dos pagamentos não estornados. */
  valorPago: number;
  pagamentos?: BarPagamento[];
  fechadaEm?: string;
  pagoEm?: string;
  canceladaEm?: string;
  motivoCancelamento?: string;
  /** Trilha de eventos que mudaram o estado da comanda. */
  historico?: BarEvento[];
  /** Poker do dia recebido nesta comanda. Fica fora do consumo e das vendas do bar. */
  pagamentosPoker?: BarPagamentoPoker[];
}

/**
 * Recebimento do poker de uma etapa feito no bar. O valor entra na gaveta do
 * caixa, mas não é venda do bar: o financeiro já conta o poker pela etapa.
 * Receber marca o jogador como pago no lançamento; estornar desmarca.
 */
export interface BarPagamentoPoker {
  id: string;
  valor: number;
  /** Como foi pago: uma conta dividida pode ter mais de uma forma. */
  partes: { forma: string; valor: number }[];
  em: string;
  caixaId: string;
  rankingId: string;
  rankingNome: string;
  /** Dia da etapa (AAAA-MM-DD). */
  dia: string;
  /** Jogador no ranking (id do resultado da etapa). */
  playerId: string;
  nome: string;
  estornado?: boolean;
  estornadoEm?: string;
  motivoEstorno?: string;
}

export type BarFormaPagamento = 'Dinheiro' | 'Pix' | 'Débito' | 'Crédito';

export interface BarPagamento {
  id?: string;
  valor: number;
  forma?: string;
  em: string;
  /** Caixa que recebeu — base do resumo do fechamento. */
  caixaId?: string;
  estornado?: boolean;
  estornadoEm?: string;
  motivoEstorno?: string;
}

export interface BarEvento {
  em: string;
  tipo: 'abertura' | 'fechamento' | 'reabertura' | 'pagamento' | 'estorno' | 'cancelamento-item' | 'cancelamento';
  descricao: string;
}

export interface BarMovimentoCaixa {
  id: string;
  /** Sangria tira dinheiro da gaveta; suprimento coloca. */
  tipo: 'sangria' | 'suprimento';
  valor: number;
  motivo: string;
  em: string;
}

export interface BarCaixa {
  id: string;
  /** Cancelado: aberto por engano. Comandas e recebimentos dele foram anulados. */
  status: 'aberto' | 'fechado' | 'cancelado';
  abertoEm: string;
  abertoPor?: string;
  /** Dinheiro na gaveta ao abrir: o fundo de troco. */
  fundoTroco: number;
  movimentos: BarMovimentoCaixa[];
  fechadoEm?: string;
  fechadoPor?: string;
  /** Total recebido por forma de pagamento, gravado no fechamento. */
  recebido?: Record<string, number>;
  /** Poker recebido no bar por forma, gravado no fechamento. */
  recebidoPoker?: Record<string, number>;
  /** Legado: caixas fechados quando havia conferência por contagem. */
  esperado?: Record<string, number>;
  conferido?: Record<string, number>;
  observacao?: string;
  canceladoEm?: string;
  canceladoPor?: string;
  motivoCancelamento?: string;
}

export type View = 'dashboard' | 'settings' | 'history' | 'profile' | 'player-data' | 'poker-clock' | 'poker-clock-settings' | 'bar-produtos' | 'bar-caixa' | 'financeiro';
