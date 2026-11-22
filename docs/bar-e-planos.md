# Gerenciamento de Bar + Planos de Uso

Plano de implementação. Branch: `feat/gerenciamento-bar`.

## 1. Planos

### Recomendação: plano nomeado + mapa de recursos

Guardar na casa apenas o nome do plano e derivar os recursos de um mapa no código.
Evita reescrever regra de acesso quando surgir um plano promocional ou um combo
diferente do previsto.

```ts
// casas/{id}.plano
type Plano = 'ranking' | 'clube' | 'completo';

const RECURSOS: Record<Plano, Recurso[]> = {
  ranking:  ['ranking'],
  clube:    ['ranking', 'pokerClock'],
  completo: ['ranking', 'pokerClock', 'bar', 'financeiro'],
};
```

Checagem no app por recurso (`temRecurso('bar')`), nunca por nome de plano. Assim
um ajuste comercial mexe só no mapa.

### Pontos de atenção

- **Poker clock já está no ar para todos.** Colocá-lo atrás de um plano tira um
  recurso de quem já usa. Precisa decidir o plano inicial dos 5 clubes existentes.
- **Gating no cliente não é segurança.** Esconder o menu impede o uso casual, mas
  alguém com o token pode escrever direto no Firestore. Se o plano tem valor
  comercial, a regra do Firestore também precisa validar.
- O campo `plano` fica num documento de leitura pública. Não é dado sensível,
  então tudo bem — mas quem edita tem que ser só o super admin.

## 2. Modelo de dados do bar

Subcoleções de `casas/{casaId}`, **com regra de leitura restrita ao dono** — ao
contrário de `rankings`, que é público.

### `bar_produtos/{produtoId}`

```ts
{
  nome: string;
  categoria?: string;        // bebida, comida, outros
  preco: number;
  ativo: boolean;            // mesmo padrão do active de ranking/jogador
  criadoEm: string;
}
```

### `bar_comandas/{comandaId}`

Uma comanda por pessoa, por noite. Itens embutidos no documento, seguindo o
padrão já usado em `history.results`.

```ts
{
  clienteNome: string;       // digitado livre
  playerId?: string;         // preenchido quando é jogador do ranking
  data: string;              // ISO, a noite da comanda
  rankingId?: string;        // etapa/noite associada, quando houver
  status: 'aberta' | 'paga';
  itens: {
    produtoId: string;
    nome: string;            // congelado no momento do pedido
    precoUnitario: number;   // congelado: mudar o preço não reescreve o passado
    quantidade: number;
    lancadoEm: string;
  }[];
  total: number;             // derivado, gravado para o dashboard não recalcular tudo
  valorPago: number;         // soma de pagamentos
  pagamentos: { valor: number; forma?: string; em: string }[];  // cada recebimento com data
  pagoEm?: string;
  formaPagamento?: string;
}
```

**Por que cada pagamento tem data:** o recebido do mês precisa saber *quando* o
dinheiro entrou, inclusive em pagamentos parciais de comandas que atravessam
dias. Um único `valorPago` perderia isso — o mesmo problema do rake, que hoje não
é gravado.

**Comanda atravessando dias:** quem já tem comanda aberta continua nela. O
consumo por noite sai do `lancadoEm` de cada item, e o mesmo produto só soma na
mesma linha se for no mesmo dia.

### Fluxo de operação (revisado)

Baseado no padrão de PDVs de bar (abertura e fechamento de caixa, sangria e
suprimento, ciclo de comanda com permissões para cancelar e reabrir):

- **Caixa**: o dia começa abrindo o caixa com o fundo de troco. Sangria e
  suprimento exigem motivo. O fechamento confere cada forma de pagamento contra
  o esperado e não é permitido com comanda aberta. Caixa fechado é imutável
  (garantido também nas regras do Firestore).
- **Comanda**: `aberta → fechada → paga`, mais `cancelada`. Só a aberta aceita
  consumo. Paga é somente leitura; a única saída é estornar um pagamento.
- **Nada é apagado**: item cancelado e pagamento estornado ficam registrados,
  riscados, com motivo. Cada comanda guarda o histórico de eventos.
- **Fiado**: conta fechada com saldo. Atravessa caixas e é recebida no caixa do
  dia em que o dinheiro entra.
- **PDV em janela própria** (`/c/{slug}?view=bar-pdv`), aberta pela página
  Caixa do app.
- **Concorrência**: lançamento e pagamento usam `arrayUnion`/`increment`,
  atômicos no servidor, e funcionam offline.

### Status da implementação

- [x] Modelo, contexto e regras do Firestore (publicadas)
- [x] Produtos
- [x] Comandas: lançamento, sugestão de jogadores, quem deve, pagamento parcial, estorno
- [x] Dashboard financeiro (dia / semana / mês) — `components/Financeiro.tsx`, lógica em `services/financeiro.ts`
- [x] Rake, bruto e administrativo gravados na etapa a partir do lançamento
- [ ] Planos

**Por que congelar nome e preço no item:** se o produto subir de preço em março,
a comanda de janeiro não pode mudar de valor. É o mesmo problema que já apareceu
no valor por etapa.

### Quem deve quanto

Não precisa de coleção de clientes. A dívida é a soma de `total - valorPago` das
comandas com `status: 'aberta'`, agrupada por `playerId` quando existe e por nome
normalizado quando não existe.

O "sugerir nome dos jogadores" no lançamento usa a união dos jogadores de todos os
rankings da casa, com a mesma normalização de acento já usada no Dashboard.

## 3. Dashboard financeiro mensal

### Bar
Soma das comandas do mês. Separar recebido (`valorPago`) de em aberto.
Produtos mais vendidos: agregar `itens` das comandas do mês por `produtoId`.

### Poker (rake)
**O rake não é gravado em lugar nenhum.** Ele é calculado no lançamento e
descartado. Mas dá para reconstruir: `services/stageFinance.ts` já faz isso a
partir dos resultados gravados e da categoria (`rakeValue`).

Dois problemas conhecidos:

1. **As categorias do Kings estão com `rake: 0`.** Hoje o rake reconstruído dá
   R$ 0 para todas as etapas. Ou o rake nunca foi parametrizado, ou é cobrado por
   fora. Precisa confirmar antes de prometer esse número no dashboard.
2. **O valor administrativo não é gravado.** É digitado no lançamento e perdido.
   Se ele entra no cálculo do que a casa arrecada, precisa passar a ser gravado
   na etapa.

Recomendação: passar a gravar `rakeValue` e `valorAdministrativo` na etapa no
momento do lançamento, e usar a reconstrução apenas como fallback para o
histórico antigo. Mesmo padrão que resolveu o valor por etapa.

## 4. Fases sugeridas

1. **Planos**: campo na casa, mapa de recursos, gating de menu, atribuição no
   SuperAdminDashboard, regras do Firestore.
2. **Produtos**: CRUD simples, espelhando a tela de categorias de jogo.
3. **Comandas**: lançamento de pedido, autocomplete de jogadores, fechar/pagar,
   visão de quem deve.
4. **Dashboard**: mês a mês, bar + poker, produtos mais vendidos.

Cada fase é utilizável sozinha. A 3 é a que entrega o valor do dia a dia.

## 5. Decisões em aberto

- Plano inicial dos 5 clubes existentes.
- Gating só no cliente ou também nas regras do Firestore.
- Pagamento parcial é necessário no início ou basta pago/não pago.
- A comanda fecha na noite ou pode ficar aberta atravessando dias.
