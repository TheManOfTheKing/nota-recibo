import { Building2, Pencil, Trash2 } from 'lucide-react';
import type { Emitter } from '../../types';

interface EmittersListProps {
  emitters: Emitter[];
  selectedEmitterId: string | null;
  isLoading: boolean;
  onSelectEmitter: (emitter: Emitter) => void;
  onCreateNew: () => void;
  onDeleteEmitter: (emitter: Emitter) => void;
}

export function EmittersList({
  emitters,
  selectedEmitterId,
  isLoading,
  onSelectEmitter,
  onCreateNew,
  onDeleteEmitter,
}: EmittersListProps) {
  return (
    <section className="rounded-2xl border border-outline-variant/30 bg-surface-container p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black tracking-wide text-on-surface">Emissores Cadastrados</h3>
        <button
          type="button"
          onClick={onCreateNew}
          aria-label="Criar novo emissor"
          className="min-h-11 rounded-lg border border-outline bg-surface-container-high px-3 py-2 text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-highest"
        >
          Novo
        </button>
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm font-semibold text-on-surface-variant">Carregando emissores...</p>
      ) : emitters.length === 0 ? (
        <p className="py-6 text-center text-sm font-semibold text-on-surface-variant">
          Nenhum emissor encontrado. Cadastre o primeiro emissor no formulário ao lado.
        </p>
      ) : (
        <ul className="space-y-3">
          {emitters.map((emitter) => {
            const isSelected = emitter.id === selectedEmitterId;

            return (
              <li
                key={emitter.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-primary bg-surface-container-high'
                    : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container-high'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectEmitter(emitter)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-label={`Selecionar emissor ${emitter.name}`}
                  >
                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-on-surface">{emitter.name}</p>
                      <p className="truncate text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                        CNPJ/CPF: {emitter.cnpjCpf}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectEmitter(emitter)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-surface-container-highest text-on-surface hover:text-primary"
                    aria-label={`Editar emissor ${emitter.name}`}
                  >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEmitter(emitter)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-red-900/50 text-red-300 hover:bg-red-800"
                    aria-label={`Excluir emissor ${emitter.name}`}
                  >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
