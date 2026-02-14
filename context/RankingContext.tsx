
import React, { createContext, useContext, useState, useEffect } from 'react';
import { PokerHouse, Ranking, Player, ScoringConfig, WeeklyHistoryEntry, View, ProfileData } from '../types';
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
  updateHouseSlug: (slug: string) => Promise<void>;
  updateProfileData: (data: ProfileData) => Promise<void>;
  addRanking: (name: string) => Promise<void>;
  deleteRanking: (id: string) => Promise<void>;
  updateRankingName: (id: string, name: string) => Promise<void>;
  loadingData: boolean;
  unauthorized: boolean;
}

const RankingContext = createContext<RankingContextType | undefined>(undefined);

export const RankingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin } = useAuth();
  const [house, setHouse] = useState<PokerHouse>({ id: '', slug: '', name: '', rankings: [] });
  const [activeRankingId, setActiveRankingId] = useState<string>('');
  const [viewingHouseId, setViewingHouseId] = useState<string | null>(null);
  const [resolvedHouseDocId, setResolvedHouseDocId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [loadingData, setLoadingData] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

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
    handleRouteChange();
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [user]);

  const updateViewingHouseId = (id: string | null) => {
    setViewingHouseId(id);
    try {
      if (id) {
        window.history.pushState({}, '', `/c/${id}`);
      } else {
        window.history.pushState({}, '', '/');
      }
    } catch (e) {}
  };

  // Resolver o viewingHouseId (que pode ser um slug) para um ID de documento real
  useEffect(() => {
    if (!viewingHouseId) {
      setResolvedHouseDocId(null);
      return;
    }

    const resolveId = async () => {
      setLoadingData(true);
      try {
        // 1. Tenta buscar por ID direto (compatibilidade)
        const directDoc = await getDocs(query(collection(db, 'casas'), where('__name__', '==', viewingHouseId)));
        if (!directDoc.empty) {
          setResolvedHouseDocId(viewingHouseId);
          return;
        }

        // 2. Busca pelo campo 'slug'
        const q = query(collection(db, 'casas'), where('slug', '==', viewingHouseId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setResolvedHouseDocId(snap.docs[0].id);
        } else {
          setResolvedHouseDocId(null);
          if (!user) updateViewingHouseId(null);
        }
      } catch (e) {
        console.error("Erro ao resolver slug:", e);
      } finally {
        setLoadingData(false);
      }
    };
    resolveId();
  }, [viewingHouseId, user]);

  useEffect(() => {
    if (!user && !viewingHouseId) {
      setHouse({ ...MOCK_HOUSE, slug: MOCK_HOUSE.id });
      if (MOCK_HOUSE.rankings.length > 0) setActiveRankingId(MOCK_HOUSE.rankings[0].id);
      setLoadingData(false);
      setUnauthorized(false);
      return;
    }

    if (!user && viewingHouseId) return;

    const resolveHouseAccess = async () => {
      setUnauthorized(false);
      if (viewingHouseId || (isSuperAdmin && !viewingHouseId)) {
        setLoadingData(false);
        return;
      }
      
      setLoadingData(true);
      try {
        const email = user?.email?.toLowerCase().trim();
        if (!email) return;

        const q = query(collection(db, 'casas'), where('ownerEmail', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const houseDoc = querySnapshot.docs[0];
          // Preferimos o slug para a URL se ele existir
          updateViewingHouseId(houseDoc.data().slug || houseDoc.id);
        } else {
          setHouse({ id: '', slug: '', name: 'Sem Clube Vinculado', rankings: [] });
          setLoadingData(false);
        }
      } catch (err) {
        setLoadingData(false);
      }
    };

    if (user) resolveHouseAccess();
  }, [user, isSuperAdmin, viewingHouseId]);

  useEffect(() => {
    if (!resolvedHouseDocId) {
      if (user && !viewingHouseId) {
        setHouse({ id: '', slug: '', name: isSuperAdmin ? '' : 'Sem Clube Vinculado', rankings: [] });
        setActiveRankingId('');
      }
      return;
    }

    setLoadingData(true);
    const houseDocRef = doc(db, 'casas', resolvedHouseDocId);
    const rankingsCollRef = collection(db, 'casas', resolvedHouseDocId, 'rankings');

    const unsubHouse = onSnapshot(houseDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setHouse(prev => ({ 
          ...prev, 
          id: resolvedHouseDocId, 
          slug: data.slug || resolvedHouseDocId,
          name: data.name,
          profile: data.profile 
        }));
      }
    });

    const unsubRankings = onSnapshot(rankingsCollRef, (snapshot) => {
      const rankingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ranking[];
      setHouse(prev => ({ ...prev, rankings: rankingsData }));
      if (rankingsData.length > 0 && (!activeRankingId || !rankingsData.find(r => r.id === activeRankingId))) {
        setActiveRankingId(rankingsData[0].id);
      }
      setLoadingData(false);
    });

    return () => {
      unsubHouse();
      unsubRankings();
    };
  }, [resolvedHouseDocId, user, isSuperAdmin]);

  const activeRanking = house.rankings.find(r => r.id === activeRankingId) || null;

  const updateHouseName = async (name: string) => {
    if (!resolvedHouseDocId) return;
    await updateDoc(doc(db, 'casas', resolvedHouseDocId), { name });
  };

  const updateHouseSlug = async (slug: string) => {
    if (!resolvedHouseDocId) return;
    // Sanitização básica
    const sanitizedSlug = slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    await updateDoc(doc(db, 'casas', resolvedHouseDocId), { slug: sanitizedSlug });
    updateViewingHouseId(sanitizedSlug);
  };

  const updateProfileData = async (profile: ProfileData) => {
    if (!resolvedHouseDocId) return;
    await updateDoc(doc(db, 'casas', resolvedHouseDocId), { profile });
  };

  const addRanking = async (name: string) => {
    if (!resolvedHouseDocId) return;
    const rankingsCollRef = collection(db, 'casas', resolvedHouseDocId, 'rankings');
    const newRank = {
      name, players: [],
      scoringConfig: { ...INITIAL_SCORING_CONFIG },
      history: []
    };
    const docRef = await addDoc(rankingsCollRef, newRank);
    setActiveRankingId(docRef.id);
  };

  const deleteRanking = async (id: string) => {
    if (!resolvedHouseDocId) return;
    await deleteDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', id));
    if (activeRankingId === id) setActiveRankingId(house.rankings.find(r => r.id !== id)?.id || '');
  };

  const updateRankingName = async (id: string, name: string) => {
    if (!resolvedHouseDocId) return;
    await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', id), { name });
  };

  const addPlayer = async (name: string) => {
    if (!activeRanking || !resolvedHouseDocId) return;
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name, totalPoints: 0, prevPoints: 0, attendances: 0, wins: 0, dayPoints: 0, accumulatedValue: 0
    };
    const updatedPlayers = [...activeRanking.players, newPlayer];
    await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), { players: updatedPlayers });
  };

  const removePlayer = async (id: string) => {
    if (!activeRanking || !resolvedHouseDocId) return;
    const updatedPlayers = activeRanking.players.filter(p => p.id !== id);
    await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), { players: updatedPlayers });
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    if (!activeRanking || !resolvedHouseDocId) return;
    const updatedPlayers = activeRanking.players.map(p => p.id === id ? { ...p, ...updates } : p);
    await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), { players: updatedPlayers });
  };

  const updateScoringConfig = async (config: ScoringConfig) => {
    if (!activeRanking || !resolvedHouseDocId) return;
    await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), { scoringConfig: config });
  };

  const addWeeklyResult = async (results: { playerId: string; position: number }[], multiplier: number) => {
    if (!activeRanking || !resolvedHouseDocId) return;
    const historyResults = results.map(r => {
      const positionPoints = activeRanking.scoringConfig[r.position] || 0;
      const pointsEarned = (positionPoints + activeRanking.scoringConfig.baseAttendance) * multiplier;
      return { ...r, pointsEarned };
    });
    const newHistoryEntry: WeeklyHistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      multiplier,
      results: historyResults
    };
    const updatedPlayers = activeRanking.players.map(player => {
      const result = historyResults.find(r => r.playerId === player.id);
      if (result) {
        const points = result.pointsEarned;
        return {
          ...player,
          prevPoints: player.totalPoints,
          totalPoints: player.totalPoints + points,
          attendances: player.attendances + 1,
          wins: result.position === 1 ? player.wins + 1 : player.wins,
          dayPoints: points
        };
      }
      return { ...player, dayPoints: 0 };
    });
    await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), {
      players: updatedPlayers,
      history: [newHistoryEntry, ...activeRanking.history]
    });
  };

  const deleteHistoryEntry = async (entryId: string) => {
    if (!activeRanking || !resolvedHouseDocId) return;
    const entryToDelete = activeRanking.history.find(h => h.id === entryId);
    if (!entryToDelete) return;
    const updatedPlayers = activeRanking.players.map(player => {
      const result = entryToDelete.results.find(r => r.playerId === player.id);
      if (result) {
        const points = result.pointsEarned;
        return {
          ...player,
          totalPoints: Math.max(0, player.totalPoints - points),
          attendances: Math.max(0, player.attendances - 1),
          wins: result.position === 1 ? Math.max(0, player.wins - 1) : player.wins,
          dayPoints: 0
        };
      }
      return player;
    });
    const updatedHistory = activeRanking.history.filter(h => h.id !== entryId);
    await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), {
      players: updatedPlayers,
      history: updatedHistory
    });
  };

  return (
    <RankingContext.Provider value={{ 
      house, activeRanking, setActiveRankingId, setViewingHouseId: updateViewingHouseId,
      currentView, setCurrentView, addPlayer, removePlayer, updatePlayer,
      updateScoringConfig, addWeeklyResult, deleteHistoryEntry, updateHouseName, updateHouseSlug,
      updateProfileData, addRanking, deleteRanking, updateRankingName,
      loadingData, unauthorized
    }}>
      {children}
    </RankingContext.Provider>
  );
};

export const useRanking = () => {
  const context = useContext(RankingContext);
  if (!context) throw new Error("useRanking must be used within RankingProvider");
  return context;
};
