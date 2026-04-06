import React, { useState, useRef } from 'react';
import { IssuerProfile } from '../types';
import { Upload, Building2, CheckCircle2, Circle, Plus, Save, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface IssuerScreenProps {
  profiles: IssuerProfile[];
  onSaveProfile: (profile: IssuerProfile) => void;
}

export function IssuerScreen({ profiles, onSaveProfile }: IssuerScreenProps) {
  const defaultProfile = profiles.find(p => p.isDefault) || {
    id: uuidv4(),
    name: '',
    document: '',
    address: '',
    isDefault: true
  };

  const [currentProfile, setCurrentProfile] = useState<IssuerProfile>(defaultProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(currentProfile);
    alert('Configurações salvas com sucesso!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentProfile({ ...currentProfile, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentProfile({ ...currentProfile, logoUrl: undefined });
  };

  return (
    <main className="pt-24 pb-32 px-6 max-w-lg mx-auto">
      <section className="mb-10">
        <h2 className="font-headline text-on-surface-variant text-xs font-bold tracking-widest uppercase mb-4">LOGOTIPO</h2>
        <div className="relative group">
          <input 
            type="file" 
            accept="image/png, image/jpeg, image/svg+xml" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleLogoUpload}
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-48 rounded-xl bg-surface-container-high flex flex-col items-center justify-center border-2 border-dashed border-outline-variant hover:border-primary transition-colors cursor-pointer overflow-hidden relative"
          >
            {currentProfile.logoUrl ? (
              <>
                <img src={currentProfile.logoUrl} alt="Logo da Empresa" className="max-h-full max-w-full object-contain p-4" />
                <button 
                  onClick={removeLogo}
                  className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-error text-white transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-on-surface-variant mb-2" />
                <p className="text-sm font-medium text-on-surface-variant">Carregar Logo da Empresa</p>
                <p className="text-[10px] text-outline mt-1 uppercase tracking-tighter">PNG, JPG ou SVG (Máx. 2MB)</p>
              </>
            )}
          </div>
        </div>
      </section>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block font-label text-sm font-bold tracking-wider text-on-surface-variant">NOME DO EMISSOR/RAZÃO SOCIAL</label>
            <input 
              type="text" 
              required
              value={currentProfile.name}
              onChange={e => setCurrentProfile({...currentProfile, name: e.target.value})}
              className="w-full h-14 bg-surface-container-highest border-none rounded-lg px-4 text-on-surface focus:ring-0 focus:border-b-2 focus:border-primary transition-all placeholder:text-outline/50" 
              placeholder="Ex: Tech Solutions Ltda" 
            />
          </div>
          
          <div className="space-y-2">
            <label className="block font-label text-sm font-bold tracking-wider text-on-surface-variant">CNPJ/CPF</label>
            <input 
              type="text" 
              required
              value={currentProfile.document}
              onChange={e => setCurrentProfile({...currentProfile, document: e.target.value})}
              className="w-full h-14 bg-surface-container-highest border-none rounded-lg px-4 text-on-surface focus:ring-0 focus:border-b-2 focus:border-primary transition-all placeholder:text-outline/50" 
              placeholder="00.000.000/0000-00" 
            />
          </div>
          
          <div className="space-y-2">
            <label className="block font-label text-sm font-bold tracking-wider text-on-surface-variant">ENDEREÇO COMPLETO</label>
            <textarea 
              required
              value={currentProfile.address}
              onChange={e => setCurrentProfile({...currentProfile, address: e.target.value})}
              className="w-full bg-surface-container-highest border-none rounded-lg p-4 text-on-surface focus:ring-0 focus:border-b-2 focus:border-primary transition-all placeholder:text-outline/50 resize-none" 
              placeholder="Rua, Número, Complemento, Bairro, Cidade - UF" 
              rows={3}
            />
          </div>
        </div>

        <div className="pt-4">
          <h3 className="font-headline text-on-surface text-lg font-bold mb-4">Perfis Salvos</h3>
          <div className="space-y-3">
            {profiles.map(profile => (
              <div 
                key={profile.id}
                onClick={() => setCurrentProfile(profile)}
                className={`flex items-center justify-between p-4 rounded-xl group transition-colors cursor-pointer ${profile.id === currentProfile.id ? 'bg-surface-container-low' : 'bg-surface-container-low opacity-60 hover:bg-surface-container hover:opacity-100'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${profile.id === currentProfile.id ? 'bg-primary-container/20' : 'bg-surface-container-highest'}`}>
                    <Building2 className={`w-5 h-5 ${profile.id === currentProfile.id ? 'text-primary' : 'text-outline'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{profile.name || 'Novo Perfil'}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase">CNPJ: {profile.document || '---'}</p>
                  </div>
                </div>
                {profile.id === currentProfile.id ? (
                  <CheckCircle2 className="text-primary w-6 h-6" />
                ) : (
                  <Circle className="text-outline w-6 h-6 opacity-0 group-hover:opacity-100" />
                )}
              </div>
            ))}

            <button 
              type="button"
              onClick={() => setCurrentProfile({ id: uuidv4(), name: '', document: '', address: '', isDefault: profiles.length === 0 })}
              className="w-full flex items-center justify-center gap-2 p-4 border border-outline-variant border-dashed rounded-xl text-on-surface-variant hover:text-primary hover:border-primary transition-all text-xs font-bold uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" />
              Adicionar Novo Perfil
            </button>
          </div>
        </div>

        <div className="pt-6">
          <button 
            type="submit"
            className="primary-gradient w-full h-16 rounded-xl flex items-center justify-center gap-3 text-on-primary font-headline font-bold text-lg shadow-[0_10px_20px_rgba(63,255,139,0.2)] active:scale-95 transition-transform"
          >
            <Save className="w-6 h-6" />
            SALVAR ALTERAÇÕES
          </button>
        </div>
      </form>
    </main>
  );
}
