import { useState } from 'react';
import { Customer, Emitter, DocumentRecord } from '../types';
import { Search, Calendar, History, Verified, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generatePDF } from '../utils/pdfGenerator';
import { v4 as uuidv4 } from 'uuid';

interface GenerateScreenProps {
  customers: Customer[];
  emitters: Emitter[];
  onSaveDocument: (doc: DocumentRecord) => void;
  onGoToHistory: () => void;
}

export function GenerateScreen({ customers, emitters, onSaveDocument, onGoToHistory }: GenerateScreenProps) {
  const [docType, setDocType] = useState<'receipt' | 'promissory_note'>('receipt');
  const [amount, setAmount] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  const defaultEmitter = emitters[0];

  const handleClientSearch = (val: string) => {
    setClientSearch(val);
    const found = customers.find(c => c.name.toLowerCase() === val.toLowerCase() || c.document === val);
    if (found) {
      setSelectedClient(found);
      setAddress(found.address);
    } else {
      setSelectedClient(null);
    }
  };

  const handleGenerate = async () => {
    if (!defaultEmitter) {
      alert('Por favor, configure os dados do emissor primeiro na aba "Emissor".');
      return;
    }
    if (!amount || !clientSearch || (docType === 'promissory_note' && !dueDate)) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    const numAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(numAmount)) {
      alert('Valor inválido.');
      return;
    }

    const doc: DocumentRecord = {
      id: uuidv4(),
      type: docType,
      customerId: selectedClient?.id || uuidv4(),
      customerName: selectedClient?.name || clientSearch,
      clientAddress: address,
      amount: numAmount,
      date: format(new Date(), 'dd MMM yyyy', { locale: ptBR }).toUpperCase(),
      dueDate: docType === 'promissory_note' ? format(new Date(dueDate), 'dd/MM/yyyy') : undefined,
      description,
      status: docType === 'receipt' ? 'PAGO' : 'EMITIDO',
      issuerId: defaultEmitter.id
    };

    // Generate PDF
    await generatePDF(doc, defaultEmitter);
    
    // Save to history
    onSaveDocument(doc);
    alert('Documento gerado com sucesso!');
  };

  return (
    <main className="flex-1 mt-16 mb-24 px-6 py-8 max-w-2xl mx-auto w-full">
      <div className="bg-surface-container-low p-1.5 rounded-xl flex items-center mb-10 w-full">
        <button 
          onClick={() => setDocType('receipt')}
          className={`flex-1 py-4 px-2 rounded-lg font-headline font-bold text-sm tracking-wide text-center transition-colors ${docType === 'receipt' ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          NOVO RECIBO
        </button>
        <button 
          onClick={() => setDocType('promissory_note')}
          className={`flex-1 py-4 px-2 rounded-lg font-headline font-bold text-sm tracking-wide text-center transition-colors ${docType === 'promissory_note' ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          NOVA NOTA PROMISSÓRIA
        </button>
      </div>

      <section className="space-y-8">
        <div className="flex flex-col gap-3">
          <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">VALOR (R$)</label>
          <div className="bg-surface-container-highest rounded-xl p-4 flex items-center">
            <span className="text-primary-fixed text-2xl font-black mr-2">R$</span>
            <input 
              type="text" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent border-none w-full text-3xl font-lexend font-bold p-0 focus:ring-0 text-on-surface placeholder:text-surface-variant" 
              placeholder="0.00" 
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">CLIENTE (NOME, CPF/CNPJ)</label>
          <div className="relative">
            <input 
              type="text" 
              value={clientSearch}
              onChange={(e) => handleClientSearch(e.target.value)}
              className="w-full bg-surface-container-highest rounded-xl p-5 pr-14 text-lg font-medium border-none focus:ring-0" 
              placeholder="Buscar ou inserir dados..." 
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-primary p-2 bg-surface-container-high rounded-lg active:scale-90 transition-transform">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">ENDEREÇO DO CLIENTE</label>
          <textarea 
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-surface-container-highest rounded-xl p-5 text-lg font-medium border-none focus:ring-0 resize-none" 
            placeholder="Rua, Número, Complemento, Bairro, Cidade - UF" 
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">DATA DE EMISSÃO</label>
            <div className="bg-surface-container-highest rounded-xl p-5 text-lg font-bold flex items-center gap-3">
              <Calendar className="w-5 h-5 text-secondary" />
              <span>{format(new Date(), 'dd MMM, yyyy', { locale: ptBR })}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">RECENTES</label>
            <button onClick={onGoToHistory} className="bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-xl p-5 text-lg font-bold flex items-center justify-center gap-3 text-secondary active:scale-95">
              <History className="w-5 h-5" />
              <span>Histórico</span>
            </button>
          </div>
        </div>

        {docType === 'promissory_note' && (
          <div className="flex flex-col gap-3">
            <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">DATA DE VENCIMENTO</label>
            <input 
              type="date" 
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-surface-container-highest rounded-xl p-5 text-lg font-medium border-none focus:ring-0" 
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">REFERENTE A (DESCRIÇÃO)</label>
          <input 
            type="text" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-surface-container-highest rounded-xl p-5 text-lg font-medium border-none focus:ring-0" 
            placeholder="Ex: Pagamento de honorários mensais" 
          />
        </div>

        <div className="bg-surface-container-low rounded-2xl overflow-hidden p-6 flex items-center gap-6 border border-outline-variant/10">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
            <Verified className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-headline font-bold text-lg leading-tight">Emissão Digital Segura</h4>
            <p className="text-on-surface-variant text-sm font-medium opacity-80">Este documento conterá assinatura digital e carimbo de data oficial.</p>
          </div>
        </div>
      </section>

      <div className="h-12"></div>

      <div className="fixed bottom-24 left-0 w-full px-6 z-40 pointer-events-none max-w-2xl mx-auto right-0">
        <button 
          onClick={handleGenerate}
          className="pointer-events-auto w-full h-[72px] primary-gradient-btn rounded-2xl flex items-center justify-center gap-3 text-on-primary font-headline font-black text-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] active:scale-95 transition-transform"
        >
          <FileText className="w-6 h-6" />
          GERAR PDF DO {docType === 'receipt' ? 'RECIBO' : 'DOCUMENTO'}
        </button>
      </div>
    </main>
  );
}
