import {
  useEffect,
  useState,
} from 'react';

import {
  getProducts,
  subscribeToProductsUpdates,
  type Product,
} from '../../data/products';

export default function AdminProductList() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  async function refreshProducts() {
    try {
      setError('');

      const result =
        await getProducts();

      /**
       * Producto más reciente arriba.
       */
      setProducts(
        [...result].sort(
          (a, b) =>
            b.id - a.id,
        ),
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
      <div className="border-border-subtle bg-card rounded-2xl border p-10 text-center">
        <p className="text-text-muted">
          Cargando productos...
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-text-primary text-2xl font-bold">
            Productos
          </h1>

          <p className="text-text-muted mt-1 text-sm">
            Administra los productos
            publicados en el catálogo.
          </p>
        </div>

        <a
          href="/admin/products/new"
          className="bg-primary-500 hover:bg-primary-400 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white transition"
        >
          + Nuevo producto
        </a>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              void refreshProducts()
            }
            className="mt-3 rounded-lg border border-red-400/30 px-4 py-2 text-sm"
          >
            Reintentar
          </button>
        </div>
      )}

      {!error &&
      products.length === 0 ? (
        <div className="border-border-subtle bg-card rounded-2xl border p-12 text-center">
          <div className="mb-4 text-5xl">
            📦
          </div>

          <h2 className="text-text-primary text-lg font-semibold">
            No hay productos
            registrados
          </h2>

          <p className="text-text-muted mt-2 text-sm">
            Registra tu primer
            producto para mostrarlo
            en el catálogo.
          </p>

          <a
            href="/admin/products/new"
            className="bg-primary-500 hover:bg-primary-400 mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-semibold text-white"
          >
            Registrar producto
          </a>
        </div>
      ) : null}

      {!error &&
        products.length > 0 && (
          <div className="border-border-subtle bg-card overflow-hidden rounded-2xl border">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-border-subtle bg-background-soft border-b">
                  <tr>
                    <th className="text-text-muted px-6 py-4 text-xs font-semibold uppercase tracking-wide">
                      Producto
                    </th>

                    <th className="text-text-muted px-6 py-4 text-xs font-semibold uppercase tracking-wide">
                      Categoría
                    </th>

                    <th className="text-text-muted px-6 py-4 text-xs font-semibold uppercase tracking-wide">
                      Precio
                    </th>

                    <th className="text-text-muted px-6 py-4 text-xs font-semibold uppercase tracking-wide">
                      Cantidad
                    </th>

                    <th className="text-text-muted px-6 py-4 text-xs font-semibold uppercase tracking-wide">
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {products.map(
                    (product) => (
                      <tr
                        key={
                          product.id
                        }
                        className="border-border-subtle hover:bg-background-soft border-b transition last:border-b-0"
                      >
                        <td className="px-6 py-4">
                          <div className="flex min-w-[260px] items-center gap-4">
                            {product
                              .images[0] ? (
                              <img
                                src={
                                  product
                                    .images[0]
                                }
                                alt={
                                  product.name
                                }
                                className="h-14 w-14 shrink-0 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="bg-background-elevated flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl">
                                {
                                  product.emoji
                                }
                              </div>
                            )}

                            <div>
                              <p className="text-text-primary font-medium">
                                {
                                  product.name
                                }
                              </p>

                              <p className="text-text-muted mt-1 text-xs">
                                SKU:{' '}
                                {
                                  product.sku
                                }
                              </p>

                              {product.images
                                .length >
                                0 && (
                                <p className="text-text-muted mt-1 text-xs">
                                  {
                                    product
                                      .images
                                      .length
                                  }{' '}
                                  foto(s)
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="text-text-secondary px-6 py-4 text-sm">
                          {
                            product.category
                          }
                        </td>

                        <td className="text-primary-400 whitespace-nowrap px-6 py-4 font-semibold">
                          $
                          {product.price.toLocaleString(
                            'es-MX',
                          )}
                        </td>

                        <td className="text-text-secondary px-6 py-4">
                          {
                            product.quantity
                          }
                        </td>

                        <td className="px-6 py-4">
                          {product.available ? (
                            <span className="inline-flex whitespace-nowrap rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                              Disponible
                            </span>
                          ) : (
                            <span className="inline-flex whitespace-nowrap rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                              No disponible
                            </span>
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </section>
  );
}

/**
 * Lo usamos en /admin para mostrar
 * cantidad dinámica de productos.
 */
export function AdminProductCount() {
  const [total, setTotal] =
    useState<number | null>(
      null,
    );

  async function refreshCount() {
    const products =
      await getProducts();

    setTotal(products.length);
  }

  useEffect(() => {
    void refreshCount();

    const unsubscribe =
      subscribeToProductsUpdates(
        () => {
          void refreshCount();
        },
      );

    return unsubscribe;
  }, []);

  const cards = [
    {
      label:
        'Total de productos',
      value:
        total === null
          ? '...'
          : total.toString(),
    },
    {
      label: 'Ventas del día',
      value: '$0',
    },
    {
      label:
        'Consultas de WhatsApp',
      value: '0',
    },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="border-border-subtle bg-card rounded-2xl border p-6"
        >
          <p className="text-text-muted text-sm">
            {card.label}
          </p>

          <p className="text-text-primary mt-3 text-3xl font-bold">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}