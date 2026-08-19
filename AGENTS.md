# Caja de Herramientas END

Plataforma de apoyo al docente de la Institución Universitaria Escuela Nacional
del Deporte. Reúne tres áreas: un **catálogo de recursos** digitales, los
**tutoriales de END Digital** (el aula virtual, Moodle) y los **contenidos del
portal institucional**.

Astro 7 · Tailwind v4 · TypeScript. Sitio estático, sin framework de UI: no hay
React, Vue ni Svelte, y no conviene añadirlos sin una razón fuerte.

## Desarrollo

Para levantar el servidor de desarrollo, usa modo background:

```
astro dev --background
```

Se gestiona con `astro dev stop`, `astro dev status` y `astro dev logs`.

| Comando | Para qué |
| --- | --- |
| `npm run build` | Build de producción. Usa la caché del portal si sigue vigente. |
| `npm run build:fresh` | Igual, pero fuerza resincronizar el portal (`PORTAL_REFRESH=1`). |
| `npx astro check` | Chequeo de tipos. Debe cerrar con **0 errores**. |

## Arquitectura

```
src/
  config/site.mjs        Nombre, dominio, textos globales. Es .mjs porque
                         astro.config.mjs lo importa antes del pipeline de TS.
  styles/global.css      ÚNICO lugar donde viven los tokens de diseño.
  lib/
    accents.ts           Traduce un acento de área a clases. Los componentes
                         piden accent('teal').tint y no saben de turquesas.
    content.ts           Acceso a colecciones + etiquetas legibles (PRICING_LABELS…).
    relations.ts         Cruces entre recursos, tutoriales e intents.
    portal/              Ingesta desde endeporte.edu.co (ver abajo).
  content/               Datos editables: JSON y Markdown, sin tocar componentes.
  components/
    primitives/          Icon, Button, Badge.
    home/                Las secciones de la portada.
    resources/ tutorials/ teacher/ search/ shared/ layout/
```

Regla de fondo: **los datos no viven en las plantillas**. Categorías, intents,
recursos y accesos institucionales son archivos de `src/content/`; añadir una
categoría o una herramienta no debería requerir editar un `.astro`.

## Sistema visual

La dirección es **producto digital moderno**, no portal universitario. Si el
resultado se parece a un sitio editorial impreso o a un dashboard, está mal.

Tres decisiones sostienen esa lectura, y están documentadas en la cabecera de
[`src/styles/global.css`](src/styles/global.css):

1. **Neutro frío.** El gris de fondo es `#F5F8FA`, azulado. Un neutro cálido
   arrastra la página hacia lo impreso.
2. **Profundidad real.** Hay eje Z: tres alturas de sombra tintadas en azul
   profundo, superficies traslúcidas (`.glass`, `.glass-dark`), orbes
   desenfocados (`.orb`), malla de puntos (`.dot-grid`).
3. **Acentos como señal.** Cian y naranja no rellenan áreas: marcan, iluminan y
   responden al cursor.

Identidad cromática por área — Recursos → azul (`end`), END Digital → cian
(`teal`), Para docentes → naranja (`clay`). El neutro es `slate`.

### Trampa de Tailwind v4 — leer antes de escribir clases

**`rounded-[--radius-card]` no funciona en v4: computa `0px`.** Esa sintaxis era
válida en v3 y dejó todas las tarjetas del sitio con esquinas cuadradas sin que
saltara ningún error.

Como los tokens están declarados en `@theme`, Tailwind ya genera las utilidades
nombradas. Usa siempre esas:

| Mal (silencioso) | Bien |
| --- | --- |
| `rounded-[--radius-card]` | `rounded-card` |
| `rounded-[--radius-panel]` | `rounded-panel` |
| `ease-[--ease-out-soft]` | `ease-out-soft` |
| `shadow-[--shadow-lift]` | `shadow-lift` |

Si añades un token a `@theme`, la utilidad aparece sola. Y si dudas de que una
clase esté surtiendo efecto, compruébalo con `getComputedStyle` en el navegador
antes de darla por buena: estos fallos no producen error.

### Reglas de diseño no negociables

- **Sin emojis.** Nunca, y menos como icono de un concepto (IA, evaluación,
  END Digital…). Para eso están los iconos lineales de `Icon.astro`, los
  números, las etiquetas y las formas.
- **Sin logotipos inventados.** Las herramientas del catálogo no tienen logo
  oficial. `ResourceMark` compone una marca tipográfica con la inicial sobre el
  degradado de su categoría; si algún día hay logos reales, basta dejarlos en
  `public/images/resources/` y declarar `logo` en el JSON del recurso.
- **Solo fotografías reales de la END**, las de `src/assets/institutional/`.
  Nada de bancos de imágenes ni de imágenes generadas. Si hace falta una foto
  que no existe, hay que pedirla, no sustituirla.
- **Nada de tarjetas todas iguales.** Siempre jerarquía: un destacado con
  espacio para explicarse y unos secundarios más compactos.
- **Los iconos son secundarios**: acompañan al texto, no lo sustituyen. Son
  `aria-hidden` salvo que reciban `label`.

### Accesibilidad

Los tonos del sistema están verificados en AA y anotados en `global.css` (por
ejemplo: `teal-700` es el primer turquesa legible sobre blanco; `teal-500` es
decorativo). El foco visible nunca se elimina, y `.on-dark` cambia su color para
que siga separándose del fondo. Todo lo que se revela con `:hover` debe revelarse
también con `:focus` — así está resuelto el navegador de "¿Qué quieres hacer?".

El movimiento respeta `prefers-reduced-motion`, y las clases `.reveal` solo
ocultan contenido si hay JavaScript capaz de mostrarlo: sin JS, la página se ve
completa.

## Contenido

Colecciones definidas en [`src/content.config.ts`](src/content.config.ts), con
vocabularios controlados (`PRICING`, `LEVELS`, `MOODLE_INTEGRATION`…) que se
declaran una vez y propagan a validación, tipos y UI.

- `resources/*.json` — herramientas del catálogo.
- `tutorials/*.md` — tutoriales de END Digital. `video` es opcional: **no dibujes
  un reproductor donde no hay video**.
- `categories.json`, `intents.json`, `institutional-links.json`.
- `teacherContent` — **no está en disco**: lo trae un loader del portal.

### El portal institucional

[`src/lib/portal/`](src/lib/portal/) es el único punto de acoplamiento con
`endeporte.edu.co`. Migrar a otra fuente (API, RSS, CMS) significa reemplazar
solo ese directorio; el schema y la interfaz no cambian.

Detalles que conviene saber antes de tocarlo:

- La caché dura 6 h. `PORTAL_REFRESH=1` fuerza sincronización completa.
- Se identifica con un `User-Agent` honesto y espacia las peticiones: no lo
  quites ni aceleres.
- Los temas del portal están seleccionados a mano por relevancia docente; los
  puramente deportivos se descartan a propósito.
- El portal a veces devuelve un resumen que solo repite el titular. Antes de
  mostrar un `excerpt`, comprueba que aporte algo (ver `PortalBand.astro`).
- Las imágenes del portal se optimizan en build gracias a `image.domains` en
  `astro.config.mjs`.

## Antes de dar algo por terminado

1. `npx astro check` → 0 errores.
2. `npm run build` completa.
3. Revisado en escritorio, tablet y móvil. En móvil hay que **mantener la
   personalidad visual**, no entregar un escritorio encogido: varias
   composiciones que se superponen en escritorio deben apilarse en móvil (las
   fichas de cifras del hero, por ejemplo, tapaban la fotografía).
4. Sin desbordamiento horizontal: el cuerpo nunca hace scroll lateral.

## Documentación

Documentación completa: https://docs.astro.build

- [Páginas, rutas dinámicas y middleware](https://docs.astro.build/en/guides/routing/)
- [Componentes Astro](https://docs.astro.build/en/basics/astro-components/)
- [Colecciones de contenido](https://docs.astro.build/en/guides/content-collections/)
- [Estilos y Tailwind](https://docs.astro.build/en/guides/styling/)
- [Imágenes](https://docs.astro.build/en/guides/images/)
