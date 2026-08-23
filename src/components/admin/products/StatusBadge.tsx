import type {
  ProductStatus,
  StatusChangeSource,
} from '../../../types/products';

interface Props {
  status: ProductStatus;
  source?: StatusChangeSource | null;
}

const STATUS_STYLES: Record<ProductStatus, string> = {
  available: 'border-success-500/40 bg-success-500/12 text-success-500',
  out_of_stock: 'border-warning-400/40 bg-warning-400/12 text-warning-400',
  sold: 'border-border-strong bg-background-elevated text-text-muted',
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  available: 'Disponible',
  out_of_stock: 'Agotado',
  sold: 'Vendido',
};

const SOURCE_LABELS: Record<StatusChangeSource, string> = {
  automatic: 'auto',
  manual: 'manual',
};

const SOURCE_TITLES: Record<StatusChangeSource, string> = {
  automatic: 'Último cambio aplicado automáticamente por el sistema',
  manual: 'Último cambio hecho manualmente por un administrador',
};

export default function StatusBadge({ status, source = null }: Props) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
      >
        {STATUS_LABELS[status]}
      </span>
      {source && (
        <span
          className="text-text-disabled text-[11px] font-medium"
          title={SOURCE_TITLES[source]}
        >
          {SOURCE_LABELS[source]}
        </span>
      )}
    </span>
  );
}
