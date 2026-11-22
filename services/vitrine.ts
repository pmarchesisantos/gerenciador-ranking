import { Ranking } from '../types';
import { getStagesTotal } from './stageValues';
import { INITIAL_SCORING_CONFIG } from './mockData';

/**
 * Vitrine: a versão PÚBLICA de um ranking, em casas/{casaId}/vitrine/{rankingId}.
 *
 * O documento do ranking guarda dados que são só do clube — valores de cada
 * etapa, re-buys, quem pagou, prêmios e, em cadastros antigos, telefone e
 * nascimento dos jogadores. Por isso ele não tem leitura pública. A página
 * pública lê apenas a vitrine, que leva só a classificação.
 *
 * Quem grava: o próprio app, sempre que o dono (ou o administrador) está com o
 * clube aberto e o ranking muda; e o botão "Gerar páginas públicas" do painel
 * Master, para os clubes de antes da vitrine existir.
 */
export interface RankingVitrine {
  name: string;
  active?: boolean;
  /** Total do pote do ranking. Só o total: o valor de cada etapa fica privado. */
  poteAcumulado: number;
  players: {
    id: string; name: string; totalPoints: number; prevPoints: number;
    attendances: number; wins: number; dayPoints: number; active?: boolean;
  }[];
  history: {
    id: string; date: string; name?: string; multiplier: number; categoryId?: string;
    results: { playerId: string; position: number; pointsEarned: number }[];
  }[];
  /** Só o nome de cada categoria (para "Etapa dobrada" etc.); preços ficam privados. */
  gameCategories: { id: string; name: string }[];
}

const semIndefinidos = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const paraVitrine = (r: Ranking): RankingVitrine => semIndefinidos({
  name: r.name,
  active: r.active,
  poteAcumulado: Math.round(getStagesTotal(r) * 100) / 100,
  players: (r.players || []).map(p => ({
    id: p.id,
    name: p.name,
    totalPoints: p.totalPoints || 0,
    prevPoints: p.prevPoints || 0,
    attendances: p.attendances || 0,
    wins: p.wins || 0,
    dayPoints: p.dayPoints || 0,
    active: p.active,
  })),
  history: (r.history || []).map(e => ({
    id: e.id,
    date: e.date,
    name: e.name,
    multiplier: e.multiplier || 1,
    categoryId: e.categoryId,
    results: (e.results || []).map(res => ({ playerId: res.playerId, position: res.position, pointsEarned: res.pointsEarned })),
  })),
  gameCategories: (r.gameCategories || []).map(c => ({ id: c.id, name: c.name })),
});

/** Vitrine lida de volta no formato de Ranking, para a página pública. */
export const daVitrine = (id: string, v: RankingVitrine): Ranking => ({
  id,
  name: v.name,
  active: v.active,
  poteAcumulado: v.poteAcumulado || 0,
  players: (v.players || []).map(p => ({ ...p, accumulatedValue: 0 })),
  history: (v.history || []).map(e => ({ ...e, results: e.results || [] })),
  gameCategories: (v.gameCategories || []).map(c => ({
    id: c.id, name: c.name, buyIn: 0, reBuy: 0, reBuyDuplo: 0, addOn: 0, rake: 0, rankingPercent: 0,
  })),
  scoringConfig: { ...INITIAL_SCORING_CONFIG },
});
