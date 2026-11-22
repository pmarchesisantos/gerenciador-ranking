/**
 * Cliente mínimo da API v3 do Asaas.
 *
 * Os dados do cartão NUNCA passam por aqui: o cliente paga na fatura do
 * próprio Asaas (invoiceUrl), que guarda o cartão e cobra as próximas
 * mensalidades sozinho. Isso deixa o app fora do escopo do PCI-DSS.
 */

const BASE = process.env.ASAAS_AMBIENTE === 'producao'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

export class AsaasError extends Error {
  constructor(message: string, public status: number, public detalhes?: unknown) { super(message); }
}

const chamar = async <T>(metodo: 'GET' | 'POST' | 'PUT' | 'DELETE', caminho: string, corpo?: unknown): Promise<T> => {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) throw new AsaasError('ASAAS_API_KEY não configurada no servidor.', 500);
  const resp = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      access_token: chave,
      // O Asaas exige um User-Agent identificando a aplicação.
      'User-Agent': 'rank-manager',
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resp.text();
  const dados = texto ? JSON.parse(texto) : {};
  if (!resp.ok) {
    const msg = dados?.errors?.[0]?.description || `Asaas respondeu ${resp.status}`;
    throw new AsaasError(msg, resp.status, dados);
  }
  return dados as T;
};

export type CicloAsaas = 'MONTHLY' | 'YEARLY';
export type FormaAsaas = 'PIX' | 'CREDIT_CARD';

export interface ClienteAsaas { id: string }
export interface AssinaturaAsaas { id: string; status: string; value: number; cycle: CicloAsaas; nextDueDate: string }
export interface CobrancaAsaas {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  invoiceUrl: string;
  subscription?: string;
  billingType: string;
}

export const asaas = {
  criarCliente: (dados: { name: string; cpfCnpj: string; email: string; mobilePhone?: string; externalReference: string }) =>
    chamar<ClienteAsaas>('POST', '/customers', dados),

  criarAssinatura: (dados: {
    customer: string; billingType: FormaAsaas; value: number; nextDueDate: string;
    cycle: CicloAsaas; description: string; externalReference: string;
  }) => chamar<AssinaturaAsaas>('POST', '/subscriptions', dados),

  atualizarAssinatura: (id: string, dados: { value?: number; description?: string; updatePendingPayments?: boolean }) =>
    chamar<AssinaturaAsaas>('PUT', `/subscriptions/${id}`, dados),

  cancelarAssinatura: (id: string) => chamar<{ deleted: boolean }>('DELETE', `/subscriptions/${id}`),

  cobrancasDaAssinatura: (id: string) =>
    chamar<{ data: CobrancaAsaas[] }>('GET', `/subscriptions/${id}/payments`).then(r => r.data || []),
};

/** Cobrança em aberto mais antiga (a que o cliente precisa pagar agora). */
export const cobrancaPendente = (cobrancas: CobrancaAsaas[]): CobrancaAsaas | null =>
  cobrancas
    .filter(c => c.status === 'PENDING' || c.status === 'OVERDUE')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null;
