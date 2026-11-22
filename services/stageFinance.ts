import { CustomValueField, GameCategory, Ranking, WeeklyHistoryEntry } from '../types';
import { getStageValues } from './stageValues';

export interface PlayerSpend {
  playerId: string;
  name: string;
  position: number;
  pointsEarned: number;
  rebuys: number;
  doubleRebuys: number;
  addons: number;
  customValues: { [fieldId: string]: number };
  paid: boolean;
  /** Quanto o jogador colocou na etapa: buy-in + re-buys + add-on + extras. */
  gross: number;
}

export interface StageFinance {
  category?: GameCategory;
  customFields: CustomValueField[];
  players: PlayerSpend[];
  totals: {
    buyins: number;
    rebuys: number;
    doubleRebuys: number;
    addons: number;
    customValues: { [fieldId: string]: number };
  };
  totalBruto: number;
  rakePercent: number;
  rakeValue: number;
  /** Valor destinado ao ranking — o mesmo exibido na modal de Valores por Etapa. */
  rankingValue: number;
  /** Bruto menos rake e ranking. Não desconta o valor administrativo, que não é gravado. */
  liquido: number;
}

/** Quanto um resultado da etapa custou, segundo os preços da categoria. */
export const calculateResultGross = (
  result: WeeklyHistoryEntry['results'][number],
  category?: GameCategory
): number => {
  if (!category) return 0;
  const custom = (category.customValues || []).reduce(
    (acc, field) => acc + (result.customValues?.[field.id] || 0) * field.value,
    0
  );
  return (
    category.buyIn +
    (result.rebuys || 0) * category.reBuy +
    (result.doubleRebuys || 0) * category.reBuyDuplo +
    (result.addons || 0) * category.addOn +
    custom
  );
};

/**
 * Reconstrói o fechamento financeiro de uma etapa já lançada, a partir dos
 * valores gravados em cada resultado e dos preços da categoria usada.
 *
 * O valor administrativo não entra: ele é informado no lançamento e não é
 * gravado no histórico, então o líquido aqui é bruto - rake - ranking.
 */
export const getStageFinance = (ranking: Ranking, entry: WeeklyHistoryEntry): StageFinance => {
  const category = (ranking.gameCategories || []).find(c => c.id === entry.categoryId);
  const customFields = category?.customValues || [];
  const nameOf = (playerId: string) =>
    ranking.players.find(p => p.id === playerId)?.name || 'Jogador removido';

  const players: PlayerSpend[] = (entry.results || [])
    .map(r => ({
      playerId: r.playerId,
      name: nameOf(r.playerId),
      position: r.position,
      pointsEarned: r.pointsEarned,
      rebuys: r.rebuys || 0,
      doubleRebuys: r.doubleRebuys || 0,
      addons: r.addons || 0,
      customValues: r.customValues || {},
      paid: !!r.paid,
      gross: calculateResultGross(r, category),
    }))
    .sort((a, b) => a.position - b.position);

  const totals = {
    buyins: players.length,
    rebuys: players.reduce((acc, p) => acc + p.rebuys, 0),
    doubleRebuys: players.reduce((acc, p) => acc + p.doubleRebuys, 0),
    addons: players.reduce((acc, p) => acc + p.addons, 0),
    customValues: customFields.reduce((acc, field) => {
      acc[field.id] = players.reduce((sum, p) => sum + (p.customValues[field.id] || 0), 0);
      return acc;
    }, {} as { [fieldId: string]: number }),
  };

  const totalBruto = players.reduce((acc, p) => acc + p.gross, 0);
  const rakePercent = category?.rake || 0;
  const rakeValue = totalBruto * (rakePercent / 100);

  // Usa o mesmo valor da modal de Valores por Etapa para os números baterem.
  const rankingValue = getStageValues(ranking).find(s => s.id === entry.id)?.value || 0;

  return {
    category,
    customFields,
    players,
    totals,
    totalBruto,
    rakePercent,
    rakeValue,
    rankingValue,
    liquido: totalBruto - rakeValue - rankingValue,
  };
};
