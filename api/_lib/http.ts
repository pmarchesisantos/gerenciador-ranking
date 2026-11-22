import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adminAuth, adminDb } from './firebaseAdmin.js';
import { AsaasError } from './asaas.js';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Quem está chamando, pelo token de login do Firebase (Authorization: Bearer ...). */
export const usuarioDoToken = async (req: VercelRequest) => {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : '';
  if (!token) throw new HttpError(401, 'Faça login para continuar.');
  try {
    const decodificado = await adminAuth.verifyIdToken(token);
    if (!decodificado.email) throw new HttpError(401, 'Conta sem e-mail.');
    return { uid: decodificado.uid, email: decodificado.email.toLowerCase().trim() };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(401, 'Sessão expirada. Entre novamente.');
  }
};

/** A casa do dono logado (o vínculo é o e-mail, como nas regras do Firestore). */
export const casaDoDono = async (email: string) => {
  const snap = await adminDb.collection('casas').where('ownerEmail', '==', email).limit(1).get();
  return snap.empty ? null : snap.docs[0];
};

/**
 * Envolve o handler: método permitido, erros em JSON e nada de detalhe
 * interno vazando para o cliente.
 */
export const rota = (
  metodos: string[],
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>,
) => async (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!metodos.includes(req.method || '')) {
    res.setHeader('Allow', metodos.join(', '));
    res.status(405).json({ erro: 'Método não permitido.' });
    return;
  }
  try {
    await handler(req, res);
  } catch (e) {
    if (e instanceof HttpError) {
      res.status(e.status).json({ erro: e.message });
    } else if (e instanceof AsaasError) {
      // A mensagem do Asaas é de validação (CPF inválido, etc.) e ajuda o usuário.
      console.error('Asaas:', e.status, JSON.stringify(e.detalhes));
      res.status(e.status >= 500 ? 502 : 400).json({ erro: e.message });
    } else {
      console.error(e);
      res.status(500).json({ erro: 'Erro interno. Tente novamente em instantes.' });
    }
  }
};
