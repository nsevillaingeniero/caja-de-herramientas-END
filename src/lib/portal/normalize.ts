/**
 * Normalización del contenido que llega del portal.
 *
 * El portal recorta las descripciones a 150 caracteres sin cerrar la frase
 * (`…acciones integrales d`). Aquí se limpian esos cortes para que las
 * tarjetas no muestren palabras truncadas.
 */

import type { PortalTopic } from './config';
import { TEACHER_CONTENT_TYPES } from '../../content.config';

type ContentType = (typeof TEACHER_CONTENT_TYPES)[number];

/** Construye un id estable y legible: `slug-portalId`. */
export function toSlug(slug: string, portalId: number): string {
  const clean = slug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');

  return clean ? `${clean}-${portalId}` : `publicacion-${portalId}`;
}

/**
 * Cierra el extracto en la última frontera de palabra completa.
 * Si el portal no dio descripción, se cae al título.
 */
export function normalizeExcerpt(
  description: string | undefined,
  fallback: string,
): string {
  const raw = description?.trim();
  if (!raw) return fallback;

  // Ya termina de forma natural.
  if (/[.!?…"»]$/.test(raw)) return raw;

  const lastSpace = raw.lastIndexOf(' ');
  const trimmed = lastSpace > 40 ? raw.slice(0, lastSpace) : raw;

  return `${trimmed.replace(/[,;:\-–—]$/, '')}…`;
}

/**
 * Imágenes del portal que no ilustran la publicación: banners de bloque,
 * cabeceras, logos y piezas de plantilla. Algunas publicaciones las
 * declaran como `og:image` por defecto, y usarlas como miniatura de una
 * noticia se ve claramente fuera de lugar.
 */
const GENERIC_IMAGE = /\b(bloque|banner|logo|cabecera|header|footer|slider|galeria)\w*\./i;

/** Las imágenes propias de una publicación siguen el patrón `pubInt`. */
const PUBLICATION_IMAGE = /pubInt/i;

/**
 * Elige la mejor imagen disponible.
 * Prioriza la específica de la publicación y descarta las de plantilla.
 */
export function pickImage(
  ...candidates: (string | undefined)[]
): string | undefined {
  const usable = candidates.filter(
    (url): url is string => Boolean(url) && !GENERIC_IMAGE.test(url!),
  );

  return usable.find((url) => PUBLICATION_IMAGE.test(url)) ?? usable[0];
}

const CONVOCATORIA_HINTS = /convocatoria|inscripci|postula|beca|aplica/i;
const EVENTO_HINTS =
  /congreso|seminario|taller|foro|jornada|encuentro|conferencia|simposio|webinar|diplomado|curso/i;

/**
 * Afina la clasificación por defecto del tema leyendo el texto.
 * El tema del portal es la base; el título puede precisarla.
 */
export function classifyContent(
  title: string,
  excerpt: string,
  topic: PortalTopic,
): ContentType {
  const haystack = `${title} ${excerpt}`;

  if (CONVOCATORIA_HINTS.test(haystack)) return 'convocatoria';
  if (EVENTO_HINTS.test(haystack)) return 'evento';

  return topic.contentType;
}
