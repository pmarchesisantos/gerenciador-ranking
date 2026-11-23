import { adminDb } from './_lib/firebaseAdmin.js';
import { asaas, cobrancaPendente, primeiraCobrancaDaAssinatura } from './_lib/asaas.js';
import { HttpError, casaDoDono, rota, usuarioDoToken } from './_lib/http.js';
import { AssinaturaPrivada, assinaturaPublica, hojeSP } from './_lib/assinatura.js';
import { aplicarTroca, referenciaTroca } from './_lib/troca.js';
import {
  PLANOS, Periodo, diferencaImplantacao, ehPlano, precoDoPeriodo, primeiraCobranca, taxaImplantacao,
} from '../services/planos.js';

/** Situações do Asaas em que o dinheiro já entrou (ou o cartão já aprovou). */
const PAGO = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];

/**
 * GET  /api/assinatura            situação e fatura pendente do clube do dono
 * POST /api/assinatura {acao}     'trocar' (com plano) ou 'cancelar';
 *                                 antes do 1º pagamento: 'refazer' (plano,
 *                                 período e forma) ou 'desistir'
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

  // ── Cadastro ainda sem o primeiro pagamento: dá para refazer a escolha ou desistir ──
  if (acao === 'refazer' || acao === 'desistir') {
    if (privada.status !== 'pendente') {
      throw new HttpError(400, 'O primeiro pagamento já foi feito. Use as opções de Minha assinatura.');
    }
    // O webhook pode estar a caminho: com pagamento recebido, não mexe em nada.
    const cobrancas = await asaas.cobrancasDaAssinatura(privada.asaasSubscriptionId);
    if (cobrancas.some(c => PAGO.includes(c.status))) {
      throw new HttpError(409, 'O pagamento já foi recebido e o painel será liberado em instantes. Clique em Atualizar.');
    }

    if (acao === 'desistir') {
      // Só desiste um clube que nunca foi liberado e não tem nada gravado.
      const sub = await casa.ref.listCollections();
      for (const c of sub) {
        if (!(await c.limit(1).get()).empty) throw new HttpError(409, 'Este clube já tem dados gravados. Fale com o suporte.');
      }
      await asaas.cancelarAssinatura(privada.asaasSubscriptionId);
      // A assinatura privada fica como registro do cadastro desistido; o clube
      // (vazio) sai, e a conta volta para a tela de cadastro.
      const lote = adminDb.batch();
      lote.update(ref, { status: 'cancelada', desistiuEm: agora, atualizadoEm: agora });
      lote.delete(casa.ref);
      await lote.commit();
      res.status(200).json({ ok: true });
      return;
    }

    const b = req.body || {};
    const plano = b.plano;
    const periodo = b.periodo as Periodo;
    const forma = b.forma;
    if (!ehPlano(plano)) throw new HttpError(400, 'Plano inválido.');
    if (periodo !== 'mensal' && periodo !== 'anual') throw new HttpError(400, 'Período inválido.');
    if (forma !== 'pix' && forma !== 'cartao') throw new HttpError(400, 'Forma de pagamento inválida.');
    if (plano === privada.plano && periodo === privada.periodo && forma === privada.forma) {
      throw new HttpError(400, 'Nada mudou: é a mesma escolha da fatura atual.');
    }

    // Nova assinatura primeiro; a antiga só sai depois que a nova estiver gravada.
    const valor = precoDoPeriodo(plano, periodo);
    const nova = await asaas.criarAssinatura({
      customer: privada.asaasCustomerId,
      billingType: forma === 'pix' ? 'PIX' : 'CREDIT_CARD',
      value: valor,
      nextDueDate: hojeSP(),
      cycle: periodo === 'anual' ? 'YEARLY' : 'MONTHLY',
      description: `Stack Club · Plano ${PLANOS[plano].nome} (${periodo})`,
      externalReference: casa.id,
    });
    let faturaUrl: string | null = null;
    const implantacao = taxaImplantacao(plano, periodo);
    try {
      if (implantacao > 0) {
        const primeira = await primeiraCobrancaDaAssinatura(nova.id);
        if (!primeira) throw new HttpError(502, 'O Asaas não gerou a cobrança. Tente novamente em instantes.');
        const ajustada = await asaas.atualizarCobranca(primeira.id, {
          value: primeiraCobranca(plano, periodo),
          description: `Stack Club · Plano ${PLANOS[plano].nome} (1º mês) + implantação`,
        });
        faturaUrl = ajustada.invoiceUrl || primeira.invoiceUrl;
      }
      const lote = adminDb.batch();
      lote.update(ref, { plano, periodo, forma, valor, implantacao, asaasSubscriptionId: nova.id, atualizadoEm: agora });
      lote.update(casa.ref, { plano, assinatura: assinaturaPublica('pendente', periodo) });
      await lote.commit();
    } catch (e) {
      await asaas.cancelarAssinatura(nova.id).catch(() => undefined);
      throw e;
    }
    // A antiga e a fatura dela deixam de existir no Asaas.
    await asaas.cancelarAssinatura(privada.asaasSubscriptionId).catch(e => console.error('Assinatura antiga não removida:', e));

    if (!faturaUrl) {
      const fatura = await asaas.cobrancasDaAssinatura(nova.id).then(cobrancaPendente).catch(() => null);
      faturaUrl = fatura?.invoiceUrl || null;
    }
    res.status(200).json({ ok: true, faturaUrl });
    return;
  }

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
