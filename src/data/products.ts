export interface Product {
  id: number;
  name: string;
  price: number;
  sku: string;
  emoji: string;
  description: string;
  available: boolean;
}

export const WHATSAPP_NUMBER = import.meta.env.PUBLIC_WHATSAPP_NUMBER ?? '';

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Licuadora Oster 600W',
    price: 1299,
    sku: 'LIC-OSTER-600',
    emoji: '🥤',
    description:
      'Licuadora de vaso de vidrio con cuchillas de acero inoxidable y 3 velocidades.',
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
    available: false,
  },
];

export function buildWhatsAppLink(product: Product, url?: string): string {
  const message = [
    'Hola, me interesa el siguiente producto:',
    '',
    `${product.emoji} ${product.name}`,
    `Precio: $${product.price.toLocaleString('es-MX')}`,
    `SKU: ${product.sku}`,
  ];
  if (url) message.push(`Enlace: ${url}`);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message.join('\n'))}`;
}
