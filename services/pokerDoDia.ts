import { GameCategory, Ranking } from '../types';
import { normalizarNome } from './jogadores';

/** Uma linha do gasto: "2× Rebuy · R$ 30,00 = R$ 60,00". */
export interface LinhaGastoPoker {
  rotulo: string;
  quantidade: number;
  /** Preço unitário da categoria. Ausente quando a etapa não tem categoria. */
  unitario?: number;
  total: number;
}

export interface GastoPoker {
  rankingId: string;
  rankingNome: string;
  /** Etapa salva. Ausente quando vem do rascunho do lançamento. */
  etapaId?: string;
  etapaNome?: string;
  /** Dia da etapa (AAAA-MM-DD). */
  dia: string;
  /** Vem do rascunho do lançamento, ainda não salvo. */
  rascunho: boolean;
  playerId: string;
  jogadorId?: string;
  nome: string;
  pago: boolean;
  buyIns: number;
  rebuys: number;
  rebuysDuplos: number;
  addons: number;
  linhas: LinhaGastoPoker[];
  total: number;
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');
const chaveDia = (d: Date) => `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;

/**
 * A noite de poker atravessa a meia-noite: o que acontece até as 6h conta
 * para o dia anterior.
 */
const VIRADA_HORAS = 6;
export const diaOperacional = (iso: string | Date) =>
  chaveDia(new Date(new Date(iso).getTime() - VIRADA_HORAS * 3600_000));

/**
 * Dias cobertos por um caixa: do dia da noite em que abriu (aberto de
 * madrugada conta a noite anterior) até o dia do calendário em que fechou.
 * A etapa pode estar datada de qualquer um deles: quem lança depois da
 * meia-noite costuma deixar a data do dia que acabou de virar.
 */
export const diasDoPeriodo = (inicio: string, fim?: string): Set<string> => {
  const dias = new Set<string>();
  const a = new Date(new Date(inicio).getTime() - VIRADA_HORAS * 3600_000);
  const b = fim ? new Date(fim) : new Date();
  const d = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  // Limite de segurança: um caixa esquecido aberto não varre meses de etapas.
  for (let i = 0; d <= b && i < 7; i++) { dias.add(chaveDia(d)); d.setDate(d.getDate() + 1); }
  if (dias.size === 0) dias.add(chaveDia(a));
  return dias;
};

const montar = (
  base: Omit<GastoPoker, 'linhas' | 'total' | 'buyIns'>,
  customValues: Record<string, number> | undefined,
  categoria?: GameCategory,
): GastoPoker => {
  const linhas: LinhaGastoPoker[] = [];
  const add = (rotulo: string, quantidade: number, unitario?: number) => {
    if (quantidade > 0) linhas.push({ rotulo, quantidade, unitario, total: (unitario || 0) * quantidade });
  };
  add('Buy-in', 1, categoria?.buyIn);
  add('Rebuy', base.rebuys, categoria?.reBuy);
  add('Rebuy duplo', base.rebuysDuplos, categoria?.reBuyDuplo);
  add('Add-on', base.addons, categoria?.addOn);
  for (const campo of categoria?.customValues || []) add(campo.name, customValues?.[campo.id] || 0, campo.value);
  return { ...base, buyIns: 1, linhas, total: linhas.reduce((a, l) => a + l.total, 0) };
};

interface RascunhoLancamento {
  stageName?: string;
  stageDate?: string;
  selectedCategoryId?: string;
  selectedPlayers?: {
    playerId: string; name: string; jogadorId?: string; paid?: boolean;
    rebuys?: number; doubleRebuys?: number; addons?: number; customValues?: Record<string, number>;
  }[];
}

/** O lançamento em andamento fica no navegador de quem lança, até ser salvo. */
const lerRascunho = (rankingId: string): RascunhoLancamento | null => {
  try {
    const bruto = localStorage.getItem(`draft_${rankingId}`);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
};

/**
 * Gastos de poker de todos os jogadores nas etapas dos dias informados —
 * as salvas e, para o ranking que ainda não salvou etapa nesses dias, o
 * rascunho do lançamento aberto neste navegador.
 */
export const gastosPokerNosDias = (rankings: Ranking[], dias: Set<string>): GastoPoker[] => {
  const gastos: GastoPoker[] = [];
  for (const r of rankings) {
    const categoriaDe = (id?: string) => (r.gameCategories || []).find(c => c.id === id);
    const jogadorIdDe = (playerId: string) => r.players.find(p => p.id === playerId)?.jogadorId;
    const nomeDe = (playerId: string) => r.players.find(p => p.id === playerId)?.name || 'Jogador removido';
    let temEtapaSalva = false;

    for (const etapa of r.history || []) {
      const dia = chaveDia(new Date(etapa.date));
      if (!dias.has(dia)) continue;
      temEtapaSalva = true;
      const categoria = categoriaDe(etapa.categoryId);
      for (const res of etapa.results || []) {
        gastos.push(montar({
          rankingId: r.id, rankingNome: r.name, etapaId: etapa.id, etapaNome: etapa.name, dia, rascunho: false,
          playerId: res.playerId, jogadorId: jogadorIdDe(res.playerId), nome: nomeDe(res.playerId),
          pago: !!res.paid, rebuys: res.rebuys || 0, rebuysDuplos: res.doubleRebuys || 0, addons: res.addons || 0,
        }, res.customValues, categoria));
      }
    }

    if (temEtapaSalva) continue;
    const rascunho = lerRascunho(r.id);
    if (!rascunho?.stageDate || !dias.has(rascunho.stageDate) || !rascunho.selectedPlayers?.length) continue;
    const categoria = categoriaDe(rascunho.selectedCategoryId);
    for (const p of rascunho.selectedPlayers) {
      gastos.push(montar({
        rankingId: r.id, rankingNome: r.name, etapaNome: rascunho.stageName || undefined, dia: rascunho.stageDate, rascunho: true,
        playerId: p.playerId, jogadorId: p.jogadorId || jogadorIdDe(p.playerId), nome: p.name,
        pago: !!p.paid, rebuys: p.rebuys || 0, rebuysDuplos: p.doubleRebuys || 0, addons: p.addons || 0,
      }, p.customValues, categoria));
    }
  }
  return gastos.sort((a, b) => a.nome.localeCompare(b.nome));
};

// ─── Marcar pago ────────────────────────────────────────────────────────────

/**
 * Histórico do ranking com o "pago" do jogador trocado na etapa salva do dia.
 * Acha o resultado pelo id do jogador ou, se a etapa foi salva depois de um
 * rascunho (o jogador novo ganha outro id), pelo nome. Devolve null quando
 * não há etapa salva com ele nesse dia.
 */
export const historicoComPago = (
  ranking: Ranking, dia: string, playerId: string, nome: string, pago: boolean,
): Ranking['history'] | null => {
  const chave = normalizarNome(nome);
  const nomeDe = (id: string) => normalizarNome(ranking.players.find(p => p.id === id)?.name || '');
  let achou = false;
  const history = (ranking.history || []).map(etapa => {
    if (chaveDia(new Date(etapa.date)) !== dia) return etapa;
    const results = etapa.results.map(r => {
      if (r.playerId !== playerId && nomeDe(r.playerId) !== chave) return r;
      achou = true;
      return { ...r, paid: pago };
    });
    return { ...etapa, results };
  });
  return achou ? history : null;
};

/** Marca o pago no rascunho do lançamento (etapa ainda não salva). */
export const marcarPagoNoRascunho = (rankingId: string, playerId: string, nome: string, pago: boolean): boolean => {
  try {
    const chaveStorage = `draft_${rankingId}`;
    const bruto = localStorage.getItem(chaveStorage);
    if (!bruto) return false;
    const rascunho = JSON.parse(bruto);
    const chave = normalizarNome(nome);
    let achou = false;
    rascunho.selectedPlayers = (rascunho.selectedPlayers || []).map((p: any) => {
      if (p.playerId !== playerId && normalizarNome(p.name || '') !== chave) return p;
      achou = true;
      return { ...p, paid: pago };
    });
    if (achou) {
      localStorage.setItem(chaveStorage, JSON.stringify(rascunho));
      // O evento storage só chega às outras janelas; esta também precisa saber.
      window.dispatchEvent(new StorageEvent('storage', { key: chaveStorage }));
    }
    return achou;
  } catch {
    return false;
  }
};

/** Os gastos de uma pessoa: pelo cadastro geral ou, sem ele, pelo nome. */
export const gastosDaPessoa = (gastos: GastoPoker[], nome: string, jogadorId?: string): GastoPoker[] => {
  const chave = normalizarNome(nome);
  return gastos.filter(g => (jogadorId && g.jogadorId === jogadorId) || normalizarNome(g.nome) === chave);
};
