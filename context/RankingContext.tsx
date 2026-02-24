
import React, { createContext, useContext, useState, useEffect } from 'react';
import { PokerHouse, Ranking, Player, ScoringConfig, WeeklyHistoryEntry, View, ProfileData, GameCategory } from '../types';
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
  addPlayer: (name: string, extraData?: Partial<Player>) => Promise<Player>;
  removePlayer: (id: string) => Promise<void>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  updateScoringConfig: (config: ScoringConfig) => Promise<void>;
  addWeeklyResult: (results: any[], multiplier: number, categoryId?: string) => Promise<void>;
  deleteHistoryEntry: (id: string) => Promise<void>;
  updateHouseName: (name: string) => Promise<void>;
  updateHouseSlug: (slug: string) => Promise<void>;
  updateProfileData: (data: ProfileData) => Promise<void>;
  addRanking: (name: string) => Promise<void>;
  deleteRanking: (id: string) => Promise<void>;
  updateRankingName: (id: string, name: string) => Promise<void>;
  updateGameCategories: (categories: GameCategory[]) => Promise<void>;
  loadingData: boolean;
  unauthorized: boolean;
}

const RankingContext = createContext<RankingContextType | undefined>(undefined);

const EMPTY_HOUSE: PokerHouse = { id: '', slug: '', name: '', rankings: [] };

export const RankingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin } = useAuth();
  const [house, setHouse] = useState<PokerHouse>(EMPTY_HOUSE);
  const [activeRankingId, setActiveRankingId] = useState<string>('');
  const [viewingHouseId, setViewingHouseId] = useState<string | null>(null);
  const [resolvedHouseDocId, setResolvedHouseDocId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [loadingData, setLoadingData] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const safeNavigate = (path: string, method: 'push' | 'replace' = 'push') => {
    try {
      if (method === 'replace') window.history.replaceState({}, '', path);
      else window.history.pushState({}, '', path);
    } catch (e) {}
  };

  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/c\/([^/]+)/);
      if (match && match[1]) {
        if (user && !isSuperAdmin) return;
        setViewingHouseId(match[1]);
      } else if (path === '/' && !user) {
        setViewingHouseId(null);
      }
    };
    handleRouteChange();
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [user, isSuperAdmin]);

  const updateViewingHouseId = (id: string | null) => {
    if (user && !isSuperAdmin && id !== null) return;
    setViewingHouseId(id);
    if (!id) {
      setResolvedHouseDocId(null);
      setHouse(EMPTY_HOUSE); 
      safeNavigate('/');
    } else {
      safeNavigate(`/c/${id}`);
    }
  };

  useEffect(() => {
    const resolveHouseAccess = async () => {
      setLoadingData(true);
      if (!user) {
        if (!viewingHouseId) {
          setHouse({ ...MOCK_HOUSE, slug: MOCK_HOUSE.id });
          setResolvedHouseDocId(null);
          setLoadingData(false);
          return;
        }
        const q = query(collection(db, 'casas'), where('slug', '==', viewingHouseId));
        const snap = await getDocs(q);
        setResolvedHouseDocId(!snap.empty ? snap.docs[0].id : null);
        setLoadingData(false);
        return;
      }
      if (user && !isSuperAdmin) {
        const email = user.email?.toLowerCase().trim();
        const q = query(collection(db, 'casas'), where('ownerEmail', '==', email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const houseDoc = snap.docs[0];
          setResolvedHouseDocId(houseDoc.id);
          const correctSlug = houseDoc.data().slug || houseDoc.id;
          if (viewingHouseId !== correctSlug) {
            setViewingHouseId(correctSlug);
            safeNavigate(`/c/${correctSlug}`, 'replace');
          }
        } else {
          setHouse({ ...EMPTY_HOUSE, name: 'Clube não localizado' });
          setResolvedHouseDocId(null);
        }
        setLoadingData(false);
        return;
      }
      if (user && isSuperAdmin) {
        if (!viewingHouseId) {
          setResolvedHouseDocId(null);
          setHouse(EMPTY_HOUSE);
          setLoadingData(false);
          return;
        }
        const q = query(collection(db, 'casas'), where('slug', '==', viewingHouseId));
        const snap = await getDocs(q);
        setResolvedHouseDocId(!snap.empty ? snap.docs[0].id : viewingHouseId);
        setLoadingData(false);
      }
    };
    resolveHouseAccess();
  }, [user, isSuperAdmin, viewingHouseId]);

  useEffect(() => {
    if (!resolvedHouseDocId) return;
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
      const rankingsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        players: doc.data().players || [],
        history: doc.data().history || [],
        gameCategories: doc.data().gameCategories || [],
        scoringConfig: doc.data().scoringConfig || { ...INITIAL_SCORING_CONFIG }
      })) as Ranking[];
      setHouse(prev => ({ ...prev, rankings: rankingsData }));
    });
    return () => { unsubHouse(); unsubRankings(); };
  }, [resolvedHouseDocId]);

  useEffect(() => {
    if (house.rankings.length > 0) {
      const exists = house.rankings.find(r => r.id === activeRankingId);
      if (!activeRankingId || !exists) setActiveRankingId(house.rankings[0].id);
    } else {
      if (activeRankingId !== '') setActiveRankingId('');
    }
  }, [house.rankings, activeRankingId]);

  const activeRanking = house.rankings.find(r => r.id === activeRankingId) || null;

  const updateHouseName = async (name: string) => { if (resolvedHouseDocId) await updateDoc(doc(db, 'casas', resolvedHouseDocId), { name }); };
  const updateHouseSlug = async (slug: string) => { 
    if (!resolvedHouseDocId) return;
    const s = slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    await updateDoc(doc(db, 'casas', resolvedHouseDocId), { slug: s });
    setViewingHouseId(s);
  };
  const updateProfileData = async (profile: ProfileData) => { if (resolvedHouseDocId) await updateDoc(doc(db, 'casas', resolvedHouseDocId), { profile }); };
  const addRanking = async (name: string) => {
    if (!resolvedHouseDocId) return;
    const rankingsCollRef = collection(db, 'casas', resolvedHouseDocId, 'rankings');
    const docRef = await addDoc(rankingsCollRef, { name, players: [], scoringConfig: { ...INITIAL_SCORING_CONFIG }, history: [], gameCategories: [] });
    setActiveRankingId(docRef.id);
  };
  const deleteRanking = async (id: string) => { if (resolvedHouseDocId) await deleteDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', id)); };
  const updateRankingName = async (id: string, name: string) => { if (resolvedHouseDocId) await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', id), { name }); };
  const updateGameCategories = async (categories: GameCategory[]) => { if (activeRanking && resolvedHouseDocId) await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), { gameCategories: categories }); };

  const addPlayer = async (name: string, extraData: Partial<Player> = {}): Promise<Player> => {
    if (!activeRanking || !resolvedHouseDocId) throw new Error("Sem ranking");
    const p: Player = { 
      id: Math.random().toString(36).substr(2, 9), 
      name, 
      totalPoints: 0, 
      prevPoints: 0, 
      attendances: 0, 
      wins: 0, 
      dayPoints: 0, 
      accumulatedValue: 0,
      ...extraData
    };
    await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), { players: [...(activeRanking.players || []), p] });
    return p;
  };
  const removePlayer = async (id: string) => { if (activeRanking && resolvedHouseDocId) await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), { players: activeRanking.players.filter(p => p.id !== id) }); };
  const updatePlayer = async (id: string, updates: Partial<Player>) => { if (activeRanking && resolvedHouseDocId) await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), { players: activeRanking.players.map(p => p.id === id ? { ...p, ...updates } : p) }); };
  const updateScoringConfig = async (config: ScoringConfig) => { if (activeRanking && resolvedHouseDocId) await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), { scoringConfig: config }); };

  const addWeeklyResult = async (results: any[], multiplier: number, categoryId?: string) => {
    if (!activeRanking || !resolvedHouseDocId) return;
    let currentPlayers = [...activeRanking.players];
    const finalResults = results.map(res => {
      if (res.isNew) {
        const p = { 
          id: Math.random().toString(36).substr(2, 9), 
          name: res.playerName, 
          totalPoints: 0, 
          prevPoints: 0, 
          attendances: 0, 
          wins: 0, 
          dayPoints: 0, 
          accumulatedValue: 0,
          phone: res.phone || '',
          birthDate: res.birthDate || '',
          favoriteTeam: res.favoriteTeam || ''
        };
        currentPlayers.push(p);
        return { ...res, playerId: p.id };
      }
      return res;
    });
    const config = activeRanking.scoringConfig || { ...INITIAL_SCORING_CONFIG };
    const historyResults = finalResults.map(r => ({ ...r, pointsEarned: ((config[r.position] || 0) + (config.baseAttendance || 0)) * multiplier }));
    const entry: WeeklyHistoryEntry = { id: Date.now().toString(), date: new Date().toISOString(), multiplier, categoryId, results: historyResults };
    const updatedPlayers = currentPlayers.map(player => {
      const res = historyResults.find(r => r.playerId === player.id);
      if (res) {
        return { ...player, prevPoints: player.totalPoints, totalPoints: player.totalPoints + res.pointsEarned, attendances: player.attendances + 1, wins: res.position === 1 ? player.wins + 1 : player.wins, dayPoints: res.pointsEarned, accumulatedValue: (player.accumulatedValue || 0) + (res.totalValue || 0) };
      }
      return { ...player, dayPoints: 0 };
    });
    await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), { players: updatedPlayers, history: [entry, ...(activeRanking.history || [])] });
  };

  const deleteHistoryEntry = async (entryId: string) => {
    if (!activeRanking || !resolvedHouseDocId) return;
    const history = activeRanking.history || [];
    const entry = history.find(h => h.id === entryId);
    if (!entry) return;
    const updatedHistory = history.filter(h => h.id !== entryId);
    const latest = updatedHistory.length > 0 ? updatedHistory[0] : null;
    const updatedPlayers = activeRanking.players.map(p => {
      let state = { ...p };
      const res = entry.results.find(r => r.playerId === p.id);
      if (res) {
        state.totalPoints = Math.max(0, state.totalPoints - res.pointsEarned);
        state.attendances = Math.max(0, state.attendances - 1);
        state.wins = res.position === 1 ? Math.max(0, state.wins - 1) : state.wins;
        state.accumulatedValue = Math.max(0, (state.accumulatedValue || 0) - (res.totalValue || 0));
      }
      if (latest) {
        const prevRes = latest.results.find(r => r.playerId === p.id);
        state.dayPoints = prevRes ? prevRes.pointsEarned : 0;
        state.prevPoints = state.totalPoints - state.dayPoints;
      } else {
        state.dayPoints = 0; state.prevPoints = state.totalPoints;
      }
      return state;
    });
    await updateDoc(doc(db, 'casas', resolvedHouseDocId, 'rankings', activeRanking.id), { players: updatedPlayers, history: updatedHistory });
  };

  return (
    <RankingContext.Provider value={{ 
      house, activeRanking, setActiveRankingId, setViewingHouseId: updateViewingHouseId,
      currentView, setCurrentView, addPlayer, removePlayer, updatePlayer,
      updateScoringConfig, addWeeklyResult, deleteHistoryEntry, updateHouseName, updateHouseSlug,
      updateProfileData, addRanking, deleteRanking, updateRankingName, updateGameCategories,
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
