import { defineCollection, reference, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

import { portalLoader } from './lib/portal/loader';

/* ============================================================
   VOCABULARIOS CONTROLADOS
   ------------------------------------------------------------
   Se declaran una sola vez y se reutilizan en los schemas.
   Cambiar un valor aquí lo propaga a validación, tipos y UI.
   ============================================================ */

export const MODALITIES = [
  'web',
  'escritorio',
  'movil',
  'multiplataforma',
] as const;

export const PRICING = [
  'gratis',
  'freemium',
  'pago',
  'licencia-institucional',
] as const;

export const MOODLE_INTEGRATION = [
  'nativa', // Plugin o actividad dentro de Moodle
  'lti', // Conexión vía LTI
  'embed', // Se incrusta con código embed
  'enlace', // Solo se enlaza desde el curso
  'ninguna',
] as const;

export const LEVELS = ['basico', 'intermedio', 'avanzado'] as const;

/**
 * Líneas del plan de capacitación.
 *
 * La hoja de origen nombra la categoría de cada sesión con frases
 * largas y desiguales ("Moodle", "LMS Moodle y su integración con la
 * suite Google"). Aquí se normalizan a tres líneas para poder filtrar;
 * el texto literal de la hoja se conserva en `categoryLabel`.
 */
export const TRAINING_TRACKS = [
  'google-workspace',
  'moodle',
  'recursos-digitales',
] as const;

/** A quién convoca cada sesión. */
export const TRAINING_AUDIENCES = ['facultades', 'abierta'] as const;

export const TEACHER_CONTENT_TYPES = [
  'noticia',
  'evento',
  'convocatoria',
  'institucional',
] as const;

/**
 * Acentos de color. Cada uno corresponde a una de las tres áreas:
 * `end` → Recursos, `teal` → END Digital, `clay` → Para docentes.
 * `slate` es el neutro para lo que no pertenece a ninguna.
 */
export const ACCENTS = ['end', 'teal', 'clay', 'slate'] as const;

/* ============================================================
   CATEGORÍAS
   ------------------------------------------------------------
   Desacopladas de los componentes: viven en JSON editable.
   ============================================================ */

const categories = defineCollection({
  loader: file('src/content/categories.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    /** Nombre del icono en `src/components/primitives/Icon.astro`. */
    icon: z.string(),
    /** Token de color de acento (clave del theme, no un hex suelto). */
    accent: z.enum(ACCENTS).default('end'),
    /** A qué tipos de contenido aplica esta categoría. */
    appliesTo: z.array(z.enum(['resource', 'tutorial'])).default(['resource']),
    order: z.number().default(99),
  }),
});

/* ============================================================
   INTENTS — "¿Qué quieres hacer?"
   ------------------------------------------------------------
   Punto de entrada por necesidad, no por sección.
   ============================================================ */

const intents = defineCollection({
  loader: file('src/content/intents.json'),
  schema: z.object({
    id: z.string(),
    /** Acción, no sección: "Evaluar a mis estudiantes". */
    label: z.string(),
    /** Título de la página de resultados, en primera persona. */
    pageTitle: z.string(),
    /** Nombre del icono. Es un apoyo secundario: nunca sustituye al texto. */
    icon: z.string(),
    description: z.string(),
    /** Categorías que alimentan los resultados de este intent. */
    matchCategories: z.array(z.string()).default([]),
    /** Etiquetas adicionales que refuerzan la coincidencia. */
    matchTags: z.array(z.string()).default([]),
    accent: z.enum(ACCENTS).default('end'),
    order: z.number().default(99),
  }),
});

/* ============================================================
   RECURSOS — catálogo de herramientas digitales
   ============================================================ */

const resources = defineCollection({
  loader: glob({ base: 'src/content/resources', pattern: '**/*.json' }),
  schema: z.object({
    name: z.string(),
    /** Frase corta para las cards. Se mantiene breve a propósito. */
    shortDescription: z.string().max(160),
    /** Descripción completa para la página de detalle. */
    description: z.string(),

    /** Qué permite crear el docente con esta herramienta. */
    activities: z.array(z.string()).min(1),

    modality: z.enum(MODALITIES).default('web'),
    pricing: z.enum(PRICING),
    /** Detalle del modelo de precio, si aplica. */
    pricingNote: z.string().optional(),

    categories: z.array(reference('categories')).min(1),

    moodleIntegration: z.enum(MOODLE_INTEGRATION),
    /** Cómo se usa concretamente dentro de END Digital. */
    moodleUsage: z.string(),

    languages: z.array(z.string()).default(['Español']),
    url: z.string().url(),

    /**
     * Logotipo oficial de la herramienta, servido desde
     * `public/images/resources/`. Es opcional a propósito: cuando falta,
     * la tarjeta resuelve la identidad con tipografía y color —nunca con
     * un emoji ni con un logotipo inventado.
     */
    logo: z.string().startsWith('/images/resources/').optional(),

    /** Tutorial propio dentro de la plataforma, si existe. */
    tutorial: reference('tutorials').optional(),
    /** Guía externa oficial de la herramienta. */
    externalGuide: z.string().url().optional(),

    intents: z.array(reference('intents')).default([]),
    tags: z.array(z.string()).default([]),

    featured: z.boolean().default(false),
    order: z.number().default(99),
  }),
});

/* ============================================================
   TUTORIALES END DIGITAL
   ------------------------------------------------------------
   Markdown: el cuerpo es el contenido extenso del tutorial.
   ============================================================ */

const tutorials = defineCollection({
  loader: glob({ base: 'src/content/tutorials', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),

    category: reference('categories'),
    level: z.enum(LEVELS).default('basico'),
    /** Duración estimada en minutos. */
    duration: z.number().positive(),

    /** URL del video (YouTube/Vimeo). Opcional: hay tutoriales escritos. */
    video: z.string().url().optional(),
    /** Material complementario descargable o enlazado. */
    guide: z
      .object({
        label: z.string(),
        url: z.string(),
      })
      .optional(),

    /** Pasos principales, para escanear el tutorial de un vistazo. */
    steps: z.array(z.string()).default([]),

    /** Recursos del catálogo que complementan este tutorial. */
    relatedResources: z.array(reference('resources')).default([]),

    intents: z.array(reference('intents')).default([]),
    tags: z.array(z.string()).default([]),

    date: z.coerce.date(),
    featured: z.boolean().default(false),
    /** Orden dentro de su categoría (define anterior/siguiente). */
    order: z.number().default(99),
  }),
});

/* ============================================================
   ACCESOS INSTITUCIONALES
   ------------------------------------------------------------
   Enlaces del portal oficial que un docente necesita a mano.
   Cada URL está tomada del menú del portal y verificada: aquí no
   se inventan destinos. La plataforma solo los ordena y los
   presenta; el contenido sigue viviendo en endeporte.edu.co.
   ============================================================ */

export const INSTITUTIONAL_GROUPS = [
  'docencia',
  'normativa',
  'servicios',
] as const;

const institutionalLinks = defineCollection({
  loader: file('src/content/institutional-links.json'),
  schema: z.object({
    id: z.string(),
    label: z.string(),
    /** Para qué le sirve al docente. Sin esto el enlace es ruido. */
    description: z.string(),
    url: z.string().url(),
    group: z.enum(INSTITUTIONAL_GROUPS),
    icon: z.string(),
    /** Marca los enlaces que abren o descargan un documento. */
    kind: z.enum(['pagina', 'documento']).default('pagina'),
    order: z.number().default(99),
  }),
});

/* ============================================================
   CONTENIDO PARA DOCENTES
   ------------------------------------------------------------
   NO se edita a mano: lo alimenta el portal institucional en
   tiempo de build mediante un loader propio.

   Para migrar a una API, RSS o CMS basta con sustituir
   `portalLoader()` — el schema, los tipos y la interfaz
   permanecen intactos.
   ============================================================ */

const teacherContent = defineCollection({
  loader: portalLoader(),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),

    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),

    image: z.string().url().optional(),
    imageAlt: z.string().optional(),

    /** URL canónica en el portal oficial. El portal manda. */
    sourceUrl: z.string().url(),
    /** Nombre del tema del portal del que proviene. */
    sourceTopic: z.string(),
    sourceTopicId: z.number(),

    contentType: z.enum(TEACHER_CONTENT_TYPES).default('noticia'),
    tags: z.array(z.string()).default([]),
  }),
});

/* ============================================================
   FACULTADES
   ------------------------------------------------------------
   Las tres facultades de la Escuela. Viven en su propio archivo
   porque las usan varias secciones y no pertenecen a ninguna.
   ============================================================ */

const faculties = defineCollection({
  loader: file('src/content/faculties.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    /** Forma corta para fichas y filtros, cuando el nombre es largo. */
    shortName: z.string().optional(),
    order: z.number().default(99),
  }),
});

/* ============================================================
   PLAN DE CAPACITACIÓN
   ------------------------------------------------------------
   Sesiones de formación y acompañamiento docente.

   El campo que sostiene el futuro de esta sección es `recording`:
   hoy casi ninguna sesión lo trae, y la ficha lo dice. Cuando la
   grabación exista, basta añadir la URL en el JSON para que la
   ficha cambie de estado sin tocar un solo componente.
   ============================================================ */

const trainings = defineCollection({
  loader: glob({ base: 'src/content/trainings', pattern: '**/*.json' }),
  schema: z.object({
    /** El título de la sesión, tal como se convoca. */
    topic: z.string(),
    track: z.enum(TRAINING_TRACKS),
    /** Categoría literal de la hoja de planeación. */
    categoryLabel: z.string(),

    /** Herramientas concretas que se trabajan en la sesión. */
    tools: z.array(z.string()).default([]),
    /** Puntos que cubre, cuando el tema los enumera. */
    covers: z.array(z.string()).default([]),

    /**
     * Fecha de la sesión. Es opcional porque el plan todavía tiene
     * sesiones sin fecha cerrada: es preferible decir "por confirmar"
     * a inventar un día.
     */
    date: z.coerce.date().optional(),
    /** Cómo se anuncia la fecha ("Jueves 20 de agosto", "Viernes"). */
    dateLabel: z.string(),

    /** Franjas en que se repite la sesión. */
    groups: z
      .array(
        z.object({
          /** "Primer grupo", "Segundo grupo"… si la sesión los separa. */
          label: z.string().optional(),
          start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        }),
      )
      .min(1),

    facilitators: z.array(z.string()).min(1),
    audience: z.enum(TRAINING_AUDIENCES).optional(),

    /** Espacio de asesoría personalizada que acompaña a la sesión. */
    support: z
      .object({
        start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
        end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
        host: z.string().optional(),
        note: z.string().optional(),
      })
      .optional(),

    /** Grabación de la sesión, cuando ya está publicada. */
    recording: z
      .object({
        url: z.string().url(),
        /** Aclaración: parte grabada, calidad, acceso restringido… */
        note: z.string().optional(),
      })
      .optional(),

    /** Materiales complementarios de la sesión. */
    resources: z
      .array(z.object({ label: z.string(), url: z.string().url() }))
      .default([]),

    order: z.number().default(99),
  }),
});

export const collections = {
  categories,
  intents,
  resources,
  tutorials,
  institutionalLinks,
  teacherContent,
  faculties,
  trainings,
};
