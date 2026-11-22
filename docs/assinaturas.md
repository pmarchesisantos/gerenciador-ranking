# Assinaturas e planos

## Planos

Definidos em `services/planos.ts` (preços, recursos, desconto anual). As regras do
Firestore repetem o mapa de recursos (`temClock`, `temBar`): mudou um, mude o outro.

| Plano        | Mensal    | Anual (−15%) | Recursos                                  |
|--------------|-----------|--------------|-------------------------------------------|
| Standard     | 49,99     | 509,90       | ranking, lançamento, jogadores, histórico |
| Gold         | 79,90     | 814,98       | + poker clock, financeiro (só poker)      |
| Black        | 249,90    | 2.548,98     | + bar (PDV, caixa, estoque), financeiro com bar |

### Implantação

Taxa única pela configuração assistida (cadastro de rankings, clock, cardápio do bar).
**Isenta no plano anual.** No mensal: Standard R$ 149,90 · Gold R$ 199,90 · Black R$ 499,90.

- No cadastro, a primeira cobrança da assinatura sai com implantação + 1º mês (uma
  fatura só; o cartão fica salvo na assinatura). As seguintes voltam ao valor normal.
- Upgrade no mensal cobra a diferença de implantação (cobrança avulsa
  `troca:{casaId}:{plano}`); o plano só muda quando o webhook confirma o pagamento.
- Troca de plano fica bloqueada até a primeira fatura ser paga.

Casas criadas pelo administrador (sem `assinatura`) são **cortesia**: acesso completo,
ou o plano definido no painel Master.

## Fluxo

1. Visitante clica em **Criar meu clube**, escolhe plano/período e preenche os dados.
2. O navegador cria a conta (Firebase Auth) — a senha não passa pelo nosso servidor.
3. `POST /api/assinar` cria a casa (`plano`, `assinatura.status = pendente`), o cliente
   e a assinatura no Asaas, e devolve o link da primeira fatura.
4. O cliente paga na página do Asaas (Pix ou cartão). O cartão fica salvo no Asaas e
   as próximas cobranças são automáticas; no Pix, o Asaas envia um Pix a cada ciclo.
5. O Asaas chama `POST /api/asaas-webhook`; o servidor grava `assinatura.ate`
   (vencimento + ciclo + 3 dias de tolerância) e o painel libera sozinho.
6. Sem pagamento, ao passar de `ate` o painel vira a tela de pagamento. As regras do
   Firestore também bloqueiam gravações (rankings, jogadores, bar).

## Onde ficam os dados

| Dado                         | Onde                                  | Quem lê               |
|------------------------------|---------------------------------------|-----------------------|
| Cartão                       | Só no Asaas                           | ninguém do app        |
| CPF/CNPJ completo            | Só no Asaas                           | ninguém do app        |
| CPF/CNPJ mascarado, titular, ids do Asaas | `assinaturas/{casaId}`   | dono e administrador  |
| Plano, status, acesso até    | `casas/{id}` (público)                | todos (não é sensível)|
| Chaves do Asaas e do Firebase Admin | Variáveis de ambiente na Vercel | só o servidor         |

## Configuração

1. **Asaas**: criar conta (comece pelo sandbox), gerar a chave de API.
2. **Firebase**: Configurações do projeto → Contas de serviço → Gerar nova chave privada.
3. **Vercel** → Project Settings → Environment Variables (ver `.env.example`):
   `ASAAS_API_KEY`, `ASAAS_AMBIENTE`, `ASAAS_WEBHOOK_TOKEN`, `FIREBASE_SERVICE_ACCOUNT`.
4. **Webhook no Asaas** (Integrações → Webhooks): URL `https://SEU_DOMINIO/api/asaas-webhook`,
   token = `ASAAS_WEBHOOK_TOKEN`, eventos de cobrança (`PAYMENT_*`) e de assinatura.
5. Publicar `firestore.rules`.
6. Preencher `EMAIL_SUPORTE` em `services/legal.ts`.

Em desenvolvimento, as rotas `/api` só rodam com `vercel dev` (o `npm run dev` serve
apenas o front).

## Limitações conhecidas

- Pix é cobrado a cada ciclo (o cliente paga um Pix por mês). Pix Automático (débito
  sem confirmação) é o próximo passo — o Asaas suporta.
- Troca de plano no anual fica com o suporte (exige acerto de diferença).
- No mensal, a troca vale na hora e o novo valor entra na próxima fatura (sem pró-rata).
