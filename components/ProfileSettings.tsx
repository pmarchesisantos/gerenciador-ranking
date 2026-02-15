
import React, { useState, useRef, useEffect } from 'react';
import { useRanking } from '../context/RankingContext';
import { Save, Plus, Trash2, Instagram, Phone, User, Image as ImageIcon, CheckCircle, Upload, X, Link, Globe } from 'lucide-react';

const ProfileSettings: React.FC = () => {
  const { house, updateProfileData, updateHouseSlug } = useRanking();
  const [logoUrl, setLogoUrl] = useState(house.profile?.logoUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(house.profile?.instagramUrl || '');
  const [houseSlug, setHouseSlug] = useState(house.slug || '');
  const [contacts, setContacts] = useState(house.profile?.contacts || [{ name: '', phone: '' }]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estados quando o house carregar
  useEffect(() => {
    if (house.id) {
      setLogoUrl(house.profile?.logoUrl || '');
      setInstagramUrl(house.profile?.instagramUrl || '');
      setHouseSlug(house.slug || house.id);
      setContacts(house.profile?.contacts || [{ name: '', phone: '' }]);
    }
  }, [house.id]);

  const handleAddContact = () => {
    setContacts([...contacts, { name: '', phone: '' }]);
  };

  const handleRemoveContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleContactChange = (index: number, field: 'name' | 'phone', value: string) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("A imagem é muito grande. Por favor, escolha uma imagem com menos de 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      // Atualizar Slug se mudou
      if (houseSlug !== house.slug) {
        await updateHouseSlug(houseSlug);
      }

      await updateProfileData({
        logoUrl,
        instagramUrl,
        contacts: contacts.filter(c => c.name.trim() !== '' && c.phone.trim() !== '')
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Erro ao salvar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">Dados do Perfil</h2>
        <p className="text-gray-400 text-sm">Personalize como seu clube aparece para os jogadores.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-8 flex flex-col items-center text-center space-y-4">
             <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Logo do Clube</label>
             
             <div 
                onClick={triggerFileInput}
                className="w-40 h-40 bg-black/40 rounded-[2.5rem] border-2 border-dashed border-gray-800 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-emerald-500 transition-all shadow-2xl"
             >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon size={32} className="text-gray-700 group-hover:text-emerald-500 transition-colors" />
                    <span className="text-[9px] font-black text-gray-600 uppercase">Escolher Foto</span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-emerald-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                   <Upload size={24} className="mb-1" />
                   <p className="text-[10px] font-black uppercase px-2">Trocar Imagem</p>
                </div>
             </div>

             <input 
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
             />

             <div className="w-full space-y-2">
               <label className="text-[9px] font-black text-gray-700 uppercase tracking-widest block text-left ml-1">Ou cole uma URL</label>
               <input 
                  type="text" 
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-gray-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500 transition-all placeholder:text-gray-700"
                  value={logoUrl.startsWith('data:') ? '' : logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
               />
             </div>
             
             <p className="text-[9px] text-gray-600 font-bold uppercase tracking-tight leading-relaxed">
               PNG, JPG ou GIF.<br/>Tamanho máx: 1MB.
             </p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* Endereço URL Personalizado */}
          <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <Globe size={80} />
             </div>
             <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-gray-800 pb-4">
                <Link className="text-amber-500" size={18} /> Endereço do Ranking (URL)
             </h3>
             <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">URL Personalizada</label>
                  <div className="flex items-center bg-black/40 border border-gray-800 rounded-2xl overflow-hidden focus-within:border-emerald-500 transition-all">
                     <span className="pl-4 py-4 text-gray-600 font-bold text-xs">/c/</span>
                     <input 
                        type="text"
                        placeholder="nome-do-seu-clube"
                        className="flex-1 bg-transparent border-none py-4 px-1 text-white font-bold outline-none"
                        value={houseSlug}
                        onChange={(e) => setHouseSlug(e.target.value)}
                     />
                  </div>
                </div>
                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                   <p className="text-[10px] text-amber-500/80 leading-relaxed">
                     <strong>Dica:</strong> Use um nome curto e fácil de lembrar. Seus jogadores acessarão o ranking através do link: <br/>
                     <code className="text-amber-500 font-black mt-1 block">rankmanager.com/c/{houseSlug || 'seu-clube'}</code>
                   </p>
                </div>
             </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-8 space-y-6">
             <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Phone className="text-emerald-500" size={18} /> Contatos de Suporte
                </h3>
                <button 
                  onClick={handleAddContact}
                  className="p-2 bg-emerald-600/10 text-emerald-500 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                >
                  <Plus size={16} />
                </button>
             </div>

             <div className="space-y-4">
                {contacts.map((contact, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-black/20 p-4 rounded-2xl border border-gray-800/50">
                    <div className="flex-1 space-y-1 w-full">
                      <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Responsável</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" size={14} />
                        <input 
                          type="text"
                          placeholder="Ex: João da House"
                          className="w-full bg-black/40 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-all"
                          value={contact.name}
                          onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1 w-full">
                      <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" size={14} />
                        <input 
                          type="text"
                          placeholder="(11) 99999-9999"
                          className="w-full bg-black/40 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-all"
                          value={contact.phone}
                          onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                        />
                      </div>
                    </div>
                    {contacts.length > 1 && (
                      <button 
                        onClick={() => handleRemoveContact(index)}
                        className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-8 space-y-6">
             <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-gray-800 pb-4">
                <Instagram className="text-pink-500" size={18} /> Redes Sociais
             </h3>
             <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Link do Instagram</label>
                <div className="relative">
                   <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                   <input 
                      type="text"
                      placeholder="https://instagram.com/seuclube"
                      className="w-full bg-black/40 border border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-white font-bold focus:border-emerald-500 outline-none transition-all"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                   />
                </div>
             </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
             <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-900/30 uppercase text-xs tracking-widest"
             >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={18} />
                    Salvar Perfil
                  </>
                )}
             </button>
             {saved && (
               <div className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase animate-in slide-in-from-left-4">
                  <CheckCircle size={18} />
                  Salvo!
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
