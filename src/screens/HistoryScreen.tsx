import { useState } from 'react';
import { DocumentRecord, IssuerProfile } from '../types';
import { Search, SlidersHorizontal, Download } from 'lucide-react';
import { generatePDF } from '../utils/pdfGenerator';

interface HistoryScreenProps {
  history: DocumentRecord[];
  profiles: IssuerProfile[];
}

export function HistoryScreen({ history, profiles }: HistoryScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = history.filter(doc => 
    doc.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = (doc: DocumentRecord) => {
    const issuer = profiles.find(p => p.id === doc.issuerId) || profiles[0];
    if (issuer) {
      generatePDF(doc, issuer);
    } else {
      alert('Emissor não encontrado para este documento. Configure um emissor primeiro.');
    }
  };

  return (
    <main className="pt-24 pb-32 px-4 max-w-lg mx-auto">
      <div className="mb-8">
        <h2 className="font-headline text-3xl font-extrabold tracking-tight mb-2">HISTÓRICO DE DOCUMENTOS</h2>
        <p className="text-on-surface-variant text-sm font-medium tracking-wide">
          Visualize e baixe segundas vias de seus registros anteriores.
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        <div className="flex-1 bg-surface-container-highest rounded-xl flex items-center px-4 h-12">
          <Search className="w-5 h-5 text-outline mr-3" />
          <input 
            type="text" 
            placeholder="Buscar por cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-outline w-full text-sm font-medium"
          />
        </div>
        <button className="bg-surface-container-high w-12 h-12 flex items-center justify-center rounded-xl hover:bg-surface-bright transition-colors active:scale-95">
          <SlidersHorizontal className="w-5 h-5 text-primary" />
        </button>
      </div>

      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center text-on-surface-variant py-8">
            Nenhum documento encontrado.
          </div>
        ) : (
          filteredHistory.map((doc) => (
            <div key={doc.id} className={`bg-surface-container-low rounded-xl p-5 border-l-4 flex flex-col gap-4 shadow-sm ${doc.type === 'receipt' ? 'border-primary/40' : 'border-on-tertiary-fixed-variant'}`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${doc.type === 'receipt' ? 'text-primary-fixed-dim' : 'text-on-surface-variant'}`}>
                    TIPO: {doc.type === 'receipt' ? 'Recibo' : 'Nota'}
                  </span>
                  <h3 className="font-headline font-bold text-lg leading-tight">{doc.customerName}</h3>
                </div>
                <div className="text-right">
                  <p className={`font-headline font-black text-xl ${doc.type === 'receipt' ? 'text-primary' : 'text-on-surface'}`}>
                    R$ {doc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-on-surface-variant font-medium">{doc.date}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-4 border-t border-outline-variant/10">
                <div className="flex gap-2">
                  <span className="bg-surface-container-highest text-tertiary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">
                    {doc.status}
                  </span>
                </div>
                <button 
                  onClick={() => handleDownload(doc)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider active:scale-95 transition-all ${doc.type === 'receipt' ? 'bg-secondary-container text-on-secondary-container hover:bg-secondary-dim' : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright'}`}
                >
                  <Download className="w-4 h-4" />
                  BAIXAR 2ª VIA
                </button>
              </div>
            </div>
          ))
        )}
        <div className="h-8"></div>
      </div>
    </main>
  );
}
