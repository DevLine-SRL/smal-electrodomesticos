import { useState } from 'react';
import { showToast } from './toast';

interface Props { productId: string; price: number; sold: boolean; onSaved?: (price: number) => void }

export default function PriceEditor({ productId, price, sold, onSaved }: Props) {
  const [currentPrice, setCurrentPrice] = useState(price);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(price));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0 || Math.round(next * 100) !== next * 100) return showToast('Ingresa un precio válido mayor a Bs 0.', 'error');
    if (sold && !window.confirm('Este producto ya fue vendido. ¿Deseas cambiar igualmente su precio?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/price`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ price: next }) });
      if (!res.ok) throw new Error();
      setCurrentPrice(next); onSaved?.(next); setOpen(false); showToast('Precio actualizado.');
    } catch { showToast('No se pudo actualizar el precio.', 'error'); } finally { setBusy(false); }
  };
  if (!open) return <button type="button" onClick={() => { setValue(String(currentPrice)); setOpen(true); }} className="text-primary-400 hover:text-primary-300 font-extrabold underline decoration-primary-400/30 underline-offset-4">Bs {currentPrice.toFixed(2)}</button>;
  return <div className="flex items-center gap-1.5"><input aria-label="Nuevo precio" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" className="border-border-strong bg-background-soft w-24 rounded-md border px-2 py-1 text-xs" autoFocus /><button type="button" disabled={busy} onClick={() => void save()} className="bg-primary-500 text-text-inverse rounded-md px-2 py-1 text-xs font-bold">Guardar</button><button type="button" onClick={() => setOpen(false)} className="text-text-muted px-1 text-xs">Cancelar</button></div>;
}
