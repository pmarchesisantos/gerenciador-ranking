import { Ranking, WeeklyHistoryEntry } from '../types';

export interface StageValue {
  id: string;
  date: string;
  name?: string;
  /** Valor que a etapa acrescentou ao bolo do ranking. */
  value: number;
  /** Ids dos campeões da etapa (vazio quando não foi registrado). */
  championIds: string[];
  /** Nomes já resolvidos dos campeões, na ordem de championIds. */
  championNames: string[];
  /** Houve acordo: mais de um jogador empatado na melhor posição da etapa. */
  isChop: boolean;
  /** O campeão foi definido manualmente, sobrepondo a detecção automática. */
  isManualChampion: boolean;
  /** Jogador a quem o valor da etapa é destinado. Em acordos, um do grupo. */
  valueRecipientId: string;
  valueRecipientName: string;
  /** O valor foi recuperado do acumulado do jogador, não gravado na etapa. */
  isInferred: boolean;
  /** Participantes da etapa, ordenados por posição — usado para escolher o campeão. */
  participants: { id: string; name: string; position: number }[];
}

/** Valor gravado nos resultados da etapa (formato legado). */
const recordedValue = (entry: WeeklyHistoryEntry): number =>
  (entry.results || []).reduce((acc, r) => acc + (r.totalValue || 0), 0);

/** Valor da etapa: o campo explícito quando existe, senão o legado gravado nos resultados. */
export const getStageValue = (entry: WeeklyHistoryEntry): number => {
  if (typeof entry.rankingValue === 'number') return entry.rankingValue;
  return recordedValue(entry);
};

/**
 * Campeões da etapa: o campo explícito quando existe, senão todos os jogadores
 * empatados na melhor posição registrada. Em etapas com acordo os pontos são
 * divididos e não há um vencedor único — nesse caso o grupo inteiro é o campeão.
 */
export const getStageChampionIds = (entry: WeeklyHistoryEntry): string[] => {
  if (entry.championIds && entry.championIds.length > 0) return entry.championIds;
  const results = entry.results || [];
  if (results.length === 0) return [];
  const bestPosition = Math.min(...results.map(r => r.position));
  return results.filter(r => r.position === bestPosition).map(r => r.playerId);
};

/** Hash estável de string — mesma entrada, mesmo resultado em qualquer aparelho. */
const stableHash = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/**
 * Em acordos ninguém fica em 1º, mas o valor da etapa precisa de um destinatário.
 * A escolha usa o id da etapa como semente: é sorteada, porém estável — o mesmo
 * jogador aparece em todo reload e em todos os aparelhos.
 */
export const pickValueRecipient = (entryId: string, championIds: string[]): string => {
  if (championIds.length === 0) return '';
  return championIds[stableHash(entryId) % championIds.length];
};

/**
 * Saldo de cada jogador que está no acumulado dele mas não aparece em nenhuma
 * etapa. É o dinheiro digitado à mão na grid antiga, antes de o valor passar a
 * ser gravado por etapa — a única fonte que resta para as etapas zeradas.
 */
const getUnallocatedByPlayer = (ranking: Ranking): Record<string, number> => {
  const recordedByPlayer: Record<string, number> = {};
  for (const entry of ranking.history || []) {
    for (const r of entry.results || []) {
      if (r.totalValue) recordedByPlayer[r.playerId] = (recordedByPlayer[r.playerId] || 0) + r.totalValue;
    }
  }
  const leftover: Record<string, number> = {};
  for (const p of ranking.players || []) {
    const rest = (p.accumulatedValue || 0) - (recordedByPlayer[p.id] || 0);
    if (rest > 0) leftover[p.id] = rest;
  }
  return leftover;
};

/** Etapas em ordem cronológica (mais antiga primeiro), prontas para exibição. */
export const getStageValues = (ranking: Ranking | null): StageValue[] => {
  if (!ranking) return [];
  const nameOf = (playerId: string) =>
    ranking.players.find(p => p.id === playerId)?.name || 'Jogador removido';

  const leftover = getUnallocatedByPlayer(ranking);

  return [...(ranking.history || [])]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(entry => {
      const championIds = getStageChampionIds(entry);
      const isManualChampion = !!(entry.championIds && entry.championIds.length > 0);
      const hasExplicitValue = typeof entry.rankingValue === 'number';

      let value = hasExplicitValue ? (entry.rankingValue as number) : recordedValue(entry);
      let isInferred = false;

      // Quem já carrega o valor gravado é o destinatário natural da etapa.
      let valueRecipientId =
        (entry.results || []).find(r => (r.totalValue || 0) > 0)?.playerId ||
        pickValueRecipient(entry.id, championIds);

      // Etapa zerada: recupera o valor do acumulado de quem venceu, destinando
      // ao membro do grupo com o maior saldo ainda não alocado.
      if (!hasExplicitValue && value === 0) {
        const candidate = championIds
          .filter(id => (leftover[id] || 0) > 0)
          .sort((a, b) => leftover[b] - leftover[a] || a.localeCompare(b))[0];
        if (candidate) {
          value = leftover[candidate];
          delete leftover[candidate];
          valueRecipientId = candidate;
          isInferred = true;
        }
      }

      return {
        id: entry.id,
        date: entry.date,
        name: entry.name,
        value,
        championIds,
        championNames: championIds.map(nameOf),
        isChop: !isManualChampion && championIds.length > 1,
        isManualChampion,
        valueRecipientId,
        valueRecipientName: valueRecipientId ? nameOf(valueRecipientId) : '',
        isInferred,
        participants: (entry.results || [])
          .map(r => ({ id: r.playerId, name: nameOf(r.playerId), position: r.position }))
          .sort((a, b) => a.position - b.position),
      };
    });
};

export const getStagesTotal = (ranking: Ranking | null): number =>
  getStageValues(ranking).reduce((acc, s) => acc + s.value, 0);

export const formatBRL = (value: number, fractionDigits = 2): string =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
