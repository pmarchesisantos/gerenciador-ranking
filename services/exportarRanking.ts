import { Ranking } from '../types';
import { Aba, agora, baixarXlsx } from './planilha';
import { getStageValues, getStagesTotal } from './stageValues';
import { nomeArquivo } from './vendas';

const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const diaCurto = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

/**
 * Ranking em planilha Excel, com três abas:
 * - Classificação: posição, pontos, presenças e vitórias (pódio destacado);
 * - Pontos por etapa: uma coluna por etapa, para ver a evolução de cada um;
 * - Etapas: data, jogadores, campeão e valor de cada etapa.
 */
export const abasDoRanking = (ranking: Ranking, clube: string): Aba[] => {
  const ativos = ranking.players.filter(p => p.active !== false).sort((a, b) => b.totalPoints - a.totalPoints);
  const etapas = [...(ranking.history || [])].sort((a, b) => a.date.localeCompare(b.date));
  const nomeDe = (id: string) => ranking.players.find(p => p.id === id)?.name || 'Jogador removido';
  const pote = getStagesTotal(ranking);
  const titulo = `${clube} · ${ranking.name}`;
  const sub = `Exportado em ${agora()} · ${ativos.length} jogador(es) · ${etapas.length} etapa(s) · pote acumulado R$ ${pote.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const classificacao: Aba = {
    nome: 'Classificação',
    titulo,
    subtitulo: sub,
    colunas: [
      { titulo: 'Pos.', tipo: 'inteiro', largura: 7 },
      { titulo: 'Jogador', largura: 30 },
      { titulo: 'Pontos', tipo: 'inteiro', largura: 11 },
      { titulo: 'Presenças', tipo: 'inteiro', largura: 11 },
      { titulo: 'Vitórias', tipo: 'inteiro', largura: 10 },
      { titulo: 'Média por etapa', tipo: 'decimal', largura: 14 },
      { titulo: 'Pontos na última etapa', tipo: 'inteiro', largura: 14 },
      { titulo: 'Distância do 1º', tipo: 'inteiro', largura: 13 },
    ],
    linhas: ativos.map((p, i) => [
      i + 1, p.name, p.totalPoints, p.attendances, p.wins,
      p.attendances ? Math.round((p.totalPoints / p.attendances) * 100) / 100 : 0,
      p.dayPoints || 0,
      i === 0 ? 0 : ativos[0].totalPoints - p.totalPoints,
    ]),
    destaque: [0, 1, 2].filter(i => i < ativos.length),
  };

  // Matriz jogador × etapa: o que cada um fez em cada noite.
  const pontosPor = new Map<string, Map<string, number>>();
  for (const e of etapas) for (const r of e.results || []) {
    const m = pontosPor.get(r.playerId) || new Map<string, number>();
    m.set(e.id, r.pointsEarned);
    pontosPor.set(r.playerId, m);
  }
  const porEtapa: Aba = {
    nome: 'Pontos por etapa',
    titulo,
    subtitulo: 'Pontos de cada jogador em cada etapa (em branco: não jogou).',
    colunas: [
      { titulo: 'Pos.', tipo: 'inteiro', largura: 7 },
      { titulo: 'Jogador', largura: 26 },
      { titulo: 'Total', tipo: 'inteiro', largura: 9 },
      ...etapas.map(e => ({ titulo: `${e.name || 'Etapa'} · ${diaCurto(e.date)}`, tipo: 'inteiro' as const, largura: 12 })),
    ],
    linhas: ativos.map((p, i) => [
      i + 1, p.name, p.totalPoints,
      ...etapas.map(e => pontosPor.get(p.id)?.get(e.id) ?? null),
    ]),
    destaque: [0, 1, 2].filter(i => i < ativos.length),
  };

  const valores = new Map(getStageValues(ranking).map(s => [s.id, s.value]));
  const etapasAba: Aba = {
    nome: 'Etapas',
    titulo,
    subtitulo: 'Uma linha por etapa lançada, da mais antiga para a mais recente.',
    colunas: [
      { titulo: 'Data', largura: 12 },
      { titulo: 'Etapa', largura: 30 },
      { titulo: 'Jogadores', tipo: 'inteiro', largura: 11 },
      { titulo: 'Multiplicador', tipo: 'inteiro', largura: 13 },
      { titulo: 'Campeão', largura: 26 },
      { titulo: 'Valor ao pote', tipo: 'moeda', largura: 15 },
    ],
    linhas: etapas.map(e => {
      const melhor = Math.min(...(e.results || []).map(r => r.position));
      const campeoes = e.championIds?.length
        ? e.championIds.map(nomeDe)
        : (e.results || []).filter(r => r.position === melhor).map(r => nomeDe(r.playerId));
      return [dia(e.date), e.name || 'Etapa', (e.results || []).length, e.multiplier || 1, campeoes.join(', '), valores.get(e.id) ?? 0];
    }),
    totais: ['Total', '', etapas.reduce((a, e) => a + (e.results || []).length, 0), '', '', pote],
  };

  return [classificacao, porEtapa, etapasAba];
};

export const exportarRanking = (ranking: Ranking, clube: string) =>
  baixarXlsx(nomeArquivo('ranking', clube, ranking.name, new Date().toISOString().slice(0, 10)), abasDoRanking(ranking, clube));
