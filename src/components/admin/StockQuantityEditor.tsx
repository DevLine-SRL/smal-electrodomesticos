import { useState } from 'react';
import { showToast } from './toast';

interface Props {
  productId: string;
  quantity: number;
  sold: boolean;
  onSaved?: (quantity: number) => void;
}

export default function StockQuantityEditor({
  productId,
  quantity,
  sold,
  onSaved,
}: Props) {
  const [currentQuantity, setCurrentQuantity] = useState(quantity);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(quantity));
  const [busy, setBusy] = useState(false);
  const save = async (confirmSold = false) => {
    const next = Number(value);
    if (!Number.isInteger(next) || next < 0)
      return showToast(
        'La cantidad debe ser un entero igual o mayor a 0.',
        'error',
      );
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/quantity`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quantity: next, confirmSold }),
      });
      if (
        res.status === 409 &&
        sold &&
        window.confirm(
          'El producto está vendido. Cambiar su stock puede ser inconsistente. ¿Continuar?',
        )
      )
        return void save(true);
      if (!res.ok) throw new Error();
      setCurrentQuantity(next);
      onSaved?.(next);
      setOpen(false);
      showToast(
        next === 0
          ? 'Stock actualizado: producto agotado.'
          : 'Stock actualizado.',
      );
    } catch {
      showToast('No se pudo actualizar el stock.', 'error');
    } finally {
      setBusy(false);
    }
  };
  if (!open)
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(currentQuantity));
          setOpen(true);
        }}
        className="text-text-secondary hover:text-primary-300 text-xs font-semibold"
      >
        Stock: {currentQuantity}
      </button>
    );
  return (
    <div className="flex items-center gap-1.5">
      <input
        aria-label="Cantidad disponible"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="numeric"
        className="border-border-strong bg-background-soft w-16 rounded-md border px-2 py-1 text-xs"
        autoFocus
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="bg-primary-500 text-text-inverse rounded-md px-2 py-1 text-xs font-bold"
      >
        Guardar
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-text-muted px-1 text-xs"
      >
        Cancelar
      </button>
    </div>
  );
}
