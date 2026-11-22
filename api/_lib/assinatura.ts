import { Timestamp } from 'firebase-admin/firestore';
import { Periodo, PlanoId, StatusAssinatura, TOLERANCIA_DIAS } from '../../services/planos.js';

/**
 * Dados privados da assinatura, em `assinaturas/{casaId}`. As regras do
 * Firestore não deixam nenhum cliente escrever aqui, e só o dono e o
 * administrador leem. O CPF/CNPJ completo NÃO é guardado: ele fica no Asaas,
 * que precisa dele para cobrar; aqui só a versão mascarada para exibição.
 */
export interface AssinaturaPrivada {
  casaId: string;
  ownerEmail: string;
  responsavel: string;
  documentoMascarado: string;
  plano: PlanoId;
  periodo: Periodo;
  forma: 'pix' | 'cartao';
  valor: number;
  asaasCustomerId: string;
  asaasSubscriptionId: string;
  status: StatusAssinatura;
  termosAceitosEm: string;
  criadoEm: string;
  atualizadoEm: string;
}

/** Fim do acesso pago por uma cobrança: vencimento + ciclo + tolerância. */
export const acessoAte = (vencimento: string, periodo: Periodo): Date => {
  const [a, m, d] = vencimento.split('-').map(Number);
  const fim = new Date(Date.UTC(a, m - 1, d, 23, 59, 59));
  if (periodo === 'anual') fim.setUTCFullYear(fim.getUTCFullYear() + 1);
  else fim.setUTCMonth(fim.getUTCMonth() + 1);
  fim.setUTCDate(fim.getUTCDate() + TOLERANCIA_DIAS);
  return fim;
};

/**
 * Parte pública gravada na casa. `ate` vai como Timestamp: é o formato que as
 * regras do Firestore conseguem comparar com a hora da requisição.
 */
export const assinaturaPublica = (status: StatusAssinatura, periodo: Periodo, ate?: Date | Timestamp | null) => ({
  status,
  periodo,
  ...(ate ? { ate: ate instanceof Timestamp ? ate : Timestamp.fromDate(ate) } : {}),
});

/** Data de hoje em São Paulo, no formato do Asaas. */
export const hojeSP = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
