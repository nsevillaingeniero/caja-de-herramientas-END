// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { SITE } from './src/config/site.mjs';

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  integrations: [
    sitemap({
      // "Para docentes" está oculta temporalmente (ver `hidden` en
      // AREAS): no se anuncia mientras no esté en la navegación.
      filter: (page) => !new URL(page).pathname.startsWith('/para-docentes'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // El portal institucional sirve las imágenes de las publicaciones.
    // Se autoriza explícitamente para poder optimizarlas en build.
    domains: ['endeporte.edu.co'],
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
