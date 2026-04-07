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
        <label htmlFor="login-email" className="block text-sm font-bold tracking-wide text-on-surface">
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
          className="h-14 w-full rounded-xl border-2 border-outline bg-surface-container-highest px-4 text-lg font-medium text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
          placeholder="voce@empresa.com"
          required
        />
        {errors.email && (
          <p id="login-email-error" className="text-sm font-medium text-red-300">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="login-password" className="block text-sm font-bold tracking-wide text-on-surface">
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
            className="h-14 w-full rounded-xl border-2 border-outline bg-surface-container-highest px-4 pr-14 text-lg font-medium text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            placeholder="******"
            required
          />
          <button
            type="button"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-1.5 top-1.5 inline-flex h-11 w-11 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && (
          <p id="login-password-error" className="text-sm font-medium text-red-300">
            {errors.password}
          </p>
        )}
      </div>

      {serverError && (
        <div
          className="rounded-xl border-2 border-red-500/60 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-300"
          role="alert"
          aria-live="assertive"
        >
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        aria-label="Entrar na conta"
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-extrabold text-on-primary transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <LogIn className="h-5 w-5" />
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </button>

      <button
        type="button"
        onClick={onSwitchToRegister}
        aria-label="Alternar para tela de registro"
        className="h-12 w-full rounded-xl border-2 border-outline bg-surface-container-high px-4 text-sm font-bold tracking-wide text-on-surface transition-colors hover:bg-surface-container-highest"
      >
        Criar nova conta
      </button>
    </form>
  );
}
