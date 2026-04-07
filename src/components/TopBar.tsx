import { FileText, LogOut, ShieldCheck, User } from 'lucide-react';
import type { UserRole } from '../types';

interface TopBarProps {
  title: string;
  userRole: UserRole;
  onSignOut: () => void;
}

export function TopBar({ title, userRole, onSignOut }: TopBarProps) {
  const roleLabel = userRole === 'admin' ? 'ADMIN' : 'USER';
  const RoleIcon = userRole === 'admin' ? ShieldCheck : User;

  return (
    <header className="fixed top-0 w-full z-50 bg-[#0e0e0e] shadow-none flex justify-between items-center px-6 h-16">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-[#00E676]" />
        <h1 className="font-lexend text-2xl font-bold tracking-tight text-[#00E676] uppercase">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full border border-[#484847] bg-[#131313] px-2 py-1 text-[10px] font-bold tracking-wide text-white">
          <RoleIcon className="h-3.5 w-3.5 text-[#00E676]" />
          {roleLabel}
        </div>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sair da conta"
          className="hover:bg-[#131313] transition-colors p-2 rounded-full active:scale-95 duration-100"
        >
          <LogOut className="w-5 h-5 text-gray-300" />
        </button>
      </div>
    </header>
  );
}
