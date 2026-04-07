import { useState } from 'react';
import { FileText, Shield } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';

type AuthMode = 'login' | 'register';

interface AuthCredentials {
  email: string;
  password: string;
}

interface AuthScreenProps {
  isSubmitting: boolean;
  errorMessage: string | null;
  infoMessage: string | null;
  onLogin: (credentials: AuthCredentials) => Promise<void>;
  onRegister: (credentials: AuthCredentials) => Promise<void>;
}

export function AuthScreen({
  isSubmitting,
  errorMessage,
  infoMessage,
  onLogin,
  onRegister,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-zinc-100 px-4 py-10 text-zinc-900 dark:bg-background dark:text-on-background">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-md rounded-2xl border-2 border-zinc-200 bg-white/95 p-6 shadow-2xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <header className="mb-6">
          <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-zinc-300 bg-zinc-100 px-4 py-2 text-xs font-bold tracking-widest text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            <FileText className="h-4 w-4 text-primary" />
            PWA RECIBOS
          </div>
          <h1 className="font-headline text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cadastro com aprovação de administrador e controle de perfil <strong>admin/user</strong>.
          </p>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-zinc-300 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`h-11 rounded-lg text-sm font-extrabold tracking-wide transition-colors ${
              mode === 'login'
                ? 'bg-zinc-900 text-white dark:bg-primary dark:text-on-primary'
                : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`h-11 rounded-lg text-sm font-extrabold tracking-wide transition-colors ${
              mode === 'register'
                ? 'bg-zinc-900 text-white dark:bg-primary dark:text-on-primary'
                : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            Registro
          </button>
        </div>

        {infoMessage && (
          <div className="mb-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {infoMessage}
          </div>
        )}

        {mode === 'login' ? (
          <LoginForm
            isSubmitting={isSubmitting}
            serverError={errorMessage}
            onSubmit={onLogin}
            onSwitchToRegister={() => setMode('register')}
          />
        ) : (
          <RegisterForm
            isSubmitting={isSubmitting}
            serverError={errorMessage}
            onSubmit={onRegister}
            onSwitchToLogin={() => setMode('login')}
          />
        )}

        <footer className="mt-6 rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-3 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          <div className="mb-1 flex items-center gap-2 font-bold">
            <Shield className="h-4 w-4 text-primary" />
            Regras de acesso
          </div>
          Novas contas entram como <strong>pendentes</strong> e só acessam o app após aprovação de um <strong>admin</strong>.
        </footer>
      </section>
    </main>
  );
}
