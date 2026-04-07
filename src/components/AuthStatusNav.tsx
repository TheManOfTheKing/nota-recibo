import { FileText, LogOut, ShieldCheck, User, Wifi } from 'lucide-react';
import type { UserRole } from '../types';

interface AuthStatusNavProps {
  title: string;
  authStatus: 'authenticated' | 'unauthenticated';
  userEmail: string;
  userRole: UserRole;
  isSigningOut: boolean;
  onSignOut: () => void;
}

export function AuthStatusNav({
  title,
  authStatus,
  userEmail,
  userRole,
  isSigningOut,
  onSignOut,
}: AuthStatusNavProps) {
  const roleLabel = userRole === 'admin' ? 'ADMIN' : 'USER';
  const RoleIcon = userRole === 'admin' ? ShieldCheck : User;
  const authLabel = authStatus === 'authenticated' ? 'Conectado' : 'Desconectado';

  return (
    <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between gap-3 border-b border-outline-variant/30 bg-background px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <FileText className="h-6 w-6 shrink-0 text-primary" aria-hidden />
        <h1 className="truncate font-lexend text-lg font-bold tracking-tight text-primary sm:text-2xl">
          {title}
        </h1>
      </div>

      <nav aria-label="Status de autenticação" className="flex items-center gap-2">
        <div className="hidden items-center gap-1 rounded-full border border-outline bg-surface-container-high px-2 py-1 text-xs font-bold tracking-wide text-on-surface sm:inline-flex">
          <Wifi className="h-3.5 w-3.5 text-primary" aria-hidden />
          {authLabel}
        </div>

        <div className="hidden max-w-[180px] truncate rounded-full border border-outline bg-surface-container-high px-2 py-1 text-xs font-bold tracking-wide text-on-surface md:block">
          {userEmail}
        </div>

        <div className="inline-flex items-center gap-1 rounded-full border border-outline bg-surface-container-high px-2 py-1 text-xs font-bold tracking-wide text-on-surface">
          <RoleIcon className="h-3.5 w-3.5 text-primary" aria-hidden />
          {roleLabel}
        </div>

        <button
          type="button"
          onClick={onSignOut}
          disabled={isSigningOut}
          aria-label="Sair da conta"
          className="inline-flex h-11 items-center justify-center rounded-full border border-outline bg-surface-container-high px-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-70"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="ml-1 hidden sm:inline">{isSigningOut ? 'Saindo...' : 'Sair'}</span>
        </button>
      </nav>
    </header>
  );
}
