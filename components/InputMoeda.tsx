
import React, { useEffect, useRef } from 'react';

interface InputMoedaProps {
  value: number | undefined;
  onChange: (valor: number | undefined) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  /** Rótulo para leitores de tela, quando o campo não tem <label>. */
  ariaLabel?: string;
}

const MAX_DIGITOS = 9; // até R$ 9.999.999,99

const formatar = (valor: number) =>
  valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const paraCentavos = (valor: number | undefined) => (valor == null ? '' : String(Math.round(valor * 100)));
const deCentavos = (digitos: string) => {
  const limpos = digitos.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITOS);
  return limpos === '' ? undefined : Number(limpos) / 100;
};

/** Texto colado: "12,50", "1.234,56" e "12.50" viram o valor; "12" vira R$ 12,00. */
const interpretarColado = (texto: string): number | undefined => {
  const t = texto.trim().replace(/[^\d.,]/g, '');
  if (!t) return undefined;
  const decimal = t.match(/[.,](\d{1,2})$/);
  const inteiro = (decimal ? t.slice(0, -decimal[0].length) : t).replace(/\D/g, '');
  const valor = Number(inteiro || '0') + (decimal ? Number(decimal[1].padEnd(2, '0')) / 100 : 0);
  return Math.min(valor, 9999999.99);
};

/**
 * Campo de dinheiro com máscara de centavos: os dígitos entram pela direita,
 * como em PDVs e apps de banco. Digitar 8, 0, 0 resulta em R$ 8,00.
 *
 * Cada tecla é interceptada no `beforeinput` e o novo valor é calculado a partir
 * dos centavos atuais — nunca da posição do cursor. Assim digitar sempre
 * acrescenta à direita e apagar sempre tira o último dígito, inclusive no
 * teclado virtual do celular, que não envia códigos de tecla confiáveis.
 */
const InputMoeda: React.FC<InputMoedaProps> = ({
  value, onChange, placeholder = '0,00', className = '', autoFocus, onEnter, ariaLabel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // O ouvinte nativo é registrado uma vez; as refs dão a ele o valor e o callback atuais.
  const valorRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valorRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const aoInserir = (ev: InputEvent) => {
      ev.preventDefault();
      const tudoSelecionado = el.value.length > 0 && el.selectionStart === 0 && el.selectionEnd === el.value.length;
      const atuais = tudoSelecionado ? '' : paraCentavos(valorRef.current);
      const tipo = ev.inputType;

      if (tipo === 'insertFromPaste' || tipo === 'insertFromDrop' || tipo === 'insertReplacementText') {
        const texto = ev.data ?? ev.dataTransfer?.getData('text') ?? '';
        onChangeRef.current(interpretarColado(texto));
      } else if (tipo.startsWith('insert')) {
        const digitos = (ev.data || '').replace(/\D/g, '');
        if (digitos) onChangeRef.current(deCentavos(atuais + digitos));
      } else if (tipo.startsWith('delete')) {
        onChangeRef.current(deCentavos(atuais.slice(0, -1)));
      }
    };

    el.addEventListener('beforeinput', aoInserir);
    return () => el.removeEventListener('beforeinput', aoInserir);
  }, []);

  // Com o texto sempre formatado, o cursor fica no fim para o campo parecer "uma máquina".
  const cursorNoFim = () => {
    const el = inputRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      if (document.activeElement === el && el.selectionStart === el.selectionEnd) {
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  };

  return (
    // min-w-0: sem isso o campo não encolhe numa linha flex e empurra os vizinhos para fora.
    <div className={`flex items-center min-w-0 bg-black/40 border border-gray-800 rounded-xl focus-within:border-emerald-500 transition-colors ${className}`}>
      <span className="pl-4 text-gray-600 text-sm font-black select-none">R$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        value={value == null ? '' : formatar(value)}
        placeholder={placeholder}
        // A edição real acontece no beforeinput; este onChange só satisfaz o React.
        onChange={() => {}}
        onFocus={cursorNoFim}
        onClick={cursorNoFim}
        onKeyDown={e => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }}
        className="flex-1 min-w-0 bg-transparent pl-2 pr-4 py-3 text-right text-sm font-black text-inherit tabular-nums outline-none placeholder:text-gray-600"
      />
    </div>
  );
};

export default InputMoeda;
