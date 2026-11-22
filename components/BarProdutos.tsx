
import React, { useMemo, useRef, useState } from 'react';
import {
  Plus, Edit2, Trash2, Search, Package, Eye, EyeOff, X, ImagePlus, Star, AlertTriangle, Boxes,
} from 'lucide-react';
import { useBar } from '../context/BarContext';
import { BarProduto, BarUnidade } from '../types';
import ConfirmationModal from './ConfirmationModal';
import { inputNumericProps } from '../services/inputNumeric';
import { formatBRL } from '../services/stageValues';
import { gerarMiniatura } from '../services/imagem';
import ComboBox from './ComboBox';
import InputMoeda from './InputMoeda';

const UNIDADES: BarUnidade[] = ['un', 'dose', 'lata', 'long neck', 'garrafa', 'copo', 'porção', 'kg', 'L'];

/** Ponto de partida comum em bares, oferecido até a casa criar as suas. */
const CATEGORIAS_SUGERIDAS = [
  'Cervejas', 'Drinks', 'Destilados', 'Doses', 'Refrigerantes', 'Águas e sucos',
  'Energéticos', 'Porções', 'Espetos', 'Lanches', 'Sobremesas', 'Tabacaria',
];

interface Rascunho {
  id?: string;
  nome: string;
  descricao: string;
  categoria: string;
  codigo: string;
  unidade: BarUnidade;
  preco: number | undefined;
  custo: number | undefined;
  imagem?: string;
  controlaEstoque: boolean;
  estoque: string;
  estoqueMinimo: string;
  destaque: boolean;
  ncm: string;
}

const VAZIO: Rascunho = {
  nome: '', descricao: '', categoria: '', codigo: '', unidade: 'un', preco: undefined, custo: undefined,
  controlaEstoque: false, estoque: '', estoqueMinimo: '', destaque: false, ncm: '',
};

const deProduto = (p: BarProduto): Rascunho => ({
  id: p.id,
  nome: p.nome,
  descricao: p.descricao || '',
  categoria: p.categoria || '',
  codigo: p.codigo || '',
  unidade: p.unidade || 'un',
  preco: p.preco,
  custo: p.custo,
  imagem: p.imagem,
  controlaEstoque: !!p.controlaEstoque,
  estoque: p.estoque != null ? String(p.estoque) : '',
  estoqueMinimo: p.estoqueMinimo != null ? String(p.estoqueMinimo) : '',
  destaque: !!p.destaque,
  ncm: p.ncm || '',
});

const numOuUndef = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));

/** Margem sobre o preço de venda e markup sobre o custo. */
export const calcularMargem = (preco?: number, custo?: number) => {
  if (!preco || custo == null || custo <= 0) return null;
  const lucro = preco - custo;
  return { lucro, margem: (lucro / preco) * 100, markup: (lucro / custo) * 100 };
};

export const situacaoEstoque = (p: BarProduto): 'ok' | 'baixo' | 'zerado' | null => {
  if (!p.controlaEstoque) return null;
  const qtd = p.estoque ?? 0;
  if (qtd <= 0) return 'zerado';
  if (p.estoqueMinimo != null && qtd <= p.estoqueMinimo) return 'baixo';
  return 'ok';
};

const Campo: React.FC<{ label: string; dica?: string; children: React.ReactNode; className?: string }> =
  ({ label, dica, children, className = '' }) => (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
      {children}
      {dica && <p className="text-[10px] text-gray-600 ml-1">{dica}</p>}
    </div>
  );

const inputCls = 'w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-emerald-500 transition-colors';

const Alternador: React.FC<{ ativo: boolean; onChange: (v: boolean) => void; label: string; dica: string }> =
  ({ ativo, onChange, label, dica }) => (
    <button type="button" onClick={() => onChange(!ativo)}
            className={`w-full flex items-center justify-between gap-4 text-left rounded-xl border px-4 py-3 transition-all ${
              ativo ? 'border-emerald-500/40 bg-emerald-600/[0.06]' : 'border-gray-800 bg-black/20 hover:border-gray-700'
            }`}>
      <span>
        <span className="block text-white text-sm font-bold">{label}</span>
        <span className="block text-gray-500 text-[11px] mt-0.5">{dica}</span>
      </span>
      <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${ativo ? 'bg-emerald-600' : 'bg-gray-700'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${ativo ? 'left-5' : 'left-1'}`} />
      </span>
    </button>
  );

const BarProdutos: React.FC = () => {
  const { produtos, addProduto, updateProduto, removeProduto, loading } = useBar();
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<string | null>(null);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [soEstoqueBaixo, setSoEstoqueBaixo] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<BarProduto | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const categorias = useMemo(
    () => [...new Set(produtos.map(p => p.categoria).filter(Boolean) as string[])].sort(),
    [produtos]
  );

  const alertasEstoque = produtos.filter(p => p.ativo !== false && ['baixo', 'zerado'].includes(situacaoEstoque(p) || '')).length;

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos
      .filter(p => mostrarInativos || p.ativo !== false)
      .filter(p => !categoria || p.categoria === categoria)
      .filter(p => !soEstoqueBaixo || ['baixo', 'zerado'].includes(situacaoEstoque(p) || ''))
      .filter(p => !termo || [p.nome, p.categoria, p.codigo].some(v => (v || '').toLowerCase().includes(termo)))
      .sort((a, b) => Number(!!b.destaque) - Number(!!a.destaque) || a.nome.localeCompare(b.nome));
  }, [produtos, busca, categoria, mostrarInativos, soEstoqueBaixo]);

  const escolherImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo || !rascunho) return;
    try {
      setRascunho({ ...rascunho, imagem: await gerarMiniatura(arquivo) });
    } catch (err: any) {
      setErro(err.message || 'Não foi possível usar esta imagem.');
    }
  };

  const salvar = async () => {
    if (!rascunho) return;
    const { preco, custo } = rascunho;
    if (!rascunho.nome.trim()) return setErro('Informe o nome do produto.');
    if (preco == null || !(preco > 0)) return setErro('Informe um preço de venda maior que zero.');
    if (custo != null && custo < 0) return setErro('O custo não pode ser negativo.');
    if (rascunho.ncm && !/^\d{8}$/.test(rascunho.ncm.replace(/\D/g, ''))) return setErro('O NCM tem 8 dígitos.');

    const dados: Omit<BarProduto, 'id' | 'criadoEm'> = {
      nome: rascunho.nome.trim(),
      descricao: rascunho.descricao.trim() || undefined,
      categoria: rascunho.categoria.trim() || undefined,
      codigo: rascunho.codigo.trim() || undefined,
      unidade: rascunho.unidade,
      preco,
      custo,
      imagem: rascunho.imagem,
      controlaEstoque: rascunho.controlaEstoque,
      estoque: rascunho.controlaEstoque ? (numOuUndef(rascunho.estoque) ?? 0) : undefined,
      estoqueMinimo: rascunho.controlaEstoque ? numOuUndef(rascunho.estoqueMinimo) : undefined,
      destaque: rascunho.destaque,
      ncm: rascunho.ncm.replace(/\D/g, '') || undefined,
    };

    setSalvando(true);
    setErro(null);
    try {
      if (rascunho.id) await updateProduto(rascunho.id, dados);
      else await addProduto(dados);
      setRascunho(null);
    } catch {
      setErro('Não foi possível salvar. Verifique a conexão e tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const margemRascunho = rascunho ? calcularMargem(rascunho.preco, rascunho.custo) : null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Produtos do Bar</h2>
          <p className="text-gray-500 text-sm mt-1">Cardápio, preços, custos e estoque usados no PDV.</p>
        </div>
        <button
          onClick={() => { setErro(null); setRascunho({ ...VAZIO }); }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
        >
          <Plus size={16} /> Novo Produto
        </button>
      </header>

      {alertasEstoque > 0 && (
        <button onClick={() => setSoEstoqueBaixo(v => !v)}
                className="w-full flex items-center gap-3 bg-amber-500/[0.07] border border-amber-500/20 rounded-2xl p-4 text-left hover:bg-amber-500/10 transition-all">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <span className="text-amber-500/90 text-xs">
            <strong className="font-black">{alertasEstoque} produto(s)</strong> com estoque baixo ou zerado.
            {' '}{soEstoqueBaixo ? 'Mostrando só eles — clique para ver todos.' : 'Clique para ver.'}
          </span>
        </button>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="w-full bg-gray-900/50 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-200 outline-none focus:border-emerald-500/50"
                 placeholder="Buscar por nome, categoria ou código..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <button onClick={() => setMostrarInativos(v => !v)}
                className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  mostrarInativos ? 'bg-gray-800 text-white border-gray-700' : 'text-gray-500 border-gray-800 hover:text-gray-300'
                }`}>
          {mostrarInativos ? 'Ocultar inativos' : 'Mostrar inativos'}
        </button>
      </div>

      {categorias.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[null, ...categorias].map(c => (
            <button key={c ?? 'todas'} onClick={() => setCategoria(c)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${
                      categoria === c ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-gray-800 text-gray-500 hover:text-gray-300'
                    }`}>
              {c ?? 'Todas'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-gray-600 text-sm">Carregando produtos...</div>
      ) : visiveis.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-3xl p-16 text-center space-y-3">
          <div className="bg-gray-800 w-14 h-14 rounded-full flex items-center justify-center mx-auto text-gray-600"><Package size={26} /></div>
          <p className="text-white font-bold">{produtos.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}</p>
          {produtos.length === 0 && <p className="text-gray-500 text-sm">Cadastre o cardápio para começar a vender no PDV.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {visiveis.map(p => {
            const inativo = p.ativo === false;
            const est = situacaoEstoque(p);
            const margem = calcularMargem(p.preco, p.custo);
            return (
              <div key={p.id} className={`bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden group transition-all ${inativo ? 'opacity-50' : 'hover:border-gray-700'}`}>
                <div className="relative aspect-[4/3] bg-black/40">
                  {p.imagem
                    ? <img src={p.imagem} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-700"><Package size={32} /></div>}
                  {p.destaque && (
                    <span className="absolute top-2 left-2 bg-amber-500 text-black rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Star size={10} fill="currentColor" /> Destaque
                    </span>
                  )}
                  {est && est !== 'ok' && (
                    <span className={`absolute top-2 right-2 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest ${
                      est === 'zerado' ? 'bg-red-600 text-white' : 'bg-amber-500 text-black'
                    }`}>
                      {est === 'zerado' ? 'Sem estoque' : 'Estoque baixo'}
                    </span>
                  )}
                  <div className="absolute bottom-2 right-2 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => updateProduto(p.id, { ativo: inativo })} title={inativo ? 'Reativar' : 'Desativar'}
                            className="p-2 rounded-lg bg-black/70 text-gray-300 hover:text-white backdrop-blur-sm">
                      {inativo ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => { setErro(null); setRascunho(deProduto(p)); }} title="Editar"
                            className="p-2 rounded-lg bg-black/70 text-gray-300 hover:text-white backdrop-blur-sm">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setParaExcluir(p)} title="Excluir"
                            className="p-2 rounded-lg bg-black/70 text-gray-300 hover:text-red-400 backdrop-blur-sm">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest truncate">
                    {[p.categoria, p.codigo && `#${p.codigo}`].filter(Boolean).join(' · ') || 'Sem categoria'}
                  </p>
                  <p className={`text-white font-bold text-sm truncate mt-1 ${inativo ? 'line-through' : ''}`}>{p.nome}</p>
                  <div className="flex items-end justify-between gap-2 mt-2">
                    <p className="text-amber-500 font-black text-lg tracking-tight">
                      R$ {formatBRL(p.preco)}<span className="text-gray-600 text-[10px] font-bold ml-1">/{p.unidade || 'un'}</span>
                    </p>
                    {margem && (
                      <span className="text-[10px] font-bold text-gray-500" title={`Lucro de R$ ${formatBRL(margem.lucro)} por unidade`}>
                        margem <span className={margem.margem < 30 ? 'text-amber-500' : 'text-emerald-400'}>{margem.margem.toFixed(0)}%</span>
                      </span>
                    )}
                  </div>
                  {p.controlaEstoque && (
                    <p className="text-[10px] font-bold text-gray-500 mt-1.5 flex items-center gap-1.5">
                      <Boxes size={11} /> {p.estoque ?? 0} em estoque
                      {p.estoqueMinimo != null && <span className="text-gray-700">· mín. {p.estoqueMinimo}</span>}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulário */}
      {rascunho && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] w-full max-w-3xl max-h-[95dvh] flex flex-col border border-gray-800 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-800 shrink-0">
              <h3 className="text-lg font-bold text-white">{rascunho.id ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setRascunho(null)} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="shrink-0">
                  <input ref={arquivoRef} type="file" accept="image/*" className="hidden" onChange={escolherImagem} />
                  <button type="button" onClick={() => arquivoRef.current?.click()}
                          className="relative w-full sm:w-40 aspect-square rounded-2xl border border-dashed border-gray-700 bg-black/30 hover:border-emerald-500/50 overflow-hidden flex items-center justify-center group transition-all">
                    {rascunho.imagem
                      ? <img src={rascunho.imagem} alt="" className="w-full h-full object-cover" />
                      : <span className="flex flex-col items-center gap-2 text-gray-600 group-hover:text-emerald-500 transition-colors">
                          <ImagePlus size={26} /><span className="text-[10px] font-black uppercase tracking-widest">Adicionar foto</span>
                        </span>}
                  </button>
                  {rascunho.imagem && (
                    <button type="button" onClick={() => setRascunho({ ...rascunho, imagem: undefined })}
                            className="mt-2 w-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 transition-colors">
                      Remover foto
                    </button>
                  )}
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Campo label="Nome *" className="sm:col-span-2">
                    <input autoFocus className={inputCls} placeholder="Ex: Heineken Long Neck 330ml"
                           value={rascunho.nome} onChange={e => setRascunho({ ...rascunho, nome: e.target.value })} />
                  </Campo>
                  <Campo label="Categoria">
                    <ComboBox value={rascunho.categoria} opcoes={categorias} sugestoes={CATEGORIAS_SUGERIDAS}
                              placeholder="Escolha ou crie" rotuloCriar="Criar categoria"
                              onChange={v => setRascunho(r => r && { ...r, categoria: v })} />
                  </Campo>
                  <Campo label="Unidade de venda">
                    <ComboBox modo="lista" value={rascunho.unidade} opcoes={UNIDADES}
                              onChange={v => setRascunho(r => r && { ...r, unidade: v as BarUnidade })} />
                  </Campo>
                  <Campo label="Código" dica="Código interno ou de barras" className="sm:col-span-2">
                    <input className={inputCls} placeholder="Opcional"
                           value={rascunho.codigo} onChange={e => setRascunho({ ...rascunho, codigo: e.target.value })} />
                  </Campo>
                </div>
              </div>

              <Campo label="Descrição">
                <textarea rows={2} className={`${inputCls} resize-none`} placeholder="Ingredientes, tamanho, observações para o atendimento..."
                          value={rascunho.descricao} onChange={e => setRascunho({ ...rascunho, descricao: e.target.value })} />
              </Campo>

              <section className="space-y-4 pt-4 border-t border-gray-800">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preço e margem</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Campo label="Preço de venda *">
                    <InputMoeda className="text-amber-500" value={rascunho.preco}
                                onChange={v => setRascunho(r => r && { ...r, preco: v })} />
                  </Campo>
                  <Campo label="Custo" dica="Quanto você paga por unidade">
                    <InputMoeda className="text-white" value={rascunho.custo}
                                onChange={v => setRascunho(r => r && { ...r, custo: v })} />
                  </Campo>
                  <div className="rounded-xl bg-black/30 border border-gray-800 p-4 flex flex-col justify-center">
                    {margemRascunho ? (
                      <>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Lucro por unidade</p>
                        <p className={`font-black text-lg ${margemRascunho.lucro < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          R$ {formatBRL(margemRascunho.lucro)}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold">
                          margem {margemRascunho.margem.toFixed(1)}% · markup {margemRascunho.markup.toFixed(0)}%
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-gray-600">Informe o custo para ver o lucro e a margem.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-4 pt-4 border-t border-gray-800">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estoque</h4>
                <Alternador ativo={rascunho.controlaEstoque} onChange={v => setRascunho({ ...rascunho, controlaEstoque: v })}
                            label="Controlar estoque" dica="Cada venda baixa o estoque e cada cancelamento devolve." />
                {rascunho.controlaEstoque && (
                  <div className="grid grid-cols-2 gap-4">
                    <Campo label="Estoque atual">
                      <input type="number" step="1" {...inputNumericProps} className={inputCls}
                             value={rascunho.estoque} onChange={e => setRascunho({ ...rascunho, estoque: e.target.value })} />
                    </Campo>
                    <Campo label="Estoque mínimo" dica="Abaixo disso, o produto é sinalizado">
                      <input type="number" step="1" {...inputNumericProps} className={inputCls}
                             value={rascunho.estoqueMinimo} onChange={e => setRascunho({ ...rascunho, estoqueMinimo: e.target.value })} />
                    </Campo>
                  </div>
                )}
              </section>

              <section className="space-y-4 pt-4 border-t border-gray-800">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Exibição e fiscal</h4>
                <Alternador ativo={rascunho.destaque} onChange={v => setRascunho({ ...rascunho, destaque: v })}
                            label="Destaque no PDV" dica="Aparece primeiro na tela de lançamento — use nos mais vendidos." />
                <Campo label="NCM" dica="Opcional. Só é necessário para emitir nota fiscal — confirme com o contador.">
                  <input className={inputCls} placeholder="Ex: 22030000" inputMode="numeric" maxLength={10}
                         value={rascunho.ncm} onChange={e => setRascunho({ ...rascunho, ncm: e.target.value })} />
                </Campo>
              </section>
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-800 shrink-0">
              <p className="text-red-400 text-xs font-bold min-h-[1rem]">{erro}</p>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => setRascunho(null)} className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all">
                  Cancelar
                </button>
                <button onClick={salvar} disabled={salvando}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!paraExcluir}
        onClose={() => setParaExcluir(null)}
        onConfirm={() => paraExcluir && removeProduto(paraExcluir.id)}
        title="Excluir Produto"
        message={`Excluir "${paraExcluir?.nome}" do cardápio? As comandas já lançadas mantêm o nome e o preço registrados. Se o produto só saiu de linha, prefira desativá-lo.`}
      />
    </div>
  );
};

export default BarProdutos;
