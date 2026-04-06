import React, { useState } from 'react';
import { Customer } from '../types';
import { Search, Users, UserPlus, User, ChevronRight, Plus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface CustomersScreenProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
}

export function CustomersScreen({ customers, onAddCustomer }: CustomersScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    document: '',
    phone: '',
    address: ''
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document.includes(searchTerm)
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomer({
      id: uuidv4(),
      ...newCustomer,
      createdAt: new Date().toISOString()
    });
    setIsModalOpen(false);
    setNewCustomer({ name: '', document: '', phone: '', address: '' });
  };

  return (
    <main className="pt-24 px-6 space-y-8 pb-32 max-w-lg mx-auto">
      <section className="w-full">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-on-surface-variant" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar clientes por nome..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary focus:outline-none transition-all font-body text-md shadow-lg"
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container-low p-5 rounded-xl flex flex-col justify-between h-32 border border-outline-variant/10">
          <Users className="w-6 h-6 text-primary-fixed" />
          <div>
            <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">Total Clientes</p>
            <p className="text-2xl font-headline font-black">{customers.length}</p>
          </div>
        </div>
        <div className="bg-surface-container-low p-5 rounded-xl flex flex-col justify-between h-32 border border-outline-variant/10">
          <UserPlus className="w-6 h-6 text-secondary" />
          <div>
            <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">Novos (Mês)</p>
            <p className="text-2xl font-headline font-black">+{customers.filter(c => new Date(c.createdAt).getMonth() === new Date().getMonth()).length}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-6">Listagem Recente</h2>
        
        {filteredCustomers.length === 0 ? (
          <div className="text-center text-on-surface-variant py-8">
            Nenhum cliente encontrado.
          </div>
        ) : (
          filteredCustomers.map((customer, idx) => (
            <div key={customer.id} className={`p-6 rounded-xl space-y-4 hover:bg-surface-bright active:scale-[0.98] transition-all cursor-pointer group ${idx % 2 === 0 ? 'bg-surface-container-high shadow-xl' : 'bg-surface-container-low shadow-md border border-outline-variant/5'}`}>
              <div className="flex justify-between items-start">
                <div className="flex gap-4 items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${idx % 2 === 0 ? 'bg-primary/10 border-primary/20' : 'bg-secondary/10 border-secondary/20'}`}>
                    <User className={`w-6 h-6 ${idx % 2 === 0 ? 'text-primary' : 'text-secondary'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">NOME</p>
                    <h3 className="text-lg font-headline font-bold text-on-surface">{customer.name}</h3>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-on-surface-variant group-hover:text-primary transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">CPF/CNPJ</p>
                  <p className="font-body font-medium text-sm">{customer.document}</p>
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">TELEFONE</p>
                  <p className="font-body font-medium text-sm">{customer.phone}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 w-16 h-16 primary-gradient rounded-xl shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40 border-t border-white/20"
      >
        <Plus className="w-8 h-8 text-on-primary" strokeWidth={3} />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-high w-full max-w-md rounded-2xl p-6 shadow-2xl border border-outline-variant/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-xl font-bold">Novo Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <X className="w-6 h-6 text-on-surface-variant" />
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <label className="block font-label text-xs font-bold tracking-wider text-on-surface-variant">NOME COMPLETO</label>
                <input required type="text" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full h-12 bg-surface-container-highest border-none rounded-lg px-4 text-on-surface focus:ring-0 focus:border-b-2 focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="block font-label text-xs font-bold tracking-wider text-on-surface-variant">CPF/CNPJ</label>
                <input required type="text" value={newCustomer.document} onChange={e => setNewCustomer({...newCustomer, document: e.target.value})} className="w-full h-12 bg-surface-container-highest border-none rounded-lg px-4 text-on-surface focus:ring-0 focus:border-b-2 focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="block font-label text-xs font-bold tracking-wider text-on-surface-variant">TELEFONE</label>
                <input required type="text" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full h-12 bg-surface-container-highest border-none rounded-lg px-4 text-on-surface focus:ring-0 focus:border-b-2 focus:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="block font-label text-xs font-bold tracking-wider text-on-surface-variant">ENDEREÇO COMPLETO</label>
                <textarea required value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} className="w-full bg-surface-container-highest border-none rounded-lg p-4 text-on-surface focus:ring-0 focus:border-b-2 focus:border-primary transition-all resize-none" rows={3} />
              </div>
              
              <button type="submit" className="w-full h-14 primary-gradient rounded-xl font-headline font-bold text-on-primary mt-6 active:scale-95 transition-transform">
                SALVAR CLIENTE
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
