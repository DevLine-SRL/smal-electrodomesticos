import { useState } from 'react';
import { showToast } from './toast';

interface Props { productId: string; quantity: number; onSaved?: (quantity: number) => void }

export default function StockDeduction({ productId, quantity, onSaved }: Props) {
  const [currentQuantity, setCurrentQuantity] = useState(quantity); const [open, setOpen] = useState(false); const [value, setValue] = useState(''); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    const amount = Number(value);
    if (!Number.isInteger(amount) || amount <= 0) return showToast('Ingresa un número entero mayor a 0.', 'error');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/stock-deduction`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ quantity: amount, reason }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return showToast(body.code === 'insufficient_stock' ? `Solo hay ${body.available} unidades disponibles.` : 'No se pudo descontar el stock.', 'error');
      setCurrentQuantity(currentQuantity - amount); onSaved?.(currentQuantity - amount); setOpen(false); setValue(''); setReason(''); showToast('Descuento de stock registrado.');
    } catch { showToast('Sin conexión con el servidor.', 'error'); } finally { setBusy(false); }
  };
  if (!open) return <button type="button" disabled={currentQuantity === 0} onClick={() => setOpen(true)} className="text-warning-400 hover:text-warning-400/80 text-xs font-semibold disabled:opacity-40">− Descontar</button>;
  return <div className="flex flex-wrap items-center gap-1.5"><input aria-label="Unidades a descontar" placeholder="Unid." value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" className="border-border-strong bg-background-soft w-16 rounded-md border px-2 py-1 text-xs" autoFocus /><input aria-label="Motivo del descuento" placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} className="border-border-strong bg-background-soft w-28 rounded-md border px-2 py-1 text-xs" /><button type="button" disabled={busy} onClick={() => void save()} className="bg-warning-400 text-text-inverse rounded-md px-2 py-1 text-xs font-bold">Restar</button><button type="button" onClick={() => setOpen(false)} className="text-text-muted px-1 text-xs">Cancelar</button></div>;
}
