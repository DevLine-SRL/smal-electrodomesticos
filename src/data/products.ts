export interface Product {
  id: number;
  name: string;
  price: number;
  sku: string;
  emoji: string;
  description: string;
}

export const WHATSAPP_NUMBER = '5215512345678';

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Licuadora Oster 600W',
    price: 1299,
    sku: 'LIC-OSTER-600',
    emoji: '🥤',
    description:
      'Licuadora de vaso de vidrio con cuchillas de acero inoxidable y 3 velocidades.',
  },
  {
    id: 2,
    name: 'Cafetera Mr. Coffee 12 tazas',
    price: 899,
    sku: 'CAF-MR-12',
    emoji: '☕',
    description:
      'Cafetera programable con jarra de vidrio, plato caliente y apagado automático.',
  },
  {
    id: 3,
    name: 'Batidora KitchenAid Artisan',
    price: 15999,
    sku: 'BAT-KA-ART',
    emoji: '🍰',
    description:
      'Batidora de pedestal con bowl de 4.8 litros, 10 velocidades y múltiples accesorios.',
  },
];

export function buildWhatsAppLink(product: Product): string {
  const message = `Hola, me interesa el siguiente producto:\n\n${product.emoji} ${product.name}\nPrecio: $${product.price.toLocaleString('es-MX')}\nSKU: ${product.sku}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
