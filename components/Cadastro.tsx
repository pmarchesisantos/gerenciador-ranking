import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CreditCard, QrCode, Trophy, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRanking } from '../context/RankingContext';
import TabelaPlanos, { SeletorPeriodo } from './TabelaPlanos';
import AvisoPrivacidade from './AvisoPrivacidade';
import { PLANOS, Periodo, PlanoId, ehPlano, precoDoPeriodo, primeiraCobranca, taxaImplantacao } from '../services/planos';
import { documentoValido, mascararDocumento, mascararTelefone, telefoneValido } from '../services/documento';
import { apiAssinatura } from '../services/apiAssinatura';
import { formatBRL } from '../services/stageValues';
import Marca from './Marca';

const brl = (v: number) => `R$ ${formatBRL(v)}`;
const RASCUNHO = 'cadastro:rascunho';

/**
 * Rascunho do formulário na sessão do navegador: ao criar a conta, a tela é
 * remontada (o usuário passa a estar logado) e sem isso o que foi digitado se
 * perderia se o servidor recusar algo. CPF/CNPJ fica de fora de propósito.
 */
interface Rascunho { plano: PlanoId; periodo: Periodo; forma: 'pix' | 'cartao'; nomeClube: string; responsavel: string; telefone: string }
const lerRascunho = (): Partial<Rascunho> => {
  try { return JSON.parse(sessionStorage.getItem(RASCUNHO) || '{}'); } catch { return {}; }
};
const gravarRascunho = (r: Rascunho) => { try { sessionStorage.setItem(RASCUNHO, JSON.stringify(r)); } catch { /* sem rascunho */ } };

/** Envio em andamento, compartilhado entre montagens da tela (ver acima). */
let envioEmAndamento: Promise<unknown> | null = null;

const inputCls = 'w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3.5 text-white text-sm font-bold outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-700';
const Campo: React.FC<{ label: string; children: React.ReactNode; dica?: string }> = ({ label, children, dica }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-semibold text-gray-500 ml-1">{label}</span>
    {children}
    {dica && <span className="block text-xs text-gray-600 ml-1">{dica}</span>}
  </label>
);

const Cadastro: React.FC<{ onVoltar?: () => void; onEntrar?: () => void }> = ({ onVoltar, onEntrar }) => {
  const { user, cadastrar, logout } = useAuth();
  const { recarregarCasa } = useRanking();
  const r = lerRascunho();

  const [etapa, setEtapa] = useState<'plano' | 'dados'>(ehPlano(r.plano) ? 'dados' : 'plano');
  const [periodo, setPeriodo] = useState<Periodo>(r.periodo === 'anual' ? 'anual' : 'mensal');
  const [plano, setPlano] = useState<PlanoId>(ehPlano(r.plano) ? r.plano : 'profissional');
  const [forma, setForma] = useState<'pix' | 'cartao'>(r.forma === 'pix' ? 'pix' : 'cartao');
  const [nomeClube, setNomeClube] = useState(r.nomeClube || '');
  const [responsavel, setResponsavel] = useState(r.responsavel || '');
  const [documento, setDocumento] = useState('');
  const [telefone, setTelefone] = useState(r.telefone || '');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [aceite, setAceite] = useState(false);
  const [verAviso, setVerAviso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [emailEmUso, setEmailEmUso] = useState(false);
  const [enviando, setEnviando] = useState(!!envioEmAndamento);

  useEffect(() => {
    gravarRascunho({ plano, periodo, forma, nomeClube, responsavel, telefone });
  }, [plano, periodo, forma, nomeClube, responsavel, telefone]);

  // Remontada no meio de um envio: espera ele terminar.
  useEffect(() => {
    if (!envioEmAndamento) return;
    envioEmAndamento.finally(() => setEnviando(false));
  }, []);

  const validar = (): string | null => {
    if (nomeClube.trim().length < 2) return 'Informe o nome do clube.';
    if (responsavel.trim().length < 3) return 'Informe o nome completo do responsável.';
    if (!documentoValido(documento)) return 'CPF ou CNPJ inválido.';
    if (!telefoneValido(telefone)) return 'Informe um celular com DDD.';
    if (!user) {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Informe um e-mail válido.';
      if (senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
      if (senha !== senha2) return 'As senhas não conferem.';
    }
    if (!aceite) return 'É preciso aceitar os termos e a política de privacidade.';
    return null;
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    const problema = validar();
    setErro(problema);
    setEmailEmUso(false);
    if (problema) return;

    // A aba da fatura é aberta já no clique: aberta depois da espera, o
    // navegador a trataria como pop-up e bloquearia.
    const aba = window.open('', '_blank');
    setEnviando(true);
    const tarefa = (async () => {
      if (!user) await cadastrar(email, senha);
      const resp = await apiAssinatura.assinar({
        nomeClube: nomeClube.trim(), responsavel: responsavel.trim(), cpfCnpj: documento, telefone,
        plano, periodo, forma, aceiteTermos: true,
      });
      try { sessionStorage.removeItem(RASCUNHO); } catch { /* ok */ }
      if (resp.faturaUrl && aba) aba.location.href = resp.faturaUrl;
      else aba?.close();
      recarregarCasa();
    })();
    envioEmAndamento = tarefa;
    try {
      await tarefa;
    } catch (err: any) {
      aba?.close();
      if (err?.code === 'auth/email-already-in-use') {
        setEmailEmUso(true);
        setErro('Este e-mail já tem uma conta. Entre com ela para concluir o cadastro do clube.');
      } else if (err?.code === 'auth/invalid-email') {
        setErro('E-mail inválido.');
      } else if (err?.code === 'auth/weak-password') {
        setErro('Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.');
      } else {
        setErro(err?.message || 'Não foi possível concluir o cadastro.');
      }
    } finally {
      envioEmAndamento = null;
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="h-16 border-b border-gray-800/60 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Marca tamanho="sm" />
        </div>
        {user ? (
          <button onClick={logout} className="text-xs font-semibold text-gray-500 hover:text-white">Sair ({user.email})</button>
        ) : onEntrar && (
          <button onClick={onEntrar} className="text-xs font-semibold text-gray-500 hover:text-white">Já tenho conta</button>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 md:py-14 space-y-8">
        {etapa === 'plano' ? (
          <>
            <div className="text-center space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Escolha o plano do seu clube</h1>
              <p className="text-gray-500 text-sm max-w-xl mx-auto">Pague com Pix ou cartão. Cancele quando quiser, direto no app.</p>
              <div className="pt-2"><SeletorPeriodo periodo={periodo} onChange={setPeriodo} /></div>
            </div>
            <TabelaPlanos periodo={periodo} onEscolher={p => { setPlano(p); setEtapa('dados'); }}
                          rotuloAcao={p => `Começar com o ${PLANOS[p].nome}`} />
            {onVoltar && (
              <div className="text-center">
                <button onClick={onVoltar} className="text-xs font-semibold text-gray-500 hover:text-white inline-flex items-center gap-2">
                  <ArrowLeft size={14} /> Voltar para os rankings
                </button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={enviar} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start" noValidate>
            <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:p-8 space-y-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Dados do clube</h1>
                <p className="text-gray-500 text-sm mt-1">Usamos estes dados para criar o seu acesso e emitir a cobrança.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo label="Nome do clube"><input className={inputCls} value={nomeClube} onChange={e => setNomeClube(e.target.value)} placeholder="Ex: Kings Poker Club" maxLength={80} autoComplete="organization" /></Campo>
                <Campo label="Responsável"><input className={inputCls} value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome completo" maxLength={100} autoComplete="name" /></Campo>
                <Campo label="CPF ou CNPJ" dica="Exigido para emitir a cobrança. Não fica salvo no nosso sistema.">
                  <input className={inputCls} value={documento} onChange={e => setDocumento(mascararDocumento(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" autoComplete="off" />
                </Campo>
                <Campo label="Celular"><input className={inputCls} value={telefone} onChange={e => setTelefone(mascararTelefone(e.target.value))} inputMode="tel" placeholder="(00) 00000-0000" autoComplete="tel" /></Campo>
              </div>

              {user ? (
                <p className="text-xs text-gray-500 bg-black/30 border border-gray-800 rounded-xl px-4 py-3">
                  O clube será criado na conta <strong className="text-gray-300">{user.email}</strong>.
                </p>
              ) : (
                <div className="space-y-4 pt-2 border-t border-gray-800">
                  <p className="text-xs font-semibold text-gray-500 pt-4">Acesso ao painel</p>
                  <Campo label="E-mail"><input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@clube.com" autoComplete="email" /></Campo>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Campo label="Senha" dica="Mínimo de 8 caracteres."><input className={inputCls} type="password" value={senha} onChange={e => setSenha(e.target.value)} autoComplete="new-password" /></Campo>
                    <Campo label="Confirmar senha"><input className={inputCls} type="password" value={senha2} onChange={e => setSenha2(e.target.value)} autoComplete="new-password" /></Campo>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-gray-800">
                <p className="text-xs font-semibold text-gray-500 pt-4">Forma de pagamento</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
                  {([
                    { id: 'cartao', titulo: 'Cartão de crédito', texto: 'Cobrado automaticamente a cada renovação.', Icone: CreditCard },
                    { id: 'pix', titulo: 'Pix', texto: 'Você recebe um Pix para pagar a cada renovação.', Icone: QrCode },
                  ] as const).map(op => (
                    <button type="button" key={op.id} role="radio" aria-checked={forma === op.id} onClick={() => setForma(op.id)}
                            className={`text-left rounded-xl border p-4 transition-all ${forma === op.id ? 'border-emerald-500/50 bg-emerald-600/[0.08]' : 'border-gray-800 hover:border-gray-700'}`}>
                      <span className="flex items-center gap-2 font-bold text-sm"><op.Icone size={16} className={forma === op.id ? 'text-emerald-400' : 'text-gray-500'} /> {op.titulo}</span>
                      <span className="block text-xs text-gray-500 mt-1">{op.texto}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 flex items-center gap-1.5"><Lock size={11} /> Os dados do cartão são digitados na página segura do Asaas, nunca no nosso app.</p>
              </div>

              <label className="flex items-start gap-3 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} className="accent-emerald-500 w-4 h-4 mt-0.5 shrink-0" />
                <span>Li e aceito os termos de uso e a{' '}
                  <button type="button" onClick={() => setVerAviso(true)} className="text-emerald-400 underline underline-offset-2">política de privacidade</button>.
                </span>
              </label>

              {erro && (
                <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-300 text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="flex-1">{erro}
                    {emailEmUso && onEntrar && <button type="button" onClick={onEntrar} className="block mt-2 font-semibold underline">Entrar com esta conta</button>}
                  </span>
                </div>
              )}
            </section>

            <aside className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5 lg:sticky lg:top-6">
              <div>
                <p className="text-xs font-semibold text-gray-500">Plano escolhido</p>
                <p className="text-white font-semibold text-xl mt-1">{PLANOS[plano].nome}</p>
                <button type="button" onClick={() => setEtapa('plano')} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 mt-1">Trocar plano</button>
              </div>
              <SeletorPeriodo periodo={periodo} onChange={setPeriodo} />
              <dl className="border-t border-gray-800 pt-4 space-y-2 text-sm tabular-nums">
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-400">{PLANOS[plano].nome} · {periodo === 'anual' ? '12 meses' : '1º mês'}</dt>
                  <dd className="text-gray-200">{brl(precoDoPeriodo(plano, periodo))}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-400">Implantação</dt>
                  <dd>{taxaImplantacao(plano, periodo) > 0
                    ? <span className="text-gray-200">{brl(taxaImplantacao(plano, periodo))}</span>
                    : <span className="text-green-400"><span className="text-gray-600 line-through mr-1.5">{brl(PLANOS[plano].implantacao)}</span>grátis</span>}
                  </dd>
                </div>
                <div className="flex justify-between items-baseline gap-3 border-t border-gray-800 pt-3">
                  <dt className="text-gray-300 font-medium">Total hoje</dt>
                  <dd className="text-white font-semibold text-2xl">{brl(primeiraCobranca(plano, periodo))}</dd>
                </div>
                <p className="text-gray-500 text-xs text-right">
                  {periodo === 'anual'
                    ? <>depois {brl(precoDoPeriodo(plano, 'anual'))} por ano · <span className="text-green-400">economia de {brl(PLANOS[plano].mensal * 12 - precoDoPeriodo(plano, 'anual'))}</span></>
                    : <>depois {brl(PLANOS[plano].mensal)} por mês · no anual a implantação é grátis</>}
                </p>
              </dl>
              <button type="submit" disabled={enviando}
                      className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-50 text-emerald-200 font-semibold py-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all ring-1 ring-inset ring-emerald-500/30">
                {enviando ? <><Loader2 size={16} className="animate-spin" /> Criando...</> : <>Ir para o pagamento <ArrowRight size={16} /></>}
              </button>
              <p className="text-xs text-gray-600 leading-relaxed">
                O pagamento abre numa nova aba. O acesso é liberado assim que o pagamento é confirmado — no Pix, em instantes.
              </p>
            </aside>
          </form>
        )}
      </main>

      {verAviso && <AvisoPrivacidade onClose={() => setVerAviso(false)} />}
    </div>
  );
};

export default Cadastro;
