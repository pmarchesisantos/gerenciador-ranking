import { auth } from './firebase';
import { Periodo, PlanoId, StatusAssinatura } from './planos';

/** Chamada às rotas /api com o token de login do Firebase. */
const chamar = async <T>(caminho: string, metodo: 'GET' | 'POST', corpo?: unknown): Promise<T> => {
  const usuario = auth.currentUser;
  if (!usuario) throw new Error('Faça login para continuar.');
  const token = await usuario.getIdToken();
  let resp: Response;
  try {
    resp = await fetch(caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique a internet e tente de novo.');
  }
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || 'Não foi possível concluir. Tente novamente.');
  return dados as T;
};

export interface DadosCadastro {
  nomeClube: string;
  responsavel: string;
  cpfCnpj: string;
  telefone: string;
  plano: PlanoId;
  periodo: Periodo;
  forma: 'pix' | 'cartao';
  aceiteTermos: boolean;
}

export interface SituacaoAssinatura {
  plano: PlanoId;
  periodo: Periodo;
  forma: 'pix' | 'cartao';
  valor: number;
  status: StatusAssinatura;
  responsavel: string;
  documento: string;
  /** Upgrade aguardando o pagamento da diferença de implantação. */
  trocaPendente: { plano: PlanoId; valor: number; url: string } | null;
  fatura: { url: string; valor: number; vencimento: string; atrasada: boolean } | null;
}

export const apiAssinatura = {
  assinar: (dados: DadosCadastro) =>
    chamar<{ casaId: string; slug: string; faturaUrl: string | null }>('/api/assinar', 'POST', dados),
  situacao: () => chamar<SituacaoAssinatura>('/api/assinatura', 'GET'),
  trocarPlano: (plano: PlanoId) =>
    chamar<{ ok: true; pendente?: boolean; faturaUrl?: string; valor?: number }>('/api/assinatura', 'POST', { acao: 'trocar', plano }),
  cancelar: () => chamar<{ ok: true }>('/api/assinatura', 'POST', { acao: 'cancelar' }),
};
