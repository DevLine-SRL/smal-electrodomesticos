import { useState } from 'react';
import StatusBadge, { STATUS_LABELS } from './StatusBadge';
import { showToast } from '../toast';
import type {
  ProductStatus,
  StatusChangeSource,
} from '../../../types/products';

interface Props {
  productId: string;
  productName: string;
  initialStatus: ProductStatus;
  initialSource: StatusChangeSource | null;
}

interface PendingChange {
  status: ProductStatus;
  message: string;
}

const CONFIRM_MESSAGES: Record<string, (name: string) => string> = {
  stock_zero: (name) =>
    `"${name}" tiene stock 0. Si lo marcas como disponible aparecerá en el catálogo público sin unidades reales. ¿Continuar?`,
  reverting_sold: (name) =>
    `"${name}" está marcado como vendido. Estás revirtiendo una venta cerrada. ¿Continuar?`,
};

// Desde cualquier estado se puede ir a los otros dos; el servidor decide cuales
// exigen confirmacion adicional.
const ALL_STATUSES: ProductStatus[] = ['available', 'out_of_stock', 'sold'];

export default function ProductStatusControl({
  productId,
  productName,
  initialStatus,
  initialSource,
}: Props) {
  const [status, setStatus] = useState<ProductStatus>(initialStatus);
  const [source, setSource] = useState<StatusChangeSource | null>(
    initialSource,
  );
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingChange | null>(null);

  const submit = async (nextStatus: ProductStatus, force: boolean) => {
    const previousStatus = status;
    const previousSource = source;

    setBusy(true);
    // Actualizacion optimista: se revierte si el servidor rechaza el cambio.
    setStatus(nextStatus);
    setSource('manual');

    try {
      const response = await fetch(`/api/admin/products/${productId}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, force }),
      });

      if (response.ok) {
        showToast(
          `"${productName}" ahora está ${STATUS_LABELS[nextStatus].toLowerCase()}.`,
        );
        return;
      }

      setStatus(previousStatus);
      setSource(previousSource);

      const body = await response.json().catch(() => ({}));

      if (response.status === 409 && CONFIRM_MESSAGES[body.code]) {
        setPending({
          status: nextStatus,
          message: CONFIRM_MESSAGES[body.code](productName),
        });
        return;
      }

      if (response.status === 401 || response.status === 403) {
        showToast(
          'Tu sesión ya no es válida. Vuelve a iniciar sesión.',
          'error',
        );
        window.location.assign('/admin/login');
        return;
      }

      showToast(
        response.status === 404
          ? 'Este producto ya no existe.'
          : 'No se pudo cambiar el estado.',
        'error',
      );
    } catch {
      setStatus(previousStatus);
      setSource(previousSource);
      showToast('Sin conexión con el servidor. Inténtalo de nuevo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const options = ALL_STATUSES.filter((option) => option !== status);

  return (
    <div className="flex flex-col items-start gap-2" aria-busy={busy}>
      <StatusBadge status={status} source={source} />

      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={busy}
            onClick={() => submit(option, false)}
            className="border-border-subtle text-text-secondary hover:border-primary-400 hover:text-primary-400 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {STATUS_LABELS[option]}
          </button>
        ))}
      </div>

      {pending && (
        <div
          role="alertdialog"
          aria-label="Confirmar cambio de estado"
          className="border-warning-400/40 bg-warning-400/10 mt-1 rounded-xl border p-3"
        >
          <p className="text-text-secondary text-xs">{pending.message}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const next = pending.status;
                setPending(null);
                void submit(next, true);
              }}
              className="bg-primary-400 text-primary-950 hover:bg-primary-300 rounded-full px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50"
            >
              Confirmar
            </button>
            <button
              type="button"
              // Cancelar no dispara ninguna peticion: el estado ya se revirtio.
              onClick={() => setPending(null)}
              className="border-border-subtle text-text-secondary hover:text-text-primary rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
