import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthStatusNav } from './components/AuthStatusNav';
import { BottomNav } from './components/BottomNav';
import { GenerateScreen } from './screens/GenerateScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { IssuerScreen } from './screens/IssuerScreen';
import { AuthScreen } from './screens/AuthScreen';
import { UsersScreen } from './screens/UsersScreen';
import { useAppStore } from './store';
import { supabase } from './lib/supabase';
import {
  ensureUserProfile,
  signInWithPassword,
  signOutCurrentUser,
  signUpWithPassword,
  toAuthErrorMessage,
} from './lib/auth';
import {
  approveUser,
  listManagedUsers,
  rejectAndRemoveUser,
  toAdminUsersErrorMessage,
  updateUserRole,
} from './lib/adminUsers';
import {
  createEmitter,
  deleteEmitter,
  listEmitters,
  toEmitterErrorMessage,
  updateEmitter,
  type UpsertEmitterInput,
} from './lib/emitters';
import {
  createClient,
  deleteClient,
  listClients,
  toClientErrorMessage,
  updateClient,
  type UpsertClientInput,
} from './lib/clients';
import {
  createPromissoryNoteDocument,
  createReceiptDocument,
  listDocuments,
  toDocumentErrorMessage,
  toDocumentsLoadErrorMessage,
} from './lib/documents';
import type { Customer, DocumentRecord, Emitter, ManagedUser, UserProfile, UserRole } from './types';

function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-on-background">
      <div className="rounded-2xl border border-outline-variant bg-surface-container px-6 py-5 text-center" role="status" aria-live="polite">
        <p className="text-sm font-bold tracking-widest text-on-surface-variant">AUTENTICANDO</p>
        <p className="mt-2 text-base font-medium text-on-surface">Carregando sua sessão...</p>
      </div>
    </main>
  );
}

function MissingProfileScreen({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-on-background">
      <div className="max-w-md rounded-2xl border border-red-500/40 bg-surface-container p-6">
        <h2 className="text-xl font-bold">Falha ao carregar perfil</h2>
        <p className="mt-2 text-sm text-on-surface-variant" role="alert">
          Não foi possível carregar seu perfil no Supabase. Verifique se a tabela <code>profiles</code> existe com as colunas{' '}
          <code>id</code>, <code>email</code>, <code>role</code> e <code>approval_status</code>.
        </p>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="mt-5 h-12 w-full rounded-xl bg-red-600 font-bold text-white transition-transform active:scale-[0.99]"
        >
          Sair da conta
        </button>
      </div>
    </main>
  );
}

function PendingApprovalScreen({
  email,
  isSigningOut,
  onSignOut,
}: {
  email: string;
  isSigningOut: boolean;
  onSignOut: () => Promise<void>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-on-background">
      <section className="w-full max-w-md rounded-2xl border border-amber-500/50 bg-surface-container p-6">
        <p className="text-xs font-extrabold uppercase tracking-widest text-amber-300">Aguardando aprovação</p>
        <h1 className="mt-2 text-2xl font-black text-on-surface">Conta criada com sucesso</h1>
        <p className="mt-3 text-sm text-on-surface-variant" role="status" aria-live="polite">
          A conta <strong>{email}</strong> está pendente de aprovação por um administrador.
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">
          Você poderá acessar o aplicativo assim que um admin aprovar seu cadastro e definir seu papel.
        </p>
        <button
          type="button"
          onClick={() => void onSignOut()}
          disabled={isSigningOut}
          className="mt-6 h-12 w-full rounded-xl bg-primary px-4 text-sm font-bold text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSigningOut ? 'Saindo...' : 'Sair da conta'}
        </button>
      </section>
    </main>
  );
}

type AuthStatus = 'loading' | 'authenticated' | 'pending_approval' | 'unauthenticated';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authProfile, setAuthProfile] = useState<UserProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [emitters, setEmitters] = useState<Emitter[]>([]);
  const [isEmittersLoading, setIsEmittersLoading] = useState(false);
  const [emittersError, setEmittersError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [isManagedUsersLoading, setIsManagedUsersLoading] = useState(false);
  const [managedUsersError, setManagedUsersError] = useState<string | null>(null);

  const { activeTab, setActiveTab } = useAppStore();

  const clearProtectedState = () => {
    setEmitters([]);
    setEmittersError(null);
    setCustomers([]);
    setCustomersError(null);
    setDocuments([]);
    setDocumentsError(null);
    setManagedUsers([]);
    setManagedUsersError(null);
  };

  const syncSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession?.user) {
      setAuthStatus('unauthenticated');
      setAuthProfile(null);
      clearProtectedState();
      setIsAuthLoading(false);
      return;
    }

    try {
      const profile = await ensureUserProfile(nextSession.user);
      setAuthProfile(profile);
      setAuthError(null);
      setAuthStatus(profile.approvalStatus === 'approved' ? 'authenticated' : 'pending_approval');
      if (profile.approvalStatus !== 'approved') {
        clearProtectedState();
      }
    } catch (error) {
      setAuthStatus('unauthenticated');
      setAuthProfile(null);
      setAuthError(toAuthErrorMessage(error));
      clearProtectedState();
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const {
        data: { session: initialSession },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(toAuthErrorMessage(error));
        setAuthStatus('unauthenticated');
        setIsAuthLoading(false);
        return;
      }

      await syncSession(initialSession);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  useEffect(() => {
    if (activeTab === 'users' && authProfile?.role !== 'admin') {
      setActiveTab('generate');
    }
  }, [activeTab, authProfile?.role, setActiveTab]);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    setIsAuthSubmitting(true);
    setAuthError(null);
    setAuthInfo(null);

    try {
      await signInWithPassword(credentials);
    } catch (error) {
      setAuthError(toAuthErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleRegister = async (credentials: { email: string; password: string }) => {
    setIsAuthSubmitting(true);
    setAuthError(null);
    setAuthInfo(null);

    try {
      const result = await signUpWithPassword(credentials);
      if (result.requiresEmailConfirmation) {
        setAuthInfo('Conta criada. Confirme o e-mail e aguarde a aprovação de um administrador.');
      } else {
        setAuthInfo('Conta criada. Aguarde a aprovação de um administrador para acessar o sistema.');
      }
    } catch (error) {
      setAuthError(toAuthErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOutCurrentUser();
      setActiveTab('generate');
      setAuthInfo(null);
      clearProtectedState();
    } catch (error) {
      setAuthError(toAuthErrorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
  };

  const loadEmitters = useCallback(async (userId: string) => {
    setIsEmittersLoading(true);
    setEmittersError(null);
    try {
      const rows = await listEmitters(userId);
      setEmitters(rows);
    } catch (error) {
      setEmittersError(toEmitterErrorMessage(error));
    } finally {
      setIsEmittersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !session?.user?.id) {
      setEmitters([]);
      setEmittersError(null);
      setIsEmittersLoading(false);
      return;
    }

    void loadEmitters(session.user.id);
  }, [authStatus, loadEmitters, session?.user?.id]);

  const loadCustomers = useCallback(async (userId: string) => {
    setIsCustomersLoading(true);
    setCustomersError(null);
    try {
      const rows = await listClients(userId);
      setCustomers(rows);
    } catch (error) {
      setCustomersError(toClientErrorMessage(error));
    } finally {
      setIsCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !session?.user?.id) {
      setCustomers([]);
      setCustomersError(null);
      setIsCustomersLoading(false);
      return;
    }

    void loadCustomers(session.user.id);
  }, [authStatus, loadCustomers, session?.user?.id]);

  const loadDocuments = useCallback(async (userId: string) => {
    setIsDocumentsLoading(true);
    setDocumentsError(null);
    try {
      const rows = await listDocuments(userId);
      setDocuments(rows);
    } catch (error) {
      setDocumentsError(toDocumentsLoadErrorMessage(error));
    } finally {
      setIsDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !session?.user?.id) {
      setDocuments([]);
      setDocumentsError(null);
      setIsDocumentsLoading(false);
      return;
    }

    void loadDocuments(session.user.id);
  }, [authStatus, loadDocuments, session?.user?.id]);

  const loadManagedUsers = useCallback(async () => {
    setIsManagedUsersLoading(true);
    setManagedUsersError(null);
    try {
      const users = await listManagedUsers();
      setManagedUsers(users);
    } catch (error) {
      setManagedUsersError(toAdminUsersErrorMessage(error));
    } finally {
      setIsManagedUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated' || authProfile?.role !== 'admin') {
      setManagedUsers([]);
      setManagedUsersError(null);
      setIsManagedUsersLoading(false);
      return;
    }

    void loadManagedUsers();
  }, [authStatus, authProfile?.role, loadManagedUsers]);

  const handleApproveUser = async (targetUserId: string, role: UserRole) => {
    if (authProfile?.role !== 'admin') {
      throw new Error('Apenas administradores podem aprovar usuários.');
    }

    try {
      await approveUser(targetUserId, role);
      await loadManagedUsers();
    } catch (error) {
      throw new Error(toAdminUsersErrorMessage(error));
    }
  };

  const handleUpdateUserRole = async (targetUserId: string, role: UserRole) => {
    if (authProfile?.role !== 'admin') {
      throw new Error('Apenas administradores podem alterar papel de usuário.');
    }

    try {
      await updateUserRole(targetUserId, role);
      await loadManagedUsers();
    } catch (error) {
      throw new Error(toAdminUsersErrorMessage(error));
    }
  };

  const handleRejectUser = async (targetUserId: string) => {
    if (authProfile?.role !== 'admin') {
      throw new Error('Apenas administradores podem rejeitar usuários.');
    }

    try {
      await rejectAndRemoveUser(targetUserId);
      await loadManagedUsers();
    } catch (error) {
      throw new Error(toAdminUsersErrorMessage(error));
    }
  };

  const handleCreateEmitter = async (payload: UpsertEmitterInput): Promise<Emitter> => {
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    const created = await createEmitter(session.user.id, payload);
    setEmitters((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
    return created;
  };

  const handleUpdateEmitter = async (emitterId: string, payload: UpsertEmitterInput): Promise<Emitter> => {
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    const updated = await updateEmitter(session.user.id, emitterId, payload);
    setEmitters((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  };

  const handleDeleteEmitter = async (emitter: Emitter): Promise<void> => {
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    await deleteEmitter(session.user.id, emitter);
    setEmitters((prev) => prev.filter((item) => item.id !== emitter.id));
  };

  const handleCreateCustomer = async (payload: UpsertClientInput): Promise<Customer> => {
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    const created = await createClient(session.user.id, payload);
    setCustomers((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
    return created;
  };

  const handleUpdateCustomer = async (customerId: string, payload: UpsertClientInput): Promise<Customer> => {
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    const updated = await updateClient(session.user.id, customerId, payload);
    setCustomers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    return updated;
  };

  const handleDeleteCustomer = async (customer: Customer): Promise<void> => {
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    await deleteClient(session.user.id, customer.id);
    setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
  };

  const handleCreateReceiptDocument = async (payload: {
    emitter: Emitter;
    customer: Customer;
    amount: number;
    description: string;
  }) => {
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    try {
      const record = await createReceiptDocument({
        userId: session.user.id,
        emitter: payload.emitter,
        customer: payload.customer,
        amount: payload.amount,
        description: payload.description,
      });
      setDocuments((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
      return record;
    } catch (error) {
      throw new Error(toDocumentErrorMessage(error));
    }
  };

  const handleCreatePromissoryNoteDocument = async (payload: {
    emitter: Emitter;
    customer: Customer;
    amount: number;
    description: string;
    dueDate: string;
    status: 'pending' | 'paid' | 'cancelled';
  }) => {
    if (!session?.user?.id) {
      throw new Error('Usuário não autenticado.');
    }

    const parsedDueDate = new Date(`${payload.dueDate}T00:00:00`);
    if (Number.isNaN(parsedDueDate.getTime())) {
      throw new Error('Data de vencimento inválida.');
    }

    try {
      const record = await createPromissoryNoteDocument({
        userId: session.user.id,
        emitter: payload.emitter,
        customer: payload.customer,
        amount: payload.amount,
        description: payload.description,
        dueDate: parsedDueDate,
        status: payload.status,
      });
      setDocuments((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
      return record;
    } catch (error) {
      throw new Error(toDocumentErrorMessage(error));
    }
  };

  if (isAuthLoading || authStatus === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (authStatus === 'pending_approval' && session?.user) {
    return (
      <PendingApprovalScreen
        email={session.user.email ?? 'Usuário sem e-mail'}
        isSigningOut={isSigningOut}
        onSignOut={handleSignOut}
      />
    );
  }

  if (authStatus !== 'authenticated' || !session?.user) {
    return (
      <AuthScreen
        isSubmitting={isAuthSubmitting}
        errorMessage={authError}
        infoMessage={authInfo}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  if (!authProfile) {
    return <MissingProfileScreen onSignOut={handleSignOut} />;
  }

  const getTitle = () => {
    switch (activeTab) {
      case 'generate':
        return 'Gerador de Documentos';
      case 'customers':
        return 'Banco de Clientes';
      case 'history':
        return 'Histórico';
      case 'issuer':
        return 'Configurações do Emissor';
      case 'users':
        return 'Gestão de Usuários';
      default:
        return 'App';
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col">
      <AuthStatusNav
        title={getTitle()}
        authStatus="authenticated"
        userEmail={session.user.email ?? 'Usuário sem e-mail'}
        userRole={authProfile.role}
        isSigningOut={isSigningOut}
        onSignOut={handleSignOut}
      />

      <div className="flex-1">
        {activeTab === 'generate' && (
          <GenerateScreen
            customers={customers}
            emitters={emitters}
            onCreateReceiptDocument={handleCreateReceiptDocument}
            onCreatePromissoryNoteDocument={handleCreatePromissoryNoteDocument}
            onGoToHistory={() => setActiveTab('history')}
          />
        )}
        {activeTab === 'customers' && (
          <CustomersScreen
            customers={customers}
            isLoading={isCustomersLoading}
            loadError={customersError}
            onCreateCustomer={handleCreateCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        )}
        {activeTab === 'history' && (
          <HistoryScreen
            documents={documents}
            isLoading={isDocumentsLoading}
            loadError={documentsError}
            onRefresh={async () => {
              if (!session?.user?.id) {
                return;
              }
              await loadDocuments(session.user.id);
            }}
          />
        )}
        {activeTab === 'issuer' && (
          <IssuerScreen
            emitters={emitters}
            isLoading={isEmittersLoading}
            loadError={emittersError}
            onCreateEmitter={handleCreateEmitter}
            onUpdateEmitter={handleUpdateEmitter}
            onDeleteEmitter={handleDeleteEmitter}
          />
        )}
        {activeTab === 'users' && authProfile.role === 'admin' && (
          <UsersScreen
            currentUserId={session.user.id}
            users={managedUsers}
            isLoading={isManagedUsersLoading}
            loadError={managedUsersError}
            onRefresh={loadManagedUsers}
            onApproveUser={handleApproveUser}
            onUpdateUserRole={handleUpdateUserRole}
            onRejectUser={handleRejectUser}
          />
        )}
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} isAdmin={authProfile.role === 'admin'} />
    </div>
  );
}
