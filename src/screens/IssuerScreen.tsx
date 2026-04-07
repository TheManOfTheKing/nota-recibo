import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Emitter } from '../types';
import { toEmitterErrorMessage } from '../lib/emitters';
import { EmittersList } from '../components/emitters/EmittersList';
import { EmitterForm, type EmitterFormValues } from '../components/emitters/EmitterForm';

interface IssuerScreenProps {
  emitters: Emitter[];
  isLoading: boolean;
  loadError: string | null;
  onCreateEmitter: (payload: {
    name: string;
    cnpjCpf: string;
    address: string;
    logoFile?: File | null;
  }) => Promise<Emitter>;
  onUpdateEmitter: (emitterId: string, payload: {
    name: string;
    cnpjCpf: string;
    address: string;
    logoFile?: File | null;
    removeLogo?: boolean;
  }) => Promise<Emitter>;
  onDeleteEmitter: (emitter: Emitter) => Promise<void>;
}

const EMPTY_FORM: EmitterFormValues = {
  name: '',
  cnpjCpf: '',
  address: '',
};

function toFormValues(emitter: Emitter): EmitterFormValues {
  return {
    name: emitter.name,
    cnpjCpf: emitter.cnpjCpf,
    address: emitter.address,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo do logotipo.'));
    reader.readAsDataURL(file);
  });
}

export function IssuerScreen({
  emitters,
  isLoading,
  loadError,
  onCreateEmitter,
  onUpdateEmitter,
  onDeleteEmitter,
}: IssuerScreenProps) {
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedEmitterId, setSelectedEmitterId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<EmitterFormValues>(EMPTY_FORM);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [selectedLogoName, setSelectedLogoName] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'error' | 'success'>('error');

  const selectedEmitter = useMemo(
    () => emitters.find((emitter) => emitter.id === selectedEmitterId) ?? null,
    [emitters, selectedEmitterId],
  );

  const selectEmitterForEdit = (emitter: Emitter) => {
    setMode('edit');
    setSelectedEmitterId(emitter.id);
    setFormValues(toFormValues(emitter));
    setLogoPreviewUrl(emitter.logoUrl ?? null);
    setSelectedLogoName(null);
    setLogoFile(null);
    setRemoveLogo(false);
    setFeedbackMessage(null);
  };

  const resetToCreate = () => {
    setMode('create');
    setSelectedEmitterId(null);
    setFormValues(EMPTY_FORM);
    setLogoPreviewUrl(null);
    setSelectedLogoName(null);
    setLogoFile(null);
    setRemoveLogo(false);
    setFeedbackMessage(null);
  };

  useEffect(() => {
    if (emitters.length === 0) {
      resetToCreate();
      return;
    }

    if (mode === 'create') {
      return;
    }

    if (!selectedEmitterId) {
      selectEmitterForEdit(emitters[0]);
      return;
    }

    const current = emitters.find((emitter) => emitter.id === selectedEmitterId);
    if (!current) {
      selectEmitterForEdit(emitters[0]);
    }
  }, [emitters, mode, selectedEmitterId]);

  const handleSelectLogo = async (file: File) => {
    try {
      const preview = await readFileAsDataUrl(file);
      setLogoFile(file);
      setSelectedLogoName(file.name);
      setLogoPreviewUrl(preview);
      setRemoveLogo(false);
      setFeedbackMessage(null);
    } catch (error) {
      setFeedbackType('error');
      setFeedbackMessage(toEmitterErrorMessage(error));
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setSelectedLogoName(null);
    setLogoPreviewUrl(null);
    setRemoveLogo(true);
    setFeedbackMessage(null);
  };

  const handleDeleteEmitter = async (emitter: Emitter) => {
    const confirmed = window.confirm(`Deseja excluir o emissor "${emitter.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      await onDeleteEmitter(emitter);
      setFeedbackType('success');
      setFeedbackMessage('Emissor excluído com sucesso.');
      if (selectedEmitterId === emitter.id) {
        resetToCreate();
      }
    } catch (error) {
      setFeedbackType('error');
      setFeedbackMessage(toEmitterErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = formValues.name.trim();
    const cnpjCpf = formValues.cnpjCpf.trim();
    const address = formValues.address.trim();

    if (!name || !cnpjCpf || !address) {
      setFeedbackType('error');
      setFeedbackMessage('Preencha nome, CNPJ/CPF e endereço.');
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      if (mode === 'create' || !selectedEmitter) {
        const created = await onCreateEmitter({
          name,
          cnpjCpf,
          address,
          logoFile,
        });
        selectEmitterForEdit(created);
        setFeedbackType('success');
        setFeedbackMessage('Emissor cadastrado com sucesso.');
      } else {
        const updated = await onUpdateEmitter(selectedEmitter.id, {
          name,
          cnpjCpf,
          address,
          logoFile,
          removeLogo,
        });
        selectEmitterForEdit(updated);
        setFeedbackType('success');
        setFeedbackMessage('Emissor atualizado com sucesso.');
      }
    } catch (error) {
      setFeedbackType('error');
      setFeedbackMessage(toEmitterErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-24 sm:px-6">
      {loadError && (
        <div className="mb-4 rounded-xl border border-red-500/60 bg-red-950/50 px-4 py-3 text-sm font-semibold text-red-300">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <EmitterForm
          mode={mode}
          values={formValues}
          logoPreviewUrl={logoPreviewUrl}
          selectedLogoName={selectedLogoName}
          isSubmitting={isSubmitting}
          feedbackMessage={feedbackMessage}
          feedbackType={feedbackType}
          onChange={setFormValues}
          onSubmit={handleSubmit}
          onSelectLogo={handleSelectLogo}
          onRemoveLogo={handleRemoveLogo}
          onCancel={() => {
            if (selectedEmitter) {
              selectEmitterForEdit(selectedEmitter);
              return;
            }
            resetToCreate();
          }}
        />

        <EmittersList
          emitters={emitters}
          selectedEmitterId={selectedEmitterId}
          isLoading={isLoading}
          onSelectEmitter={selectEmitterForEdit}
          onCreateNew={resetToCreate}
          onDeleteEmitter={handleDeleteEmitter}
        />
      </div>
    </main>
  );
}
