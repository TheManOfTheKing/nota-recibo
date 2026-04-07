import { FileText, Users, History, Briefcase, Shield } from 'lucide-react';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  isAdmin?: boolean;
}

export function BottomNav({ activeTab, onChange, isAdmin = false }: BottomNavProps) {
  const navItems: Array<{ id: TabType; icon: typeof FileText; label: string }> = [
    { id: 'generate', icon: FileText, label: 'Gerar' },
    { id: 'customers', icon: Users, label: 'Clientes' },
    { id: 'history', icon: History, label: 'Histórico' },
    { id: 'issuer', icon: Briefcase, label: 'Emissor' },
  ];

  if (isAdmin) {
    navItems.push({ id: 'users', icon: Shield, label: 'Usuários' });
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-xl border-t border-outline-variant/30 bg-surface-container-low/95 px-4 pb-5 pt-2 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
    >
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            aria-label={`Ir para ${item.label}`}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-12 min-w-16 flex-col items-center justify-center rounded-xl px-3 py-2 transition-transform active:scale-95 ${
              isActive 
                ? 'bg-surface-container-high text-primary' 
                : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
            }`}
          >
            <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
            <span className="font-manrope text-xs font-bold tracking-wider uppercase">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
