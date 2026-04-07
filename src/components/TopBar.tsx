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
    <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant/30 bg-background px-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="font-lexend text-2xl font-bold tracking-tight text-primary uppercase">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full border border-outline bg-surface-container-high px-2 py-1 text-xs font-bold tracking-wide text-on-surface">
          <RoleIcon className="h-3.5 w-3.5 text-primary" />
          {roleLabel}
        </div>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sair da conta"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-100 hover:bg-surface-container-high active:scale-95"
        >
          <LogOut className="h-5 w-5 text-on-surface-variant" />
        </button>
      </div>
    </header>
  );
}
