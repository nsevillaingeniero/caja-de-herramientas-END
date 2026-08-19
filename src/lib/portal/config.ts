/**
 * Configuración de la ingesta desde el portal institucional.
 *
 * Verificado contra endeporte.edu.co (agosto 2026):
 *  - `/publicaciones/noticias/?tema=N` devuelve HTML renderizado en servidor.
 *  - `/publicaciones/{id}/{slug}/` expone metadatos Open Graph completos.
 *  - robots.txt NO restringe /publicaciones y permite las rutas de media
 *    (donde viven las imágenes), pero sí bloquea /info — por eso no se
 *    usan los sitemaps internos, que además responden 403.
 */

import { TEACHER_CONTENT_TYPES } from '../../content.config';

export const PORTAL_ORIGIN = 'https://endeporte.edu.co';

export const LISTING_PATH = '/publicaciones/noticias/';

/** Identificador honesto: permite al portal reconocer y contactar el origen. */
export const USER_AGENT =
  'CajaHerramientasEND/1.0 (+https://endeporte.edu.co; plataforma docente institucional)';

export const REQUEST_TIMEOUT_MS = 20_000;

/** Espera entre peticiones, para no presionar el portal. */
export const REQUEST_DELAY_MS = 350;

type ContentType = (typeof TEACHER_CONTENT_TYPES)[number];

export interface PortalTopic {
  /** Valor del parámetro `?tema=` en el portal. */
  id: number;
  /** Nombre tal como aparece en el selector del portal. */
  name: string;
  /** Cómo se clasifica en la plataforma docente. */
  contentType: ContentType;
  /** Etiquetas que se añaden a todo contenido de este tema. */
  tags: string[];
}

/**
 * Temas del portal seleccionados por su relevancia para docentes.
 *
 * Se descartan deliberadamente los temas puramente deportivos o de
 * coyuntura (Mundial de Atletismo, Juegos Nacionales, Elección de Rector),
 * que no aportan a la labor docente.
 */
export const TOPICS: PortalTopic[] = [
  {
    id: 4,
    name: 'Institucional',
    contentType: 'institucional',
    tags: ['institucional'],
  },
  {
    id: 5,
    name: 'Programas académicos',
    contentType: 'institucional',
    tags: ['académico', 'programas'],
  },
  {
    id: 9,
    name: 'Educación continua',
    contentType: 'convocatoria',
    tags: ['formación', 'educación continua'],
  },
  {
    id: 10,
    name: 'Investigación',
    contentType: 'noticia',
    tags: ['investigación'],
  },
  {
    id: 13,
    name: 'Convocatorias - Internacionalización',
    contentType: 'convocatoria',
    tags: ['convocatoria', 'internacionalización'],
  },
  {
    id: 14,
    name: 'Internacionalización',
    contentType: 'noticia',
    tags: ['internacionalización'],
  },
  {
    id: 6,
    name: 'Biblioteca',
    contentType: 'institucional',
    tags: ['biblioteca', 'recursos'],
  },
  {
    id: 2,
    name: 'Noticia principal',
    contentType: 'noticia',
    tags: ['destacado'],
  },
];

/** Cuántas publicaciones se traen por tema. */
export const ITEMS_PER_TOPIC = 12;
