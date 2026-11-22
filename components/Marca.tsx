import React from 'react';

/**
 * Identidade Stack Club: o símbolo (ficha com o monograma) e o nome.
 * O símbolo vem de /public/marca.svg — trocar esse arquivo troca o logo no app
 * inteiro, no ícone do navegador e na tela de login.
 */
export const Simbolo: React.FC<{ tamanho?: number; className?: string }> = ({ tamanho = 32, className = '' }) => (
  <img src="/marca.svg" width={tamanho} height={tamanho} alt="" aria-hidden="true" className={`shrink-0 ${className}`} />
);

/** Símbolo + "STACK CLUB" espaçado, como no logo horizontal. */
const Marca: React.FC<{ tamanho?: 'sm' | 'md' | 'lg'; className?: string }> = ({ tamanho = 'md', className = '' }) => {
  const t = { sm: { s: 26, txt: 'text-[13px]' }, md: { s: 32, txt: 'text-[15px]' }, lg: { s: 52, txt: 'text-2xl' } }[tamanho];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Simbolo tamanho={t.s} />
      <span className={`${t.txt} font-medium text-ouro-500 tracking-[0.16em] whitespace-nowrap`}>STACK CLUB</span>
    </span>
  );
};

export default Marca;
