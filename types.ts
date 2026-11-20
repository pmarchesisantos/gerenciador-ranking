
export interface Player {
  id: string;
  name: string;
  totalPoints: number;
  prevPoints: number;
  attendances: number;
  wins: number;
  dayPoints: number;
  accumulatedValue: number;
  // Novos campos de cadastro
  phone?: string;
  birthDate?: string;
  favoriteTeam?: string;
  active?: boolean;
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

export type View = 'dashboard' | 'settings' | 'history' | 'profile' | 'player-data' | 'poker-clock' | 'poker-clock-settings';
