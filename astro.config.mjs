// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

import react from '@astrojs/react';

import icons from 'astro-icons';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  image: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/product-images/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/product-images/**',
      },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  adapter: node({
    mode: 'standalone',
  }),

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [react(), icons()],
});
