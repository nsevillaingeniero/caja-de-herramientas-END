import type { APIRoute } from 'astro';

import { buildSearchIndex } from '../../lib/search';

/**
 * Índice de búsqueda como archivo estático.
 *
 * Se emite en build; el diálogo de búsqueda lo descarga una sola vez
 * la primera vez que el docente abre el buscador.
 */
export const GET: APIRoute = async () => {
  const documents = await buildSearchIndex();

  return new Response(JSON.stringify(documents), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
