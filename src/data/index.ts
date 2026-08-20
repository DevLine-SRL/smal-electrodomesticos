import { WHATSAPP_NUMBER } from './products';

export { WHATSAPP_NUMBER, PRODUCTS, buildWhatsAppLink } from './products';

export const NAV_LINKS = [
  { label: 'Inicio', href: '/' },
  { label: 'Categorías', href: '/#categorias' },
  { label: 'Nosotros', href: '/#nosotros' },
  { label: 'Ubicación', href: '/#location' },
  { label: 'Contacto', href: '/#contacto' },
];

export const TIKTOK_HANDLE = '@smal.tienda';
export const TIKTOK_URL = 'https://www.tiktok.com/@smal.tienda';

export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Hola, quiero más información sobre sus productos.',
)}`;

export function buildCategoryWhatsAppLink(category: string): string {
  const message = `Hola, quiero información sobre ${category.toLowerCase()}.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const HOURS: [string, string][] = [
  ['Lunes a Sábado', '8:30 – 19:00'],
  ['Domingo', '9:00 – 13:00'],
];

export const MAP = {
  query: 'Entre Ríos, Carrasco, Cochabamba, Bolivia',
  gmaps:
    'https://www.google.com/maps/search/?api=1&query=Entre%20R%C3%ADos%2C%20Carrasco%2C%20Cochabamba%2C%20Bolivia',
  embedSrc:
    'https://www.google.com/maps?q=Entre%20R%C3%ADos%2C%20Carrasco%2C%20Cochabamba%2C%20Bolivia&z=13&output=embed',
};
