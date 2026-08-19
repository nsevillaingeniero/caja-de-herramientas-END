import type { Loader, LoaderContext } from 'astro/loaders';

import {
  ITEMS_PER_TOPIC,
  LISTING_PATH,
  PORTAL_ORIGIN,
  REQUEST_DELAY_MS,
  REQUEST_TIMEOUT_MS,
  TOPICS,
  USER_AGENT,
  type PortalTopic,
} from './config';
import { parseListing, parsePublication, type ListingItem } from './parser';
import { classifyContent, normalizeExcerpt, pickImage, toSlug } from './normalize';

/* ============================================================
   LOADER DEL PORTAL INSTITUCIONAL
   ------------------------------------------------------------
   Punto único de acoplamiento con endeporte.edu.co.

   Migrar a otra fuente (API oficial, RSS, CMS, base de datos)
   significa reemplazar SOLO este archivo: el schema, los tipos
   y toda la interfaz permanecen sin cambios.
   ============================================================ */

/**
 * Vigencia de la caché de contenido institucional.
 *
 * Seis horas equilibran frescura y tiempo de build. En producción,
 * cada despliegue con `PORTAL_REFRESH=1` fuerza una sincronización completa.
 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** `fetch` con timeout, para que un portal lento no cuelgue el build. */
async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-CO,es;q=0.9',
      },
    });

    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadTopic(
  topic: PortalTopic,
  logger: LoaderContext['logger'],
): Promise<ListingItem[]> {
  const url = `${PORTAL_ORIGIN}${LISTING_PATH}?tema=${topic.id}`;
  const html = await fetchText(url);

  if (!html) {
    logger.warn(`No se pudo leer el tema "${topic.name}" (${url})`);
    return [];
  }

  const items = parseListing(html, PORTAL_ORIGIN).slice(0, ITEMS_PER_TOPIC);
  logger.info(`Tema "${topic.name}": ${items.length} publicaciones`);
  return items;
}

export function portalLoader(): Loader {
  return {
    name: 'portal-endeporte',

    async load({ store, logger, parseData, meta }: LoaderContext) {
      // Reutiliza la sincronización previa mientras siga fresca.
      // Evita esperar la ingesta completa en cada build de desarrollo.
      const lastSync = meta.get('lastSync');
      const force = process.env.PORTAL_REFRESH === '1';

      if (!force && lastSync && store.keys().length > 0) {
        const age = Date.now() - new Date(lastSync).getTime();

        if (age < CACHE_TTL_MS) {
          const minutes = Math.round(age / 60_000);
          logger.info(
            `Contenido institucional en caché (${store.keys().length} publicaciones, ${minutes} min). ` +
              'Usa PORTAL_REFRESH=1 para forzar la actualización.',
          );
          return;
        }
      }

      logger.info(`Consultando el portal institucional (${PORTAL_ORIGIN})…`);

      // Se recorren los temas y se deduplica: una publicación puede
      // aparecer en varios temas del portal.
      const collected = new Map<number, { item: ListingItem; topic: PortalTopic }>();

      for (const topic of TOPICS) {
        const items = await loadTopic(topic, logger);
        for (const item of items) {
          if (!collected.has(item.portalId)) {
            collected.set(item.portalId, { item, topic });
          }
        }
        await sleep(REQUEST_DELAY_MS);
      }

      if (collected.size === 0) {
        // El portal no respondió. Se conserva lo que ya estaba en el store
        // para que el sitio siga construyéndose con el último contenido bueno.
        const cached = store.keys().length;
        if (cached > 0) {
          logger.warn(
            `Portal inaccesible: se conservan ${cached} contenidos de la caché anterior.`,
          );
          return;
        }
        logger.warn(
          'Portal inaccesible y sin caché previa. "Para docentes" quedará vacía en este build.',
        );
        return;
      }

      store.clear();
      let stored = 0;

      for (const { item, topic } of collected.values()) {
        // Los metadatos Open Graph del detalle son más fiables que el listado.
        const detailHtml = await fetchText(item.url);
        const metaData = detailHtml ? parsePublication(detailHtml) : {};

        const title = metaData.title ?? item.title;
        const excerpt = normalizeExcerpt(metaData.description, title);
        const publishedAt = metaData.publishedAt;
        const image = pickImage(item.image, metaData.image);

        if (!publishedAt) {
          logger.warn(`Sin fecha de publicación, se omite: ${item.url}`);
          continue;
        }

        const id = toSlug(item.slug, item.portalId);

        const data = await parseData({
          id,
          data: {
            title,
            excerpt,
            publishedAt,
            updatedAt: metaData.updatedAt,
            image,
            imageAlt: image ? (metaData.imageAlt ?? title) : undefined,
            sourceUrl: metaData.canonicalUrl ?? item.url,
            sourceTopic: topic.name,
            sourceTopicId: topic.id,
            contentType: classifyContent(title, excerpt, topic),
            tags: topic.tags,
          },
        });

        store.set({ id, data });
        stored += 1;

        await sleep(REQUEST_DELAY_MS);
      }

      meta.set('lastSync', new Date().toISOString());
      logger.info(`Contenido institucional sincronizado: ${stored} publicaciones.`);
    },
  };
}
