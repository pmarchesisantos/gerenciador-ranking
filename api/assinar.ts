import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './_lib/firebaseAdmin.js';
import { asaas, cobrancaPendente } from './_lib/asaas.js';
import { HttpError, casaDoDono, rota, usuarioDoToken } from './_lib/http.js';
import { AssinaturaPrivada, assinaturaPublica, hojeSP } from './_lib/assinatura.js';
import { PLANOS, Periodo, ehPlano, precoDoPeriodo } from '../services/planos.js';
import { documentoValido, ocultarDocumento, soDigitos, telefoneValido } from '../services/documento.js';

const slugify = (texto: string) => texto.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+|-+$/g, '');

/** Slug livre: "kings", depois "kings-2", "kings-3"... */
const slugLivre = async (base: string) => {
  const raiz = base || 'clube';
  for (let i = 1; i < 50; i++) {
    const candidato = i === 1 ? raiz : `${raiz}-${i}`;
    const snap = await adminDb.collection('casas').where('slug', '==', candidato).limit(1).get();
    if (snap.empty) return candidato;
  }
  return `${raiz}-${Date.now().toString(36)}`;
};

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * POST /api/assinar — cadastro de um clube novo com assinatura.
 *
 * Quem chama já criou a conta (Firebase Auth) no navegador e manda o token: a
 * senha nunca passa por este servidor. Aqui nasce a casa, o cliente e a
 * assinatura no Asaas; a resposta traz o link da primeira fatura, onde o
 * cliente paga com Pix ou cartão.
 */
export default rota(['POST'], async (req, res) => {
  const usuario = await usuarioDoToken(req);
  const b = (req.body || {}) as Record<string, unknown>;

  const nomeClube = texto(b.nomeClube, 80);
  const responsavel = texto(b.responsavel, 100);
  const documento = soDigitos(texto(b.cpfCnpj, 20));
  const telefone = soDigitos(texto(b.telefone, 20));
  const plano = b.plano;
  const periodo = b.periodo as Periodo;
  const forma = b.forma;

  if (nomeClube.length < 2) throw new HttpError(400, 'Informe o nome do clube.');
  if (responsavel.length < 3) throw new HttpError(400, 'Informe o nome do responsável.');
  if (!documentoValido(documento)) throw new HttpError(400, 'CPF ou CNPJ inválido.');
  if (!telefoneValido(telefone)) throw new HttpError(400, 'Celular inválido.');
  if (!ehPlano(plano)) throw new HttpError(400, 'Plano inválido.');
  if (periodo !== 'mensal' && periodo !== 'anual') throw new HttpError(400, 'Período inválido.');
  if (forma !== 'pix' && forma !== 'cartao') throw new HttpError(400, 'Forma de pagamento inválida.');
  if (b.aceiteTermos !== true) throw new HttpError(400, 'É preciso aceitar os termos de uso e a política de privacidade.');

  // Já tem clube? Se o cadastro anterior ficou sem pagar, devolve a mesma fatura
  // em vez de abrir outra assinatura.
  const existente = await casaDoDono(usuario.email);
  if (existente) {
    const privada = (await adminDb.collection('assinaturas').doc(existente.id).get()).data() as AssinaturaPrivada | undefined;
    if (privada?.status === 'pendente') {
      const fatura = cobrancaPendente(await asaas.cobrancasDaAssinatura(privada.asaasSubscriptionId));
      res.status(200).json({ casaId: existente.id, slug: existente.data().slug, faturaUrl: fatura?.invoiceUrl || null });
      return;
    }
    throw new HttpError(409, 'Esta conta já tem um clube cadastrado.');
  }

  // Trava contra duplo clique: um cadastro por vez para a mesma conta.
  const trava = adminDb.collection('cadastros_em_andamento').doc(usuario.uid);
  try {
    await trava.create({ em: FieldValue.serverTimestamp() });
  } catch {
    throw new HttpError(409, 'Já existe um cadastro em andamento para esta conta. Aguarde alguns segundos.');
  }

  let assinaturaId: string | null = null;
  try {
    const slug = await slugLivre(slugify(nomeClube));
    const casaRef = adminDb.collection('casas').doc(`${slug}-${Math.random().toString(36).slice(2, 6)}`);
    const valor = precoDoPeriodo(plano, periodo);

    const cliente = await asaas.criarCliente({
      name: responsavel, cpfCnpj: documento, email: usuario.email, mobilePhone: telefone, externalReference: casaRef.id,
    });
    const assinatura = await asaas.criarAssinatura({
      customer: cliente.id,
      billingType: forma === 'pix' ? 'PIX' : 'CREDIT_CARD',
      value: valor,
      nextDueDate: hojeSP(),
      cycle: periodo === 'anual' ? 'YEARLY' : 'MONTHLY',
      description: `Rank Manager · Plano ${PLANOS[plano].nome} (${periodo})`,
      externalReference: casaRef.id,
    });
    assinaturaId = assinatura.id;

    const agora = new Date().toISOString();
    const privada: AssinaturaPrivada = {
      casaId: casaRef.id,
      ownerEmail: usuario.email,
      responsavel,
      documentoMascarado: ocultarDocumento(documento),
      plano, periodo, forma, valor,
      asaasCustomerId: cliente.id,
      asaasSubscriptionId: assinatura.id,
      status: 'pendente',
      termosAceitosEm: agora,
      criadoEm: agora,
      atualizadoEm: agora,
    };

    const lote = adminDb.batch();
    lote.create(casaRef, {
      name: nomeClube,
      slug,
      ownerEmail: usuario.email,
      createdAt: agora,
      plano,
      assinatura: assinaturaPublica('pendente', periodo),
    });
    lote.create(adminDb.collection('assinaturas').doc(casaRef.id), privada);
    await lote.commit();
    // Gravado: daqui em diante a assinatura é válida e não pode ser desfeita.
    assinaturaId = null;

    // A fatura pode demorar a aparecer; sem ela, a tela de pagamento busca depois.
    const fatura = await asaas.cobrancasDaAssinatura(assinatura.id).then(cobrancaPendente).catch(() => null);
    res.status(201).json({ casaId: casaRef.id, slug, faturaUrl: fatura?.invoiceUrl || null });
  } catch (e) {
    // Assinatura criada no Asaas mas o clube não gravou: cancela para não cobrar
    // alguém que não tem clube.
    if (assinaturaId) await asaas.cancelarAssinatura(assinaturaId).catch(() => undefined);
    throw e;
  } finally {
    await trava.delete().catch(() => undefined);
  }
});
