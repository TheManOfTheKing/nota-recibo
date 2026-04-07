import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react';

interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface RegisterFormProps {
  isSubmitting: boolean;
  serverError: string | null;
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
  onSwitchToLogin: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'Digite um e-mail válido.';
  }

  if (values.password.length < 6) {
    errors.password = 'A senha deve ter pelo menos 6 caracteres.';
  }

  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'As senhas não conferem.';
  }

  return errors;
}

export function RegisterForm({
  isSubmitting,
  serverError,
  onSubmit,
  onSwitchToLogin,
}: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<RegisterFormErrors>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate({
      email,
      password,
      confirmPassword,
    });
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
      aria-label="Formulário de registro"
    >
      <div className="rounded-xl border border-zinc-300 bg-zinc-100/80 px-4 py-3 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
        <div className="mb-1 flex items-center gap-2 font-bold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Regra de segurança
        </div>
        Novos cadastros ficam <strong>pendentes</strong> até aprovação de um usuário <strong>admin</strong>.
      </div>

      <div className="space-y-2">
        <label htmlFor="register-email" className="block text-sm font-bold tracking-wide text-zinc-800 dark:text-zinc-100">
          E-mail
        </label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'register-email-error' : undefined}
          className="h-14 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 text-lg font-medium text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-primary"
          placeholder="voce@empresa.com"
          required
        />
        {errors.email && (
          <p id="register-email-error" className="text-sm font-medium text-red-700 dark:text-red-300">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="register-password" className="block text-sm font-bold tracking-wide text-zinc-800 dark:text-zinc-100">
          Senha
        </label>
        <div className="relative">
          <input
            id="register-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'register-password-error' : undefined}
            className="h-14 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 pr-14 text-lg font-medium text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-primary"
            placeholder="No mínimo 6 caracteres"
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
          <p id="register-password-error" className="text-sm font-medium text-red-700 dark:text-red-300">
            {errors.password}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="register-confirm-password" className="block text-sm font-bold tracking-wide text-zinc-800 dark:text-zinc-100">
          Confirmar senha
        </label>
        <div className="relative">
          <input
            id="register-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'register-confirm-password-error' : undefined}
            className="h-14 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 pr-14 text-lg font-medium text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-primary"
            placeholder="Repita a senha"
            required
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
            onClick={() => setShowConfirmPassword((value) => !value)}
            className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 transition-colors hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p id="register-confirm-password-error" className="text-sm font-medium text-red-700 dark:text-red-300">
            {errors.confirmPassword}
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
        <UserPlus className="h-5 w-5" />
        {isSubmitting ? 'Criando conta...' : 'Criar conta'}
      </button>

      <button
        type="button"
        onClick={onSwitchToLogin}
        className="h-12 w-full rounded-xl border-2 border-zinc-300 bg-white px-4 text-sm font-bold tracking-wide text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        Já tenho conta
      </button>
    </form>
  );
}
