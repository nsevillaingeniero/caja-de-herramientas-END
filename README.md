# Caja de Herramientas para Docentes

Espacio digital de apoyo al docente de la **Institución Universitaria Escuela
Nacional del Deporte**. Reúne recursos digitales para la enseñanza, tutoriales
de END Digital (Moodle institucional) y contenidos del portal oficial de la END.

Construido con **Astro 7** en modo estático, TypeScript en `strict` y Tailwind v4.

---

## Puesta en marcha

```bash
npm install
```

```bash
npm run dev
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en `localhost:4321` |
| `npm run build` | Build de producción (usa la caché del portal si está fresca) |
| `npm run build:fresh` | Build forzando una sincronización completa con el portal |
| `npm run preview` | Sirve el build de producción |
| `npx astro check` | Verificación de tipos |

---

## Arquitectura

```
src/
├─ config/site.mjs         Configuración global (nombre, URL, portal)
├─ content.config.ts       Modelos de datos y colecciones (Zod)
├─ content/                Datos: recursos, tutoriales, categorías, intents
├─ lib/
│  ├─ content.ts           Servicios de lectura de contenido
│  ├─ relations.ts         Motor de recomendación cruzada
│  ├─ search.ts            Construcción del índice de búsqueda
│  └─ portal/              Ingesta desde endeporte.edu.co
├─ components/
│  ├─ primitives/          Button, Badge, Icon
│  ├─ layout/              Header, Footer
│  ├─ search/              Diálogo de búsqueda global
│  ├─ resources/           Catálogo y filtros
│  ├─ tutorials/           Tarjetas y video
│  ├─ teacher/             Contenido institucional
│  ├─ home/                Hero, accesos, intents
│  └─ shared/              Cabeceras, relacionados
├─ layouts/BaseLayout.astro
├─ pages/
└─ styles/global.css       Design tokens
```

### Principio de diseño

La interfaz nunca lee las colecciones directamente: siempre pasa por
`src/lib/`. Eso permite cambiar el origen de los datos sin tocar componentes.

---

## Mapa de rutas

| Ruta | Contenido |
| --- | --- |
| `/` | Inicio con buscador, accesos e intents |
| `/recursos/` | Catálogo con filtros |
| `/recursos/[slug]/` | Detalle de recurso |
| `/recursos/categoria/[slug]/` | Recursos por categoría |
| `/end-digital/` | Hub de tutoriales |
| `/end-digital/[slug]/` | Detalle de tutorial |
| `/end-digital/categoria/[slug]/` | Tutoriales por categoría |
| `/para-docentes/` | Contenidos del portal institucional |
| `/para-docentes/[slug]/` | Detalle con enlace a la fuente oficial |
| `/necesito/[slug]/` | Resultados por necesidad (cruza secciones) |
| `/buscar/` | Búsqueda global |

---

## Cómo añadir contenido

### Un recurso

Crea `src/content/resources/mi-recurso.json`. El schema está en
`src/content.config.ts` y el build falla si falta algún campo obligatorio.

```json
{
  "name": "Nombre de la herramienta",
  "shortDescription": "Una frase para la tarjeta (máx. 160 caracteres).",
  "description": "Descripción completa.\n\nAdmite varios párrafos.",
  "activities": ["Qué permite crear"],
  "modality": "web",
  "pricing": "gratis",
  "categories": ["evaluacion"],
  "moodleIntegration": "nativa",
  "moodleUsage": "Cómo se usa concretamente dentro de END Digital.",
  "url": "https://ejemplo.com",
  "intents": ["evaluar"],
  "tags": ["cuestionario"]
}
```

Valores admitidos:

- `modality`: `web` · `escritorio` · `movil` · `multiplataforma`
- `pricing`: `gratis` · `freemium` · `pago` · `licencia-institucional`
- `moodleIntegration`: `nativa` · `lti` · `embed` · `enlace` · `ninguna`

### Un tutorial

Crea `src/content/tutorials/mi-tutorial.md` con frontmatter y el cuerpo en
Markdown. `steps` alimenta la columna lateral; `order` define la navegación
anterior/siguiente dentro de la categoría.

### Categorías e intents

Se editan en `src/content/categories.json` e `src/content/intents.json`. No
están escritos en ningún componente: añadir una categoría no requiere tocar
la interfaz.

---

## Ingesta del portal institucional

La sección **Para docentes** no se escribe a mano: se genera en tiempo de build
desde `endeporte.edu.co`.

**Cómo funciona.** `src/lib/portal/` recorre los temas relevantes del listado
`/publicaciones/noticias/?tema=N`, entra a cada publicación y lee sus metadatos
Open Graph (título, descripción, fecha ISO, imagen).

**Temas seleccionados** (en `src/lib/portal/config.ts`): Institucional,
Programas académicos, Educación continua, Investigación, Convocatorias,
Internacionalización, Biblioteca y Noticia principal. Se descartan los temas
puramente deportivos o de coyuntura.

**Caché.** El resultado se guarda 6 horas para no ralentizar cada build. Para
forzar una sincronización:

```bash
npm run build:fresh
```

**Si el portal no responde**, el build conserva el último contenido válido; si
no hay caché previa, la sección se muestra vacía con un enlace al portal. El
build nunca falla por esta causa.

**La fuente oficial sigue siendo el portal.** La plataforma muestra el resumen
y la imagen, marca visiblemente la procedencia y enlaza siempre a la
publicación original. No reproduce el cuerpo de los artículos.

### Migrar a otra fuente

Sustituir `portalLoader()` en `src/content.config.ts` por otro loader que
devuelva el mismo esquema. El resto —schema, tipos, componentes y páginas—
permanece intacto. Esa es la vía prevista para conectar una API oficial, un
CMS o una base de datos.

> Antes de publicar conviene confirmar con la END el uso de esta ingesta, y
> valorar con el proveedor del portal (Nexura) la publicación de un feed
> oficial, que sería más estable que leer el HTML.

---

## Decisiones técnicas

**Astro estático con islas.** Todo el contenido se genera en build. El único
JavaScript que se envía son los filtros, el diálogo de búsqueda y el menú
móvil: unos 32 KB en total, casi todos de Fuse.js.

**Los filtros se renderizan en el servidor.** Todas las tarjetas están en el
HTML y el filtrado solo las oculta. El catálogo sigue siendo indexable y
utilizable aunque el JavaScript falle.

**Las animaciones no ocultan contenido.** El estado inicial de `.reveal` solo
se aplica si un script inline confirmó que hay JavaScript capaz de revelarlo.

**Búsqueda sin backend.** El índice se emite como `/api/search-index.json` y se
descarga la primera vez que se abre el buscador.

---

## Accesibilidad

Verificado sobre las 117 páginas del build:

- Un solo `<h1>` por página y jerarquía de encabezados sin saltos
- Enlace «Saltar al contenido» como primer elemento tabulable
- Estados de foco visibles en toda la plataforma
- Todas las imágenes con `alt`
- Contraste AA en texto y controles (mínimo medido: 4.79:1)
- El color nunca es el único portador de significado
- Se respeta `prefers-reduced-motion`
- Enlaces externos con `rel="noopener noreferrer"`

---

## Antes de desplegar

1. Ajustar `SITE.url` en `src/config/site.mjs` al dominio definitivo.
2. Ejecutar `npm run build:fresh` para publicar con contenido actualizado.
3. Programar despliegues periódicos si se quiere mantener «Para docentes» al día.
