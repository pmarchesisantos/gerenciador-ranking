
import { PokerHouse, Ranking } from '../types';

export const INITIAL_SCORING_CONFIG = {
  1: 100,
  2: 80,
  3: 60,
  4: 50,
  5: 40,
  6: 30,
  7: 20,
  8: 10,
  baseAttendance: 20
};

const mockPlayers = [
  { id: '1', name: 'João Silva', totalPoints: 450, prevPoints: 430, attendances: 12, wins: 3, dayPoints: 0, accumulatedValue: 150.00 },
  { id: '2', name: 'Maria Santos', totalPoints: 410, prevPoints: 390, attendances: 10, wins: 1, dayPoints: 0, accumulatedValue: 80.00 },
  { id: '3', name: 'Pedro Costa', totalPoints: 380, prevPoints: 380, attendances: 8, wins: 2, dayPoints: 0, accumulatedValue: 200.00 },
  { id: '4', name: 'Ana Oliveira', totalPoints: 320, prevPoints: 300, attendances: 15, wins: 0, dayPoints: 0, accumulatedValue: 0 },
];

export const MOCK_HOUSE: PokerHouse = {
  id: 'house_123',
  name: 'Royal Flush Club',
  rankings: [
    {
      id: 'rank_mon',
      name: 'Ranking de Segunda',
      players: [...mockPlayers],
      scoringConfig: { ...INITIAL_SCORING_CONFIG },
      history: []
    },
    {
      id: 'rank_thu',
      name: 'Ranking de Quinta',
      players: [
        { id: '5', name: 'Carlos Reis', totalPoints: 120, prevPoints: 100, attendances: 5, wins: 1, dayPoints: 0, accumulatedValue: 50.00 }
      ],
      scoringConfig: { ...INITIAL_SCORING_CONFIG },
      history: []
    }
  ]
};
