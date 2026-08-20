import { WHATSAPP_NUMBER } from './products';

export { WHATSAPP_NUMBER, PRODUCTS, buildWhatsAppLink } from './products';

export const NAV_LINKS = [
  { label: 'Inicio', href: '/' },
  { label: 'Productos', href: '/products' },
  { label: 'Contacto', href: '/contact' },
];

export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  'Hola, quiero más información sobre sus productos.',
)}`;
