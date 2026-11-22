import { Jogador, Player, Ranking } from '../types';

/**
 * Chave de identidade de um nome: sem acento, minúsculo e com espaços únicos.
 * "Gustavo  Simões" e "GUSTAVO SIMOES" são a mesma pessoa para o sistema.
 */
export const normalizarNome = (nome: string): string =>
  (nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export const encontrarJogador = (jogadores: Jogador[], nome: string): Jogador | undefined => {
  const chave = normalizarNome(nome);
  return chave ? jogadores.find(j => j.nomeNormalizado === chave) : undefined;
};

/** Participação já existente no ranking para este nome ou pessoa do cadastro. */
export const encontrarNoRanking = (ranking: Ranking, nome: string, jogadorId?: string): Player | undefined => {
  const chave = normalizarNome(nome);
  return (ranking.players || []).find(p =>
    (jogadorId && p.jogadorId === jogadorId) || (!!chave && normalizarNome(p.name) === chave)
  );
};

export interface Participacao {
  rankingId: string;
  rankingNome: string;
  player: Player;
}

/**
 * Uma pessoa como a tela de dados enxerga: o registro do cadastro geral, quando
 * existe, mais as participações dela nos rankings.
 */
export interface Pessoa {
  chave: string;
  nome: string;
  /** Registro no cadastro geral. Ausente para quem só existe nos rankings antigos. */
  jogador?: Jogador;
  telefone?: string;
  nascimento?: string;
  time?: string;
  ativo: boolean;
  /** Um item por ranking em que a pessoa aparece. */
  participacoes: Participacao[];
}

/** Entre grafias diferentes da mesma pessoa, fica a mais usada; no empate, a com mais acentos. */
const melhorGrafia = (grafias: string[]): string => {
  const contagem = new Map<string, number>();
  for (const g of grafias) contagem.set(g.trim(), (contagem.get(g.trim()) || 0) + 1);
  const acentos = (s: string) => (s.normalize('NFD').match(/[̀-ͯ]/g) || []).length;
  return [...contagem.entries()].sort((a, b) => b[1] - a[1] || acentos(b[0]) - acentos(a[0]))[0][0];
};

/**
 * Junta o cadastro geral com os jogadores de todos os rankings, agrupando pela
 * pessoa. Só lê: nenhum registro salvo é alterado para montar esta visão.
 *
 * Quem já está no cadastro é identificado pelo vínculo (jogadorId); quem só
 * existe nos rankings antigos, pelo nome normalizado.
 */
export const consolidarPessoas = (jogadores: Jogador[], rankings: Ranking[]): Pessoa[] => {
  const porChave = new Map<string, { jogador?: Jogador; grafias: string[]; players: Participacao[] }>();
  const chaveDoJogador = new Map(jogadores.map(j => [j.id, j.nomeNormalizado]));

  for (const j of jogadores) porChave.set(j.nomeNormalizado, { jogador: j, grafias: [j.nome], players: [] });

  for (const r of rankings) {
    for (const p of r.players || []) {
      const chave = (p.jogadorId && chaveDoJogador.get(p.jogadorId)) || normalizarNome(p.name);
      if (!chave) continue;
      const grupo = porChave.get(chave) || { grafias: [], players: [] };
      grupo.grafias.push(p.name);
      grupo.players.push({ rankingId: r.id, rankingNome: r.name, player: p });
      porChave.set(chave, grupo);
    }
  }

  return [...porChave.entries()].map(([chave, g]) => {
    // Dados do cadastro prevalecem; sem eles, usa o primeiro preenchido nos rankings antigos.
    const legado = (campo: 'phone' | 'birthDate' | 'favoriteTeam') =>
      g.players.map(x => x.player[campo]).find(v => !!v) || undefined;
    // Uma linha por ranking, mesmo que a pessoa esteja repetida dentro dele.
    const participacoes = [...new Map(g.players.map(x => [x.rankingId, x])).values()];
    return {
      chave,
      nome: g.jogador?.nome || melhorGrafia(g.grafias),
      jogador: g.jogador,
      telefone: g.jogador?.telefone || legado('phone'),
      nascimento: g.jogador?.nascimento || legado('birthDate'),
      time: g.jogador?.time || legado('favoriteTeam'),
      ativo: g.jogador?.ativo !== false,
      participacoes,
    };
  }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
};

export const encontrarPessoa = (pessoas: Pessoa[], nome: string): Pessoa | undefined => {
  const chave = normalizarNome(nome);
  return chave ? pessoas.find(p => p.chave === chave) : undefined;
};

/** Erro de regra no cadastro: a mensagem é para o usuário ler. */
export class CadastroError extends Error {}
