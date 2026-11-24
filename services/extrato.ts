import { BarCaixa, BarComanda, BarComandaItem, BarPagamento, Ranking } from '../types';
import { GastoPoker, gastosDaPessoa, gastosPokerNosDias } from './pokerDoDia';
import { normalizarNome } from './jogadores';
import { formatBRL } from './stageValues';
import { dataHoraPlanilha, nomeArquivo } from './vendas';
import { agora, baixarXlsx } from './planilha';
import { diasDaComanda, saldoComanda } from '../context/BarContext';

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Uma conta em aberto da pessoa: o que consumiu num dia, o que já pagou e o poker. */
export interface ContaExtrato {
  comanda: BarComanda;
  itens: BarComandaItem[];
  pagamentos: BarPagamento[];
  consumo: number;
  pago: number;
  saldoBar: number;
  poker: GastoPoker[];
  saldoPoker: number;
  total: number;
}

export interface Extrato {
  nome: string;
  contas: ContaExtrato[];
  consumo: number;
  pago: number;
  saldoBar: number;
  saldoPoker: number;
  total: number;
  desde?: string;
  itens: number;
}

/**
 * Tudo o que uma pessoa deve: as contas fechadas com saldo (fiado de vários
 * dias) e o poker em aberto desses dias, da mais antiga para a mais recente.
 * Cada etapa de poker conta uma vez só, mesmo com várias comandas no dia.
 */
export const extratoDe = (nome: string, comandas: BarComanda[], rankings: Ranking[], caixas: BarCaixa[]): Extrato => {
  const chave = normalizarNome(nome);
  const vistos = new Set<string>();
  const contas: ContaExtrato[] = [];

  const daPessoa = comandas
    .filter(c => c.status === 'fechada' && normalizarNome(c.clienteNome) === chave)
    .sort((a, b) => a.data.localeCompare(b.data));

  for (const c of daPessoa) {
    const itens = (c.itens || []).filter(i => !i.cancelado).sort((a, b) => a.lancadoEm.localeCompare(b.lancadoEm));
    const pagamentos = (c.pagamentos || []).filter(p => !p.estornado);
    const poker = gastosDaPessoa(gastosPokerNosDias(rankings, diasDaComanda(c, caixas)), c.clienteNome, c.playerId)
      .filter(g => {
        if (g.pago || g.total <= 0) return false;
        const k = `${g.rankingId}|${g.etapaId ?? g.dia}|${g.playerId}`;
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
      });
    const consumo = round2(itens.reduce((a, i) => a + i.precoUnitario * i.quantidade, 0));
    const pago = round2(pagamentos.reduce((a, p) => a + p.valor, 0));
    const saldoBar = round2(saldoComanda(c));
    const saldoPoker = round2(poker.reduce((a, g) => a + g.total, 0));
    if (saldoBar <= 0 && saldoPoker <= 0) continue;
    contas.push({ comanda: c, itens, pagamentos, consumo, pago, saldoBar, poker, saldoPoker, total: round2(saldoBar + saldoPoker) });
  }

  const soma = (f: (c: ContaExtrato) => number) => round2(contas.reduce((a, c) => a + f(c), 0));
  return {
    nome: contas[0]?.comanda.clienteNome || nome,
    contas,
    consumo: soma(c => c.consumo),
    pago: soma(c => c.pago),
    saldoBar: soma(c => c.saldoBar),
    saldoPoker: soma(c => c.saldoPoker),
    total: soma(c => c.total),
    desde: contas[0]?.comanda.data,
    itens: contas.reduce((a, c) => a + c.itens.reduce((x, i) => x + i.quantidade, 0), 0),
  };
};

// ─── Planilha ───────────────────────────────────────────────────────────────

/** Uma linha por lançamento: consumo, pagamentos parciais e poker em aberto. */
export const exportarExtrato = (e: Extrato, clube: string) => {
  const linhas: (string | number | null)[][] = [];
  for (const c of e.contas) {
    const cmd = c.comanda.numero != null ? `#${c.comanda.numero}` : '';
    for (const i of c.itens) {
      linhas.push([dataHoraPlanilha(i.lancadoEm), cmd, 'Consumo', i.nome, i.quantidade, i.precoUnitario, round2(i.precoUnitario * i.quantidade)]);
    }
    for (const p of c.pagamentos) {
      linhas.push([dataHoraPlanilha(p.em), cmd, 'Pagamento', p.forma || 'Não informado', null, null, -p.valor]);
    }
    for (const g of c.poker) {
      for (const l of g.linhas) {
        linhas.push([new Date(`${g.dia}T12:00:00`).toLocaleDateString('pt-BR'), cmd, `Poker · ${g.rankingNome}${g.etapaNome ? ` · ${g.etapaNome}` : ''}`, l.rotulo, l.quantidade, l.unitario ?? null, l.total]);
      }
    }
  }
  baixarXlsx(nomeArquivo('extrato', clube, e.nome), [{
    nome: 'Extrato',
    titulo: `${clube} · Extrato de ${e.nome}`,
    subtitulo: `Emitido em ${agora()} · ${e.contas.length} conta(s) em aberto · consumo R$ ${e.consumo.toFixed(2).replace('.', ',')} · já pago R$ ${e.pago.toFixed(2).replace('.', ',')}`,
    colunas: [
      { titulo: 'Data', largura: 17 }, { titulo: 'Comanda', largura: 10 }, { titulo: 'Tipo', largura: 26 },
      { titulo: 'Descrição', largura: 30 }, { titulo: 'Qtd', tipo: 'inteiro', largura: 7 },
      { titulo: 'Preço unitário', tipo: 'moeda', largura: 14 }, { titulo: 'Valor', tipo: 'moeda', largura: 14 },
    ],
    linhas,
    totais: ['Total a pagar', '', '', '', null, null, e.total],
  }]);
};

// ─── Impressão (A4) ─────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const htmlExtrato = (e: Extrato, clube: string): string => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Extrato — ${esc(e.nome)}</title>
<style>
  @page { margin: 14mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #111; font-size: 11.5px; line-height: 1.4; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
  h1 { font-size: 20px; } .clube { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
  .muted { color: #555; }
  .resumo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
  .resumo div { border: 1px solid #ccc; border-radius: 6px; padding: 8px 10px; }
  .resumo b { display: block; font-size: 15px; margin-top: 2px; }
  .resumo .forte { border-color: #111; }
  .conta { break-inside: avoid; margin-bottom: 14px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
  .conta h2 { font-size: 12px; background: #f2f2f2; padding: 7px 10px; display: flex; justify-content: space-between; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 5px 10px; border-bottom: 1px solid #eee; text-align: left; vertical-align: top; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #555; }
  .r { text-align: right; white-space: nowrap; } .num { font-variant-numeric: tabular-nums; }
  .pag td { color: #0a6b3d; } .pk td:first-child { color: #8f6f32; font-weight: 700; }
  .sub td { font-weight: 700; border-bottom: 0; }
  footer { margin-top: 18px; padding-top: 10px; border-top: 2px solid #111; display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; }
  .aviso { margin-top: 10px; font-size: 10px; color: #666; text-align: center; letter-spacing: .08em; text-transform: uppercase; }
</style></head><body>
<header>
  <div><div class="clube">${esc(clube)}</div><h1>Extrato de conta · ${esc(e.nome)}</h1>
    <div class="muted">${e.contas.length} conta(s) em aberto${e.desde ? ` desde ${data(e.desde)}` : ''}</div></div>
  <div class="muted r">Emitido em ${new Date().toLocaleString('pt-BR')}</div>
</header>
<div class="resumo num">
  <div>Consumo<b>R$ ${formatBRL(e.consumo)}</b></div>
  <div>Já pago<b>R$ ${formatBRL(e.pago)}</b></div>
  <div>Poker em aberto<b>R$ ${formatBRL(e.saldoPoker)}</b></div>
  <div class="forte">Total a pagar<b>R$ ${formatBRL(e.total)}</b></div>
</div>
${e.contas.map(c => `
<section class="conta">
  <h2><span>${data(c.comanda.data)}${c.comanda.numero != null ? ` · Comanda nº ${c.comanda.numero}` : ''}</span><span class="num">R$ ${formatBRL(c.total)}</span></h2>
  <table class="num">
    <thead><tr><th>Hora</th><th>Descrição</th><th class="r">Qtd</th><th class="r">Unit.</th><th class="r">Valor</th></tr></thead>
    <tbody>
      ${c.itens.map(i => `<tr><td>${hora(i.lancadoEm)}</td><td>${esc(i.nome)}</td><td class="r">${i.quantidade}</td><td class="r">${formatBRL(i.precoUnitario)}</td><td class="r">${formatBRL(i.precoUnitario * i.quantidade)}</td></tr>`).join('')}
      ${c.pagamentos.map(p => `<tr class="pag"><td>${new Date(p.em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td><td>Pagamento · ${esc(p.forma || 'Não informado')}</td><td></td><td></td><td class="r">− ${formatBRL(p.valor)}</td></tr>`).join('')}
      ${c.poker.flatMap(g => g.linhas.map(l => `<tr class="pk"><td>Poker</td><td>${esc(g.rankingNome)}${g.etapaNome ? ` · ${esc(g.etapaNome)}` : ''} — ${esc(l.rotulo)}</td><td class="r">${l.quantidade}</td><td class="r">${l.unitario != null ? formatBRL(l.unitario) : ''}</td><td class="r">${formatBRL(l.total)}</td></tr>`)).join('')}
      <tr class="sub"><td></td><td>Saldo desta conta</td><td></td><td></td><td class="r">R$ ${formatBRL(c.total)}</td></tr>
    </tbody>
  </table>
</section>`).join('')}
<footer><span>Total a pagar</span><span class="num">R$ ${formatBRL(e.total)}</span></footer>
<p class="aviso">Documento de controle interno · não é documento fiscal</p>
</body></html>`;

/** Imprime por um iframe oculto (a tela continua onde está). */
export const imprimirExtrato = (e: Extrato, clube: string) => {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(htmlExtrato(e, clube));
  doc.close();
  const win = frame.contentWindow!;
  win.addEventListener('afterprint', () => setTimeout(() => frame.remove(), 500), { once: true });
  setTimeout(() => { win.focus(); win.print(); }, 150);
  setTimeout(() => frame.isConnected && frame.remove(), 60_000);
};
