import {
  getIntents,
  getResources,
  getTutorials,
  type Intent,
  type Resource,
  type Tutorial,
} from './content';

/* ============================================================
   MOTOR DE RECOMENDACIÓN CRUZADA
   ------------------------------------------------------------
   Responde a "También te puede interesar" atravesando los tipos
   de contenido: desde un tutorial se llega a herramientas, y
   desde una herramienta se llega a tutoriales.

   La relevancia se calcula por señales compartidas, no por
   listas escritas a mano, para que las relaciones se mantengan
   solas a medida que crece el catálogo.
   ============================================================ */

/** Peso de cada señal. Una categoría compartida vale más que una etiqueta. */
const WEIGHTS = {
  explicitLink: 100,
  category: 10,
  intent: 6,
  tag: 2,
} as const;

export interface RelatedItem {
  type: 'resource' | 'tutorial';
  href: string;
  title: string;
  description: string;
  score: number;
}

interface Signals {
  categories: Set<string>;
  intents: Set<string>;
  tags: Set<string>;
}

function resourceSignals(resource: Resource): Signals {
  return {
    categories: new Set(resource.data.categories.map((c) => c.id)),
    intents: new Set(resource.data.intents.map((i) => i.id)),
    tags: new Set(resource.data.tags.map((t) => t.toLowerCase())),
  };
}

function tutorialSignals(tutorial: Tutorial): Signals {
  return {
    categories: new Set([tutorial.data.category.id]),
    intents: new Set(tutorial.data.intents.map((i) => i.id)),
    tags: new Set(tutorial.data.tags.map((t) => t.toLowerCase())),
  };
}

function overlap(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const value of a) if (b.has(value)) count += 1;
  return count;
}

function score(a: Signals, b: Signals): number {
  return (
    overlap(a.categories, b.categories) * WEIGHTS.category +
    overlap(a.intents, b.intents) * WEIGHTS.intent +
    overlap(a.tags, b.tags) * WEIGHTS.tag
  );
}

/**
 * Contenido relacionado con un tutorial.
 * Prioriza los recursos que el propio tutorial declara, y luego
 * completa con herramientas y otros tutoriales afines.
 */
export async function getRelatedToTutorial(
  tutorial: Tutorial,
  limit = 4,
): Promise<RelatedItem[]> {
  const base = tutorialSignals(tutorial);
  const explicit = new Set(tutorial.data.relatedResources.map((r) => r.id));

  const [resources, tutorials] = await Promise.all([getResources(), getTutorials()]);

  const candidates: RelatedItem[] = [];

  for (const resource of resources) {
    const value =
      score(base, resourceSignals(resource)) +
      (explicit.has(resource.id) ? WEIGHTS.explicitLink : 0);

    if (value <= 0) continue;

    candidates.push({
      type: 'resource',
      href: `/recursos/${resource.id}/`,
      title: resource.data.name,
      description: resource.data.shortDescription,
      score: value,
    });
  }

  for (const other of tutorials) {
    if (other.id === tutorial.id) continue;

    const value = score(base, tutorialSignals(other));
    if (value <= 0) continue;

    candidates.push({
      type: 'tutorial',
      href: `/end-digital/${other.id}/`,
      title: other.data.title,
      description: other.data.description,
      score: value,
    });
  }

  return rank(candidates, limit);
}

/**
 * Contenido relacionado con un recurso: sobre todo tutoriales que
 * enseñan a usarlo, más herramientas que resuelven necesidades similares.
 */
export async function getRelatedToResource(
  resource: Resource,
  limit = 4,
): Promise<RelatedItem[]> {
  const base = resourceSignals(resource);

  const [resources, tutorials] = await Promise.all([getResources(), getTutorials()]);

  const candidates: RelatedItem[] = [];

  for (const tutorial of tutorials) {
    const declares = tutorial.data.relatedResources.some((r) => r.id === resource.id);
    const value =
      score(base, tutorialSignals(tutorial)) +
      (declares ? WEIGHTS.explicitLink : 0);

    if (value <= 0) continue;

    candidates.push({
      type: 'tutorial',
      href: `/end-digital/${tutorial.id}/`,
      title: tutorial.data.title,
      description: tutorial.data.description,
      score: value,
    });
  }

  for (const other of resources) {
    if (other.id === resource.id) continue;

    const value = score(base, resourceSignals(other));
    if (value <= 0) continue;

    candidates.push({
      type: 'resource',
      href: `/recursos/${other.id}/`,
      title: other.data.name,
      description: other.data.shortDescription,
      score: value,
    });
  }

  return rank(candidates, limit);
}

/**
 * Resultados de un intent: mezcla recursos y tutoriales que
 * responden a la misma necesidad declarada por el docente.
 */
export async function getByIntent(intentId: string) {
  const [resources, tutorials] = await Promise.all([getResources(), getTutorials()]);

  return {
    resources: resources.filter((item) =>
      item.data.intents.some((ref) => ref.id === intentId),
    ),
    tutorials: tutorials.filter((item) =>
      item.data.intents.some((ref) => ref.id === intentId),
    ),
  };
}

/**
 * Cada intent con cuánto hay detrás. La lista de "¿Qué quieres hacer?"
 * muestra ese volumen: es la diferencia entre un menú y una promesa
 * verificable de lo que el docente va a encontrar.
 */
export async function getIntentSummaries(): Promise<
  { intent: Intent; resources: number; tutorials: number }[]
> {
  const intents = await getIntents();

  return Promise.all(
    intents.map(async (intent) => {
      const { resources, tutorials } = await getByIntent(intent.id);
      return { intent, resources: resources.length, tutorials: tutorials.length };
    }),
  );
}

/** Ordena por relevancia y alterna tipos para que la lista no sea homogénea. */
function rank(candidates: RelatedItem[], limit: number): RelatedItem[] {
  const sorted = candidates.sort((a, b) => b.score - a.score);

  const resources = sorted.filter((item) => item.type === 'resource');
  const tutorials = sorted.filter((item) => item.type === 'tutorial');

  const mixed: RelatedItem[] = [];
  let i = 0;

  while (mixed.length < limit && (i < resources.length || i < tutorials.length)) {
    if (i < tutorials.length) mixed.push(tutorials[i]);
    if (mixed.length < limit && i < resources.length) mixed.push(resources[i]);
    i += 1;
  }

  return mixed.slice(0, limit);
}
