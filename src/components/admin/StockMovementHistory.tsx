import { useState } from 'react';
import { showToast } from './toast';

type HistoryKind = 'stock' | 'price' | 'status';

interface HistoryEntry {
  id: string;
  kind: HistoryKind;
  created_at: string;
  userName: string | null;
  title: string;
  detail: string;
}

export default function StockMovementHistory({
  productId,
}: {
  productId: string;
}) {
  const [open, setOpen] = useState(false);
  const [movements, setMovements] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const toggle = async () => {
    if (!open && !loaded) {
      const response = await fetch(`/api/admin/products/${productId}/history`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        return showToast('No se pudo cargar el historial.', 'error');
      setMovements(Array.isArray(body.history) ? body.history : []);
      setLoaded(true);
    }
    setOpen((value) => !value);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => void toggle()}
        className="text-text-muted hover:text-primary-300 text-xs font-semibold"
      >
        Historial
      </button>
      {open && (
        <div className="border-border-subtle bg-background-soft mt-2 max-h-56 overflow-auto rounded-lg border p-2 text-xs">
          {movements.length === 0 ? (
            <p className="text-text-muted p-1">Sin movimientos registrados.</p>
          ) : (
            movements.map((movement) => (
              <div
                key={movement.id}
                className="border-border-subtle border-b px-1 py-2 last:border-0"
              >
                <span
                  className={
                    movement.kind === 'status'
                      ? 'text-primary-400 font-bold'
                      : movement.kind === 'price'
                        ? 'text-success-500 font-bold'
                        : 'text-warning-400 font-bold'
                  }
                >
                  {movement.title}
                </span>
                <div className="text-text-secondary mt-1">{movement.detail}</div>
                <div className="text-text-muted mt-1">
                  {movement.userName ?? 'Sistema'} ·{' '}
                  {new Date(movement.created_at).toLocaleString('es-BO')}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
