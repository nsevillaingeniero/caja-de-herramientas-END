/**
 * Extracción de datos del HTML del portal institucional.
 *
 * El portal corre sobre Nexura y renderiza en servidor con una estructura
 * estable (`.contentPubTema` por publicación). Aun así, todo aquí es
 * defensivo: si el marcado cambia, se devuelve `null` y el loader
 * continúa con el resto en lugar de romper el build.
 */

/** Decodifica las entidades HTML que aparecen en el portal. */
function decodeEntities(input: string): string {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    ntilde: 'ñ',
    Ntilde: 'Ñ',
    aacute: 'á',
    eacute: 'é',
    iacute: 'í',
    oacute: 'ó',
    uacute: 'ú',
    Aacute: 'Á',
    Eacute: 'É',
    Iacute: 'Í',
    Oacute: 'Ó',
    Uacute: 'Ú',
    uuml: 'ü',
    laquo: '«',
    raquo: '»',
    hellip: '…',
    mdash: '—',
    ndash: '–',
    rsquo: '’',
    lsquo: '‘',
    ldquo: '“',
    rdquo: '”',
  };

  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&([a-z]+);/gi, (match, name) => named[name] ?? match);
}

/** Quita etiquetas y normaliza espacios. */
export function stripHtml(input: string): string {
  return decodeEntities(input.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lee un `<meta property="..."|name="...">` del documento. */
export function readMeta(html: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
    'i',
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
    'i',
  );

  const match = html.match(pattern) ?? html.match(alt);
  if (!match?.[1]) return undefined;

  const value = decodeEntities(match[1]).trim();
  return value.length > 0 ? value : undefined;
}

export interface ListingItem {
  /** Identificador numérico de la publicación en el portal. */
  portalId: number;
  slug: string;
  title: string;
  url: string;
  image?: string;
}

/**
 * Extrae las publicaciones de una página de listado.
 *
 * Estructura observada por item:
 *   <div class="contentPubTema">
 *     <div class="contentImage"><img src="/info/.../thpubInt_400X400_{id}.webp"></div>
 *     <h2 class="title"><a href="https://.../publicaciones/{id}/{slug}/">Título</a></h2>
 */
export function parseListing(html: string, origin: string): ListingItem[] {
  const items: ListingItem[] = [];
  const seen = new Set<number>();

  // Cada bloque empieza en `contentPubTema`; el primer fragmento es cabecera.
  const blocks = html.split('<div class="contentPubTema">').slice(1);

  for (const block of blocks) {
    const linkMatch = block.match(
      /<h2[^>]*class="[^"]*title[^"]*"[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i,
    );
    if (!linkMatch) continue;

    const url = linkMatch[1].trim();
    const title = stripHtml(linkMatch[2]);
    if (!title) continue;

    const idMatch = url.match(/\/publicaciones\/(\d+)\/([^/?#]+)/);
    if (!idMatch) continue;

    const portalId = Number(idMatch[1]);
    if (seen.has(portalId)) continue;
    seen.add(portalId);

    const imgMatch = block.match(
      /<div[^>]*class="[^"]*contentImage[^"]*"[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
    );
    let image: string | undefined;
    if (imgMatch?.[1]) {
      const raw = imgMatch[1].trim();
      image = raw.startsWith('http') ? raw : `${origin}${raw}`;
    }

    items.push({
      portalId,
      slug: idMatch[2],
      title,
      url: url.startsWith('http') ? url : `${origin}${url}`,
      image,
    });
  }

  return items;
}

export interface PublicationMeta {
  title?: string;
  description?: string;
  publishedAt?: string;
  updatedAt?: string;
  image?: string;
  imageAlt?: string;
  canonicalUrl?: string;
}

/**
 * Lee los metadatos Open Graph de una publicación individual.
 * Es la fuente más fiable: fechas en ISO 8601 e imagen a 600px.
 */
export function parsePublication(html: string): PublicationMeta {
  return {
    title: readMeta(html, 'og:title'),
    description:
      readMeta(html, 'og:description') ?? readMeta(html, 'description'),
    publishedAt: readMeta(html, 'og:published_time'),
    updatedAt: readMeta(html, 'og:updated_time'),
    image: readMeta(html, 'og:image'),
    imageAlt: readMeta(html, 'og:image:alt'),
    canonicalUrl: readMeta(html, 'og:url'),
  };
}
