import { adminDb } from './_lib/firebaseAdmin.js';
import { asaas, cobrancaPendente } from './_lib/asaas.js';
import { HttpError, casaDoDono, rota, usuarioDoToken } from './_lib/http.js';
import { AssinaturaPrivada, assinaturaPublica } from './_lib/assinatura.js';
import { PLANOS, ehPlano, precoDoPeriodo } from '../services/planos.js';

/**
 * GET  /api/assinatura            situação e fatura pendente do clube do dono
 * POST /api/assinatura {acao}     'trocar' (com plano) ou 'cancelar'
 */
export default rota(['GET', 'POST'], async (req, res) => {
  const usuario = await usuarioDoToken(req);
  const casa = await casaDoDono(usuario.email);
  if (!casa) throw new HttpError(404, 'Nenhum clube encontrado para esta conta.');

  const ref = adminDb.collection('assinaturas').doc(casa.id);
  const privada = (await ref.get()).data() as AssinaturaPrivada | undefined;
  if (!privada) throw new HttpError(404, 'Este clube não tem assinatura (acesso de cortesia).');

  if (req.method === 'GET') {
    const fatura = cobrancaPendente(await asaas.cobrancasDaAssinatura(privada.asaasSubscriptionId));
    res.status(200).json({
      plano: privada.plano,
      periodo: privada.periodo,
      forma: privada.forma,
      valor: privada.valor,
      status: privada.status,
      responsavel: privada.responsavel,
      documento: privada.documentoMascarado,
      fatura: fatura ? { url: fatura.invoiceUrl, valor: fatura.value, vencimento: fatura.dueDate, atrasada: fatura.status === 'OVERDUE' } : null,
    });
    return;
  }

  const acao = (req.body || {}).acao;
  const agora = new Date().toISOString();

  if (acao === 'cancelar') {
    if (privada.status === 'cancelada') throw new HttpError(400, 'A assinatura já está cancelada.');
    await asaas.cancelarAssinatura(privada.asaasSubscriptionId);
    // O acesso segue até o fim do período pago (o campo `ate` não muda).
    const atual = casa.data().assinatura || {};
    const lote = adminDb.batch();
    lote.update(ref, { status: 'cancelada', atualizadoEm: agora });
    lote.update(casa.ref, { assinatura: assinaturaPublica('cancelada', privada.periodo, atual.ate) });
    await lote.commit();
    res.status(200).json({ ok: true });
    return;
  }

  if (acao === 'trocar') {
    const plano = (req.body || {}).plano;
    if (!ehPlano(plano)) throw new HttpError(400, 'Plano inválido.');
    if (plano === privada.plano) throw new HttpError(400, 'Este já é o seu plano.');
    if (privada.status === 'cancelada') throw new HttpError(400, 'Assinatura cancelada: faça um novo cadastro.');
    // No anual o período já foi pago adiantado com o valor do plano antigo; a
    // troca no meio do ano exige acerto de diferença, feito pelo suporte.
    if (privada.periodo === 'anual') {
      throw new HttpError(400, 'Planos anuais trocam na renovação. Para trocar antes, fale com o suporte.');
    }
    const valor = precoDoPeriodo(plano, privada.periodo);
    await asaas.atualizarAssinatura(privada.asaasSubscriptionId, {
      value: valor,
      description: `Rank Manager · Plano ${PLANOS[plano].nome} (${privada.periodo})`,
      updatePendingPayments: true,
    });
    const lote = adminDb.batch();
    lote.update(ref, { plano, valor, atualizadoEm: agora });
    lote.update(casa.ref, { plano });
    await lote.commit();
    res.status(200).json({ ok: true, plano, valor });
    return;
  }

  throw new HttpError(400, 'Ação desconhecida.');
});
