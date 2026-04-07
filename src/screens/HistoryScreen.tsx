import { useMemo, useState } from 'react';
import type { DocumentRecord } from '../types';
import { Download, Eye, RefreshCw, Search } from 'lucide-react';

interface HistoryScreenProps {
  documents: DocumentRecord[];
  isLoading: boolean;
  loadError: string | null;
  onRefresh: () => Promise<void>;
}

function getStatusLabel(status: DocumentRecord['status']): string {
  if (status === 'paid') {
    return 'Pago';
  }

  if (status === 'cancelled') {
    return 'Cancelado';
  }

  return 'Pendente';
}

function getTypeLabel(type: DocumentRecord['type']): string {
  return type === 'receipt' ? 'Recibo' : 'Nota promissória';
}

export function HistoryScreen({ documents, isLoading, loadError, onRefresh }: HistoryScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return documents;
    }

    return documents.filter((doc) => {
      return (
        doc.customerName.toLowerCase().includes(query) ||
        doc.description.toLowerCase().includes(query) ||
        getTypeLabel(doc.type).toLowerCase().includes(query)
      );
    });
  }, [documents, searchTerm]);

  const handleViewPdf = (doc: DocumentRecord) => {
    if (!doc.pdfUrl) {
      return;
    }

    window.open(doc.pdfUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadPdf = async (doc: DocumentRecord) => {
    if (!doc.pdfUrl) {
      return;
    }

    setIsDownloadingId(doc.id);
    try {
      const response = await fetch(doc.pdfUrl);
      if (!response.ok) {
        throw new Error('Falha ao baixar PDF do Supabase Storage.');
      }

      const pdfBlob = await response.blob();
      const objectUrl = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${doc.type === 'receipt' ? 'recibo' : 'nota-promissoria'}-${doc.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(doc.pdfUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloadingId(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-32 pt-24 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">HISTÓRICO DE DOCUMENTOS</h2>
          <p className="mt-2 text-sm font-medium tracking-wide text-on-surface-variant">
            Lista completa de recibos e notas promissórias gerados e salvos no Supabase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-outline bg-surface-container-high px-4 text-sm font-bold text-on-surface hover:bg-surface-container-highest"
          aria-label="Atualizar histórico de documentos"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      <div className="mb-5 rounded-xl bg-surface-container-highest">
        <label htmlFor="history-search" className="sr-only">
          Buscar documento por cliente, tipo ou descrição
        </label>
        <div className="flex items-center px-4">
          <Search className="mr-3 h-5 w-5 text-outline" aria-hidden />
          <input
            id="history-search"
            type="text"
            placeholder="Buscar por cliente, tipo ou descrição..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-12 w-full border-none bg-transparent text-sm font-medium text-on-surface placeholder:text-outline focus:ring-0"
          />
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-500/60 bg-red-950/50 px-4 py-3 text-sm font-semibold text-red-300">
          {loadError}
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-6 text-center text-sm font-medium text-on-surface-variant">
            Carregando documentos...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-6 text-center text-sm font-medium text-on-surface-variant">
            Nenhum documento encontrado.
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <article
              key={doc.id}
              className={`rounded-xl border-l-4 bg-surface-container-low p-5 shadow-sm ${
                doc.type === 'receipt' ? 'border-primary/40' : 'border-on-tertiary-fixed-variant'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      doc.type === 'receipt' ? 'text-primary-fixed-dim' : 'text-on-surface-variant'
                    }`}
                  >
                    Tipo: {getTypeLabel(doc.type)}
                  </span>
                  <h3 className="font-headline text-lg font-bold leading-tight text-on-surface">{doc.customerName}</h3>
                  <p className="text-xs font-medium text-on-surface-variant">Data: {doc.date}</p>
                </div>

                <div className="text-right">
                  <p className={`font-headline text-xl font-black ${doc.type === 'receipt' ? 'text-primary' : 'text-on-surface'}`}>
                    R$ {doc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="inline-flex rounded-full bg-surface-container-highest px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-tertiary">
                    {getStatusLabel(doc.status)}
                  </span>
                </div>
              </div>

              {doc.description && (
                <p className="mt-3 text-sm font-medium text-on-surface-variant">{doc.description}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant/10 pt-4">
                <button
                  type="button"
                  onClick={() => handleViewPdf(doc)}
                  disabled={!doc.pdfUrl}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-secondary-container px-4 text-xs font-bold uppercase tracking-wider text-on-secondary-container hover:bg-secondary-dim disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Visualizar PDF de ${getTypeLabel(doc.type)} para ${doc.customerName}`}
                >
                  <Eye className="h-4 w-4" />
                  Visualizar
                </button>

                <button
                  type="button"
                  onClick={() => void handleDownloadPdf(doc)}
                  disabled={!doc.pdfUrl || isDownloadingId === doc.id}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-surface-container-highest px-4 text-xs font-bold uppercase tracking-wider text-on-surface hover:bg-surface-bright disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Baixar PDF de ${getTypeLabel(doc.type)} para ${doc.customerName}`}
                >
                  <Download className="h-4 w-4" />
                  {isDownloadingId === doc.id ? 'Baixando...' : 'Baixar PDF'}
                </button>
              </div>
            </article>
          ))
        )}
        <div className="h-8" />
      </div>
    </main>
  );
}
