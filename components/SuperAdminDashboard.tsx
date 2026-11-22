
import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, setDoc, doc, deleteDoc, getDocs, firebaseConfig, query, where, handleFirestoreError, OperationType } from '../services/firebase';
import { useRanking } from '../context/RankingContext';
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { Trophy, Plus, Mail, Shield, Trash2, Home, UserCheck, Info, ExternalLink, Key, Loader2, Eraser, AlertCircle, Eye, ShieldAlert } from 'lucide-react';
import { updateDoc, deleteField } from 'firebase/firestore';
import { LISTA_PLANOS, PLANOS, PlanoId, Recurso, StatusAssinatura, ehPlano } from '../services/planos';
import ConfirmationModal from './ConfirmationModal';
import { paraVitrine } from '../services/vitrine';
import { Ranking } from '../types';

const STATUS_TEXTO: Record<StatusAssinatura, { texto: string; cls: string }> = {
  pendente: { texto: 'Aguardando pagamento', cls: 'text-amber-400' },
  ativa: { texto: 'Assinatura ativa', cls: 'text-green-500' },
  atrasada: { texto: 'Pagamento atrasado', cls: 'text-red-400' },
  cancelada: { texto: 'Cancelada', cls: 'text-gray-400' },
};

interface HouseRecord {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  /** Legado: senha inicial gravada em texto puro num documento público. Não é mais gravada. */
  tempPassword?: string;
  createdAt: string;
  plano?: PlanoId;
  assinatura?: { status: StatusAssinatura };
  /**
   * Fim da cortesia (AAAA-MM-DD). Só um lembrete para o administrador: o acesso
   * NÃO é cortado automaticamente. Vencido, é hora de solicitar a assinatura.
   */
  cortesiaAte?: string;
}

const SuperAdminDashboard: React.FC = () => {
  const { setViewingHouseId } = useRanking();
  const [houses, setHouses] = useState<HouseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [newHouseName, setNewHouseName] = useState('');
  const [newHouseEmail, setNewHouseEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'casas'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as HouseRecord));
      setHouses(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'casas');
      setLoading(false);
    });
    return unsub;
  }, []);

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };

  const handleAddHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!newHouseName.trim() || !newHouseEmail.trim() || !tempPassword.trim()) {
      setStatus({type: 'error', msg: 'Preencha todos os campos.'});
      return;
    }

    setIsProcessing(true);
    let secondaryApp;

    try {
      const secondaryAppName = `Secondary-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      
      try {
        await createUserWithEmailAndPassword(secondaryAuth, newHouseEmail.toLowerCase().trim(), tempPassword);
      } catch (authErr: any) {
        if (authErr.code !== 'auth/email-already-in-use') {
          throw authErr;
        }
      }

      const sanitizedSlug = slugify(newHouseName);
      // O ID do documento pode ser randômico ou baseado no slug original
      const docId = sanitizedSlug + '-' + Math.random().toString(36).substr(2, 4);
      
      await setDoc(doc(db, 'casas', docId), {
        name: newHouseName,
        slug: sanitizedSlug,
        ownerEmail: newHouseEmail.toLowerCase().trim(),
        // A senha NÃO é gravada: este documento tem leitura pública.
        createdAt: new Date().toISOString()
      });
      
      setNewHouseName('');
      setNewHouseEmail('');
      setTempPassword('');
      setStatus({
        type: 'success', 
        msg: 'Clube autorizado com sucesso! Acesso liberado via URL amigável.'
      });
    } catch (err: any) {
      console.error(err);
      setStatus({type: 'error', msg: `Erro: ${err.message || 'Falha ao processar.'}`});
    } finally {
      if (secondaryApp) await deleteApp(secondaryApp);
      setIsProcessing(false);
    }
  };

  const handleDeleteHouse = async (id: string) => {
    if (confirm('Deseja realmente REMOVER O ACESSO desta casa?')) {
      try {
        await deleteDoc(doc(db, 'casas', id));
      } catch (err) {
        alert('Erro ao remover acesso.');
      }
    }
  };

  /**
   * Plano de uma casa de cortesia (sem assinatura). A escolha na lista fica
   * pendente até o "Confirmar" e a confirmação na janela — nada grava direto.
   * Casa sem plano gravado equivale ao Black (acesso completo, como sempre teve).
   */
  const [escolhas, setEscolhas] = useState<Record<string, PlanoId>>({});
  const [confirmarPlano, setConfirmarPlano] = useState<{ casa: HouseRecord; plano: PlanoId } | null>(null);
  const planoAtual = (casa: HouseRecord): PlanoId => (casa.plano && ehPlano(casa.plano) ? casa.plano : 'completo');

  const definirPlano = async (casa: HouseRecord, plano: PlanoId) => {
    try {
      await updateDoc(doc(db, 'casas', casa.id), { plano });
      setEscolhas(e => { const n = { ...e }; delete n[casa.id]; return n; });
      setStatus({ type: 'success', msg: `${casa.name} agora está no plano ${PLANOS[plano].nome}.` });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `casas/${casa.id}`);
      setStatus({ type: 'error', msg: 'Não foi possível alterar o plano.' });
    }
  };

  const NOME_RECURSO: Record<Recurso, string> = { ranking: 'ranking', pokerClock: 'poker clock', financeiro: 'financeiro', bar: 'bar' };
  // ── Prazo da cortesia ──
  const hojeISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const somarDias = (iso: string, dias: number) => {
    const [a, m, d] = iso.split('-').map(Number);
    const data = new Date(a, m - 1, d + dias);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  };
  const dataBR = (iso: string) => iso.split('-').reverse().join('/');
  const diasAte = (iso: string) => {
    const [a, m, d] = iso.split('-').map(Number);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return Math.round((new Date(a, m - 1, d).getTime() - hoje.getTime()) / 86400000);
  };
  const PRAZO_PADRAO_DIAS = 90;

  const [editandoPrazo, setEditandoPrazo] = useState<Record<string, string>>({});
  const [confirmarPrazo, setConfirmarPrazo] = useState<{ casa: HouseRecord; ate: string } | null>(null);

  const definirPrazo = async (casa: HouseRecord, ate: string) => {
    try {
      await updateDoc(doc(db, 'casas', casa.id), { cortesiaAte: ate });
      setEditandoPrazo(e => { const n = { ...e }; delete n[casa.id]; return n; });
      setStatus({ type: 'success', msg: `Cortesia do ${casa.name} vai até ${dataBR(ate)}.` });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `casas/${casa.id}`);
      setStatus({ type: 'error', msg: 'Não foi possível salvar o prazo da cortesia.' });
    }
  };

  const mensagemTroca = (casa: HouseRecord, plano: PlanoId) => {
    const de = PLANOS[planoAtual(casa)], para = PLANOS[plano];
    const perde = de.recursos.filter(r => !para.recursos.includes(r)).map(r => NOME_RECURSO[r]);
    const ganha = para.recursos.filter(r => !de.recursos.includes(r)).map(r => NOME_RECURSO[r]);
    return `O ${casa.name} passa do plano ${de.nome} para o ${para.nome}, sem cobrança (cortesia).`
      + (ganha.length ? ` Passa a ter: ${ganha.join(', ')}.` : '')
      + (perde.length ? ` Perde o acesso a: ${perde.join(', ')} (os dados ficam guardados).` : '');
  };

  const comSenhaExposta = houses.filter(h => h.tempPassword);
  /**
   * Gera a vitrine (página pública) de todos os clubes a partir dos rankings.
   * Só CRIA/atualiza os documentos públicos; os rankings não são alterados.
   * Rodar antes de publicar as regras que fecham a leitura dos rankings.
   */
  const [gerandoVitrines, setGerandoVitrines] = useState(false);
  const gerarVitrines = async () => {
    setGerandoVitrines(true);
    setStatus(null);
    let total = 0;
    try {
      for (const casa of houses) {
        const rankings = await getDocs(collection(db, 'casas', casa.id, 'rankings'));
        for (const r of rankings.docs) {
          await setDoc(doc(db, 'casas', casa.id, 'vitrine', r.id), paraVitrine({ id: r.id, ...r.data() } as Ranking));
          total++;
        }
      }
      setStatus({ type: 'success', msg: `Páginas públicas geradas: ${total} ranking(s) em ${houses.length} clube(s). Agora você já pode publicar as regras novas do Firestore.` });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'casas/*/vitrine');
      setStatus({ type: 'error', msg: `Parou depois de ${total} ranking(s). Verifique a conexão e tente de novo.` });
    } finally {
      setGerandoVitrines(false);
    }
  };

  const removerSenhasExpostas = async () => {
    if (!confirm(`Remover a senha em texto puro de ${comSenhaExposta.length} clube(s)? As senhas de acesso dos donos NÃO mudam; só deixam de ficar visíveis no banco.`)) return;
    setIsProcessing(true);
    try {
      await Promise.all(comSenhaExposta.map(h => updateDoc(doc(db, 'casas', h.id), { tempPassword: deleteField() })));
      setStatus({ type: 'success', msg: 'Senhas removidas dos registros públicos.' });
    } catch (err) {
      setStatus({ type: 'error', msg: 'Erro ao remover as senhas.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAll = async () => {
    if (confirm('ATENÇÃO: Isso removerá TODOS os clubes cadastrados.')) {
      setIsProcessing(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'casas'));
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, 'casas', d.id)));
        await Promise.all(deletePromises);
      } catch (err) {
        setStatus({ type: 'error', msg: 'Erro ao limpar registros.' });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2 text-amber-500">
            <Shield size={20} />
            <span className="text-xs font-semibold">Painel de Administração</span>
          </div>
          <h1 className="text-4xl font-semibold text-white tracking-tight">Gerenciamento Global</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Autorize novos clubes ou gerencie os rankings existentes clicando em "Testar Painel".
          </p>
        </div>
        <button 
          onClick={handleClearAll}
          disabled={isProcessing || houses.length === 0}
          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border border-red-500/20 disabled:opacity-30"
        >
          <Eraser size={14} />
          Limpar Todos
        </button>
      </header>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div>
          <p className="text-white font-semibold">Páginas públicas dos clubes</p>
          <p className="text-gray-400 text-sm mt-1">Gera a versão pública de cada ranking (só classificação e pontos, sem valores nem contatos).
            Os rankings não são alterados. Rode uma vez antes de publicar as regras novas; depois disso elas se atualizam sozinhas.</p>
        </div>
        <button onClick={gerarVitrines} disabled={gerandoVitrines || houses.length === 0}
                className="shrink-0 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 ring-1 ring-inset ring-emerald-500/30 px-5 py-3 rounded-xl text-xs font-semibold disabled:opacity-40 flex items-center gap-2">
          {gerandoVitrines ? <><Loader2 size={14} className="animate-spin" /> Gerando...</> : 'Gerar páginas públicas'}
        </button>
      </div>
      {status && (
        <div className={`p-4 rounded-xl text-sm font-medium ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {status.msg}
        </div>
      )}

      {comSenhaExposta.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-white font-semibold">{comSenhaExposta.length} clube(s) com senha exposta</p>
              <p className="text-gray-400 text-sm mt-1">A senha inicial foi gravada em texto puro no documento do clube, que qualquer pessoa pode ler.
                Remova-a dos registros e peça aos donos que troquem a senha em "Dados do Perfil".</p>
            </div>
          </div>
          <button onClick={removerSenhasExpostas} disabled={isProcessing}
                  className="shrink-0 bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-xl text-xs font-semibold disabled:opacity-40">
            Remover senhas expostas
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-6 sticky top-24 shadow-2xl">
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              <Plus className="text-emerald-500" /> Autorizar Clube
            </h2>
            
            <form onSubmit={handleAddHouse} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 ml-1">Nome do Clube</label>
                <input 
                  disabled={isProcessing}
                  className="w-full bg-black/40 border border-gray-800 rounded-xl px-5 py-4 text-white font-bold outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
                  placeholder="Ex: Diamond Poker Club"
                  value={newHouseName}
                  onChange={(e) => setNewHouseName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 ml-1">E-mail do Proprietário</label>
                <input 
                  disabled={isProcessing}
                  className="w-full bg-black/40 border border-gray-800 rounded-xl px-5 py-4 text-white font-bold outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
                  placeholder="dono@exemplo.com"
                  type="email"
                  value={newHouseEmail}
                  onChange={(e) => setNewHouseEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 ml-1">Senha de Acesso</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                  <input 
                    disabled={isProcessing}
                    className="w-full bg-black/40 border border-gray-800 rounded-xl pl-12 pr-5 py-4 text-white font-bold outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
                    placeholder="Senha inicial"
                    type="password"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                  />
                </div>
              </div>

              {status && (
                <div className={`p-4 rounded-xl text-xs font-bold flex items-start gap-3 animate-in zoom-in-95 ${
                  status.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <span>{status.msg}</span>
                </div>
              )}

              <button 
                disabled={isProcessing}
                className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 font-semibold py-4 rounded-xl  transition-all text-xs flex items-center justify-center gap-2 ring-1 ring-inset ring-emerald-500/30"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : 'Liberar Acesso Agora'}
              </button>
            </form>
          </div>
        </section>

        <section className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between ml-2">
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              <Home className="text-amber-500" /> Clubes Autorizados ({houses.length})
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full py-20 text-center text-gray-600">Carregando clubes...</div>
            ) : houses.map(houseRecord => (
              <div key={houseRecord.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 group transition-all hover:border-emerald-500/30 relative shadow-lg">
                <div className="absolute top-6 right-6 flex gap-2">
                  <button 
                    onClick={() => setViewingHouseId(houseRecord.slug || houseRecord.id)} 
                    className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500/25 transition-all hover:text-emerald-100 flex items-center gap-2 px-3 text-xs font-semibold"
                    title="Simular Acesso"
                  >
                    <Eye size={14}/> Testar Painel
                  </button>
                  <button 
                    onClick={() => handleDeleteHouse(houseRecord.id)} 
                    className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 transition-all hover:text-white"
                    title="Remover Acesso"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
                <div className="flex items-start mb-4">
                  <div className="w-12 h-12 bg-gray-800/50 rounded-xl flex items-center justify-center border border-gray-800">
                    <Trophy className="text-emerald-500" size={24} />
                  </div>
                </div>
                <h3 className="text-white font-semibold text-lg mb-1">{houseRecord.name}</h3>
                <p className="text-gray-500 text-xs mb-4 font-medium">{houseRecord.ownerEmail}</p>
                <div className="mb-3 flex items-center justify-between gap-3">
                  {houseRecord.assinatura ? (
                    <>
                      <span className="text-xs font-bold text-white">{houseRecord.plano ? PLANOS[houseRecord.plano].nome : '—'}</span>
                      <span className={`text-xs font-semibold   ${STATUS_TEXTO[houseRecord.assinatura.status]?.cls || 'text-gray-400'}`}>
                        {STATUS_TEXTO[houseRecord.assinatura.status]?.texto || houseRecord.assinatura.status}
                      </span>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-xs font-semibold text-gray-600 shrink-0">Cortesia</span>
                      <select value={escolhas[houseRecord.id] ?? planoAtual(houseRecord)}
                              onChange={e => setEscolhas(x => ({ ...x, [houseRecord.id]: e.target.value as PlanoId }))}
                              aria-label={`Plano do ${houseRecord.name}`}
                              className="flex-1 min-w-0 bg-black/40 border border-gray-800 rounded-lg px-2 py-1.5 text-xs font-bold text-white outline-none">
                        {LISTA_PLANOS.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                      {escolhas[houseRecord.id] && escolhas[houseRecord.id] !== planoAtual(houseRecord) && (
                        <>
                          <button onClick={() => setConfirmarPlano({ casa: houseRecord, plano: escolhas[houseRecord.id] })}
                                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25">
                            Confirmar
                          </button>
                          <button onClick={() => setEscolhas(x => { const n = { ...x }; delete n[houseRecord.id]; return n; })}
                                  title="Desfazer a escolha" className="shrink-0 text-xs text-gray-500 hover:text-white">
                            Desfazer
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {!houseRecord.assinatura && (() => {
                  const editando = editandoPrazo[houseRecord.id];
                  if (editando !== undefined) {
                    return (
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600 shrink-0">Até</span>
                        <input type="date" value={editando} min={hojeISO()}
                               onChange={e => setEditandoPrazo(x => ({ ...x, [houseRecord.id]: e.target.value }))}
                               aria-label={`Fim da cortesia do ${houseRecord.name}`}
                               className="flex-1 min-w-0 bg-black/40 border border-gray-800 rounded-lg px-2 py-1.5 text-xs font-bold text-white outline-none [color-scheme:dark]" />
                        <button disabled={!editando} onClick={() => setConfirmarPrazo({ casa: houseRecord, ate: editando })}
                                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-40">
                          Confirmar
                        </button>
                        <button onClick={() => setEditandoPrazo(x => { const n = { ...x }; delete n[houseRecord.id]; return n; })}
                                className="shrink-0 text-xs text-gray-500 hover:text-white">Desfazer</button>
                      </div>
                    );
                  }
                  const ate = houseRecord.cortesiaAte;
                  const dias = ate ? diasAte(ate) : null;
                  const cor = dias === null ? 'text-gray-500' : dias < 0 ? 'text-red-400' : dias <= 15 ? 'text-amber-400' : 'text-gray-400';
                  return (
                    <div className="mb-3 flex items-center justify-between gap-2 text-xs">
                      <span className={cor}>
                        {ate === undefined ? 'Cortesia sem prazo definido'
                          : dias! < 0 ? `Cortesia venceu em ${dataBR(ate)} · hora de solicitar a assinatura`
                          : `Cortesia até ${dataBR(ate)} · ${dias === 0 ? 'vence hoje' : `faltam ${dias} dia${dias === 1 ? '' : 's'}`}`}
                      </span>
                      <button onClick={() => setEditandoPrazo(x => ({ ...x, [houseRecord.id]: ate || somarDias(hojeISO(), PRAZO_PADRAO_DIAS) }))}
                              className="shrink-0 font-semibold text-emerald-400 hover:text-emerald-300">
                        {ate ? 'Alterar prazo' : `Definir prazo (${PRAZO_PADRAO_DIAS} dias)`}
                      </button>
                    </div>
                  );
                })()}
                <div className="bg-black/40 rounded-xl p-3 border border-gray-800 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <UserCheck size={12} className="text-emerald-500" />
                     <span className="text-xs font-semibold text-gray-600">{houseRecord.assinatura ? 'Assinante' : 'Acesso Ativo'}</span>
                   </div>
                   <span className="text-xs font-bold text-emerald-500/60 font-mono">URL: /c/{houseRecord.slug || houseRecord.id}</span>
                </div>
              </div>
            ))}
            {!loading && houses.length === 0 && (
              <div className="col-span-full py-20 text-center bg-gray-900/50 rounded-xl border border-dashed border-gray-800 flex flex-col items-center gap-4">
                <AlertCircle size={32} className="text-gray-700" />
                <p className="text-gray-600 font-bold text-xs">Nenhum clube autorizado encontrado.</p>
              </div>
            )}
          </div>
        </section>
      </div>
      <ConfirmationModal
        isOpen={!!confirmarPrazo}
        onClose={() => setConfirmarPrazo(null)}
        onConfirm={() => { const c = confirmarPrazo!; setConfirmarPrazo(null); definirPrazo(c.casa, c.ate); }}
        title="Prazo da cortesia"
        message={confirmarPrazo ? `A cortesia do ${confirmarPrazo.casa.name} vai até ${dataBR(confirmarPrazo.ate)} (${diasAte(confirmarPrazo.ate)} dias a partir de hoje). O acesso não é cortado automaticamente: o prazo serve de lembrete para solicitar a assinatura.` : ''}
        confirmLabel="Salvar prazo"
        variant="warning"
      />
      <ConfirmationModal
        isOpen={!!confirmarPlano}
        onClose={() => setConfirmarPlano(null)}
        onConfirm={() => { const c = confirmarPlano!; setConfirmarPlano(null); definirPlano(c.casa, c.plano); }}
        title="Alterar plano"
        message={confirmarPlano ? mensagemTroca(confirmarPlano.casa, confirmarPlano.plano) : ''}
        confirmLabel="Alterar plano"
        variant="warning"
      />
    </div>
  );
};

export default SuperAdminDashboard;
