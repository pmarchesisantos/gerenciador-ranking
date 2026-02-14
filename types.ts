
export interface Player {
  id: string;
  name: string;
  totalPoints: number;
  prevPoints: number;
  attendances: number;
  wins: number;
  dayPoints: number;
  accumulatedValue: number;
}

export interface ScoringConfig {
  [position: number]: number;
  baseAttendance: number;
}

export interface WeeklyHistoryEntry {
  id: string;
  date: string;
  multiplier: number;
  results: {
    playerId: string;
    position: number;
    pointsEarned: number;
  }[];
}

export interface Ranking {
  id: string;
  name: string;
  players: Player[];
  scoringConfig: ScoringConfig;
  history: WeeklyHistoryEntry[];
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

export type View = 'dashboard' | 'settings' | 'history' | 'profile';
