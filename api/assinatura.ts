import { adminDb } from './_lib/firebaseAdmin.js';
import { asaas, cobrancaPendente } from './_lib/asaas.js';
import { HttpError, casaDoDono, rota, usuarioDoToken } from './_lib/http.js';
import { AssinaturaPrivada, assinaturaPublica, hojeSP } from './_lib/assinatura.js';
import { aplicarTroca, referenciaTroca } from './_lib/troca.js';
import { PLANOS, diferencaImplantacao, ehPlano } from '../services/planos.js';

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
      trocaPendente: privada.trocaPendente
        ? { plano: privada.trocaPendente.plano, valor: privada.trocaPendente.valor, url: privada.trocaPendente.faturaUrl }
        : null,
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
    // A primeira fatura carrega a implantação; trocar antes de pagá-la a
    // recalcularia (updatePendingPayments) e a implantação sumiria.
    if (privada.status === 'pendente') {
      throw new HttpError(400, 'Conclua o primeiro pagamento antes de trocar de plano.');
    }

    // Já existe uma troca esperando pagamento: mesma escolha devolve a mesma
    // fatura; escolha diferente descarta a anterior.
    if (privada.trocaPendente) {
      if (privada.trocaPendente.plano === plano) {
        res.status(200).json({ ok: true, pendente: true, faturaUrl: privada.trocaPendente.faturaUrl, valor: privada.trocaPendente.valor });
        return;
      }
      await asaas.removerCobranca(privada.trocaPendente.cobrancaId).catch(() => undefined);
    }

    // Upgrade: cobra a diferença de implantação e só troca quando ela for paga
    // (o webhook aplica a troca). Downgrade ou mesma taxa: troca na hora.
    const diferenca = diferencaImplantacao(privada.plano, plano);
    if (diferenca > 0) {
      const cobranca = await asaas.criarCobranca({
        customer: privada.asaasCustomerId,
        billingType: privada.forma === 'pix' ? 'PIX' : 'CREDIT_CARD',
        value: diferenca,
        dueDate: hojeSP(),
        description: `Stack Club · Implantação do plano ${PLANOS[plano].nome} (diferença)`,
        externalReference: referenciaTroca(casa.id, plano),
      });
      await ref.update({
        trocaPendente: { plano, cobrancaId: cobranca.id, faturaUrl: cobranca.invoiceUrl, valor: diferenca },
        atualizadoEm: agora,
      });
      res.status(200).json({ ok: true, pendente: true, faturaUrl: cobranca.invoiceUrl, valor: diferenca });
      return;
    }

    const valor = await aplicarTroca(casa.id, privada, plano);
    res.status(200).json({ ok: true, plano, valor });
    return;
  }

  throw new HttpError(400, 'Ação desconhecida.');
});
