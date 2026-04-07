import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';

interface LoginFormValues {
  email: string;
  password: string;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
}

interface LoginFormProps {
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (values: LoginFormValues) => Promise<void>;
  onSwitchToRegister: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'Digite um e-mail válido.';
  }

  if (values.password.length < 6) {
    errors.password = 'A senha deve ter pelo menos 6 caracteres.';
  }

  return errors;
}

export function LoginForm({
  isSubmitting,
  serverError,
  onSubmit,
  onSwitchToRegister,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate({ email, password });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit({
      email: email.trim(),
      password,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-5"
      noValidate
      aria-label="Formulário de login"
    >
      <div className="space-y-2">
        <label htmlFor="login-email" className="block text-sm font-bold tracking-wide text-zinc-800 dark:text-zinc-100">
          E-mail
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          className="h-14 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 text-lg font-medium text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-primary"
          placeholder="voce@empresa.com"
          required
        />
        {errors.email && (
          <p id="login-email-error" className="text-sm font-medium text-red-700 dark:text-red-300">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="login-password" className="block text-sm font-bold tracking-wide text-zinc-800 dark:text-zinc-100">
          Senha
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            className="h-14 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 pr-14 text-lg font-medium text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-primary"
            placeholder="******"
            required
          />
          <button
            type="button"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 transition-colors hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && (
          <p id="login-password-error" className="text-sm font-medium text-red-700 dark:text-red-300">
            {errors.password}
          </p>
        )}
      </div>

      {serverError && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-lg font-extrabold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-primary dark:text-on-primary"
      >
        <LogIn className="h-5 w-5" />
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </button>

      <button
        type="button"
        onClick={onSwitchToRegister}
        className="h-12 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 text-sm font-bold tracking-wide text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        Criar nova conta
      </button>
    </form>
  );
}
