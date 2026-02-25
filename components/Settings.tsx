
import React, { useState } from 'react';
import { useRanking } from '../context/RankingContext';
import { useAuth } from '../context/AuthContext';
import { Save, Info, Key, ShieldCheck, Settings as SettingsIcon, AlertCircle, CheckCircle, Wallet, Plus, Trash2, Edit2, Percent, Trophy } from 'lucide-react';
import { GameCategory } from '../types';

const Settings: React.FC = () => {
  const { activeRanking, updateScoringConfig, updateGameCategories } = useRanking();
  const { updateUserPassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'scoring' | 'security' | 'values'>('scoring');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdStatus, setPwdStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [editingCategory, setEditingCategory] = useState<Partial<GameCategory> | null>(null);

  if (!activeRanking) return <div className="p-8 text-gray-500">Selecione um ranking...</div>;

  const handleScoreChange = (pos: number, val: string) => {
    updateScoringConfig({
      ...activeRanking.scoringConfig,
      [pos]: Number(val)
    });
  };

  const handleBaseChange = (val: string) => {
    updateScoringConfig({
      ...activeRanking.scoringConfig,
      baseAttendance: Number(val)
    });
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdStatus(null);
    if (newPassword.length < 6) {
      setPwdStatus({type: 'error', msg: 'A senha deve ter pelo menos 6 caracteres.'});
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdStatus({type: 'error', msg: 'As senhas não coincidem.'});
      return;
    }
    setIsUpdating(true);
    try {
      await updateUserPassword(newPassword);
      setPwdStatus({type: 'success', msg: 'Senha atualizada com sucesso!'});
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdStatus({type: 'error', msg: 'Erro ao atualizar.'});
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!editingCategory || !editingCategory.name) return;
    const currentCategories = activeRanking.gameCategories || [];
    let updatedCategories;
    if (editingCategory.id) {
      updatedCategories = currentCategories.map(c => c.id === editingCategory.id ? (editingCategory as GameCategory) : c);
    } else {
      const newCategory = {
        ...editingCategory,
        id: Date.now().toString(),
        rake: editingCategory.rake || 0,
        rankingPercent: editingCategory.rankingPercent || 0
      } as GameCategory;
      updatedCategories = [...currentCategories, newCategory];
    }
    await updateGameCategories(updatedCategories);
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Deseja excluir esta categoria?')) {
      const updatedCategories = (activeRanking.gameCategories || []).filter(c => c.id !== id);
      await updateGameCategories(updatedCategories);
    }
  };

  // Helper Senior para inputs numéricos: Seleção automática e bloqueio de scroll
  const inputNumericProps = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
    onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
    inputMode: "numeric" as const,
  };

  const positions = Array.from({ length: 25 }, (_, i) => i + 1);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white mb-1">Configurações</h2>
        <p className="text-gray-400 text-sm">Gerencie as regras do ranking, valores e a segurança da sua conta.</p>
      </header>

      <div className="flex gap-4 border-b border-gray-800 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('scoring')}
          className={`pb-4 px-6 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'scoring' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <SettingsIcon size={16} /> Pontuação
        </button>
        <button 
          onClick={() => setActiveTab('values')}
          className={`pb-4 px-6 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'values' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Wallet size={16} /> Parametrização de Valores
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`pb-4 px-6 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'security' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <Key size={16} /> Segurança
        </button>
      </div>

      {activeTab === 'scoring' && (
        <div className="animate-in fade-in duration-300 space-y-8">
          <div className="bg-amber-600/10 border border-amber-600/30 rounded-2xl p-6 flex gap-4 items-start">
            <Info className="text-amber-500 mt-1 shrink-0" />
            <div>
              <h4 className="text-amber-500 font-bold mb-1">Regra de Cálculo</h4>
              <p className="text-amber-100/70 text-sm leading-relaxed">
                A pontuação final da etapa é calculada somando os <strong>Pontos de Posição</strong> + <strong>Pontos de Presença</strong>. 
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-4">Pontos por Posição</h3>
              <div className="flex flex-col gap-y-3 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                {positions.map(pos => (
                  <div key={pos} className="flex items-center justify-between border-b border-gray-800/50 pb-2">
                    <label className="text-gray-400 font-medium">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded mr-3 text-[10px] font-black ${
                        pos === 1 ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 
                        pos <= 3 ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30' :
                        'bg-gray-800 text-gray-500'
                      }`}>
                        {pos}º
                      </span>
                      Lugar
                    </label>
                    <input 
                      type="number"
                      {...inputNumericProps}
                      className="bg-black/50 border border-gray-700 rounded-lg px-3 py-2 w-24 text-right text-emerald-400 font-bold focus:border-emerald-500 outline-none"
                      value={activeRanking.scoringConfig[pos] || 0}
                      onChange={(e) => handleScoreChange(pos, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6 h-fit">
              <h3 className="text-xl font-bold text-white border-b border-gray-800 pb-4">Bônus de Presença</h3>
              <div className="mt-6 flex items-center justify-between">
                <label className="text-gray-400 font-medium text-sm">Pontos Base</label>
                <input 
                  type="number"
                  {...inputNumericProps}
                  className="bg-black/50 border border-gray-700 rounded-lg px-4 py-2 w-32 text-right text-emerald-400 focus:border-emerald-500 outline-none"
                  value={activeRanking.scoringConfig.baseAttendance}
                  onChange={(e) => handleBaseChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'values' && (
        <div className="animate-in fade-in duration-300 space-y-8">
           <div className="flex justify-between items-center">
             <h3 className="text-xl font-bold text-white">Categorias de Jogos</h3>
             <button 
               onClick={() => setEditingCategory({ name: '', buyIn: 0, reBuy: 0, reBuyDuplo: 0, addOn: 0, rake: 0, rankingPercent: 0 })}
               className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
             >
               <Plus size={16} /> Nova Categoria
             </button>
           </div>

           {editingCategory && (
             <div className="bg-gray-900 border border-emerald-500/50 rounded-3xl p-8 space-y-6 animate-in zoom-in-95">
                <h4 className="text-lg font-black text-white uppercase tracking-widest">{editingCategory.id ? 'Editar' : 'Nova'} Categoria</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome</label>
                     <input 
                        className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-emerald-500"
                        placeholder="Ex: Jogo de Segunda"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Buy-in (R$)</label>
                     <input 
                        type="number" {...inputNumericProps}
                        className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-emerald-500"
                        value={editingCategory.buyIn}
                        onChange={(e) => setEditingCategory({...editingCategory, buyIn: Number(e.target.value)})}
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Re-buy (R$)</label>
                     <input 
                        type="number" {...inputNumericProps}
                        className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-emerald-500"
                        value={editingCategory.reBuy}
                        onChange={(e) => setEditingCategory({...editingCategory, reBuy: Number(e.target.value)})}
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Re-buy Duplo (R$)</label>
                     <input 
                        type="number" {...inputNumericProps}
                        className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-emerald-500"
                        value={editingCategory.reBuyDuplo}
                        onChange={(e) => setEditingCategory({...editingCategory, reBuyDuplo: Number(e.target.value)})}
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Add-on (R$)</label>
                     <input 
                        type="number" {...inputNumericProps}
                        className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-emerald-500"
                        value={editingCategory.addOn}
                        onChange={(e) => setEditingCategory({...editingCategory, addOn: Number(e.target.value)})}
                     />
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">RAKE (%)</label>
                     <input 
                        type="number" {...inputNumericProps}
                        className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-emerald-500"
                        value={editingCategory.rake}
                        onChange={(e) => setEditingCategory({...editingCategory, rake: Number(e.target.value)})}
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">% Ranking</label>
                     <input 
                        type="number" {...inputNumericProps}
                        className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none focus:border-emerald-500"
                        value={editingCategory.rankingPercent}
                        onChange={(e) => setEditingCategory({...editingCategory, rankingPercent: Number(e.target.value)})}
                     />
                   </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                   <button onClick={() => setEditingCategory(null)} className="px-6 py-3 text-gray-500 font-bold uppercase text-[10px]">Cancelar</button>
                   <button onClick={handleSaveCategory} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px]">Salvar</button>
                </div>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {(activeRanking.gameCategories || []).map(cat => (
               <div key={cat.id} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-4 group transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-black text-lg">{cat.name}</h4>
                      <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mt-1">Rake: {cat.rake}% | Rank: {cat.rankingPercent}%</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => setEditingCategory(cat)} className="p-2 text-gray-500 hover:text-white"><Edit2 size={14} /></button>
                      <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-gray-500 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-black/30 p-3 rounded-2xl border border-gray-800 text-[11px]"><p className="text-gray-600 mb-1">Buy-in</p>R$ {cat.buyIn.toFixed(2)}</div>
                    <div className="bg-black/30 p-3 rounded-2xl border border-gray-800 text-[11px]"><p className="text-gray-600 mb-1">Re-buy</p>R$ {cat.reBuy.toFixed(2)}</div>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="animate-in fade-in duration-300 max-w-2xl">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 space-y-8">
            <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
              <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-500">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Alterar Senha</h3>
                <p className="text-gray-500 text-xs uppercase font-bold tracking-widest mt-1">Mantenha sua conta protegida</p>
              </div>
            </div>

            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nova Senha</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
                  <input 
                    type="password"
                    className="w-full bg-black/40 border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-white font-bold focus:border-emerald-500 outline-none transition-all"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700" size={18} />
                  <input 
                    type="password"
                    className="w-full bg-black/40 border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-white font-bold focus:border-emerald-500 outline-none transition-all"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {pwdStatus && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 ${
                  pwdStatus.type === 'success' ? 'bg-emerald-600/10 border border-emerald-500/20 text-emerald-500' : 'bg-red-600/10 border border-red-500/20 text-red-500'
                }`}>
                  {pwdStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <span className="text-xs font-bold uppercase tracking-tight">{pwdStatus.msg}</span>
                </div>
              )}

              <button 
                type="submit"
                disabled={isUpdating}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-900/30 uppercase text-xs tracking-widest"
              >
                {isUpdating ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={18} />
                    Atualizar Senha
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
