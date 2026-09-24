import { useState } from 'react';
import { showToast } from './toast';

interface Movement { id: string; movement_type: 'adjustment' | 'deduction'; quantity_change: number; quantity_before: number; quantity_after: number; reason: string | null; created_at: string }

export default function StockMovementHistory({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false); const [movements, setMovements] = useState<Movement[]>([]); const [loaded, setLoaded] = useState(false);
  const toggle = async () => {
    if (!open && !loaded) {
      const response = await fetch(`/api/admin/products/${productId}/stock-history`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return showToast('No se pudo cargar el historial.', 'error');
      setMovements(body.movements); setLoaded(true);
    }
    setOpen((value) => !value);
  };
  return <div><button type="button" onClick={() => void toggle()} className="text-text-muted hover:text-primary-300 text-xs font-semibold">Historial</button>{open && <div className="border-border-subtle bg-background-soft mt-2 max-h-40 overflow-auto rounded-lg border p-2 text-xs">{movements.length === 0 ? <p className="text-text-muted p-1">Sin movimientos registrados.</p> : movements.map((movement) => <div key={movement.id} className="border-border-subtle border-b px-1 py-2 last:border-0"><span className="text-warning-400 font-bold">{movement.movement_type === 'deduction' ? 'Resta' : 'Ajuste'}: {movement.quantity_change} u.</span> · {movement.quantity_before} → {movement.quantity_after}<br /><span className="text-text-muted">{movement.reason || 'Sin motivo'} · {new Date(movement.created_at).toLocaleString('es-BO')}</span></div>)}</div>}</div>;
}
