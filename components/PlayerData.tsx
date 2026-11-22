
import React, { useMemo, useState } from 'react';
import { useRanking } from '../context/RankingContext';
import { Search, Edit2, Check, X, Calendar, Heart, User, MessageCircle, Archive, ArchiveRestore, Plus, Trophy, Users } from 'lucide-react';
import { consolidarPessoas, normalizarNome, Pessoa, CadastroError } from '../services/jogadores';
import ComboBox from './ComboBox';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const formatarTelefone = (valor: string) => {
  const d = (valor || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/** O WhatsApp exige o código do país; números com DDD (até 11 dígitos) ganham o 55. */
const linkWhatsApp = (telefone: string) => {
  const d = telefone.replace(/\D/g, '');
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
};

interface Rascunho {
  nome: string;
  telefone: string;
  nascimento: string;
  time: string;
}

const inputCls = 'bg-black/40 border border-emerald-500/50 rounded-xl px-3 py-2 w-full text-white font-bold text-sm outline-none';

const PlayerData: React.FC = () => {
  const { house, jogadores, salvarJogador } = useRanking();
  const [busca, setBusca] = useState('');
  const [mes, setMes] = useState('');
  const [time, setTime] = useState('');
  const [ranking, setRanking] = useState('');
  const [arquivados, setArquivados] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [novo, setNovo] = useState<Rascunho | null>(null);
  const [salvando, setSalvando] = useState(false);

  const pessoas = useMemo(() => consolidarPessoas(jogadores, house.rankings), [jogadores, house.rankings]);

  const visiveis = useMemo(() => {
    const termo = normalizarNome(busca);
    const termoTime = normalizarNome(time);
    const idxMes = MESES.indexOf(mes);
    return pessoas.filter(p =>
      p.ativo !== arquivados &&
      (!termo || p.chave.includes(termo)) &&
      (!termoTime || normalizarNome(p.time || '').includes(termoTime)) &&
      (idxMes < 0 || (p.nascimento && new Date(p.nascimento + 'T00:00:00').getMonth() === idxMes)) &&
      (!ranking || p.participacoes.some(x => x.rankingNome === ranking))
    );
  }, [pessoas, busca, time, mes, ranking, arquivados]);

  const resumo = useMemo(() => ({
    total: pessoas.filter(p => p.ativo).length,
    emVarios: pessoas.filter(p => p.ativo && p.participacoes.length > 1).length,
    arquivados: pessoas.filter(p => !p.ativo).length,
  }), [pessoas]);

  const executar = async (acao: () => Promise<void>) => {
    setSalvando(true);
    try {
      await acao();
      return true;
    } catch (e) {
      alert(e instanceof CadastroError ? e.message : 'Não foi possível salvar. Verifique a conexão e tente novamente.');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicao = (p: Pessoa) => {
    setEditando(p.chave);
    setRascunho({ nome: p.nome, telefone: p.telefone || '', nascimento: p.nascimento || '', time: p.time || '' });
  };

  const salvarEdicao = async (p: Pessoa) => {
    if (!rascunho) return;
    const ok = await executar(() => salvarJogador(
      { nome: rascunho.nome, telefone: rascunho.telefone, nascimento: rascunho.nascimento, time: rascunho.time, ativo: p.ativo },
      { jogadorId: p.jogador?.id, chave: p.chave }
    ));
    if (ok) { setEditando(null); setRascunho(null); }
  };

  const alternarArquivo = (p: Pessoa) => executar(() => salvarJogador(
    { nome: p.nome, telefone: p.telefone, nascimento: p.nascimento, time: p.time, ativo: !p.ativo },
    { jogadorId: p.jogador?.id, chave: p.chave }
  ));

  const criar = async () => {
    if (!novo) return;
    const ok = await executar(() => salvarJogador({ nome: novo.nome, telefone: novo.telefone, nascimento: novo.nascimento, time: novo.time }));
    if (ok) setNovo(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">Dados Jogadores</h2>
          <p className="text-gray-500 text-xs md:text-sm">Cadastro geral da casa — base dos rankings, das etapas e das comandas do bar.</p>
          <p className="text-gray-600 text-[11px] font-bold mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1.5"><Users size={12} /> {resumo.total} pessoas</span>
            <span>· {resumo.emVarios} em mais de um ranking</span>
          </p>
        </div>
        <button onClick={() => setNovo({ nome: '', telefone: '', nascimento: '', time: '' })}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 shrink-0">
          <Plus size={16} /> Novo Jogador
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto] gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input className="w-full bg-gray-900/50 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-xs text-white font-bold outline-none focus:border-emerald-500/50"
                 placeholder="Nome..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <ComboBox modo="lista" value={ranking} onChange={setRanking} placeholder="Todos os rankings"
                  opcoes={['', ...house.rankings.map(r => r.name)].filter(Boolean)} />
        <ComboBox modo="lista" value={mes} onChange={setMes} placeholder="Mês de nascimento" opcoes={MESES} />
        <div className="relative">
          <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input className="w-full bg-gray-900/50 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-xs text-white font-bold outline-none focus:border-emerald-500/50"
                 placeholder="Time..." value={time} onChange={e => setTime(e.target.value)} />
        </div>
        <div className="flex bg-gray-900/50 border border-gray-800 rounded-xl p-1">
          <button onClick={() => setArquivados(false)}
                  className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${!arquivados ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            Ativos
          </button>
          <button onClick={() => setArquivados(true)}
                  className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${arquivados ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            Arquivados{resumo.arquivados > 0 && ` ${resumo.arquivados}`}
          </button>
        </div>
      </div>
      {(ranking || mes) && (
        <div className="flex gap-2 -mt-3">
          {ranking && <button onClick={() => setRanking('')} className="text-[10px] font-black text-gray-500 hover:text-white flex items-center gap-1"><X size={11} /> {ranking}</button>}
          {mes && <button onClick={() => setMes('')} className="text-[10px] font-black text-gray-500 hover:text-white flex items-center gap-1"><X size={11} /> {mes}</button>}
        </div>
      )}

      {novo && (
        <section className="bg-gray-900 border border-emerald-500/30 rounded-3xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-white font-black text-sm uppercase tracking-widest">Novo jogador</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input autoFocus className={inputCls} placeholder="Nome *" value={novo.nome}
                   onChange={e => setNovo({ ...novo, nome: e.target.value })} onKeyDown={e => e.key === 'Enter' && criar()} />
            <input className={inputCls} placeholder="(00) 00000-0000" inputMode="tel" value={novo.telefone}
                   onChange={e => setNovo({ ...novo, telefone: formatarTelefone(e.target.value) })} />
            <input type="date" className={inputCls} value={novo.nascimento} onChange={e => setNovo({ ...novo, nascimento: e.target.value })} />
            <input className={inputCls} placeholder="Time do coração" value={novo.time} onChange={e => setNovo({ ...novo, time: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setNovo(null)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white">Cancelar</button>
            <button onClick={criar} disabled={!novo.nome.trim() || salvando}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest">
              {salvando ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </section>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[1040px]">
          <thead>
            <tr className="bg-gray-800 text-gray-500 text-[10px] uppercase tracking-widest border-b border-gray-700">
              <th className="px-6 py-5">Nome</th>
              <th className="px-4 py-5">Celular</th>
              <th className="px-4 py-5">Nascimento</th>
              <th className="px-4 py-5">Time</th>
              <th className="px-4 py-5">Rankings</th>
              <th className="px-4 py-5 text-center w-28">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/40">
            {visiveis.length === 0 && (
              <tr><td colSpan={6} className="py-16 text-center text-gray-600 text-sm">Nenhum jogador encontrado.</td></tr>
            )}
            {visiveis.map(p => (
              <tr key={p.chave} className="hover:bg-emerald-600/[0.02] group transition-colors">
                {editando === p.chave && rascunho ? (
                  <>
                    <td className="px-6 py-3">
                      <input className={inputCls} value={rascunho.nome} onChange={e => setRascunho({ ...rascunho, nome: e.target.value })} />
                      {p.participacoes.length > 0 && normalizarNome(rascunho.nome) !== p.chave && (
                        <p className="text-[10px] text-amber-500/80 mt-1">O nome também muda nos {p.participacoes.length} ranking(s) em que ele joga.</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input className={inputCls} placeholder="(00) 00000-0000" inputMode="tel" value={rascunho.telefone}
                             onChange={e => setRascunho({ ...rascunho, telefone: formatarTelefone(e.target.value) })} />
                    </td>
                    <td className="px-4 py-3">
                      <input type="date" className={inputCls} value={rascunho.nascimento} onChange={e => setRascunho({ ...rascunho, nascimento: e.target.value })} />
                    </td>
                    <td className="px-4 py-3">
                      <input className={inputCls} placeholder="Ex: Palmeiras" value={rascunho.time} onChange={e => setRascunho({ ...rascunho, time: e.target.value })} />
                    </td>
                    <td className="px-4 py-3 text-[10px] text-gray-600">—</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => salvarEdicao(p)} disabled={salvando} title="Salvar" className="p-2.5 bg-emerald-600 text-white rounded-xl disabled:opacity-40"><Check size={16} /></button>
                        <button onClick={() => { setEditando(null); setRascunho(null); }} title="Cancelar" className="p-2.5 bg-gray-800 text-gray-400 rounded-xl"><X size={16} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 font-bold text-white min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-500 shrink-0"><User size={14} /></div>
                        <span className="truncate">{p.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-sm">
                      {p.telefone ? (
                        <div className="flex items-center gap-2">
                          <a href={linkWhatsApp(p.telefone)} target="_blank" rel="noreferrer" title="Conversar no WhatsApp"
                             className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                            <MessageCircle size={14} />
                          </a>
                          <span className="tabular-nums">{p.telefone}</span>
                        </div>
                      ) : <span className="text-gray-700 italic text-xs">Não inf.</span>}
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-sm">
                      {p.nascimento ? (
                        <span className="flex items-center gap-2"><Calendar size={12} className="text-gray-600" />{new Date(p.nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      ) : <span className="text-gray-700 italic text-xs">Não inf.</span>}
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-sm">
                      {p.time ? <span className="flex items-center gap-2"><Heart size={12} className="text-pink-500" />{p.time}</span> : <span className="text-gray-700 italic text-xs">Não inf.</span>}
                    </td>
                    <td className="px-4 py-4">
                      {p.participacoes.length === 0 ? (
                        <span className="text-gray-700 italic text-xs">Nenhum</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                          {/* Até 3 etiquetas por linha; o resto fica no "+N" para a tabela não esticar. */}
                          {p.participacoes.slice(0, 3).map(x => (
                            <span key={x.rankingId} title={`${x.player.totalPoints} pontos · ${x.player.attendances} presença(s)`}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 whitespace-nowrap max-w-[140px]">
                              <Trophy size={10} className="text-amber-500/70 shrink-0" /><span className="truncate">{x.rankingNome}</span>
                            </span>
                          ))}
                          {p.participacoes.length > 3 && (
                            <span title={p.participacoes.slice(3).map(x => x.rankingNome).join('\n')}
                                  className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 cursor-help">
                              +{p.participacoes.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => iniciarEdicao(p)} title="Editar dados" className="p-2 text-gray-500 hover:text-emerald-500 transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => alternarArquivo(p)} disabled={salvando}
                                title={p.ativo ? 'Arquivar: deixa de aparecer nas sugestões. Nada é apagado.' : 'Reativar'}
                                className={`p-2 transition-colors ${p.ativo ? 'text-gray-500 hover:text-amber-500' : 'text-emerald-500 hover:bg-emerald-500/10 rounded-lg'}`}>
                          {p.ativo ? <Archive size={16} /> : <ArchiveRestore size={16} />}
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerData;
