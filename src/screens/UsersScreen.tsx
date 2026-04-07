import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ShieldAlert, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ManagedUser, UserRole } from '../types';

interface UsersScreenProps {
  currentUserId: string;
  users: ManagedUser[];
  isLoading: boolean;
  loadError: string | null;
  onRefresh: () => Promise<void>;
  onApproveUser: (targetUserId: string, role: UserRole) => Promise<void>;
  onUpdateUserRole: (targetUserId: string, role: UserRole) => Promise<void>;
  onRejectUser: (targetUserId: string) => Promise<void>;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

function roleBadgeClass(role: UserRole): string {
  if (role === 'admin') {
    return 'border border-blue-400/60 bg-blue-950/40 text-blue-300';
  }
  return 'border border-outline bg-surface-container-highest text-on-surface';
}

function statusBadgeClass(status: ManagedUser['approvalStatus']): string {
  if (status === 'approved') {
    return 'border border-emerald-500/60 bg-emerald-950/40 text-emerald-300';
  }
  return 'border border-amber-500/60 bg-amber-950/40 text-amber-300';
}

export function UsersScreen({
  currentUserId,
  users,
  isLoading,
  loadError,
  onRefresh,
  onApproveUser,
  onUpdateUserRole,
  onRejectUser,
}: UsersScreenProps) {
  const [roleSelections, setRoleSelections] = useState<Record<string, UserRole>>({});
  const [isSubmittingFor, setIsSubmittingFor] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'error' | 'success'>('success');

  useEffect(() => {
    const next: Record<string, UserRole> = {};
    for (const user of users) {
      next[user.id] = user.role;
    }
    setRoleSelections(next);
  }, [users]);

  const pendingUsers = useMemo(
    () => users.filter((user) => user.approvalStatus === 'pending'),
    [users],
  );
  const approvedUsers = useMemo(
    () => users.filter((user) => user.approvalStatus === 'approved'),
    [users],
  );

  const updateSelection = (userId: string, role: UserRole) => {
    setRoleSelections((prev) => ({ ...prev, [userId]: role }));
  };

  const getSelection = (user: ManagedUser): UserRole => roleSelections[user.id] ?? user.role;

  const executeAction = async (targetUserId: string, action: () => Promise<void>, successMessage: string) => {
    setIsSubmittingFor(targetUserId);
    setFeedbackMessage(null);

    try {
      await action();
      setFeedbackType('success');
      setFeedbackMessage(successMessage);
    } catch (error) {
      setFeedbackType('error');
      setFeedbackMessage(error instanceof Error ? error.message : 'Falha ao atualizar usuário.');
    } finally {
      setIsSubmittingFor(null);
    }
  };

  const handleApprove = async (user: ManagedUser) => {
    await executeAction(
      user.id,
      async () => onApproveUser(user.id, getSelection(user)),
      `Usuário ${user.email ?? user.id} aprovado com sucesso.`,
    );
  };

  const handleUpdateRole = async (user: ManagedUser) => {
    await executeAction(
      user.id,
      async () => onUpdateUserRole(user.id, getSelection(user)),
      `Papel de ${user.email ?? user.id} atualizado com sucesso.`,
    );
  };

  const handleReject = async (user: ManagedUser) => {
    const confirmed = window.confirm(
      `Remover a conta de ${user.email ?? user.id}? Esta ação apaga também os dados vinculados do usuário.`,
    );
    if (!confirmed) {
      return;
    }

    await executeAction(
      user.id,
      async () => onRejectUser(user.id),
      `Usuário ${user.email ?? user.id} removido com sucesso.`,
    );
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-24 sm:px-6">
      <section className="mb-6 rounded-2xl border border-outline-variant/30 bg-surface-container p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-on-surface">Gestão de Usuários</h2>
            <p className="mt-1 text-sm font-medium text-on-surface-variant">
              Aprove contas pendentes, defina papel (<strong>admin</strong> ou <strong>user</strong>) e remova contas rejeitadas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-outline bg-surface-container-high px-4 text-sm font-bold text-on-surface hover:bg-surface-container-highest"
            aria-label="Atualizar lista de usuários"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 px-4 py-3 text-amber-200">
            <p className="text-xs font-bold uppercase tracking-wider">Pendentes</p>
            <p className="mt-1 text-2xl font-black">{pendingUsers.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 px-4 py-3 text-emerald-200">
            <p className="text-xs font-bold uppercase tracking-wider">Aprovados</p>
            <p className="mt-1 text-2xl font-black">{approvedUsers.length}</p>
          </div>
          <div className="rounded-xl border border-blue-500/40 bg-blue-950/20 px-4 py-3 text-blue-200">
            <p className="text-xs font-bold uppercase tracking-wider">Admins</p>
            <p className="mt-1 text-2xl font-black">{approvedUsers.filter((user) => user.role === 'admin').length}</p>
          </div>
        </div>
      </section>

      {loadError && (
        <div
          className="mb-4 rounded-xl border border-red-500/60 bg-red-950/50 px-4 py-3 text-sm font-semibold text-red-300"
          role="alert"
          aria-live="assertive"
        >
          {loadError}
        </div>
      )}

      {feedbackMessage && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
            feedbackType === 'success'
              ? 'border border-emerald-500/60 bg-emerald-950/40 text-emerald-300'
              : 'border border-red-500/60 bg-red-950/40 text-red-300'
          }`}
          role="status"
          aria-live="polite"
        >
          {feedbackMessage}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-300" />
            <h3 className="text-lg font-black text-on-surface">Pendentes de aprovação</h3>
          </div>

          {isLoading ? (
            <p className="rounded-xl bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">Carregando usuários...</p>
          ) : pendingUsers.length === 0 ? (
            <p className="rounded-xl bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">Nenhuma solicitação pendente.</p>
          ) : (
            <ul className="space-y-3">
              {pendingUsers.map((user) => (
                <li key={user.id} className="rounded-xl border border-outline-variant/20 bg-surface-container-high p-4">
                  <p className="truncate text-sm font-bold text-on-surface">{user.email ?? user.id}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Criado em: {formatDateTime(user.createdAt)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${statusBadgeClass(user.approvalStatus)}`}>
                      {user.approvalStatus}
                    </span>
                    <select
                      value={getSelection(user)}
                      onChange={(event) => updateSelection(user.id, event.target.value as UserRole)}
                      className="h-11 rounded-lg border border-outline bg-background px-3 text-sm font-semibold text-on-surface"
                      aria-label={`Papel para ${user.email ?? user.id}`}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleApprove(user)}
                      disabled={isSubmittingFor === user.id}
                      className="inline-flex h-11 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-70"
                      aria-label={`Aprovar usuário ${user.email ?? user.id}`}
                    >
                      <UserCheck className="h-4 w-4" />
                      Aprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReject(user)}
                      disabled={isSubmittingFor === user.id || user.id === currentUserId}
                      className="inline-flex h-11 items-center gap-1 rounded-lg bg-red-700 px-3 text-xs font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Rejeitar e remover usuário ${user.email ?? user.id}`}
                    >
                      <UserX className="h-4 w-4" />
                      Rejeitar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            <h3 className="text-lg font-black text-on-surface">Usuários aprovados</h3>
          </div>

          {isLoading ? (
            <p className="rounded-xl bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">Carregando usuários...</p>
          ) : approvedUsers.length === 0 ? (
            <p className="rounded-xl bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">Nenhum usuário aprovado ainda.</p>
          ) : (
            <ul className="space-y-3">
              {approvedUsers.map((user) => (
                <li key={user.id} className="rounded-xl border border-outline-variant/20 bg-surface-container-high p-4">
                  <p className="truncate text-sm font-bold text-on-surface">{user.email ?? user.id}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Aprovado em: {formatDateTime(user.approvedAt)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${statusBadgeClass(user.approvalStatus)}`}>
                      {user.approvalStatus}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${roleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                    <select
                      value={getSelection(user)}
                      onChange={(event) => updateSelection(user.id, event.target.value as UserRole)}
                      className="h-11 rounded-lg border border-outline bg-background px-3 text-sm font-semibold text-on-surface"
                      aria-label={`Alterar papel de ${user.email ?? user.id}`}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleUpdateRole(user)}
                      disabled={isSubmittingFor === user.id}
                      className="inline-flex h-11 items-center rounded-lg bg-blue-700 px-3 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-70"
                      aria-label={`Atualizar papel do usuário ${user.email ?? user.id}`}
                    >
                      Atualizar papel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReject(user)}
                      disabled={isSubmittingFor === user.id || user.id === currentUserId}
                      className="inline-flex h-11 items-center gap-1 rounded-lg bg-red-700 px-3 text-xs font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Remover usuário ${user.email ?? user.id}`}
                    >
                      <UserX className="h-4 w-4" />
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
