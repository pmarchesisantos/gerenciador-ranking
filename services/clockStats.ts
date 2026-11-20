import { GameCategory, PokerClockConfig } from '../types';

export interface ChipCounts {
  entries: number;
  rebuys: number;
  doubleRebuys: number;
  addons: number;
  /** Quantidade somada de cada campo personalizado, por id do campo. */
  customValues?: { [fieldId: string]: number };
}

/**
 * Total de fichas em jogo segundo os valores da categoria da etapa.
 *
 * É o caminho exato: cada compra da categoria tem suas próprias fichas,
 * inclusive os campos personalizados. Retorna 0 quando a categoria ainda não
 * tem fichas parametrizadas.
 */
export const getChipsFromCategory = (
  category: GameCategory | undefined,
  counts: ChipCounts
): number => {
  if (!category) return 0;
  const custom = (category.customValues || []).reduce(
    (acc, field) => acc + (counts.customValues?.[field.id] || 0) * (field.chips || 0),
    0
  );
  return (
    counts.entries * (category.buyInChips || 0) +
    counts.rebuys * (category.reBuyChips || 0) +
    counts.doubleRebuys * (category.reBuyDuploChips || 0) +
    counts.addons * (category.addOnChips || 0) +
    custom
  );
};

export const DEFAULT_STARTING_STACK = 10000;

export interface ClockStats {
  playersRemaining: number;
  totalPlayers: number;
  /** Soma das fichas distribuídas em entradas, re-buys e add-ons. */
  totalChips: number;
  /** Fichas totais divididas pelos jogadores ainda em jogo. */
  averageStack: number;
  totalPrize: number;
  /** Há dados de fichas para exibir (ao menos uma entrada na etapa). */
  hasChipData: boolean;
  /** O stack usado veio do padrão, não de uma configuração do clube. */
  usingDefaultStack: boolean;
}

/**
 * Traduz as contagens da etapa em andamento para os números do clock.
 *
 * As contagens (entradas, re-buys, add-ons) vêm do lançamento; os tamanhos de
 * stack vêm das configurações do clock. Manter os dois separados permite
 * corrigir um stack configurado errado sem precisar relançar a etapa.
 */
export const getClockStats = (config: PokerClockConfig): ClockStats => {
  // Sem configuração, assume um stack padrão para que os números já apareçam.
  // O valor real se ajusta em Configurações do Clock.
  const startingStack = config.startingStack || DEFAULT_STARTING_STACK;
  // Sem valor próprio, cada re-buy/add-on vale um stack inicial, e o duplo vale dois.
  const rebuyStack = config.rebuyStack ?? startingStack;
  const doubleRebuyStack = config.doubleRebuyStack ?? startingStack * 2;
  const addonStack = config.addonStack ?? startingStack;

  const totalPlayers = config.totalPlayers || 0;
  // Sem contagem explícita de entradas, cada jogador da etapa é uma entrada.
  const entries = config.entries ?? totalPlayers;
  const playersRemaining = config.playersRemaining || 0;

  // O lançamento envia o total exato calculado pela categoria da etapa.
  // Sem ele (etapa sem categoria ou sem fichas parametrizadas), estima pelo stack.
  const fromCategory = config.totalChips || 0;
  const estimated =
    entries * startingStack +
    (config.rebuys || 0) * rebuyStack +
    (config.doubleRebuys || 0) * doubleRebuyStack +
    (config.addons || 0) * addonStack;

  const totalChips = fromCategory > 0 ? fromCategory : estimated;

  return {
    playersRemaining,
    totalPlayers,
    totalChips,
    averageStack: playersRemaining > 0 ? Math.round(totalChips / playersRemaining) : 0,
    totalPrize: config.totalPrize || 0,
    hasChipData: entries > 0,
    usingDefaultStack: fromCategory === 0 && !config.startingStack,
  };
};

/** Abrevia valores de ficha para caber no telão: 1.2M, 36k, 950. */
export const formatChips = (value: number): string => {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions.toFixed(millions >= 10 ? 0 : 1).replace('.', ',')}M`;
  }
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString('pt-BR');
};
