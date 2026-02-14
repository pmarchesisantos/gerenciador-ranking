
import React, { useState, useEffect } from 'react';
import { db, collection, onSnapshot, setDoc, doc, deleteDoc, getDocs, firebaseConfig, query, where } from '../services/firebase';
import { useRanking } from '../context/RankingContext';
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { Trophy, Plus, Mail, Shield, Trash2, Home, UserCheck, Info, ExternalLink, Key, Loader2, Eraser, AlertCircle, Eye } from 'lucide-react';

interface HouseRecord {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  tempPassword?: string;
  createdAt: string;
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
      console.error("Erro ao escutar mudanças:", error);
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
        tempPassword: tempPassword,
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
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Painel de Administração</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Gerenciamento Global</h1>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Autorize novos clubes ou gerencie os rankings existentes clicando em "Testar Painel".
          </p>
        </div>
        <button 
          onClick={handleClearAll}
          disabled={isProcessing || houses.length === 0}
          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all border border-red-500/20 disabled:opacity-30 uppercase tracking-widest"
        >
          <Eraser size={14} />
          Limpar Todos
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-4">
          <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-8 space-y-6 sticky top-24 shadow-2xl">
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <Plus className="text-emerald-500" /> Autorizar Clube
            </h2>
            
            <form onSubmit={handleAddHouse} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome do Clube</label>
                <input 
                  disabled={isProcessing}
                  className="w-full bg-black/40 border border-gray-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
                  placeholder="Ex: Diamond Poker Club"
                  value={newHouseName}
                  onChange={(e) => setNewHouseName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">E-mail do Proprietário</label>
                <input 
                  disabled={isProcessing}
                  className="w-full bg-black/40 border border-gray-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
                  placeholder="dono@exemplo.com"
                  type="email"
                  value={newHouseEmail}
                  onChange={(e) => setNewHouseEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                  <input 
                    disabled={isProcessing}
                    className="w-full bg-black/40 border border-gray-800 rounded-2xl pl-12 pr-5 py-4 text-white font-bold outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
                    placeholder="Senha inicial"
                    type="password"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                  />
                </div>
              </div>

              {status && (
                <div className={`p-4 rounded-2xl text-xs font-bold flex items-start gap-3 animate-in zoom-in-95 ${
                  status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <span>{status.msg}</span>
                </div>
              )}

              <button 
                disabled={isProcessing}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-900/20 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : 'Liberar Acesso Agora'}
              </button>
            </form>
          </div>
        </section>

        <section className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between ml-2">
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <Home className="text-amber-500" /> Clubes Autorizados ({houses.length})
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full py-20 text-center text-gray-600">Carregando clubes...</div>
            ) : houses.map(houseRecord => (
              <div key={houseRecord.id} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 group transition-all hover:border-emerald-500/30 relative shadow-lg">
                <div className="absolute top-6 right-6 flex gap-2">
                  <button 
                    onClick={() => setViewingHouseId(houseRecord.slug || houseRecord.id)} 
                    className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 transition-all hover:text-white flex items-center gap-2 px-3 text-[10px] font-black uppercase tracking-widest"
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
                  <div className="w-12 h-12 bg-gray-800/50 rounded-2xl flex items-center justify-center border border-gray-800">
                    <Trophy className="text-emerald-500" size={24} />
                  </div>
                </div>
                <h3 className="text-white font-black text-lg mb-1">{houseRecord.name}</h3>
                <p className="text-gray-500 text-xs mb-4 font-medium">{houseRecord.ownerEmail}</p>
                <div className="bg-black/40 rounded-xl p-3 border border-gray-800 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <UserCheck size={12} className="text-emerald-500" />
                     <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Acesso Ativo</span>
                   </div>
                   <span className="text-[10px] font-bold text-emerald-500/60 font-mono">URL: /c/{houseRecord.slug || houseRecord.id}</span>
                </div>
              </div>
            ))}
            {!loading && houses.length === 0 && (
              <div className="col-span-full py-20 text-center bg-gray-900/50 rounded-[2.5rem] border border-dashed border-gray-800 flex flex-col items-center gap-4">
                <AlertCircle size={32} className="text-gray-700" />
                <p className="text-gray-600 font-bold uppercase text-[10px] tracking-widest">Nenhum clube autorizado encontrado.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
