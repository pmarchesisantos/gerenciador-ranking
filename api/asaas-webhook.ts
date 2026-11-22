import { timingSafeEqual } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from './_lib/firebaseAdmin.js';
import { rota, HttpError } from './_lib/http.js';
import { AssinaturaPrivada, acessoAte, assinaturaPublica } from './_lib/assinatura.js';
import { StatusAssinatura } from '../services/planos.js';

interface EventoAsaas {
  id: string;
  event: string;
  payment?: { id: string; subscription?: string; dueDate: string; status: string };
  subscription?: { id: string };
}

/** Compara o token sem vazar, pelo tempo de resposta, quantos caracteres bateram. */
const tokenConfere = (recebido: string) => {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN || '';
  if (!esperado || recebido.length !== esperado.length) return false;
  return timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado));
};

/**
 * POST /api/asaas-webhook — o Asaas avisa cada mudança de cobrança.
 *
 * - Pagamento confirmado/recebido: libera o acesso até o fim do período pago.
 * - Vencido: marca "atrasada"; o acesso segue até a data já paga + tolerância.
 * - Estornado/chargeback: corta o acesso na hora.
 * - Assinatura removida: "cancelada"; o acesso segue até o fim do período pago.
 *
 * Cada evento é processado uma vez só (o Asaas reenvia em caso de falha).
 */
export default rota(['POST'], async (req, res) => {
  const token = String(req.headers['asaas-access-token'] || '');
  if (!tokenConfere(token)) throw new HttpError(401, 'Token inválido.');

  const evento = (req.body || {}) as EventoAsaas;
  if (!evento.id || !evento.event) throw new HttpError(400, 'Evento inválido.');

  const subscriptionId = evento.payment?.subscription || evento.subscription?.id;
  // Cobranças avulsas (fora de assinatura) não são deste app.
  if (!subscriptionId) { res.status(200).json({ ignorado: true }); return; }

  const snap = await adminDb.collection('assinaturas').where('asaasSubscriptionId', '==', subscriptionId).limit(1).get();
  if (snap.empty) { res.status(200).json({ ignorado: true }); return; }
  const privadaRef = snap.docs[0].ref;
  const casaRef = adminDb.collection('casas').doc(snap.docs[0].id);

  await adminDb.runTransaction(async tx => {
    // Idempotência: o mesmo evento entregue duas vezes não estende o acesso duas vezes.
    const marcaRef = privadaRef.collection('eventos').doc(evento.id);
    if ((await tx.get(marcaRef)).exists) return;

    const privada = (await tx.get(privadaRef)).data() as AssinaturaPrivada;
    const casa = (await tx.get(casaRef)).data();
    if (!privada || !casa) return;
    const ateAtual: Timestamp | undefined = casa.assinatura?.ate;

    let status: StatusAssinatura = privada.status;
    let ate: Date | Timestamp | undefined = ateAtual;

    switch (evento.event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        const novoFim = acessoAte(evento.payment!.dueDate, privada.periodo);
        // Nunca encurta: um pagamento atrasado de um mês antigo não reduz o acesso já pago.
        ate = ateAtual && ateAtual.toDate() > novoFim ? ateAtual : novoFim;
        status = privada.status === 'cancelada' ? 'cancelada' : 'ativa';
        break;
      }
      case 'PAYMENT_OVERDUE':
        if (status !== 'cancelada') status = 'atrasada';
        break;
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
        ate = new Date();
        if (status !== 'cancelada') status = 'atrasada';
        break;
      case 'SUBSCRIPTION_DELETED':
      case 'SUBSCRIPTION_INACTIVATED':
        status = 'cancelada';
        break;
      default:
        tx.create(marcaRef, { evento: evento.event, em: new Date().toISOString(), ignorado: true });
        return;
    }

    const agora = new Date().toISOString();
    tx.update(privadaRef, { status, atualizadoEm: agora });
    tx.update(casaRef, { assinatura: assinaturaPublica(status, privada.periodo, ate) });
    tx.create(marcaRef, { evento: evento.event, cobranca: evento.payment?.id || null, em: agora });
  });

  res.status(200).json({ ok: true });
});
