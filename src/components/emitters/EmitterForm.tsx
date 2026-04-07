import { useRef, type FormEvent } from 'react';
import { ImagePlus, Save, Trash2, X } from 'lucide-react';

export interface EmitterFormValues {
  name: string;
  cnpjCpf: string;
  address: string;
}

interface EmitterFormProps {
  mode: 'create' | 'edit';
  values: EmitterFormValues;
  logoPreviewUrl: string | null;
  selectedLogoName: string | null;
  isSubmitting: boolean;
  feedbackMessage: string | null;
  feedbackType: 'error' | 'success';
  onChange: (values: EmitterFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectLogo: (file: File) => void;
  onRemoveLogo: () => void;
  onCancel: () => void;
}

export function EmitterForm({
  mode,
  values,
  logoPreviewUrl,
  selectedLogoName,
  isSubmitting,
  feedbackMessage,
  feedbackType,
  onChange,
  onSubmit,
  onSelectLogo,
  onRemoveLogo,
  onCancel,
}: EmitterFormProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-outline-variant/30 bg-surface-container p-5 shadow-lg"
      noValidate
      aria-label={mode === 'create' ? 'Formulário para cadastrar emissor' : 'Formulário para editar emissor'}
    >
      <h3 className="mb-5 text-lg font-black tracking-wide text-on-surface">
        {mode === 'create' ? 'Novo Emissor' : 'Editar Emissor'}
      </h3>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="emitter-name" className="block text-xs font-bold uppercase tracking-[0.12rem] text-on-surface-variant">
            Nome / Razão Social
          </label>
          <input
            id="emitter-name"
            type="text"
            required
            value={values.name}
            onChange={(event) => onChange({ ...values, name: event.target.value })}
            className="h-12 w-full rounded-xl border border-outline bg-surface-container-highest px-4 text-base font-semibold text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            placeholder="Ex: Tech Solutions Ltda"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="emitter-doc" className="block text-xs font-bold uppercase tracking-[0.12rem] text-on-surface-variant">
            CNPJ / CPF
          </label>
          <input
            id="emitter-doc"
            type="text"
            required
            value={values.cnpjCpf}
            onChange={(event) => onChange({ ...values, cnpjCpf: event.target.value })}
            className="h-12 w-full rounded-xl border border-outline bg-surface-container-highest px-4 text-base font-semibold text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            placeholder="00.000.000/0000-00"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="emitter-address" className="block text-xs font-bold uppercase tracking-[0.12rem] text-on-surface-variant">
            Endereço Completo
          </label>
          <textarea
            id="emitter-address"
            required
            value={values.address}
            onChange={(event) => onChange({ ...values, address: event.target.value })}
            rows={3}
            className="w-full rounded-xl border border-outline bg-surface-container-highest p-4 text-base font-semibold text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            placeholder="Rua, número, bairro, cidade - UF"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.12rem] text-on-surface-variant">Logotipo</p>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              onSelectLogo(file);
            }}
          />

          <div className="rounded-xl border border-dashed border-outline bg-surface-container-high p-4">
            {logoPreviewUrl ? (
              <div className="space-y-3">
                <img
                  src={logoPreviewUrl}
                  alt="Pré-visualização do logotipo do emissor"
                  className="mx-auto max-h-36 w-auto rounded-lg object-contain"
                />
                {selectedLogoName && (
                  <p className="truncate text-center text-xs font-semibold text-on-surface-variant">{selectedLogoName}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-surface-container-highest text-sm font-bold text-on-surface hover:bg-surface-bright"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Trocar
                  </button>
                  <button
                    type="button"
                    onClick={onRemoveLogo}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-red-600/90 text-sm font-bold text-white hover:bg-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex h-24 w-full flex-col items-center justify-center rounded-lg bg-surface-container-highest text-on-surface-variant hover:text-primary"
              >
                <ImagePlus className="mb-2 h-6 w-6" />
                <span className="text-sm font-bold">Selecionar logotipo (até 2MB)</span>
              </button>
            )}
          </div>
        </div>

        {feedbackMessage && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-semibold ${
              feedbackType === 'success'
                ? 'border border-emerald-500/60 bg-emerald-950/40 text-emerald-300'
                : 'border border-red-500/60 bg-red-950/40 text-red-300'
            }`}
          >
            {feedbackMessage}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl primary-gradient font-headline text-base font-black text-on-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save className="h-5 w-5" />
            {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Cadastrar Emissor' : 'Salvar Alterações'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-outline bg-surface-container-high text-base font-bold text-on-surface hover:bg-surface-container-highest"
          >
            <X className="h-5 w-5" />
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}
