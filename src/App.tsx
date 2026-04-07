import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AuthStatusNav } from './components/AuthStatusNav';
import { BottomNav } from './components/BottomNav';
import { GenerateScreen } from './screens/GenerateScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { IssuerScreen } from './screens/IssuerScreen';
import { AuthScreen } from './screens/AuthScreen';
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
import type { Customer, Emitter, UserProfile } from './types';

function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-on-background">
      <div className="rounded-2xl border border-outline-variant bg-surface-container px-6 py-5 text-center">
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
        <p className="mt-2 text-sm text-on-surface-variant">
          Não foi possível carregar seu perfil no Supabase. Verifique se a tabela <code>profiles</code> existe com as colunas <code>id</code> e <code>role</code>.
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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authProfile, setAuthProfile] = useState<UserProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
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

  const {
    activeTab,
    setActiveTab,
    history,
    addDocument,
  } = useAppStore();

  const syncSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession?.user) {
      setAuthStatus('unauthenticated');
      setAuthProfile(null);
      setEmitters([]);
      setEmittersError(null);
      setCustomers([]);
      setCustomersError(null);
      setIsAuthLoading(false);
      return;
    }

    try {
      const profile = await ensureUserProfile(nextSession.user);
      setAuthStatus('authenticated');
      setAuthProfile(profile);
      setAuthError(null);
    } catch (error) {
      setAuthStatus('unauthenticated');
      setAuthProfile(null);
      setAuthError(toAuthErrorMessage(error));
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
        setAuthInfo('Conta criada. Confirme o e-mail para concluir o acesso.');
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
      setEmitters([]);
      setEmittersError(null);
      setCustomers([]);
      setCustomersError(null);
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

  if (isAuthLoading || authStatus === 'loading') {
    return <AuthLoadingScreen />;
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
            onSaveDocument={addDocument}
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
            history={history}
            emitters={emitters}
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
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
