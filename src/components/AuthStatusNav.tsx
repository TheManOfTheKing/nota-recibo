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
    <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between gap-3 bg-[#0e0e0e] px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <FileText className="h-6 w-6 shrink-0 text-[#00E676]" aria-hidden />
        <h1 className="truncate font-lexend text-lg font-bold tracking-tight text-[#00E676] sm:text-2xl">
          {title}
        </h1>
      </div>

      <nav aria-label="Status de autenticação" className="flex items-center gap-2">
        <div className="hidden items-center gap-1 rounded-full border border-[#484847] bg-[#131313] px-2 py-1 text-[10px] font-bold tracking-wide text-white sm:inline-flex">
          <Wifi className="h-3.5 w-3.5 text-[#00E676]" aria-hidden />
          {authLabel}
        </div>

        <div className="hidden max-w-[180px] truncate rounded-full border border-[#484847] bg-[#131313] px-2 py-1 text-[10px] font-bold tracking-wide text-gray-200 md:block">
          {userEmail}
        </div>

        <div className="inline-flex items-center gap-1 rounded-full border border-[#484847] bg-[#131313] px-2 py-1 text-[10px] font-bold tracking-wide text-white">
          <RoleIcon className="h-3.5 w-3.5 text-[#00E676]" aria-hidden />
          {roleLabel}
        </div>

        <button
          type="button"
          onClick={onSignOut}
          disabled={isSigningOut}
          aria-label="Sair da conta"
          className="inline-flex h-10 items-center justify-center rounded-full bg-[#131313] px-3 text-sm font-bold text-gray-100 transition-colors hover:bg-[#1b1b1b] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="ml-1 hidden sm:inline">{isSigningOut ? 'Saindo...' : 'Sair'}</span>
        </button>
      </nav>
    </header>
  );
}
