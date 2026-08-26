import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';

import {
  MAX_IMAGE_SIZE,
  MAX_IMAGE_SIZE_MB,
  createProduct,
  fileToDataUrl,
  getProducts,
  productNameExists,
} from '../../data/products';

interface FormErrors {
  name?: string;
  price?: string;
  quantity?: string;
  images?: string;
}

const DEFAULT_CATEGORIES = [
  'Batidoras',
  'Cafeteras',
  'Cocinas',
  'Congeladores',
  'Electrodomésticos',
  'Licuadoras',
  'Refrigeradores',
  'Televisores',
];

function getFileIdentifier(
  file: File,
): string {
  return [
    file.name,
    file.size,
    file.lastModified,
  ].join('-');
}

export default function ProductForm() {
  const [name, setName] =
    useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [price, setPrice] =
    useState('');

  const [quantity, setQuantity] =
    useState('');

  const [category, setCategory] =
    useState('');

  const [categories, setCategories] =
    useState<string[]>(
      DEFAULT_CATEGORIES,
    );

  const [images, setImages] =
    useState<File[]>([]);

  const [errors, setErrors] =
    useState<FormErrors>({});

  const [
    imageError,
    setImageError,
  ] = useState('');

  const [
    serverError,
    setServerError,
  ] = useState('');

  const [
    duplicateWarning,
    setDuplicateWarning,
  ] = useState(false);

  const [
    checkingDuplicate,
    setCheckingDuplicate,
  ] = useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  /**
   * Recuperar categorías de productos existentes.
   */
  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        const products =
          await getProducts();

        if (!mounted) {
          return;
        }

        const existingCategories =
          products
            .map(
              (product) =>
                product.category.trim(),
            )
            .filter(
              (categoryName) =>
                categoryName &&
                categoryName !==
                  'Sin categoría',
            );

        setCategories(
          Array.from(
            new Set([
              ...DEFAULT_CATEGORIES,
              ...existingCategories,
            ]),
          ).sort((a, b) =>
            a.localeCompare(
              b,
              'es',
            ),
          ),
        );
      } catch (error) {
        console.error(
          'No se pudieron cargar las categorías:',
          error,
        );
      }
    }

    void loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Crear previsualizaciones.
   */
  const imagePreviews =
    useMemo(
      () =>
        images.map((file) => ({
          file,
          url:
            URL.createObjectURL(
              file,
            ),
        })),
      [images],
    );

  /**
   * Liberar memoria.
   */
  useEffect(() => {
    return () => {
      imagePreviews.forEach(
        (preview) => {
          URL.revokeObjectURL(
            preview.url,
          );
        },
      );
    };
  }, [imagePreviews]);

  /**
   * HU-02 CA 11:
   * advertencia por duplicado.
   *
   * Tiene pequeño debounce para evitar consultar
   * almacenamiento con cada pulsación.
   */
  useEffect(() => {
    const normalizedName =
      name.trim();

    if (!normalizedName) {
      setDuplicateWarning(
        false,
      );

      setCheckingDuplicate(
        false,
      );

      return;
    }

    let cancelled = false;

    const timeout =
      window.setTimeout(
        async () => {
          try {
            setCheckingDuplicate(
              true,
            );

            const exists =
              await productNameExists(
                normalizedName,
              );

            if (!cancelled) {
              setDuplicateWarning(
                exists,
              );
            }
          } catch (error) {
            console.error(
              'No se pudo comprobar el nombre:',
              error,
            );

            if (!cancelled) {
              setDuplicateWarning(
                false,
              );
            }
          } finally {
            if (!cancelled) {
              setCheckingDuplicate(
                false,
              );
            }
          }
        },
        300,
      );

    return () => {
      cancelled = true;

      window.clearTimeout(
        timeout,
      );
    };
  }, [name]);

  function clearError(
    field: keyof FormErrors,
  ) {
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  /**
   * HU-02 CA 3, 4, 5 y 9.
   */
  function validateForm(): boolean {
    const newErrors:
      FormErrors = {};

    const cleanPrice =
      price
        .trim()
        .replace(',', '.');

    const parsedPrice =
      Number(cleanPrice);

    const parsedQuantity =
      Number(quantity.trim());

    if (!name.trim()) {
      newErrors.name =
        'El nombre es obligatorio.';
    }

    if (!price.trim()) {
      newErrors.price =
        'El precio es obligatorio.';
    } else if (
      !/^\d+([.,]\d{1,2})?$/.test(
        price.trim(),
      )
    ) {
      newErrors.price =
        'Ingrese un precio válido.';
    } else if (
      Number.isNaN(parsedPrice)
    ) {
      newErrors.price =
        'El precio debe ser numérico.';
    } else if (
      parsedPrice <= 0
    ) {
      newErrors.price =
        'El precio debe ser mayor a 0.';
    }

    if (!quantity.trim()) {
      newErrors.quantity =
        'La cantidad es obligatoria.';
    } else if (
      !/^\d+$/.test(
        quantity.trim(),
      )
    ) {
      newErrors.quantity =
        'La cantidad debe ser un número entero no negativo.';
    } else if (
      Number.isNaN(
        parsedQuantity,
      )
    ) {
      newErrors.quantity =
        'La cantidad debe ser numérica.';
    } else if (
      parsedQuantity < 0
    ) {
      newErrors.quantity =
        'La cantidad no puede ser negativa.';
    }

    /**
     * Regla definitiva para CA 9:
     * al menos una fotografía es obligatoria.
     */
    if (images.length === 0) {
      newErrors.images =
        'Debe agregar al menos una fotografía.';
    }

    setErrors(newErrors);

    return (
      Object.keys(
        newErrors,
      ).length === 0
    );
  }

  /**
   * HU-02 CA 6, 7 y 8.
   */
  function handleImagesChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    setImageError('');

    clearError('images');

    const selectedFiles =
      Array.from(
        event.target.files ?? [],
      );

    if (
      selectedFiles.length === 0
    ) {
      return;
    }

    const existingFiles =
      new Set(
        images.map(
          getFileIdentifier,
        ),
      );

    const validFiles: File[] =
      [];

    const validationMessages:
      string[] = [];

    selectedFiles.forEach(
      (file) => {
        /**
         * CA 6:
         * debe ser imagen.
         */
        if (
          !file.type ||
          !file.type.startsWith(
            'image/',
          )
        ) {
          validationMessages.push(
            `${file.name}: el archivo debe ser una imagen.`,
          );

          return;
        }

        /**
         * CA 7:
         * máximo 5 MB.
         */
        if (
          file.size >
          MAX_IMAGE_SIZE
        ) {
          validationMessages.push(
            `${file.name}: la imagen no puede superar ${MAX_IMAGE_SIZE_MB} MB.`,
          );

          return;
        }

        const identifier =
          getFileIdentifier(file);

        if (
          existingFiles.has(
            identifier,
          )
        ) {
          validationMessages.push(
            `${file.name}: esta fotografía ya fue seleccionada.`,
          );

          return;
        }

        existingFiles.add(
          identifier,
        );

        validFiles.push(file);
      },
    );

    if (
      validationMessages.length >
      0
    ) {
      setImageError(
        validationMessages.join(
          ' ',
        ),
      );
    }

    if (
      validFiles.length > 0
    ) {
      setImages(
        (currentImages) => [
          ...currentImages,
          ...validFiles,
        ],
      );
    }

    /**
     * Permite seleccionar de nuevo
     * un archivo eliminado.
     */
    event.target.value = '';
  }

  function removeImage(
    index: number,
  ) {
    setImages(
      (currentImages) =>
        currentImages.filter(
          (_, imageIndex) =>
            imageIndex !== index,
        ),
    );

    setImageError('');
  }

  /**
   * HU-02 CA 2, 10 y 12.
   */
  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setServerError('');
    setImageError('');

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      const imageUrls =
        await Promise.all(
          images.map(
            fileToDataUrl,
          ),
        );

      const parsedPrice =
        Number(
          price
            .trim()
            .replace(',', '.'),
        );

      const parsedQuantity =
        Number(
          quantity.trim(),
        );

      await createProduct({
        name,
        description,
        price: parsedPrice,
        quantity:
          parsedQuantity,
        category,
        images: imageUrls,
      });

      /**
       * CA 10:
       * al volver al listado se consulta
       * inmediatamente IndexedDB.
       */
      window.location.assign(
        '/admin/products',
      );
    } catch (error) {
      console.error(error);

      /**
       * CA 12:
       * NO limpiamos name, price,
       * quantity, category ni images.
       */
      setServerError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el producto. Inténtelo nuevamente.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="border-border-subtle bg-card rounded-2xl border p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <h1 className="text-text-primary text-2xl font-bold">
            Nuevo producto
          </h1>

          <p className="text-text-muted mt-2 text-sm">
            Registra un producto para
            publicarlo en el catálogo.
          </p>
        </div>

        {serverError && (
          <div
            className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
            role="alert"
          >
            <p className="font-semibold">
              No se pudo guardar
              el producto
            </p>

            <p className="mt-1">
              {serverError}
            </p>

            <p className="mt-2">
              Los datos ingresados
              permanecen en el
              formulario para que
              puedas reintentar.
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-6"
        >
          {/* Nombre */}
          <div>
            <label
              htmlFor="name"
              className="text-text-primary mb-2 block text-sm font-medium"
            >
              Nombre

              <span className="ml-1 text-red-400">
                *
              </span>
            </label>

            <input
              id="name"
              name="name"
              type="text"
              value={name}
              maxLength={150}
              aria-invalid={
                Boolean(
                  errors.name,
                )
              }
              onChange={(event) => {
                setName(
                  event.target.value,
                );

                clearError(
                  'name',
                );
              }}
              placeholder="Ej. Refrigerador Samsung"
              className={`bg-background-soft text-text-primary placeholder:text-text-muted w-full rounded-xl border px-4 py-3 outline-none transition ${
                errors.name
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-border-subtle focus:border-primary-400'
              }`}
            />

            {errors.name && (
              <p className="mt-2 text-sm text-red-400">
                {errors.name}
              </p>
            )}

            {checkingDuplicate && (
              <p className="text-text-muted mt-2 text-xs">
                Comprobando nombre...
              </p>
            )}

            {duplicateWarning &&
              !checkingDuplicate && (
                <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300">
                  <strong>
                    Posible duplicado.
                  </strong>{' '}

                  Ya existe un producto
                  con este nombre. Puedes
                  continuar si corresponde
                  a otro modelo o
                  presentación.
                </div>
              )}
          </div>

          {/* Descripción */}
          <div>
            <label
              htmlFor="description"
              className="text-text-primary mb-2 block text-sm font-medium"
            >
              Descripción
            </label>

            <textarea
              id="description"
              name="description"
              rows={5}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              placeholder="Describe las características principales del producto..."
              className="border-border-subtle bg-background-soft text-text-primary placeholder:text-text-muted focus:border-primary-400 w-full resize-none rounded-xl border px-4 py-3 outline-none transition"
            />
          </div>

          {/* Precio y cantidad */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="price"
                className="text-text-primary mb-2 block text-sm font-medium"
              >
                Precio

                <span className="ml-1 text-red-400">
                  *
                </span>
              </label>

              <input
                id="price"
                name="price"
                type="text"
                inputMode="decimal"
                value={price}
                aria-invalid={
                  Boolean(
                    errors.price,
                  )
                }
                onChange={(event) => {
                  setPrice(
                    event.target.value,
                  );

                  clearError(
                    'price',
                  );
                }}
                placeholder="Ej. 1299.00"
                className={`bg-background-soft text-text-primary placeholder:text-text-muted w-full rounded-xl border px-4 py-3 outline-none transition ${
                  errors.price
                    ? 'border-red-500'
                    : 'border-border-subtle focus:border-primary-400'
                }`}
              />

              {errors.price && (
                <p className="mt-2 text-sm text-red-400">
                  {errors.price}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="quantity"
                className="text-text-primary mb-2 block text-sm font-medium"
              >
                Cantidad inicial

                <span className="ml-1 text-red-400">
                  *
                </span>
              </label>

              <input
                id="quantity"
                name="quantity"
                type="text"
                inputMode="numeric"
                value={quantity}
                aria-invalid={
                  Boolean(
                    errors.quantity,
                  )
                }
                onChange={(event) => {
                  setQuantity(
                    event.target.value,
                  );

                  clearError(
                    'quantity',
                  );
                }}
                placeholder="Ej. 10"
                className={`bg-background-soft text-text-primary placeholder:text-text-muted w-full rounded-xl border px-4 py-3 outline-none transition ${
                  errors.quantity
                    ? 'border-red-500'
                    : 'border-border-subtle focus:border-primary-400'
                }`}
              />

              {errors.quantity && (
                <p className="mt-2 text-sm text-red-400">
                  {
                    errors.quantity
                  }
                </p>
              )}
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label
              htmlFor="category"
              className="text-text-primary mb-2 block text-sm font-medium"
            >
              Categoría
            </label>

            <input
              id="category"
              name="category"
              type="text"
              list="product-categories"
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value,
                )
              }
              placeholder="Ej. Refrigeradores"
              className="border-border-subtle bg-background-soft text-text-primary placeholder:text-text-muted focus:border-primary-400 w-full rounded-xl border px-4 py-3 outline-none transition"
            />

            <datalist id="product-categories">
              {categories.map(
                (categoryName) => (
                  <option
                    key={
                      categoryName
                    }
                    value={
                      categoryName
                    }
                  />
                ),
              )}
            </datalist>

            <p className="text-text-muted mt-2 text-xs">
              Puedes elegir una
              categoría existente o
              escribir una nueva.
            </p>
          </div>

          {/* Fotografías */}
          <div>
            <div className="mb-2">
              <label className="text-text-primary block text-sm font-medium">
                Fotografías

                <span className="ml-1 text-red-400">
                  *
                </span>
              </label>

              <p className="text-text-muted mt-1 text-xs">
                Debes subir al menos
                una imagen. Máximo{' '}
                {MAX_IMAGE_SIZE_MB} MB
                por fotografía.
              </p>
            </div>

            <label
              htmlFor="images"
              className="border-border-subtle bg-background-soft hover:border-primary-400 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition"
            >
              <span className="mb-3 text-4xl">
                📷
              </span>

              <span className="text-text-primary text-sm font-medium">
                Seleccionar fotografías
              </span>

              <span className="text-text-muted mt-1 text-xs">
                Puedes seleccionar
                varias imágenes.
              </span>

              <input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={
                  handleImagesChange
                }
                className="hidden"
              />
            </label>

            {imageError && (
              <div
                className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
                role="alert"
              >
                {imageError}
              </div>
            )}

            {errors.images && (
              <p className="mt-2 text-sm text-red-400">
                {errors.images}
              </p>
            )}

            {imagePreviews.length >
              0 && (
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-text-primary text-sm font-medium">
                    Fotografías
                    seleccionadas
                  </p>

                  <span className="text-text-muted text-xs">
                    {
                      imagePreviews.length
                    }{' '}
                    archivo(s)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {imagePreviews.map(
                    (
                      preview,
                      index,
                    ) => (
                      <div
                        key={getFileIdentifier(
                          preview.file,
                        )}
                        className="border-border-subtle bg-background-soft relative overflow-hidden rounded-xl border"
                      >
                        <img
                          src={
                            preview.url
                          }
                          alt={`Previsualización de ${preview.file.name}`}
                          className="aspect-square w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeImage(
                              index,
                            )
                          }
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-500"
                          aria-label={`Eliminar ${preview.file.name}`}
                        >
                          ✕
                        </button>

                        <div className="p-2">
                          <p
                            className="text-text-muted truncate text-xs"
                            title={
                              preview.file
                                .name
                            }
                          >
                            {
                              preview.file
                                .name
                            }
                          </p>

                          <p className="text-text-muted mt-1 text-[11px]">
                            {(
                              preview.file
                                .size /
                              1024 /
                              1024
                            ).toFixed(
                              2,
                            )}{' '}
                            MB
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Estado */}
          <div className="border-primary-500/20 bg-primary-500/5 rounded-xl border p-4">
            <p className="text-text-primary text-sm font-medium">
              Estado inicial
            </p>

            <p className="text-text-muted mt-1 text-sm">
              El producto será
              registrado automáticamente
              como{' '}
              <strong className="text-green-400">
                Disponible
              </strong>
              .
            </p>
          </div>

          {/* Acciones */}
          <div className="border-border-subtle flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
            <a
              href="/admin/products"
              className="border-border-subtle text-text-secondary hover:bg-background-elevated hover:text-text-primary rounded-xl border px-5 py-3 text-center text-sm font-medium transition"
            >
              Cancelar
            </a>

            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary-500 hover:bg-primary-400 rounded-xl px-6 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? 'Guardando...'
                : 'Guardar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}