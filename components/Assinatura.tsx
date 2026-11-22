import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, QrCode, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Clock, Gift, LogOut, Loader2 } from 'lucide-react';
import { useRanking } from '../context/RankingContext';
import { useAuth } from '../context/AuthContext';
import TabelaPlanos from './TabelaPlanos';
import ConfirmationModal from './ConfirmationModal';
import { PLANOS, PlanoId, StatusAssinatura, acessoLiberado, diferencaImplantacao, precoDoPeriodo } from '../services/planos';
import { SituacaoAssinatura, apiAssinatura } from '../services/apiAssinatura';
import { formatBRL } from '../services/stageValues';
import { contatoSuporte } from '../services/legal';

const brl = (v: number) => `R$ ${formatBRL(v)}`;
const data = (s?: string) => {
  if (!s) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : new Date(s);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const STATUS: Record<StatusAssinatura, { texto: string; cls: string; Icone: typeof Clock }> = {
  pendente: { texto: 'Aguardando pagamento', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', Icone: Clock },
  ativa: { texto: 'Ativa', cls: 'bg-green-500/10 text-green-400 border-green-500/20', Icone: CheckCircle2 },
  atrasada: { texto: 'Pagamento atrasado', cls: 'bg-red-500/10 text-red-400 border-red-500/20', Icone: AlertCircle },
  cancelada: { texto: 'Cancelada', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20', Icone: AlertCircle },
};

/**
 * Minha assinatura. Com `bloqueado`, é a tela que aparece no lugar do painel
 * quando o acesso não está liberado (falta o primeiro pagamento ou venceu).
 */
const Assinatura: React.FC<{ bloqueado?: boolean }> = ({ bloqueado }) => {
  const { house } = useRanking();
  const { logout } = useAuth();
  const [situacao, setSituacao] = useState<SituacaoAssinatura | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trocarPara, setTrocarPara] = useState<PlanoId | null>(null);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  const [processando, setProcessando] = useState(false);

  const temAssinatura = !!house.assinatura;

  const carregar = useCallback(async () => {
    if (!temAssinatura) return;
    setCarregando(true);
    setErro(null);
    try {
      setSituacao(await apiAssinatura.situacao());
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [temAssinatura]);

  // Recarrega quando o servidor muda a assinatura (pagamento confirmado, etc.).
  useEffect(() => { carregar(); }, [carregar, house.assinatura?.status, house.assinatura?.ate, house.plano]);

  /** Executa a ação; se ela devolver um texto, ele substitui a mensagem de sucesso. */
  const executar = async (acao: () => Promise<unknown>, sucesso: string) => {
    setProcessando(true);
    setErro(null);
    try {
      const msg = await acao();
      setAviso(typeof msg === 'string' ? msg : sucesso);
      await carregar();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setProcessando(false);
    }
  };

  // ── Cortesia: casa criada pelo administrador, sem cobrança ──
  if (!temAssinatura) {
    const plano = house.plano ? PLANOS[house.plano] : PLANOS.completo;
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Minha assinatura</h2>
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-600/[0.05] p-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/15 text-emerald-400 flex items-center justify-center shrink-0"><Gift size={22} /></div>
          <div>
            <p className="text-white font-semibold text-lg">Acesso de cortesia · {plano.nome}</p>
            <p className="text-gray-400 text-sm mt-1">Este clube foi liberado pelo administrador e não tem cobrança. Inclui: {plano.inclui.join(' · ')}.</p>
          </div>
        </section>
      </div>
    );
  }

  const status = house.assinatura!.status;
  const S = STATUS[status];
  const liberado = acessoLiberado(house);
  const planoAtual = house.plano || situacao?.plano;

  return (
    <div className={bloqueado ? 'min-h-screen bg-gray-950 text-white' : ''}>
      {bloqueado && (
        <header className="h-16 border-b border-gray-800/60 px-4 md:px-8 flex items-center justify-between">
          <span className="font-semibold text-sm truncate">{house.name}</span>
          <button onClick={logout} className="p-2 text-gray-500 hover:text-red-400" aria-label="Sair"><LogOut size={18} /></button>
        </header>
      )}

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {bloqueado ? (status === 'pendente' ? 'Falta só o pagamento' : 'Seu acesso está suspenso') : 'Minha assinatura'}
          </h2>
          {bloqueado && (
            <p className="text-gray-500 text-sm">
              {status === 'pendente'
                ? 'Assim que o pagamento for confirmado, o painel libera sozinho — no Pix, em instantes.'
                : 'O período pago terminou. Pague a fatura em aberto para voltar a usar o painel. Seus dados continuam guardados.'}
            </p>
          )}
        </header>

        {aviso && <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-300 text-sm">{aviso}</div>}
        {erro && (
          <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-300 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{erro}</span>
          </div>
        )}

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500">Plano</p>
              <p className="text-white font-semibold text-2xl">{planoAtual ? PLANOS[planoAtual].nome : '—'}
                <span className="text-gray-500 text-sm font-bold ml-2">{house.assinatura!.periodo === 'anual' ? 'anual' : 'mensal'}</span>
              </p>
            </div>
            <span className={`self-start md:self-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold   ${S.cls}`}>
              <S.Icone size={12} /> {S.texto}
            </span>
          </div>

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><dt className="text-xs font-semibold text-gray-500">Valor</dt>
              <dd className="text-white font-bold tabular-nums mt-0.5">{situacao ? brl(situacao.valor) : planoAtual ? brl(precoDoPeriodo(planoAtual, house.assinatura!.periodo)) : '—'}</dd></div>
            <div><dt className="text-xs font-semibold text-gray-500">Acesso até</dt>
              <dd className={`font-bold mt-0.5 ${liberado ? 'text-white' : 'text-red-400'}`}>{house.assinatura!.ate ? data(house.assinatura!.ate) : 'após o pagamento'}</dd></div>
            <div><dt className="text-xs font-semibold text-gray-500">Pagamento</dt>
              <dd className="text-white font-bold mt-0.5 flex items-center gap-1.5">
                {situacao ? (situacao.forma === 'pix' ? <><QrCode size={14} /> Pix</> : <><CreditCard size={14} /> Cartão</>) : '—'}
              </dd></div>
            <div><dt className="text-xs font-semibold text-gray-500">Titular</dt>
              <dd className="text-white font-bold mt-0.5 truncate">{situacao ? `${situacao.responsavel}` : '—'}</dd>
              {situacao && <dd className="text-gray-500 text-xs font-mono">{situacao.documento}</dd>}</div>
          </dl>

          {carregando && !situacao ? (
            <p className="text-gray-500 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Consultando a cobrança...</p>
          ) : situacao?.trocaPendente ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold">Mudança para o {PLANOS[situacao.trocaPendente.plano].nome} aguardando pagamento</p>
                <p className="text-gray-400 text-xs mt-0.5">Diferença de implantação: {brl(situacao.trocaPendente.valor)}. O plano muda assim que o pagamento for confirmado.</p>
              </div>
              <a href={situacao.trocaPendente.url} target="_blank" rel="noopener noreferrer"
                 className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 ring-1 ring-inset ring-emerald-500/30 px-6 py-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all">
                Pagar diferença <ExternalLink size={13} />
              </a>
            </div>
          ) : situacao?.fatura ? (
            <div className={`rounded-xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${situacao.fatura.atrasada ? 'border-red-500/30 bg-red-500/[0.05]' : 'border-amber-500/30 bg-amber-500/[0.05]'}`}>
              <div>
                <p className="text-white font-semibold">Fatura em aberto · {brl(situacao.fatura.valor)}</p>
                <p className="text-gray-400 text-xs mt-0.5">{situacao.fatura.atrasada ? 'Venceu' : 'Vence'} em {data(situacao.fatura.vencimento)}</p>
              </div>
              <a href={situacao.fatura.url} target="_blank" rel="noopener noreferrer"
                 className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 px-6 py-3.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all ring-1 ring-inset ring-emerald-500/30">
                Pagar agora <ExternalLink size={13} />
              </a>
            </div>
          ) : situacao && status !== 'cancelada' ? (
            <p className="text-green-400/80 text-sm flex items-center gap-2"><CheckCircle2 size={15} /> Nenhuma fatura em aberto.</p>
          ) : null}

          <button onClick={carregar} disabled={carregando}
                  className="text-xs font-semibold text-gray-500 hover:text-white flex items-center gap-1.5 disabled:opacity-40">
            <RefreshCw size={12} className={carregando ? 'animate-spin' : ''} /> Atualizar
          </button>
        </section>

        {!bloqueado && status !== 'cancelada' && planoAtual && (
          <section className="space-y-4">
            <div>
              <h3 className="text-white font-semibold text-lg">Trocar de plano</h3>
              <p className="text-gray-500 text-sm">
                {house.assinatura!.periodo === 'anual'
                  ? `No plano anual a troca acontece na renovação. Para trocar antes, fale com ${contatoSuporte()}.`
                  : 'A troca vale na hora; o novo valor entra a partir da próxima fatura.'}
              </p>
            </div>
            <TabelaPlanos periodo={house.assinatura!.periodo} atual={planoAtual} implantacao={false}
                          desabilitado={processando || house.assinatura!.periodo === 'anual'}
                          rotuloAcao={p => (PLANOS[p].mensal > PLANOS[planoAtual].mensal ? `Mudar para ${PLANOS[p].nome}` : `Voltar para ${PLANOS[p].nome}`)}
                          onEscolher={setTrocarPara} />
          </section>
        )}

        {!bloqueado && status !== 'cancelada' && (
          <section className="border-t border-gray-800 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <p className="text-gray-500 text-sm">Ao cancelar, o acesso continua até {house.assinatura!.ate ? data(house.assinatura!.ate) : 'o fim do período pago'}.</p>
            <button onClick={() => setConfirmarCancelamento(true)} disabled={processando}
                    className="px-5 py-3 rounded-xl border border-red-500/30 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40">
              Cancelar assinatura
            </button>
          </section>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!trocarPara}
        onClose={() => setTrocarPara(null)}
        onConfirm={() => {
          const p = trocarPara!;
          setTrocarPara(null);
          // Upgrade com diferença de implantação: a fatura abre numa aba nova. A aba
          // é aberta já no clique; depois da espera o navegador a bloquearia.
          const aba = planoAtual && diferencaImplantacao(planoAtual, p) > 0 ? window.open('', '_blank') : null;
          executar(async () => {
            try {
              const r = await apiAssinatura.trocarPlano(p);
              if (r.pendente && r.faturaUrl && aba) aba.location.href = r.faturaUrl;
              else aba?.close();
              if (r.pendente) {
                return `Pague a diferença de implantação (${brl(r.valor || 0)}) na aba que abriu. O plano muda para ${PLANOS[p].nome} assim que o pagamento for confirmado.`;
              }
            } catch (e) {
              aba?.close();
              throw e;
            }
          }, `Plano alterado para ${PLANOS[p].nome}.`);
        }}
        title="Trocar de plano"
        message={trocarPara ? (() => {
          const mensal = `${brl(precoDoPeriodo(trocarPara, house.assinatura!.periodo))}/mês`;
          const diferenca = planoAtual ? diferencaImplantacao(planoAtual, trocarPara) : 0;
          return diferenca > 0
            ? `Mudar para o plano ${PLANOS[trocarPara].nome} (${mensal})? O upgrade cobra a diferença de implantação: ${brl(diferenca)}, uma vez. O plano muda assim que esse pagamento for confirmado, e a nova mensalidade vale a partir da próxima fatura.`
            : `Mudar para o plano ${PLANOS[trocarPara].nome} (${mensal})? Os recursos mudam na hora e o novo valor vale a partir da próxima fatura.`;
        })() : ''}
        confirmLabel="Trocar plano"
        variant="warning"
      />
      <ConfirmationModal
        isOpen={confirmarCancelamento}
        onClose={() => setConfirmarCancelamento(false)}
        onConfirm={() => { setConfirmarCancelamento(false); executar(() => apiAssinatura.cancelar(), 'Assinatura cancelada. O acesso segue até o fim do período pago.'); }}
        title="Cancelar assinatura"
        message="As próximas cobranças deixam de ser geradas. O acesso continua até o fim do período já pago e os dados do clube ficam guardados."
        confirmLabel="Cancelar assinatura"
      />
    </div>
  );
};

export default Assinatura;
