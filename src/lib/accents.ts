/* ============================================================
   ACENTOS DE ÁREA
   ------------------------------------------------------------
   Las tres áreas de la plataforma tienen identidad cromática
   propia. Este archivo es el único sitio donde un acento se
   traduce a clases: los componentes piden `accent('teal').tint`
   y no saben nada de turquesas ni de arcillas.

   Cambiar la identidad de un área = cambiar este archivo.
   ============================================================ */

export type Accent = 'end' | 'teal' | 'clay' | 'slate';

export interface AccentStyles {
  /** Texto de acento sobre fondo claro. Verificado en AA. */
  text: string;
  /** Fondo sólido con texto blanco encima. */
  solid: string;
  /** Fondo profundo para bandas amplias. */
  deep: string;
  /** Texto claro legible sobre `deep`. */
  onDeep: string;
  /** Fondo tenue para chips y bloques secundarios. */
  tint: string;
  /** Texto sobre `tint`. */
  onTint: string;
  /** Filete o borde de acento. */
  rule: string;
  /** Borde en estado normal → acentuado al pasar el cursor. */
  hoverBorder: string;
  /** Fondo que aparece al pasar el cursor sobre una fila. */
  hoverTint: string;
  /**
   * Texto que toma el color de acento al pasar el cursor por el grupo.
   * Va escrito completo a propósito: Tailwind analiza el código fuente
   * como texto, así que una clase compuesta en tiempo de ejecución
   * (`group-hover:` + color) no llegaría a generarse.
   */
  hoverText: string;
}

const STYLES: Record<Accent, AccentStyles> = {
  end: {
    text: 'text-end-700',
    solid: 'bg-end-600',
    deep: 'bg-end-950',
    onDeep: 'text-end-200',
    tint: 'bg-end-50',
    onTint: 'text-end-800',
    rule: 'bg-end-600',
    hoverBorder: 'hover:border-end-600',
    hoverTint: 'group-hover:bg-end-50',
    hoverText: 'group-hover:text-end-700',
  },
  teal: {
    text: 'text-teal-700',
    solid: 'bg-teal-600',
    deep: 'bg-teal-950',
    onDeep: 'text-teal-200',
    tint: 'bg-teal-50',
    onTint: 'text-teal-800',
    rule: 'bg-teal-500',
    hoverBorder: 'hover:border-teal-600',
    hoverTint: 'group-hover:bg-teal-50',
    hoverText: 'group-hover:text-teal-700',
  },
  clay: {
    text: 'text-clay-700',
    solid: 'bg-clay-600',
    deep: 'bg-clay-950',
    onDeep: 'text-clay-200',
    tint: 'bg-clay-50',
    onTint: 'text-clay-800',
    rule: 'bg-clay-500',
    hoverBorder: 'hover:border-clay-600',
    hoverTint: 'group-hover:bg-clay-50',
    hoverText: 'group-hover:text-clay-700',
  },
  slate: {
    text: 'text-ink-soft',
    solid: 'bg-ink',
    deep: 'bg-ink',
    onDeep: 'text-white',
    tint: 'bg-paper-deep',
    onTint: 'text-ink',
    rule: 'bg-ink-soft',
    hoverBorder: 'hover:border-outline',
    hoverTint: 'group-hover:bg-paper',
    hoverText: 'group-hover:text-ink',
  },
};

export function accent(name: string | undefined): AccentStyles {
  return STYLES[(name ?? 'end') as Accent] ?? STYLES.end;
}

/* ------------------------------------------------------------
   Las tres áreas. La navegación, la home y las cabeceras de
   sección leen de aquí: el orden y los nombres no se repiten
   en cada componente.
   ------------------------------------------------------------ */

export interface Area {
  id: 'recursos' | 'end-digital' | 'para-docentes';
  href: string;
  label: string;
  /** Frase que explica el área en una línea. */
  summary: string;
  accent: Accent;
  /**
   * Área oculta temporalmente.
   *
   * Sus páginas se siguen generando —no se borra nada— pero desaparece
   * de la navegación, de la portada, del buscador y del sitemap, y sus
   * páginas van con `noindex`. Volver a publicarla es quitar esta
   * marca: no hay que reconstruir nada.
   */
  hidden?: boolean;
}

export const AREAS: Area[] = [
  {
    id: 'recursos',
    href: '/recursos/',
    label: 'Recursos',
    summary:
      'Herramientas digitales seleccionadas para enriquecer tus clases.',
    accent: 'end',
  },
  {
    id: 'end-digital',
    href: '/end-digital/',
    label: 'END Digital',
    summary: 'Aprende a utilizar y aprovechar tu aula virtual.',
    accent: 'teal',
  },
  {
    id: 'para-docentes',
    href: '/para-docentes/',
    label: 'Para docentes',
    summary:
      'Accesos y publicaciones del portal institucional de la END.',
    accent: 'clay',
    hidden: true,
  },
];

/**
 * Las áreas que hoy se muestran. Es lo que deben recorrer la
 * navegación y la portada; `AREAS` sigue conteniendo todas.
 */
export const VISIBLE_AREAS: Area[] = AREAS.filter((area) => !area.hidden);

/** Si un área está publicada. Para decidir si se pinta su sección. */
export function isAreaVisible(id: Area['id']): boolean {
  return AREAS.some((area) => area.id === id && !area.hidden);
}
