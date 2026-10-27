import { useState } from 'react';

export default function LogoutButton() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    setBusy(true);
    setError(null);
    try {
      // El endpoint responde con un redirect, asi que basta con navegar.
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        setError(
          'No se pudo cerrar la sesión. Revisa tu conexión e inténtalo de nuevo.',
        );
        setBusy(false);
        return;
      }
      window.location.assign(
        response.redirected ? response.url : '/admin/login',
      );
    } catch {
      setBusy(false);
      setError('No se pudo conectar con el servidor. Inténtalo de nuevo.');
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="border-border-subtle text-text-secondary hover:border-error-500 hover:text-error-500 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
      >
        Cerrar sesión
      </button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label="Confirmar cierre de sesión"
      className="flex items-center gap-2"
    >
      {error && (
        <span role="alert" className="text-error-500 text-xs">
          {error}
        </span>
      )}
      <span className="text-text-secondary hidden text-sm sm:inline">
        ¿Cerrar sesión?
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={logout}
        className="bg-error-500 cursor-pointer rounded-full px-3.5 py-2 text-sm font-bold text-white transition-opacity disabled:opacity-60"
      >
        {busy ? 'Saliendo…' : 'Sí, salir'}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirming(false)}
        className="border-border-subtle text-text-secondary hover:text-text-primary cursor-pointer rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}
