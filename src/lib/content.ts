import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

/* ============================================================
   SERVICIOS DE CONTENIDO
   ------------------------------------------------------------
   Única capa que las páginas usan para leer datos. Aísla a la
   interfaz de cómo están almacenadas las colecciones.
   ============================================================ */

export type Resource = CollectionEntry<'resources'>;
export type Tutorial = CollectionEntry<'tutorials'>;
export type TeacherContent = CollectionEntry<'teacherContent'>;
export type Category = CollectionEntry<'categories'>;
export type Intent = CollectionEntry<'intents'>;
export type InstitutionalLink = CollectionEntry<'institutionalLinks'>;
export type Faculty = CollectionEntry<'faculties'>;
export type Training = CollectionEntry<'trainings'>;

/* --- Recursos ------------------------------------------------ */

export async function getResources(): Promise<Resource[]> {
  const items = await getCollection('resources');
  return items.sort(
    (a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name, 'es'),
  );
}

/**
 * Los recursos destacados, completados hasta `limit` con el resto del
 * catálogo en su orden. Marcar tres destacados no debe dejar huecos en
 * una composición pensada para cuatro.
 */
export async function getFeaturedResources(limit = 3): Promise<Resource[]> {
  const items = await getResources();
  const featured = items.filter((item) => item.data.featured);
  const filler = items.filter((item) => !item.data.featured);
  return [...featured, ...filler].slice(0, limit);
}

/* --- Tutoriales ---------------------------------------------- */

export async function getTutorials(): Promise<Tutorial[]> {
  const items = await getCollection('tutorials');
  return items.sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
}

export async function getFeaturedTutorial(): Promise<Tutorial | undefined> {
  const items = await getTutorials();
  return items.find((item) => item.data.featured) ?? items[0];
}

/**
 * Tutoriales de una categoría, en orden de aprendizaje.
 * Este orden define la navegación anterior/siguiente.
 */
export async function getTutorialsByCategory(categoryId: string): Promise<Tutorial[]> {
  const items = await getTutorials();
  return items
    .filter((item) => item.data.category.id === categoryId)
    .sort((a, b) => a.data.order - b.data.order);
}

/** Vecinos dentro de la misma categoría, para la navegación secuencial. */
export async function getTutorialNeighbors(tutorial: Tutorial) {
  const siblings = await getTutorialsByCategory(tutorial.data.category.id);
  const index = siblings.findIndex((item) => item.id === tutorial.id);

  return {
    previous: index > 0 ? siblings[index - 1] : undefined,
    next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined,
  };
}

/* --- Contenido institucional --------------------------------- */

export async function getTeacherContent(): Promise<TeacherContent[]> {
  const items = await getCollection('teacherContent');
  return items.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
  );
}

/* --- Accesos institucionales --------------------------------- */

/** Títulos de los grupos. Viven aquí, no dentro de la plantilla. */
export const INSTITUTIONAL_GROUP_LABELS: Record<string, string> = {
  docencia: 'Docencia y vida académica',
  normativa: 'Normativa y gobierno',
  servicios: 'Servicios y atención',
};

export async function getInstitutionalLinks(): Promise<InstitutionalLink[]> {
  const items = await getCollection('institutionalLinks');
  return items.sort((a, b) => a.data.order - b.data.order);
}

/**
 * Los accesos agrupados y en orden, listos para pintar. Devuelve solo
 * los grupos que tienen enlaces, para que quitar uno del JSON no deje
 * un encabezado huérfano.
 */
export async function getInstitutionalGroups(): Promise<
  { id: string; label: string; links: InstitutionalLink[] }[]
> {
  const links = await getInstitutionalLinks();

  return Object.entries(INSTITUTIONAL_GROUP_LABELS)
    .map(([id, label]) => ({
      id,
      label,
      links: links.filter((link) => link.data.group === id),
    }))
    .filter((group) => group.links.length > 0);
}

/* --- Categorías e intents ------------------------------------ */

export async function getCategories(
  appliesTo?: 'resource' | 'tutorial',
): Promise<Category[]> {
  const items = await getCollection('categories');
  const filtered = appliesTo
    ? items.filter((item) => item.data.appliesTo.includes(appliesTo))
    : items;

  return filtered.sort((a, b) => a.data.order - b.data.order);
}

export async function getIntents(): Promise<Intent[]> {
  const items = await getCollection('intents');
  return items.sort((a, b) => a.data.order - b.data.order);
}

/**
 * Categorías de recursos con cuántos recursos tiene cada una.
 * Alimenta la navegación del catálogo, que muestra el volumen real
 * en vez de una lista plana de nombres.
 */
export async function getResourceCategoriesWithCount(): Promise<
  { category: Category; count: number }[]
> {
  const [categories, resources] = await Promise.all([
    getCategories('resource'),
    getResources(),
  ]);

  return categories
    .map((category) => ({
      category,
      count: resources.filter((resource) =>
        resource.data.categories.some((ref) => ref.id === category.id),
      ).length,
    }))
    .filter((entry) => entry.count > 0);
}

/**
 * Agrupa los tutoriales por categoría respetando el orden de
 * aprendizaje. Es la estructura que END Digital presenta como rutas.
 */
export async function getTutorialPaths(): Promise<
  { category: Category; tutorials: Tutorial[] }[]
> {
  const [categories, tutorials] = await Promise.all([
    getCategories('tutorial'),
    getTutorials(),
  ]);

  return categories
    .map((category) => ({
      category,
      tutorials: tutorials
        .filter((tutorial) => tutorial.data.category.id === category.id)
        .sort((a, b) => a.data.order - b.data.order),
    }))
    .filter((path) => path.tutorials.length > 0);
}

/**
 * Resuelve las referencias de categoría a sus entradas completas.
 * Las referencias rotas se descartan en vez de romper la página.
 */
export async function resolveCategories(
  refs: { id: string }[],
): Promise<Category[]> {
  const entries = await Promise.all(refs.map((ref) => getEntry('categories', ref.id)));
  return entries.filter((entry): entry is Category => Boolean(entry));
}

export async function resolveIntents(refs: { id: string }[]): Promise<Intent[]> {
  const entries = await Promise.all(refs.map((ref) => getEntry('intents', ref.id)));
  return entries.filter((entry): entry is Intent => Boolean(entry));
}

export async function resolveResources(refs: { id: string }[]): Promise<Resource[]> {
  const entries = await Promise.all(refs.map((ref) => getEntry('resources', ref.id)));
  return entries.filter((entry): entry is Resource => Boolean(entry));
}

/* --- Etiquetas legibles -------------------------------------- */

export const MODALITY_LABELS: Record<string, string> = {
  web: 'En el navegador',
  escritorio: 'Se instala',
  movil: 'Móvil',
  multiplataforma: 'Multiplataforma',
};

export const PRICING_LABELS: Record<string, string> = {
  gratis: 'Gratis',
  freemium: 'Plan gratuito',
  pago: 'De pago',
  'licencia-institucional': 'Licencia END',
};

export const MOODLE_LABELS: Record<string, string> = {
  nativa: 'Integración nativa',
  lti: 'Conexión LTI',
  embed: 'Se incrusta',
  enlace: 'Se enlaza',
  ninguna: 'Sin integración',
};

export const LEVEL_LABELS: Record<string, string> = {
  basico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  noticia: 'Noticia',
  evento: 'Evento',
  convocatoria: 'Convocatoria',
  institucional: 'Institucional',
};

/** Formatea una fecha en español para mostrarla al docente. */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota',
  }).format(date);
}

/** Duración en minutos a texto corto: "12 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/* ============================================================
   FACULTADES
   ============================================================ */

export async function getFaculties(): Promise<Faculty[]> {
  const items = await getCollection('faculties');
  return items.sort(
    (a, b) =>
      a.data.order - b.data.order ||
      a.data.name.localeCompare(b.data.name, 'es'),
  );
}

/* ============================================================
   PLAN DE CAPACITACIÓN
   ============================================================ */

export const TRACK_LABELS: Record<string, string> = {
  'google-workspace': 'Google Workspace',
  moodle: 'Moodle',
  'recursos-digitales': 'Recursos digitales',
};

export const AUDIENCE_LABELS: Record<string, string> = {
  facultades: 'Por facultades y áreas',
  abierta: 'Invitación abierta',
};

/**
 * Las sesiones del plan, en el orden en que se imparten.
 *
 * Las que aún no tienen fecha cerrada van al final: no se les inventa
 * un día para poder ordenarlas.
 */
export async function getTrainings(): Promise<Training[]> {
  const items = await getCollection('trainings');

  return items.sort((a, b) => {
    const dateA = a.data.date?.getTime();
    const dateB = b.data.date?.getTime();

    if (dateA && dateB && dateA !== dateB) return dateA - dateB;
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;

    return a.data.order - b.data.order;
  });
}

/**
 * Clave numérica AAAAMMDD de una fecha de calendario.
 *
 * Las fechas del plan vienen del JSON como "2026-08-20", que se
 * interpreta como medianoche UTC. Leerlas en la zona de Bogotá
 * (UTC-5) las retrasaría un día: el 20 de agosto se mostraría como
 * el 19. Por eso se leen siempre en UTC.
 */
function dayKeyUTC(date: Date): number {
  return (
    date.getUTCFullYear() * 10000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate()
  );
}

/** Clave del día local, para comparar con `dayKeyUTC`. */
function dayKeyLocal(date: Date): number {
  return (
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  );
}

/**
 * Una sesión ya ocurrió si su día es anterior a hoy.
 *
 * Se compara el día, no el instante: una sesión de las 8:00 no debe
 * darse por pasada a las 9:00 del mismo día, porque el plan la repite
 * en varias franjas horarias.
 */
export function isPastTraining(training: Training, today = new Date()): boolean {
  const date = training.data.date;
  if (!date) return false;

  return dayKeyUTC(date) < dayKeyLocal(today);
}
