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
import type { UserProfile } from './types';

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

  const {
    activeTab,
    setActiveTab,
    customers,
    addCustomer,
    profiles,
    addProfile,
    updateProfile,
    history,
    addDocument,
  } = useAppStore();

  const syncSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession?.user) {
      setAuthStatus('unauthenticated');
      setAuthProfile(null);
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
    } catch (error) {
      setAuthError(toAuthErrorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
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
            profiles={profiles}
            onSaveDocument={addDocument}
            onGoToHistory={() => setActiveTab('history')}
          />
        )}
        {activeTab === 'customers' && (
          <CustomersScreen
            customers={customers}
            onAddCustomer={addCustomer}
          />
        )}
        {activeTab === 'history' && (
          <HistoryScreen
            history={history}
            profiles={profiles}
          />
        )}
        {activeTab === 'issuer' && (
          <IssuerScreen
            profiles={profiles}
            onSaveProfile={(profile) => {
              const exists = profiles.find((existing) => existing.id === profile.id);
              if (exists) {
                updateProfile(profile);
              } else {
                addProfile(profile);
              }
            }}
          />
        )}
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
