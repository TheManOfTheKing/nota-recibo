import { FileText, Users, History, Briefcase } from 'lucide-react';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const navItems = [
    { id: 'generate', icon: FileText, label: 'Gerar' },
    { id: 'customers', icon: Users, label: 'Clientes' },
    { id: 'history', icon: History, label: 'Histórico' },
    { id: 'issuer', icon: Briefcase, label: 'Emissor' },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-[#131313]/70 backdrop-blur-xl z-50 rounded-t-xl border-t border-[#484847]/15 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`flex flex-col items-center justify-center active:scale-90 transition-transform ${
              isActive 
                ? 'text-[#00E676] bg-[#20201f] rounded-xl px-3 py-2' 
                : 'text-gray-500 opacity-60 hover:text-[#00E676]'
            }`}
          >
            <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
            <span className="font-manrope text-[10px] font-bold tracking-wider uppercase">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
