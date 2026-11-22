import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Acesso de administrador ao Firebase, só no servidor. A credencial vem da
 * variável de ambiente FIREBASE_SERVICE_ACCOUNT (o JSON da conta de serviço)
 * e nunca vai para o navegador.
 *
 * O SDK de admin ignora as regras do Firestore: é por ele que o plano e a
 * assinatura são gravados, já que as regras proíbem o dono de mexer nesses campos.
 */
const app = getApps()[0] || initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')),
});

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
