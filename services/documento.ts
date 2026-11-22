/**
 * CPF/CNPJ e telefone: validação e máscara. Usado no formulário de cadastro e
 * de novo no servidor — o navegador nunca é a única barreira.
 */

export const soDigitos = (s: string) => (s || '').replace(/\D/g, '');

const cpfValido = (d: string) => {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (base: string, pesoInicial: number) => {
    const soma = [...base].reduce((a, n, i) => a + Number(n) * (pesoInicial - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(d.slice(0, 9), 10) === Number(d[9]) && dv(d.slice(0, 10), 11) === Number(d[10]);
};

const cnpjValido = (d: string) => {
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = [...base].reduce((a, n, i) => a + Number(n) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return dv(d.slice(0, 12)) === Number(d[12]) && dv(d.slice(0, 13)) === Number(d[13]);
};

export const documentoValido = (s: string) => {
  const d = soDigitos(s);
  return d.length === 11 ? cpfValido(d) : cnpjValido(d);
};

/** Máscara enquanto digita: CPF até 11 dígitos, CNPJ a partir do 12º. */
export const mascararDocumento = (s: string) => {
  const d = soDigitos(s).slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};

/** Para exibir depois de gravado: só os dígitos do meio, nunca o documento inteiro. */
export const ocultarDocumento = (s: string) => {
  const d = soDigitos(s);
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : `**.${d.slice(2, 5)}.${d.slice(5, 8)}/****-**`;
};

export const telefoneValido = (s: string) => {
  const d = soDigitos(s);
  return d.length === 10 || d.length === 11;
};

export const mascararTelefone = (s: string) => {
  const d = soDigitos(s).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
