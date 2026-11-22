
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Check, Plus, X } from 'lucide-react';

const normalizar = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

interface ComboBoxProps {
  value: string;
  onChange: (valor: string) => void;
  opcoes: string[];
  placeholder?: string;
  /**
   * livre: digita para filtrar e pode criar um valor novo.
   * lista: só escolhe entre as opções, como um select.
   */
  modo?: 'livre' | 'lista';
  /** Texto da ação de criar, ex.: "Criar categoria". */
  rotuloCriar?: string;
  /** Opções sugeridas, mostradas abaixo das existentes enquanto não forem usadas. */
  sugestoes?: string[];
  className?: string;
}

/**
 * Combo box no visual do app. Substitui o datalist nativo, que abre uma lista
 * do navegador fora do padrão visual e não deixa claro que o campo tem opções.
 */
const ComboBox: React.FC<ComboBoxProps> = ({
  value, onChange, opcoes, placeholder, modo = 'livre', rotuloCriar = 'Criar', sugestoes = [], className = '',
}) => {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(value);
  const [destaque, setDestaque] = useState(0);
  const raizRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => { if (!aberto) setTexto(value); }, [value, aberto]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (raizRef.current && !raizRef.current.contains(e.target as Node)) fechar();
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  });

  const termo = modo === 'livre' ? normalizar(texto) : '';
  const existentes = useMemo(
    () => [...new Set(opcoes.filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [opcoes]
  );
  const sugeridas = useMemo(
    () => sugestoes.filter(s => !existentes.some(e => normalizar(e) === normalizar(s))),
    [sugestoes, existentes]
  );

  // Durante a digitação, a lista só mostra o que bate com o texto.
  const filtrar = (lista: string[]) => (termo && texto !== value ? lista.filter(o => normalizar(o).includes(termo)) : lista);
  const visiveisExistentes = filtrar(existentes);
  const visiveisSugeridas = filtrar(sugeridas);
  const correspondente = [...existentes, ...sugeridas].find(o => normalizar(o) === normalizar(texto));
  const podeCriar = modo === 'livre' && !!texto.trim() && !correspondente;

  const itens: { tipo: 'opcao' | 'criar'; valor: string }[] = [
    ...visiveisExistentes.map(v => ({ tipo: 'opcao' as const, valor: v })),
    ...visiveisSugeridas.map(v => ({ tipo: 'opcao' as const, valor: v })),
    ...(podeCriar ? [{ tipo: 'criar' as const, valor: texto.trim() }] : []),
  ];

  useEffect(() => { setDestaque(0); }, [texto, aberto]);

  // Mantém o item destacado visível ao navegar pelo teclado.
  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>(`[data-indice="${destaque}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [destaque]);

  const escolher = (valor: string) => {
    onChange(valor);
    setTexto(valor);
    setAberto(false);
  };

  const fechar = () => {
    setAberto(false);
    if (modo === 'livre') {
      // Texto digitado que bate com uma opção vira a grafia existente, sem criar
      // duplicata. O texto exibido é ajustado aqui mesmo, junto com o valor: se
      // dependesse de um efeito posterior, o Tab levaria o foco embora antes e o
      // campo continuaria mostrando o que foi digitado.
      const final = correspondente ?? texto.trim();
      setTexto(final);
      if (final !== value) onChange(final);
    } else {
      setTexto(value);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!aberto) setAberto(true); else setDestaque(d => Math.min(d + 1, itens.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setDestaque(d => Math.max(d - 1, 0)); }
    else if (e.key === 'Enter') {
      if (!aberto) return;
      e.preventDefault();
      const item = itens[destaque];
      if (item) escolher(item.valor);
      else fechar();
    }
    else if (e.key === 'Escape') { e.preventDefault(); setTexto(value); setAberto(false); }
    else if (e.key === 'Tab') fechar();
  };

  const listaId = `${id}-lista`;

  return (
    <div ref={raizRef} className={`relative ${className}`}>
      <div className={`flex items-center bg-black/40 border rounded-xl transition-colors ${aberto ? 'border-emerald-500' : 'border-gray-800 hover:border-gray-700'}`}>
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listaId}
          aria-autocomplete={modo === 'livre' ? 'list' : 'none'}
          aria-activedescendant={aberto && itens[destaque] ? `${id}-op-${destaque}` : undefined}
          readOnly={modo === 'lista'}
          value={texto}
          placeholder={placeholder}
          onChange={e => { setTexto(e.target.value); setAberto(true); }}
          onFocus={() => modo === 'livre' && inputRef.current?.select()}
          onClick={() => setAberto(true)}
          onKeyDown={onKeyDown}
          className={`flex-1 min-w-0 bg-transparent px-4 py-3 text-white text-sm font-bold outline-none placeholder:text-gray-600 ${modo === 'lista' ? 'cursor-pointer' : ''}`}
        />
        {modo === 'livre' && value && (
          <button type="button" tabIndex={-1} title="Limpar"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { onChange(''); setTexto(''); inputRef.current?.focus(); }}
                  className="p-1 text-gray-600 hover:text-gray-300 transition-colors">
            <X size={14} />
          </button>
        )}
        <button type="button" tabIndex={-1} aria-label="Mostrar opções"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { setAberto(a => !a); inputRef.current?.focus(); }}
                className="px-3 py-3 text-gray-500 hover:text-white transition-colors">
          <ChevronDown size={16} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {aberto && (
        <ul ref={listaRef} id={listaId} role="listbox"
            className="absolute z-40 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto custom-scrollbar bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 animate-in fade-in duration-100">
          {itens.length === 0 ? (
            <li className="px-4 py-3 text-xs text-gray-500">
              {modo === 'livre' ? 'Digite para criar a primeira.' : 'Nenhuma opção.'}
            </li>
          ) : itens.map((item, idx) => {
            const ehSugerida = item.tipo === 'opcao' && !existentes.includes(item.valor);
            const primeiraSugerida = ehSugerida && idx === visiveisExistentes.length;
            const selecionado = item.tipo === 'opcao' && item.valor === value;
            return (
              <React.Fragment key={`${item.tipo}-${item.valor}`}>
                {primeiraSugerida && (
                  <li role="presentation" className="px-4 pt-2.5 pb-1 text-[9px] font-black text-gray-600 uppercase tracking-widest border-t border-gray-800 mt-1">
                    Sugestões
                  </li>
                )}
                <li
                  id={`${id}-op-${idx}`}
                  role="option"
                  aria-selected={selecionado}
                  data-indice={idx}
                  onMouseDown={e => e.preventDefault()}
                  onMouseEnter={() => setDestaque(idx)}
                  onClick={() => escolher(item.valor)}
                  className={`mx-1 px-3 py-2.5 rounded-lg text-sm flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    idx === destaque ? 'bg-emerald-600/15 text-white' : 'text-gray-300'
                  } ${item.tipo === 'criar' ? 'border-t border-gray-800 mt-1 rounded-t-none' : ''}`}
                >
                  {item.tipo === 'criar' ? (
                    <span className="flex items-center gap-2 text-emerald-400 font-bold min-w-0">
                      <Plus size={14} className="shrink-0" />
                      <span className="truncate">{rotuloCriar} “{item.valor}”</span>
                    </span>
                  ) : (
                    <span className={`truncate font-bold ${ehSugerida ? 'text-gray-400' : ''}`}>{item.valor}</span>
                  )}
                  {selecionado && <Check size={14} className="text-emerald-400 shrink-0" />}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ComboBox;
