export interface Product {
  id: number;
  name: string;
  price: number;
  sku: string;
  emoji: string;
  description: string;
  quantity: number;
  category: string;
  images: string[];
  available: boolean;
}

export interface CreateProductInput {
  name: string;
  price: number;
  description: string;
  quantity: number;
  category: string;
  images: string[];
}

export const WHATSAPP_NUMBER =
  import.meta.env.PUBLIC_WHATSAPP_NUMBER ?? '';

export const PRODUCT_STORAGE_KEY = 'admin-products';

export const PRODUCTS_UPDATED_EVENT = 'products-updated';

const PRODUCTS_BROADCAST_CHANNEL = 'smal-products-channel';

const DATABASE_NAME = 'smal-products-db';
const DATABASE_VERSION = 1;
const PRODUCT_STORE_NAME = 'products';


export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE =
  MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Licuadora Oster 600W',
    price: 1299,
    sku: 'LIC-OSTER-600',
    emoji: '🥤',
    description:
      'Licuadora de vaso de vidrio con cuchillas de acero inoxidable y 3 velocidades.',
    quantity: 8,
    category: 'Licuadoras',
    images: [],
    available: true,
  },
  {
    id: 2,
    name: 'Cafetera Mr. Coffee 12 tazas',
    price: 899,
    sku: 'CAF-MR-12',
    emoji: '☕',
    description:
      'Cafetera programable con jarra de vidrio, plato caliente y apagado automático.',
    quantity: 5,
    category: 'Cafeteras',
    images: [],
    available: true,
  },
  {
    id: 3,
    name: 'Batidora KitchenAid Artisan',
    price: 15999,
    sku: 'BAT-KA-ART',
    emoji: '🍰',
    description:
      'Batidora de pedestal con bowl de 4.8 litros, 10 velocidades y múltiples accesorios.',
    quantity: 0,
    category: 'Batidoras',
    images: [],
    available: false,
  },
];


export function normalizeProductName(
  name: string,
): string {
  return name
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function cloneProducts(
  products: Product[],
): Product[] {
  return products.map((product) => ({
    ...product,
    images: [...product.images],
  }));
}

function isValidStoredProduct(
  value: unknown,
): value is Product {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return false;
  }

  const product =
    value as Partial<Product>;

  return (
    typeof product.id === 'number' &&
    typeof product.name === 'string' &&
    typeof product.price === 'number' &&
    typeof product.sku === 'string' &&
    typeof product.emoji === 'string' &&
    typeof product.description === 'string' &&
    typeof product.quantity === 'number' &&
    typeof product.category === 'string' &&
    Array.isArray(product.images) &&
    product.images.every(
      (image) => typeof image === 'string',
    ) &&
    typeof product.available === 'boolean'
  );
}


function readLegacyProducts():
  | Product[]
  | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedProducts =
      window.localStorage.getItem(
        PRODUCT_STORAGE_KEY,
      );

    if (!storedProducts) {
      return null;
    }

    const parsed:
      unknown = JSON.parse(storedProducts);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const validProducts =
      parsed.filter(isValidStoredProduct);

    return validProducts.length > 0
      ? validProducts
      : null;
  } catch (error) {
    console.warn(
      'No se pudieron recuperar los productos antiguos:',
      error,
    );

    return null;
  }
}

function requestToPromise<T>(
  request: IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error(
            'Ocurrió un error accediendo al almacenamiento.',
          ),
      );
    };
  });
}

function transactionToPromise(
  transaction: IDBTransaction,
): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(
        transaction.error ??
          new Error(
            'No se pudo completar la operación.',
          ),
      );
    };

    transaction.onabort = () => {
      reject(
        transaction.error ??
          new Error(
            'La operación fue cancelada.',
          ),
      );
    };
  });
}

function openProductsDatabase():
  Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (
      typeof window === 'undefined' ||
      typeof indexedDB === 'undefined'
    ) {
      reject(
        new Error(
          'IndexedDB no está disponible en este navegador.',
        ),
      );

      return;
    }

    const request = indexedDB.open(
      DATABASE_NAME,
      DATABASE_VERSION,
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (
        !database.objectStoreNames.contains(
          PRODUCT_STORE_NAME,
        )
      ) {
        database.createObjectStore(
          PRODUCT_STORE_NAME,
          {
            keyPath: 'id',
          },
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error(
            'No se pudo abrir la base de datos local.',
          ),
      );
    };
  });
}


async function ensureInitialProducts(
  database: IDBDatabase,
): Promise<void> {
  const readTransaction =
    database.transaction(
      PRODUCT_STORE_NAME,
      'readonly',
    );

  const store =
    readTransaction.objectStore(
      PRODUCT_STORE_NAME,
    );

  const count =
    await requestToPromise(store.count());

  await transactionToPromise(
    readTransaction,
  );

  if (count > 0) {
    return;
  }

  const legacyProducts =
    readLegacyProducts();

  const initialProducts =
    legacyProducts ??
    cloneProducts(PRODUCTS);

  const writeTransaction =
    database.transaction(
      PRODUCT_STORE_NAME,
      'readwrite',
    );

  const writeStore =
    writeTransaction.objectStore(
      PRODUCT_STORE_NAME,
    );

  initialProducts.forEach((product) => {
    writeStore.put(product);
  });

  await transactionToPromise(
    writeTransaction,
  );
}


export async function getProducts():
  Promise<Product[]> {
  if (typeof window === 'undefined') {
    return cloneProducts(PRODUCTS);
  }

  let database: IDBDatabase | null = null;

  try {
    database =
      await openProductsDatabase();

    await ensureInitialProducts(database);

    const transaction =
      database.transaction(
        PRODUCT_STORE_NAME,
        'readonly',
      );

    const store =
      transaction.objectStore(
        PRODUCT_STORE_NAME,
      );

    const products =
      await requestToPromise(
        store.getAll() as IDBRequest<Product[]>,
      );

    await transactionToPromise(
      transaction,
    );

    return products;
  } catch (error) {
    console.error(
      'Error obteniendo productos:',
      error,
    );


    return (
      readLegacyProducts() ??
      cloneProducts(PRODUCTS)
    );
  } finally {
    database?.close();
  }
}

function notifyProductsUpdated(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      PRODUCTS_UPDATED_EVENT,
    ),
  );

  if (
    typeof BroadcastChannel !==
    'undefined'
  ) {
    const channel =
      new BroadcastChannel(
        PRODUCTS_BROADCAST_CHANNEL,
      );

    channel.postMessage({
      type: PRODUCTS_UPDATED_EVENT,
    });

    channel.close();
  }
}

export function subscribeToProductsUpdates(
  callback: () => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const localHandler = () => {
    callback();
  };

  window.addEventListener(
    PRODUCTS_UPDATED_EVENT,
    localHandler,
  );

  let channel:
    | BroadcastChannel
    | null = null;

  const broadcastHandler = () => {
    callback();
  };

  if (
    typeof BroadcastChannel !==
    'undefined'
  ) {
    channel =
      new BroadcastChannel(
        PRODUCTS_BROADCAST_CHANNEL,
      );

    channel.addEventListener(
      'message',
      broadcastHandler,
    );
  }

  return () => {
    window.removeEventListener(
      PRODUCTS_UPDATED_EVENT,
      localHandler,
    );

    if (channel) {
      channel.removeEventListener(
        'message',
        broadcastHandler,
      );

      channel.close();
    }
  };
}


export async function saveProducts(
  products: Product[],
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error(
      'Los productos solamente pueden guardarse desde el navegador.',
    );
  }

  let database: IDBDatabase | null = null;

  try {
    database =
      await openProductsDatabase();

    const transaction =
      database.transaction(
        PRODUCT_STORE_NAME,
        'readwrite',
      );

    const store =
      transaction.objectStore(
        PRODUCT_STORE_NAME,
      );

    store.clear();

    products.forEach((product) => {
      store.put(product);
    });

    await transactionToPromise(
      transaction,
    );

    notifyProductsUpdated();
  } catch (indexedDbError) {
    console.error(
      'IndexedDB no pudo guardar los productos:',
      indexedDbError,
    );

    
    try {
      window.localStorage.setItem(
        PRODUCT_STORAGE_KEY,
        JSON.stringify(products),
      );

      notifyProductsUpdated();
    } catch (localStorageError) {
      console.error(
        'localStorage tampoco pudo guardar:',
        localStorageError,
      );

      throw new Error(
        'No se pudo guardar el producto. Revisa el almacenamiento del navegador e inténtalo nuevamente.',
      );
    }
  } finally {
    database?.close();
  }
}

function getNextProductId(
  products: Product[],
): number {
  if (products.length === 0) {
    return 1;
  }

  return (
    Math.max(
      ...products.map(
        (product) => product.id,
      ),
    ) + 1
  );
}

function generateSku(
  name: string,
  id: number,
): string {
  const normalizedName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim();

  const words = normalizedName
    .split(/\s+/)
    .filter(Boolean);

  const prefix = words
    .slice(0, 3)
    .map((word) =>
      word.substring(0, 4),
    )
    .join('-');

  return `${prefix || 'PROD'}-${String(
    id,
  ).padStart(4, '0')}`;
}


export async function productNameExists(
  name: string,
): Promise<boolean> {
  if (!name.trim()) {
    return false;
  }

  const normalizedName =
    normalizeProductName(name);

  const products =
    await getProducts();

  return products.some(
    (product) =>
      normalizeProductName(
        product.name,
      ) === normalizedName,
  );
}


function validateProductInput(
  input: CreateProductInput,
): void {
  if (!input.name.trim()) {
    throw new Error(
      'El nombre del producto es obligatorio.',
    );
  }

  if (
    !Number.isFinite(input.price) ||
    input.price <= 0
  ) {
    throw new Error(
      'El precio debe ser mayor a 0.',
    );
  }

  if (
    !Number.isInteger(input.quantity) ||
    input.quantity < 0
  ) {
    throw new Error(
      'La cantidad debe ser un número entero no negativo.',
    );
  }

  
  if (input.images.length === 0) {
    throw new Error(
      'Debe agregar al menos una fotografía.',
    );
  }
}


export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  validateProductInput(input);

  const currentProducts =
    await getProducts();

  const id =
    getNextProductId(
      currentProducts,
    );

  const newProduct: Product = {
    id,
    name: input.name.trim(),
    price: input.price,
    sku: generateSku(
      input.name,
      id,
    ),
    emoji: '📦',
    description:
      input.description.trim(),
    quantity: input.quantity,
    category:
      input.category.trim() ||
      'Sin categoría',
    images: [...input.images],

    /**
     * Siempre disponible inicialmente.
     */
    available: true,
  };

  await saveProducts([
    ...currentProducts,
    newProduct,
  ]);

  return newProduct;
}


export function fileToDataUrl(
  file: File,
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () => {
        if (
          typeof reader.result !==
          'string'
        ) {
          reject(
            new Error(
              `No se pudo procesar ${file.name}.`,
            ),
          );

          return;
        }

        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(
          new Error(
            `Ocurrió un error al leer ${file.name}.`,
          ),
        );
      };

      reader.readAsDataURL(file);
    },
  );
}

export function buildWhatsAppLink(
  product: Product,
  url?: string,
): string {
  const message = [
    'Hola, me interesa el siguiente producto:',
    '',
    `${product.emoji} ${product.name}`,
    `Precio: $${product.price.toLocaleString(
      'es-MX',
    )}`,
    `SKU: ${product.sku}`,
  ];

  if (url) {
    message.push(
      `Enlace: ${url}`,
    );
  }

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    message.join('\n'),
  )}`;
}