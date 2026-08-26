import {
  useEffect,
  useState,
} from 'react';

import {
  getProducts,
  subscribeToProductsUpdates,
  type Product,
} from '../../data/products';

import ProductContact from './ProductContact';

export default function ProductGrid() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  async function refreshProducts() {
    try {
      setError('');

      const storedProducts =
        await getProducts();

      const availableProducts =
        storedProducts.filter(
          (product) =>
            product.available,
        );

      setProducts(
        availableProducts,
      );
    } catch (loadError) {
      console.error(loadError);

      setError(
        'No se pudieron cargar los productos.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshProducts();

    const unsubscribe =
      subscribeToProductsUpdates(
        () => {
          void refreshProducts();
        },
      );

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="text-text-muted py-12 text-center">
        Cargando productos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-center text-red-400">
        <p>{error}</p>

        <button
          type="button"
          onClick={() =>
            void refreshProducts()
          }
          className="mt-4 rounded-lg border border-red-400/30 px-4 py-2 text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="border-border-subtle bg-card rounded-2xl border p-10 text-center">
        <div className="mb-4 text-5xl">
          📦
        </div>

        <h2 className="text-text-primary text-lg font-semibold">
          No hay productos
          disponibles
        </h2>

        <p className="text-text-muted mt-2 text-sm">
          Próximamente tendremos
          nuevos productos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map(
        (product) => {
          const mainImage =
            product.images[0];

          return (
            <article
              key={product.id}
              className="border-border-subtle bg-card shadow-inner-dark hover:bg-card-hover flex flex-col overflow-hidden rounded-2xl border transition-colors"
            >
              <a
                href={`/products/${product.id}`}
                className="group flex flex-1 flex-col"
              >
                {mainImage ? (
                  <div className="bg-background-soft aspect-[4/3] overflow-hidden">
                    <img
                      src={mainImage}
                      alt={
                        product.name
                      }
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="bg-background-soft flex aspect-[4/3] items-center justify-center text-7xl">
                    {
                      product.emoji
                    }
                  </div>
                )}

                <div className="flex flex-1 flex-col p-6">
                  <span className="text-primary-400 mb-2 text-xs font-semibold uppercase tracking-wide">
                    {
                      product.category
                    }
                  </span>

                  <h3 className="text-text-primary group-hover:text-primary-400 text-lg font-semibold transition">
                    {product.name}
                  </h3>

                  <p className="text-text-muted mt-1 text-xs">
                    SKU:{' '}
                    {product.sku}
                  </p>

                  {product.description && (
                    <p className="text-text-secondary mt-3 line-clamp-2 text-sm">
                      {
                        product.description
                      }
                    </p>
                  )}

                  <div className="mt-auto pt-5">
                    <p className="text-primary-400 text-2xl font-bold">
                      $
                      {product.price.toLocaleString(
                        'es-MX',
                      )}
                    </p>

                    <p className="text-text-muted mt-2 text-xs">
                      {product.quantity >
                      0
                        ? `${product.quantity} unidad(es) disponibles`
                        : 'Sin stock actualmente'}
                    </p>
                  </div>
                </div>
              </a>

              <div className="px-6 pb-6">
                <ProductContact
                  product={product}
                />
              </div>
            </article>
          );
        },
      )}
    </div>
  );
}