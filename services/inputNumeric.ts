import React from 'react';

/**
 * Props padrão dos campos numéricos.
 *
 * O `onFocus` sozinho não basta: ao clicar, o navegador dispara o foco (que
 * seleciona o conteúdo) e logo depois posiciona o cursor, desfazendo a seleção.
 * O resultado é que digitar num campo zerado gerava "0100" em vez de "100".
 *
 * Por isso o primeiro clique é interceptado no `onMouseDown` — ele foca o campo
 * sem deixar o cursor ser posicionado, mantendo tudo selecionado para que o que
 * for digitado substitua o valor. Cliques seguintes, com o campo já focado,
 * seguem o comportamento normal: posicionar o cursor e selecionar com arrasto.
 *
 * Ainda sobra o caso do campo já focado, em que o `onFocus` não dispara e o
 * cursor fica depois do zero. O `onInput` cobre isso removendo zeros à esquerda,
 * o que também protege contra colagem. Não afeta decimais: em "0.5" o zero é
 * seguido de ponto, não de dígito.
 */
export const inputNumericProps = {
  onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
  onMouseDown: (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    if (document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
  },
  onInput: (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const normalized = input.value.replace(/^(-?)0+(?=\d)/, '$1');
    if (normalized !== input.value) input.value = normalized;
  },
  onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
  inputMode: 'numeric' as const,
};
