/**
 * Planilha Excel (.xlsx) gerada no navegador, sem biblioteca: título, cabeçalho
 * em destaque e fixo, filtro nas colunas, reais e porcentagens formatados e
 * largura de coluna ajustada. Abre no Excel, Google Planilhas e LibreOffice.
 *
 * O .xlsx é um zip de XMLs; aqui o zip é montado sem compressão (o formato
 * aceita) para não precisar de dependência.
 */

export type TipoColuna = 'texto' | 'inteiro' | 'moeda' | 'decimal' | 'percentual';

export interface Coluna {
  titulo: string;
  tipo?: TipoColuna;
  /** Largura em caracteres. */
  largura?: number;
}

export type Celula = string | number | null | undefined;

export interface Aba {
  nome: string;
  titulo?: string;
  subtitulo?: string;
  colunas: Coluna[];
  linhas: Celula[][];
  /** Linha de totais, em negrito, no fim. */
  totais?: Celula[];
  /** Índices (em `linhas`) a destacar — o pódio do ranking, por exemplo. */
  destaque?: number[];
}

// ─── Estilos (índices de cellXfs) ──────────────────────────────────────────
const S = {
  titulo: 1, subtitulo: 2, cabecalho: 3,
  texto: 4, inteiro: 5, moeda: 6, decimal: 7, percentual: 8,
  totalTexto: 9, totalInteiro: 10, totalMoeda: 11, totalDecimal: 12, totalPercentual: 13,
  dTexto: 14, dInteiro: 15, dMoeda: 16, dDecimal: 17, dPercentual: 18,
};
const ESTILO_TIPO: Record<TipoColuna, [number, number, number]> = {
  texto: [S.texto, S.totalTexto, S.dTexto],
  inteiro: [S.inteiro, S.totalInteiro, S.dInteiro],
  moeda: [S.moeda, S.totalMoeda, S.dMoeda],
  decimal: [S.decimal, S.totalDecimal, S.dDecimal],
  percentual: [S.percentual, S.totalPercentual, S.dPercentual],
};

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="0.00%"/></numFmts>
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="15"/><name val="Calibri"/></font>
<font><i/><sz val="10"/><color rgb="FF6B6B6B"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1B1B1F"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF5EDD6"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="3">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFDDDDDD"/></bottom><diagonal/></border>
<border><left/><right/><top style="medium"><color rgb="FF1B1B1F"/></top><bottom/><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="19">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="1" fontId="4" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="164" fontId="4" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="2" fontId="4" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="165" fontId="4" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="1" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="2" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="165" fontId="4" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // Caracteres de controle quebram o XML.
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const letra = (n: number) => {
  let s = '';
  for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

const celulaXml = (ref: string, v: Celula, estilo: number, tipo: TipoColuna) => {
  if (v == null || v === '') return `<c r="${ref}" s="${estilo}"/>`;
  if (typeof v === 'number' && tipo !== 'texto' && Number.isFinite(v)) {
    const valor = tipo === 'percentual' ? v / 100 : v;
    return `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>`;
  }
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
};

const nomeAba = (nome: string, usados: Set<string>) => {
  let n = nome.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Planilha';
  for (let k = 2; usados.has(n.toLowerCase()); k++) n = `${n.slice(0, 28)} ${k}`;
  usados.add(n.toLowerCase());
  return n;
};

const larguraAuto = (c: Coluna, linhas: Celula[][], i: number) => {
  if (c.largura) return c.largura;
  const maior = Math.max(c.titulo.length, ...linhas.slice(0, 300).map(l => String(l[i] ?? '').length + (c.tipo === 'moeda' ? 5 : 0)));
  return Math.min(48, Math.max(8, maior + 2));
};

const folha = (a: Aba): { xml: string; filtro?: string } => {
  const rows: string[] = [];
  let r = 0;
  const linha = (cells: string, extra = '') => { r += 1; rows.push(`<row r="${r}"${extra}>${cells}</row>`); };
  if (a.titulo) linha(celulaXml(`A${r + 1}`, a.titulo, S.titulo, 'texto'), ' ht="22" customHeight="1"');
  if (a.subtitulo) linha(celulaXml(`A${r + 1}`, a.subtitulo, S.subtitulo, 'texto'));
  if (a.titulo || a.subtitulo) linha('');

  const linhaCab = r + 1;
  linha(a.colunas.map((c, i) => celulaXml(`${letra(i)}${r + 1}`, c.titulo, S.cabecalho, 'texto')).join(''), ' ht="30" customHeight="1"');
  const destaque = new Set(a.destaque || []);
  a.linhas.forEach((l, k) => {
    const n = r + 1;
    linha(a.colunas.map((c, i) => {
      const [normal, , realce] = ESTILO_TIPO[c.tipo || 'texto'];
      return celulaXml(`${letra(i)}${n}`, l[i], destaque.has(k) ? realce : normal, c.tipo || 'texto');
    }).join(''));
  });
  const ultimaDados = r;
  if (a.totais) {
    const n = r + 1;
    linha(a.colunas.map((c, i) => celulaXml(`${letra(i)}${n}`, a.totais![i], ESTILO_TIPO[c.tipo || 'texto'][1], c.tipo || 'texto')).join(''));
  }

  const ultimaCol = letra(a.colunas.length - 1);
  const filtro = a.linhas.length ? `A${linhaCab}:${ultimaCol}${ultimaDados}` : undefined;
  const cols = a.colunas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${larguraAuto(c, a.linhas, i)}" customWidth="1"/>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${linhaCab}" topLeftCell="A${linhaCab + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18" customHeight="1"/>
<cols>${cols}</cols>
<sheetData>${rows.join('')}</sheetData>
${filtro ? `<autoFilter ref="${filtro}"/>` : ''}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="${a.colunas.length > 7 ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
  return { xml, filtro };
};

// ─── Zip (sem compressão) ──────────────────────────────────────────────────
const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (b: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TABELA_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const zip = (arquivos: { nome: string; dados: string }[]): Blob => {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const a of arquivos) {
    const nome = enc.encode(a.nome);
    const dados = enc.encode(a.dados);
    const crc = crc32(dados);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true); local.setUint32(14, crc, true); local.setUint32(18, dados.length, true);
    local.setUint32(22, dados.length, true); local.setUint16(26, nome.length, true);
    partes.push(new Uint8Array(local.buffer), nome, dados);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true);
    cd.setUint32(16, crc, true); cd.setUint32(20, dados.length, true); cd.setUint32(24, dados.length, true);
    cd.setUint16(28, nome.length, true); cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), nome);
    offset += 30 + nome.length + dados.length;
  }
  const tamCentral = central.reduce((a, b) => a + b.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true);
  fim.setUint32(12, tamCentral, true); fim.setUint32(16, offset, true);
  return new Blob([...partes, ...central, new Uint8Array(fim.buffer)] as BlobPart[], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/** Monta o .xlsx (para testes e para baixar). */
export const gerarXlsx = (abas: Aba[]): Blob => {
  const usados = new Set<string>();
  const nomes = abas.map(a => nomeAba(a.nome, usados));
  const folhas = abas.map(folha);
  const definidos = folhas.map((f, i) => f.filtro
    ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(nomes[i]).replace(/'/g, "''")}'!${f.filtro.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')}</definedName>` : '').join('');
  return zip([
    { nome: '[Content_Types].xml', dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>` },
    { nome: '_rels/.rels', dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nome: 'xl/workbook.xml', dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${nomes.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
${definidos ? `<definedNames>${definidos}</definedNames>` : ''}
</workbook>` },
    { nome: 'xl/_rels/workbook.xml.rels', dados: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
    { nome: 'xl/styles.xml', dados: STYLES },
    ...folhas.map((f, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, dados: f.xml })),
  ]);
};

export const baixarXlsx = (nomeArquivo: string, abas: Aba[]) => {
  const url = URL.createObjectURL(gerarXlsx(abas));
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo.endsWith('.xlsx') ? nomeArquivo : `${nomeArquivo}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const agora = () => new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
