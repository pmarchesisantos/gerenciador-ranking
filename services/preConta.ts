import { BarComanda } from '../types';
import { formatBRL } from './stageValues';
import { GastoPoker } from './pokerDoDia';

export interface DadosPreConta {
  casa: { nome: string; logoUrl?: string; contato?: string; instagram?: string };
  cliente: { nome: string; telefone?: string };
  comanda: BarComanda;
  /** Gastos do cliente nas etapas de poker do dia. */
  poker?: GastoPoker[];
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const dataHora = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const telefone = (t?: string) => {
  const d = (t || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t || '';
};

const instagram = (url?: string) => {
  if (!url) return '';
  const m = url.match(/instagram\.com\/([^/?#]+)/i);
  return m ? `@${m[1]}` : url.startsWith('@') ? url : '';
};

/**
 * Pré-conta: o extrato que o cliente confere antes de pagar. Documento de
 * controle interno, sem valor fiscal — por isso o aviso no rodapé.
 */
export const gerarHtmlPreConta = ({ casa, cliente, comanda, poker = [] }: DadosPreConta): string => {
  const itens = comanda.itens.filter(i => !i.cancelado);
  const pagamentos = (comanda.pagamentos || []).filter(p => !p.estornado);
  const total = itens.reduce((a, i) => a + i.precoUnitario * i.quantidade, 0);
  const pago = pagamentos.reduce((a, p) => a + p.valor, 0);
  const saldo = Math.max(0, Math.round((total - pago) * 100) / 100);
  const quantidade = itens.reduce((a, i) => a + i.quantidade, 0);
  const contatos = [telefone(casa.contato), instagram(casa.instagram)].filter(Boolean).join('  ·  ');

  const selo =
    comanda.status === 'cancelada' ? 'Comanda cancelada'
    : comanda.status === 'paga' ? 'Conta quitada'
    : saldo > 0 && pago > 0 ? 'Pagamento parcial'
    : '';

  const linhaItem = (i: BarComanda['itens'][number]) => `
    <tr>
      <td class="qtd">${i.quantidade}×</td>
      <td class="desc">${esc(i.nome)}<span class="unit">${formatBRL(i.precoUnitario)} un</span></td>
      <td class="valor">${formatBRL(i.precoUnitario * i.quantidade)}</td>
    </tr>`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Comanda ${comanda.numero ?? ''} — ${esc(cliente.nome)}</title>
<style>
  @page { margin: 4mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #000; background: #fff; font-size: 11px; line-height: 1.35; }
  .recibo { width: 72mm; margin: 0 auto; }
  .topo { text-align: center; padding-bottom: 8px; }
  .logo { max-width: 26mm; max-height: 26mm; margin: 0 auto 6px; display: block; filter: grayscale(1); }
  .casa { font-size: 15px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
  .contatos { font-size: 9.5px; color: #333; margin-top: 2px; }
  .titulo { text-align: center; font-size: 10px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase;
            border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 5px 0; margin: 4px 0 8px; }
  .numero { font-size: 18px; letter-spacing: .02em; display: block; margin-top: 1px; }
  .titulo.poker { margin-top: 14px; }
  .sub { display: block; font-size: 10px; letter-spacing: .04em; text-transform: none; font-weight: 600; margin-top: 2px; }
  dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; margin-bottom: 8px; }
  dt { color: #444; }
  dd { text-align: right; font-weight: 600; overflow-wrap: anywhere; }
  hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; text-align: left; padding-bottom: 4px; border-bottom: 1px solid #000; }
  th.valor, td.valor { text-align: right; white-space: nowrap; }
  td { vertical-align: top; padding: 4px 0; border-bottom: 1px dotted #999; }
  tr:last-child td { border-bottom: 0; }
  td.qtd { width: 8mm; font-weight: 700; }
  td.desc { padding-right: 6px; }
  .unit { display: block; font-size: 9px; color: #555; }
  .totais div { display: flex; justify-content: space-between; padding: 1.5px 0; }
  .totais .forte { font-size: 14px; font-weight: 800; border-top: 1px solid #000; margin-top: 3px; padding-top: 5px; }
  .secao { font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #444; margin-bottom: 3px; }
  .selo { text-align: center; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; font-size: 10px;
          border: 1px solid #000; border-radius: 3px; padding: 4px; margin-top: 8px; }
  .rodape { text-align: center; margin-top: 10px; }
  .fiscal { font-weight: 800; letter-spacing: .1em; font-size: 10px; text-transform: uppercase; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; }
  .obrigado { margin-top: 6px; font-size: 10px; color: #333; }
  .num { font-variant-numeric: tabular-nums; }
</style></head>
<body><div class="recibo">
  <header class="topo">
    ${casa.logoUrl ? `<img class="logo" src="${esc(casa.logoUrl)}" alt="">` : ''}
    <div class="casa">${esc(casa.nome)}</div>
    ${contatos ? `<div class="contatos">${esc(contatos)}</div>` : ''}
  </header>

  <div class="titulo">Conferência de consumo<span class="numero">Comanda nº ${comanda.numero ?? '—'}</span></div>

  <dl>
    <dt>Cliente</dt><dd>${esc(cliente.nome)}</dd>
    ${cliente.telefone ? `<dt>Telefone</dt><dd class="num">${esc(telefone(cliente.telefone))}</dd>` : ''}
    <dt>Aberta em</dt><dd class="num">${dataHora(comanda.data)}</dd>
    <dt>Impressa em</dt><dd class="num">${dataHora(new Date().toISOString())}</dd>
  </dl>

  <table class="num">
    <thead><tr><th>Qtd</th><th>Descrição</th><th class="valor">Total</th></tr></thead>
    <tbody>${itens.length ? itens.map(linhaItem).join('') : '<tr><td colspan="3">Nenhum item lançado.</td></tr>'}</tbody>
  </table>

  <hr>
  <div class="totais num">
    <div><span>Quantidade de itens</span><span>${quantidade}</span></div>
    <div class="forte"><span>Total</span><span>R$ ${formatBRL(total)}</span></div>
  </div>

  ${pagamentos.length ? `
  <hr>
  <p class="secao">Pagamentos</p>
  <div class="totais num">
    ${pagamentos.map(p => `<div><span>${esc(p.forma || 'Não informado')}</span><span>R$ ${formatBRL(p.valor)}</span></div>`).join('')}
    <div><span>Total pago</span><span>R$ ${formatBRL(pago)}</span></div>
    <div class="forte"><span>${saldo > 0 ? 'A pagar' : 'Saldo'}</span><span>R$ ${formatBRL(saldo)}</span></div>
  </div>` : ''}

  ${selo ? `<div class="selo">${selo}</div>` : ''}

  ${poker.map(g => `
  <div class="titulo poker">Poker do dia<span class="sub">${esc(g.rankingNome)}${g.etapaNome ? ` · ${esc(g.etapaNome)}` : ''}</span></div>
  <table class="num">
    <thead><tr><th>Qtd</th><th>Descrição</th><th class="valor">Total</th></tr></thead>
    <tbody>${g.linhas.map(l => `
      <tr>
        <td class="qtd">${l.quantidade}×</td>
        <td class="desc">${esc(l.rotulo)}${l.unitario != null ? `<span class="unit">${formatBRL(l.unitario)} un</span>` : ''}</td>
        <td class="valor">${l.unitario != null ? formatBRL(l.total) : '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="totais num">
    <div class="forte"><span>Total poker</span><span>R$ ${formatBRL(g.total)}</span></div>
  </div>
  <div class="selo">${g.pago ? 'Poker pago' : 'Poker a pagar'}</div>`).join('')}

  ${poker.length ? `
  <hr>
  <p class="secao">Resumo do dia</p>
  <div class="totais num">
    <div><span>Bar</span><span>R$ ${formatBRL(total)}</span></div>
    <div><span>Poker</span><span>R$ ${formatBRL(poker.reduce((a, g) => a + g.total, 0))}</span></div>
    <div class="forte"><span>Total do dia</span><span>R$ ${formatBRL(total + poker.reduce((a, g) => a + g.total, 0))}</span></div>
  </div>` : ''}

  <footer class="rodape">
    <div class="fiscal">Não é documento fiscal</div>
    <div class="obrigado">Obrigado pela preferência!</div>
  </footer>
</div></body></html>`;
};

/** Imprime por um iframe oculto: a janela do PDV continua onde está. */
export const imprimirPreConta = (dados: DadosPreConta) => {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);

  const doc = frame.contentDocument!;
  doc.open();
  doc.write(gerarHtmlPreConta(dados));
  doc.close();

  const remover = () => setTimeout(() => frame.remove(), 500);
  const imprimir = () => {
    const win = frame.contentWindow!;
    win.addEventListener('afterprint', remover, { once: true });
    win.focus();
    win.print();
    // Navegadores que não disparam afterprint.
    setTimeout(() => frame.isConnected && frame.remove(), 60_000);
  };

  // Espera o logo carregar para ele sair no papel.
  const imgs = [...doc.images].filter(i => !i.complete);
  if (imgs.length === 0) return imprimir();
  let impresso = false;
  const uma = () => { if (!impresso) { impresso = true; imprimir(); } };
  let faltam = imgs.length;
  const pronto = () => { if (--faltam === 0) uma(); };
  imgs.forEach(i => { i.addEventListener('load', pronto, { once: true }); i.addEventListener('error', pronto, { once: true }); });
  // Logo lento não segura a impressão.
  setTimeout(uma, 3000);
};
