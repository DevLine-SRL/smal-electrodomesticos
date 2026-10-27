import { useEffect, useState } from 'react';
import { STATUS_LABELS } from './StatusBadge';
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
  quantity: number;
}

interface PendingChange {
  status: ProductStatus;
  message: string;
}

interface ProductUpdatedEvent extends CustomEvent {
  detail: {
    productId: string;
    quantity?: number;
    status?: ProductStatus;
  };
}

const CONFIRM_MESSAGES: Record<string, (name: string) => string> = {
  stock_zero: (name) =>
    `"${name}" tiene stock 0. Si lo marcas como disponible aparecerá en el catálogo público sin unidades reales. ¿Continuar?`,
  reverting_sold: (name) =>
    `"${name}" está marcado como vendido. Estás revirtiendo una venta cerrada. ¿Continuar?`,
};

const ALL_STATUSES: ProductStatus[] = ['available', 'out_of_stock', 'sold'];

const SEGMENT_STYLES: Record<ProductStatus, { active: string; idle: string }> =
  {
    available: {
      active: 'bg-success-500/15 text-success-500 border-success-500/40',
      idle: 'text-text-muted hover:text-success-500',
    },
    out_of_stock: {
      active: 'bg-warning-400/15 text-warning-400 border-warning-400/40',
      idle: 'text-text-muted hover:text-warning-400',
    },
    sold: {
      active: 'bg-error-500/15 text-error-500 border-error-500/40',
      idle: 'text-text-muted hover:text-error-500',
    },
  };

const SOURCE_LABELS: Record<StatusChangeSource, string> = {
  automatic: 'auto',
  manual: 'manual',
};

export default function ProductStatusControl({
  productId,
  productName,
  initialStatus,
  initialSource,
  quantity: initialQuantity,
}: Props) {
  const [status, setStatus] = useState<ProductStatus>(initialStatus);
  const [source, setSource] = useState<StatusChangeSource | null>(
    initialSource,
  );
  const [quantity, setQuantity] = useState(initialQuantity);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [saleDialog, setSaleDialog] = useState(false);

  useEffect(() => {
    const syncProduct = (event: Event) => {
      const detail = (event as ProductUpdatedEvent).detail;
      if (detail?.productId !== productId) return;
      if (typeof detail.quantity === 'number') setQuantity(detail.quantity);
      if (detail.status) {
        setStatus(detail.status);
        setSource('manual');
      }
    };
    window.addEventListener('smal:product-updated', syncProduct);
    return () =>
      window.removeEventListener('smal:product-updated', syncProduct);
  }, [productId]);

  const submit = async (nextStatus: ProductStatus, force: boolean) => {
    const previousStatus = status;
    const previousSource = source;
    setBusy(true);
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
        window.dispatchEvent(
          new CustomEvent('smal:product-updated', {
            detail: { productId, status: nextStatus, quantity },
          }),
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

  const recordSale = async (saleMode: 'unit' | 'lot') => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/sale`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ saleMode }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          showToast(
            'Tu sesión ya no es válida. Vuelve a iniciar sesión.',
            'error',
          );
          window.location.assign('/admin/login');
          return;
        }
        showToast(
          body.code === 'no_stock'
            ? 'No hay unidades disponibles para registrar esa venta.'
            : body.code === 'already_sold'
              ? 'Este producto ya está marcado como vendido.'
              : 'No se pudo registrar la venta. Inténtalo nuevamente.',
          'error',
        );
        return;
      }

      const product = body.product as {
        quantity: number;
        status: ProductStatus;
      };
      setQuantity(product.quantity);
      setStatus(product.status);
      setSource(product.status === 'sold' ? 'manual' : source);
      setSaleDialog(false);
      showToast(
        saleMode === 'unit'
          ? `Venta de una unidad de "${productName}" registrada.`
          : `El lote de "${productName}" quedó marcado como vendido.`,
      );
      window.dispatchEvent(
        new CustomEvent('smal:product-updated', {
          detail: {
            productId,
            quantity: product.quantity,
            status: product.status,
          },
        }),
      );
    } catch {
      showToast('Sin conexión con el servidor. Inténtalo de nuevo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2" aria-busy={busy}>
      <div className="bg-background-soft border-border-subtle inline-flex rounded-lg border p-0.5">
        {ALL_STATUSES.map((option) => {
          const isActive = option === status;
          const styles = SEGMENT_STYLES[option];
          return (
            <button
              key={option}
              type="button"
              disabled={busy || isActive}
              onClick={() =>
                option === 'sold'
                  ? setSaleDialog(true)
                  : void submit(option, false)
              }
              title={
                isActive && source
                  ? `Último cambio: ${SOURCE_LABELS[source]}`
                  : undefined
              }
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all disabled:cursor-default ${
                isActive
                  ? `border ${styles.active}`
                  : `${styles.idle} border border-transparent`
              }`}
            >
              {STATUS_LABELS[option]}
            </button>
          );
        })}
      </div>

      {source && (
        <span
          className="text-text-disabled text-[10px] font-medium"
          title={
            source === 'automatic'
              ? 'Cambio automático por el sistema'
              : 'Cambio manual por un administrador'
          }
        >
          {SOURCE_LABELS[source]}
        </span>
      )}

      {saleDialog && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Registrar venta del producto"
          className="border-border-subtle bg-background-soft mt-1 w-full rounded-xl border p-3"
        >
          <p className="text-text-primary text-xs font-bold">
            ¿Qué quieres registrar como vendido?
          </p>
          <p className="text-text-muted mt-1 text-xs">
            Stock actual: {quantity} {quantity === 1 ? 'unidad' : 'unidades'}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || quantity < 1}
              onClick={() => void recordSale('unit')}
              className="bg-primary-400 text-primary-950 rounded-lg px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Vender 1 unidad
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void recordSale('lot')}
              className="bg-error-500 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Vender todo el lote
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setSaleDialog(false)}
              className="border-border-subtle text-text-secondary rounded-lg border px-3 py-2 text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {pending && (
        <div
          role="alertdialog"
          aria-label="Confirmar cambio de estado"
          className="border-warning-400/30 bg-warning-400/8 mt-1 rounded-xl border p-3"
        >
          <p className="text-text-secondary text-xs leading-relaxed">
            {pending.message}
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const next = pending.status;
                setPending(null);
                void submit(next, true);
              }}
              className="bg-warning-400 hover:bg-warning-400/80 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
              style={{ color: '#1a1a1a' }}
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-strong rounded-lg border px-3.5 py-1.5 text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
