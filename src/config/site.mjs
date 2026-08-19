/**
 * Configuración global del sitio.
 *
 * Se mantiene en `.mjs` (y no en `.ts`) porque `astro.config.mjs` la importa
 * antes de que exista el pipeline de TypeScript.
 */
export const SITE = {
  name: 'Caja de Herramientas',
  shortName: 'Caja de Herramientas',
  institution: 'Institución Universitaria Escuela Nacional del Deporte',
  institutionShort: 'Escuela Nacional del Deporte',
  institutionAcronym: 'IUEND',

  /** Cambiar por el dominio definitivo antes de publicar. */
  url: 'https://caja-herramientas.endeporte.edu.co',

  description:
    'Espacio digital de apoyo al docente de la Escuela Nacional del Deporte. Recursos digitales, tutoriales de END Digital y contenidos institucionales de interés.',

  tagline: 'Todo lo que necesitas para enseñar mejor.',

  locale: 'es-CO',
  lang: 'es',

  /** Portal institucional: fuente oficial de los contenidos para docentes. */
  portal: {
    name: 'Portal institucional END',
    url: 'https://endeporte.edu.co',
  },
};
