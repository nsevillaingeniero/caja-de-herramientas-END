import { isAreaVisible } from './accents';
import {
  getResources,
  getTeacherContent,
  getTutorials,
  CONTENT_TYPE_LABELS,
  LEVEL_LABELS,
  PRICING_LABELS,
} from './content';

/* ============================================================
   ÍNDICE DE BÚSQUEDA GLOBAL
   ------------------------------------------------------------
   Se genera en tiempo de build y se sirve como JSON estático.
   El cliente solo descarga este índice: no hay backend ni
   llamadas en tiempo de ejecución.
   ============================================================ */

export type SearchGroup = 'resource' | 'tutorial' | 'teacher';

export interface SearchDocument {
  id: string;
  group: SearchGroup;
  title: string;
  description: string;
  href: string;
  /** Etiqueta contextual que se muestra en el resultado. */
  meta: string;
  /** Texto adicional que alimenta la coincidencia sin mostrarse. */
  keywords: string;
}

export const GROUP_LABELS: Record<SearchGroup, string> = {
  resource: 'Recursos',
  tutorial: 'END Digital',
  teacher: 'Para docentes',
};

export async function buildSearchIndex(): Promise<SearchDocument[]> {
  // El área "Para docentes" está oculta: llevar a ella desde el
  // buscador dejaría al docente en una sección que la navegación no
  // ofrece. Vuelve al índice sola al quitar `hidden` en `AREAS`.
  const showTeacher = isAreaVisible('para-docentes');

  const [resources, tutorials, teacher] = await Promise.all([
    getResources(),
    getTutorials(),
    showTeacher ? getTeacherContent() : Promise.resolve([]),
  ]);

  const documents: SearchDocument[] = [];

  for (const item of resources) {
    documents.push({
      id: `resource:${item.id}`,
      group: 'resource',
      title: item.data.name,
      description: item.data.shortDescription,
      href: `/recursos/${item.id}/`,
      meta: PRICING_LABELS[item.data.pricing] ?? '',
      keywords: [
        ...item.data.tags,
        ...item.data.activities,
        ...item.data.categories.map((c) => c.id.replace(/-/g, ' ')),
        ...item.data.intents.map((i) => i.id.replace(/-/g, ' ')),
      ].join(' '),
    });
  }

  for (const item of tutorials) {
    documents.push({
      id: `tutorial:${item.id}`,
      group: 'tutorial',
      title: item.data.title,
      description: item.data.description,
      href: `/end-digital/${item.id}/`,
      meta: LEVEL_LABELS[item.data.level] ?? '',
      keywords: [
        ...item.data.tags,
        ...item.data.steps,
        item.data.category.id.replace(/-/g, ' '),
        ...item.data.intents.map((i) => i.id.replace(/-/g, ' ')),
      ].join(' '),
    });
  }

  for (const item of teacher) {
    documents.push({
      id: `teacher:${item.id}`,
      group: 'teacher',
      title: item.data.title,
      description: item.data.excerpt,
      href: `/para-docentes/${item.id}/`,
      meta: CONTENT_TYPE_LABELS[item.data.contentType] ?? '',
      keywords: [...item.data.tags, item.data.sourceTopic].join(' '),
    });
  }

  return documents;
}
