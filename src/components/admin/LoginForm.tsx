import { useEffect, useRef, useState } from 'react';

interface Props {
  next: string;
}

type FieldErrors = { email?: string; password?: string };

const INPUT_CLASS =
  'border-border-subtle bg-background-soft text-text-primary placeholder:text-text-disabled focus:border-primary-500 w-full rounded-xl border px-4 py-2.5 text-sm transition-colors outline-none';
const INPUT_ERROR_CLASS = 'border-error-500 focus:border-error-500';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fallos que no son de credenciales: se explican por si mismos al admin. */
const AUTH_CONFIG_MESSAGES: Record<string, string> = {
  email_provider_disabled:
    'El inicio de sesión por email está desactivado en el proyecto de Supabase.',
  email_not_confirmed: 'Esta cuenta todavía no tiene el correo confirmado.',
  signup_disabled: 'El registro está deshabilitado en el proyecto de Supabase.',
};

const validate = (email: string, password: string): FieldErrors => {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = 'Ingresa tu correo electrónico.';
  else if (!EMAIL_PATTERN.test(email.trim()))
    errors.email = 'El correo electrónico no tiene un formato válido.';
  if (!password) errors.password = 'Ingresa tu contraseña.';
  return errors;
};

const formatCountdown = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export default function LoginForm({ next }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Cuenta regresiva del bloqueo temporal por intentos fallidos.
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setLockSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockSeconds]);

  const locked = lockSeconds > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    // La validacion por campo ocurre antes de cualquier peticion al servidor.
    const errors = validate(email, password);
    setFieldErrors(errors);
    if (errors.email) {
      emailRef.current?.focus();
      return;
    }
    if (errors.password) {
      passwordRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, next }),
      });

      const body = await response.json().catch(() => ({}));

      if (response.ok) {
        // Recarga completa para que el middleware valide con cookies frescas.
        window.location.assign(body.redirectTo ?? '/admin');
        return;
      }

      if (response.status === 423) {
        setLockSeconds(body.remainingSeconds ?? 900);
        setFormError(
          'Demasiados intentos fallidos. La cuenta quedó bloqueada temporalmente.',
        );
      } else if (response.status === 401) {
        setFormError(
          typeof body.attemptsLeft === 'number'
            ? `Credenciales inválidas. Te quedan ${body.attemptsLeft} intento(s).`
            : 'Credenciales inválidas.',
        );
      } else if (response.status === 403) {
        setFormError('Esta cuenta no tiene acceso al panel de administración.');
      } else if (response.status === 429) {
        setFormError(
          'Demasiadas peticiones al servidor de autenticación. Espera un momento.',
        );
      } else if (response.status === 502) {
        // No son credenciales malas: el proveedor de email esta apagado, la
        // cuenta no esta confirmada o algo similar en la configuracion.
        setFormError(
          AUTH_CONFIG_MESSAGES[body.authCode] ??
            'El servicio de autenticación no está disponible. Avisa al administrador del proyecto.',
        );
      } else if (response.status === 503) {
        setFormError(
          'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
        );
      } else {
        setFormError('Ocurrió un error inesperado. Inténtalo de nuevo.');
      }
    } catch {
      // fetch solo rechaza cuando la peticion no llego a salir.
      setFormError(
        'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="mt-7 flex flex-col gap-5"
      onSubmit={handleSubmit}
      noValidate
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-text-secondary text-sm font-semibold">
          Correo electrónico
        </span>
        <input
          ref={emailRef}
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          placeholder="admin@smal.local"
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          className={`${INPUT_CLASS} ${fieldErrors.email ? INPUT_ERROR_CLASS : ''}`}
        />
        {fieldErrors.email && (
          <span id="email-error" className="text-error-500 text-xs font-medium">
            {fieldErrors.email}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-text-secondary text-sm font-semibold">
          Contraseña
        </span>
        <span className="relative flex items-center">
          <input
            ref={passwordRef}
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? 'password-error' : undefined
            }
            className={`${INPUT_CLASS} pr-12 ${fieldErrors.password ? INPUT_ERROR_CLASS : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={
              showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
            aria-pressed={showPassword}
            className="text-text-muted hover:text-text-primary absolute right-3 text-xs font-semibold transition-colors"
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </span>
        {fieldErrors.password && (
          <span
            id="password-error"
            className="text-error-500 text-xs font-medium"
          >
            {fieldErrors.password}
          </span>
        )}
      </label>

      {formError && (
        <p
          role="alert"
          className="border-error-500/40 bg-error-500/10 text-error-500 rounded-xl border px-4 py-2.5 text-sm font-medium"
        >
          {formError}
          {locked && (
            <span className="mt-1 block font-normal">
              Vuelve a intentarlo en {formatCountdown(lockSeconds)}.
            </span>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || locked}
        aria-busy={submitting}
        className="bg-primary-400 text-primary-950 hover:bg-primary-300 shadow-primary hover:shadow-accent mt-1 w-full rounded-full px-6 py-3 text-sm font-bold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
