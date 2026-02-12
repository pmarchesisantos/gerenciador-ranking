
import React, { createContext, useContext, useState, useEffect } from 'react';
import { PokerHouse, Ranking, Player, ScoringConfig, WeeklyHistoryEntry, View } from '../types';
import { INITIAL_SCORING_CONFIG, MOCK_HOUSE } from '../services/mockData';
import { useAuth } from './AuthContext';
import { 
  db, 
  doc, 
  collection, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  query,
  where,
  getDocs
} from '../services/firebase';

interface RankingContextType {
  house: PokerHouse;
  activeRanking: Ranking | null;
  setActiveRankingId: (id: string) => void;
  setViewingHouseId: (id: string | null) => void;
  currentView: View;
  setCurrentView: (view: View) => void;
  addPlayer: (name: string) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  updateScoringConfig: (config: ScoringConfig) => Promise<void>;
  addWeeklyResult: (results: { playerId: string; position: number }[], multiplier: number) => Promise<void>;
  deleteHistoryEntry: (id: string) => Promise<void>;
  updateHouseName: (name: string) => Promise<void>;
  addRanking: (name: string) => Promise<void>;
  deleteRanking: (id: string) => Promise<void>;
  updateRankingName: (id: string, name: string) => Promise<void>;
  loadingData: boolean;
  unauthorized: boolean;
}

const RankingContext = createContext<RankingContextType | undefined>(undefined);

export const RankingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin } = useAuth();
  const [house, setHouse] = useState<PokerHouse>({ id: '', name: '', rankings: [] });
  const [activeRankingId, setActiveRankingId] = useState<string>('');
  const [viewingHouseId, setViewingHouseId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [loadingData, setLoadingData] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  // 1. Roteamento: Detectar ID na URL no carregamento inicial
  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/c\/([^/]+)/);
      if (match && match[1]) {
        setViewingHouseId(match[1]);
      } else if (path === '/' && !user) {
        setViewingHouseId(null);
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    handleRouteChange(); // Executa no mount

    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [user]);

  // Função para atualizar a URL ao mudar de casa
  const updateViewingHouseId = (id: string | null) => {
    setViewingHouseId(id);
    if (id) {
      window.history.pushState({}, '', `/c/${id}`);
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  // 2. Lógica de Identificação de Tenant (Casa)
  useEffect(() => {
    if (!user && !viewingHouseId) {
      setHouse(MOCK_HOUSE);
      if (MOCK_HOUSE.rankings.length > 0) setActiveRankingId(MOCK_HOUSE.rankings[0].id);
      setLoadingData(false);
      setUnauthorized(false);
      return;
    }

    if (!user && viewingHouseId) return;

    if (isSuperAdmin && !viewingHouseId) {
      setHouse({ id: '', name: '', rankings: [] });
      setLoadingData(false);
      setUnauthorized(false);
      return;
    }

    const resolveHouseAccess = async () => {
      if (viewingHouseId) return;
      setLoadingData(true);
      setUnauthorized(false);
      
      try {
        const email = user?.email?.toLowerCase().trim();
        if (!email) return;
        const q = query(collection(db, 'casas'), where('ownerEmail', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const houseDoc = querySnapshot.docs[0];
          updateViewingHouseId(houseDoc.id);
        } else {
          if (!isSuperAdmin) setUnauthorized(true);
          setLoadingData(false);
        }
      } catch (err) {
        console.error("Erro ao validar acesso:", err);
        setLoadingData(false);
      }
    };

    if (user) resolveHouseAccess();
  }, [user, isSuperAdmin, viewingHouseId]);

  // 3. Lógica de Carregamento Reativo da Casa Escolhida
  useEffect(() => {
    if (!viewingHouseId) return;

    setLoadingData(true);
    setHouse(prev => ({ ...prev, name: 'Sincronizando...', rankings: [] }));
    setActiveRankingId('');

    const houseDocRef = doc(db, 'casas', viewingHouseId);
    const rankingsCollRef = collection(db, 'casas', viewingHouseId, 'rankings');

    const unsubHouse = onSnapshot(houseDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setHouse(prev => ({ ...prev, id: viewingHouseId, name: data.name }));
      } else {
        // Se a casa não existir, volta para a home
        if (!user) updateViewingHouseId(null);
      }
    });

    const unsubRankings = onSnapshot(rankingsCollRef, (snapshot) => {
      const rankingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ranking[];
      
      setHouse(prev => ({ ...prev, rankings: rankingsData }));
      
      if (rankingsData.length > 0 && !activeRankingId) {
        setActiveRankingId(rankingsData[0].id);
      }
      setLoadingData(false);
    });

    return () => {
      unsubHouse();
      unsubRankings();
    };
  }, [viewingHouseId]);

  const activeRanking = house.rankings.find(r => r.id === activeRankingId) || null;

  // Operações do Firestore
  const updateHouseName = async (name: string) => {
    if (!viewingHouseId) return;
    await updateDoc(doc(db, 'casas', viewingHouseId), { name });
  };

  const addRanking = async (name: string) => {
    if (!viewingHouseId) return;
    const rankingsCollRef = collection(db, 'casas', viewingHouseId, 'rankings');
    const newRank = {
      name, players: [],
      scoringConfig: { ...INITIAL_SCORING_CONFIG },
      history: []
    };
    const docRef = await addDoc(rankingsCollRef, newRank);
    setActiveRankingId(docRef.id);
  };

  const deleteRanking = async (id: string) => {
    if (!viewingHouseId) return;
    await deleteDoc(doc(db, 'casas', viewingHouseId, 'rankings', id));
    if (activeRankingId === id) setActiveRankingId(house.rankings.find(r => r.id !== id)?.id || '');
  };

  const updateRankingName = async (id: string, name: string) => {
    if (!viewingHouseId) return;
    await updateDoc(doc(db, 'casas', viewingHouseId, 'rankings', id), { name });
  };

  const addPlayer = async (name: string) => {
    if (!activeRanking || !viewingHouseId) return;
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name, totalPoints: 0, prevPoints: 0, attendances: 0, wins: 0, dayPoints: 0, accumulatedValue: 0
    };
    const updatedPlayers = [...activeRanking.players, newPlayer];
    await updateDoc(doc(db, 'casas', viewingHouseId, 'rankings', activeRanking.id), { players: updatedPlayers });
  };

  const removePlayer = async (id: string) => {
    if (!activeRanking || !viewingHouseId) return;
    const updatedPlayers = activeRanking.players.filter(p => p.id !== id);
    await updateDoc(doc(db, 'casas', viewingHouseId, 'rankings', activeRanking.id), { players: updatedPlayers });
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    if (!activeRanking || !viewingHouseId) return;
    const updatedPlayers = activeRanking.players.map(p => p.id === id ? { ...p, ...updates } : p);
    await updateDoc(doc(db, 'casas', viewingHouseId, 'rankings', activeRanking.id), { players: updatedPlayers });
  };

  const updateScoringConfig = async (config: ScoringConfig) => {
    if (!activeRanking || !viewingHouseId) return;
    await updateDoc(doc(db, 'casas', viewingHouseId, 'rankings', activeRanking.id), { scoringConfig: config });
  };

  const addWeeklyResult = async (results: { playerId: string; position: number }[], multiplier: number) => {
    if (!activeRanking || !viewingHouseId) return;
    const newHistoryEntry: WeeklyHistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      multiplier,
      results: results.map(res => {
        const points = (activeRanking.scoringConfig[res.position] || 0) + activeRanking.scoringConfig.baseAttendance;
        return { playerId: res.playerId, position: res.position, pointsEarned: points * multiplier };
      })
    };
    const updatedPlayers = activeRanking.players.map(p => {
      const result = newHistoryEntry.results.find(res => res.playerId === p.id);
      if (result) {
        return {
          ...p, prevPoints: p.totalPoints, totalPoints: p.totalPoints + result.pointsEarned,
          attendances: p.attendances + 1, wins: p.wins + (result.position === 1 ? 1 : 0), dayPoints: result.pointsEarned
        };
      }
      return { ...p, dayPoints: 0 };
    });
    await updateDoc(doc(db, 'casas', viewingHouseId, 'rankings', activeRanking.id), {
      players: updatedPlayers,
      history: [newHistoryEntry, ...activeRanking.history]
    });
  };

  const deleteHistoryEntry = async (historyId: string) => {
    if (!activeRanking || !viewingHouseId) return;
    const entry = activeRanking.history.find(h => h.id === historyId);
    if (!entry) return;
    const updatedPlayers = activeRanking.players.map(p => {
      const result = entry.results.find(res => res.playerId === p.id);
      if (result) {
        return {
          ...p, totalPoints: Math.max(0, p.totalPoints - result.pointsEarned),
          attendances: Math.max(0, p.attendances - 1), wins: Math.max(0, p.wins - (result.position === 1 ? 1 : 0)), dayPoints: 0
        };
      }
      return p;
    });
    await updateDoc(doc(db, 'casas', viewingHouseId, 'rankings', activeRanking.id), {
      players: updatedPlayers,
      history: activeRanking.history.filter(h => h.id !== historyId)
    });
  };

  return (
    <RankingContext.Provider value={{
      house, activeRanking, setActiveRankingId, setViewingHouseId: updateViewingHouseId,
      currentView, setCurrentView, addPlayer, removePlayer, updatePlayer, updateScoringConfig,
      addWeeklyResult, deleteHistoryEntry, updateHouseName, addRanking, deleteRanking, updateRankingName,
      loadingData, unauthorized
    }}>
      {children}
    </RankingContext.Provider>
  );
};

export const useRanking = () => {
  const context = useContext(RankingContext);
  if (context === undefined) throw new Error('useRanking must be used within a RankingProvider');
  return context;
};
