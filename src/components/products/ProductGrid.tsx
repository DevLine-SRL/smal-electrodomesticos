import { PRODUCTS } from '../../data/products';
import ProductContact from './ProductContact';

export default function ProductGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {PRODUCTS.map((product) => (
        <article
          key={product.id}
          className="border-border-subtle bg-card shadow-inner-dark hover:bg-card-hover flex flex-col rounded-2xl border p-6 transition-colors"
        >
          <a href={`/products/${product.id}`} className="group">
            <div className="mb-4 text-6xl">{product.emoji}</div>
            <h3 className="text-text-primary group-hover:text-primary-400 text-lg font-semibold transition">
              {product.name}
            </h3>
            <p className="text-text-muted mt-1 text-sm">SKU: {product.sku}</p>
            <p className="text-primary-400 mt-3 text-2xl font-bold">
              ${product.price.toLocaleString('es-MX')}
            </p>
          </a>
          <div className="mt-6">
            <ProductContact product={product} />
          </div>
        </article>
      ))}
    </div>
  );
}
