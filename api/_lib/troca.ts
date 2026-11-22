import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin.js';
import { asaas } from './asaas.js';
import { AssinaturaPrivada } from './assinatura.js';
import { PLANOS, PlanoId, precoDoPeriodo } from '../../services/planos.js';

/** Referência das cobranças de diferença de implantação: "troca:{casaId}:{plano}". */
export const referenciaTroca = (casaId: string, plano: PlanoId) => `troca:${casaId}:${plano}`;

export const lerReferenciaTroca = (ref?: string | null): { casaId: string; plano: PlanoId } | null => {
  const m = /^troca:([^:]+):(essencial|profissional|completo)$/.exec(ref || '');
  return m ? { casaId: m[1], plano: m[2] as PlanoId } : null;
};

/**
 * Efetiva a troca de plano: novo valor nas próximas cobranças da assinatura e
 * novo plano no clube (recursos mudam na hora). Idempotente: aplicar duas
 * vezes o mesmo plano não muda nada.
 */
export const aplicarTroca = async (casaId: string, privada: AssinaturaPrivada, plano: PlanoId) => {
  const valor = precoDoPeriodo(plano, privada.periodo);
  await asaas.atualizarAssinatura(privada.asaasSubscriptionId, {
    value: valor,
    description: `Stack Club · Plano ${PLANOS[plano].nome} (${privada.periodo})`,
    updatePendingPayments: true,
  });
  const lote = adminDb.batch();
  lote.update(adminDb.collection('assinaturas').doc(casaId), {
    plano, valor, trocaPendente: FieldValue.delete(), atualizadoEm: new Date().toISOString(),
  });
  lote.update(adminDb.collection('casas').doc(casaId), { plano });
  await lote.commit();
  return valor;
};
