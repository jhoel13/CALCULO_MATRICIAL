# HidroCalc · Diseño hidráulico

Aplicación web (HTML + CSS + JavaScript, sin servidor) que reemplaza 10 hojas de cálculo del curso de obras hidráulicas. Tiene calculadoras interactivas con **desarrollo paso a paso**, **gráficos**, **teoría con fórmulas** y **exportación de la memoria de cálculo a PDF y LaTeX**.

## Cómo usarla

Abre `index.html` en el navegador (doble clic). No necesita internet: KaTeX y Chart.js están en `vendor/`.

También puedes publicarla con GitHub Pages (Settings → Pages → rama y carpeta `/hidrocalc`) o servirla localmente:

```bash
cd hidrocalc
python3 -m http.server 8000   # luego abrir http://localhost:8000
```

## Ventanas

| Ventana | Contenido |
|---|---|
| **Inicio** | Panel con todas las calculadoras agrupadas |
| **Calculadora** (por módulo) | Datos en paneles plegables, resultados al instante, verificaciones ✓/✗ y gráfico principal |
| **Paso a paso** | Cada fórmula con su sustitución numérica y resultado, tablas de iteración e índice lateral |
| **Gráficos** | Curvas interactivas (Chart.js) y esquemas a escala en SVG |
| **Teoría** | Fundamentos y fórmulas del módulo, más las correcciones al Excel |
| **Biblioteca de teoría** | Toda la teoría con buscador |
| **Formulario** | Resumen de todas las ecuaciones |
| **Correcciones al Excel** | Errores encontrados en las hojas originales y cómo se resolvieron |

## Calculadoras

| Módulo | Hoja de origen |
|---|---|
| Canales (Manning): tirante normal y crítico, caudal, sección óptima, Froude | CALCULO DE CANALES.xlsx, DISEÑO DE CANALES ABIERTOS.xls |
| Canal por tramos (perfil longitudinal) | 03-DISEÑO CANAL RECTANGULAR.xls |
| Alcantarilla: metrados, presupuesto y verificación hidráulica | DISEÑO DE ALCANTARILLA.xlsx |
| Acueducto: hidráulica, viga, columna y zapata | DISEÑO DE ACUEDUCTO.xlsx |
| Sifón invertido (incluye los 11 sifones como ejemplos) | DISEÑO DE SIFONES.xls |
| Bocatoma con barraje mixto: resalto, Creager, Lane, subpresión, estabilidad | DISEÑO DE BOCATOMA.xlsx |
| Desarenador | DISEÑO DESARENADOR.xlsx |
| Cámara de rejas | DISEÑO DE CAMARAS DE REJAS.xls |
| Muros de cámaras y acero (incluye el ejemplo del tanque Imhoff) | CALCULO ESTRUCTURAL BARRAJE SIN CANAL.xlsx |

## Exportar la memoria de cálculo

- **PDF**: abre el diálogo de impresión con una memoria formateada (portada, datos, resultados, verificaciones, desarrollo y gráficos). Elige «Guardar como PDF».
- **LaTeX**: descarga un `.tex` completo (portada, índice, ecuaciones `amsmath`, tablas `booktabs` y gráficos `pgfplots`). Se compila con pdfLaTeX.
- **Overleaf**: abre ese mismo documento en Overleaf para compilarlo en línea.
- La casilla **+ teoría** agrega la teoría del módulo como anexo.
- El botón **Proyecto** guarda el nombre del proyecto, el responsable y la entidad para la portada.

## Estructura

```
hidrocalc/
├── index.html
├── css/styles.css          # tema claro/oscuro, diseño adaptable e impresión
├── js/core/
│   ├── util.js             # formato, solvers (bisección, Newton), geometría, acero
│   ├── steps.js            # documento paso a paso → HTML (KaTeX) y LaTeX
│   ├── charts.js           # Chart.js, dibujos SVG y exportación pgfplots
│   ├── ui.js               # formularios generados desde el esquema de cada módulo
│   ├── report.js           # PDF, .tex y Overleaf
│   └── app.js              # rutas, páginas y vistas
├── js/modules/*.js         # un archivo por calculadora
└── vendor/                 # KaTeX 0.16 y Chart.js 4.4 (MIT)
```

Para agregar una calculadora, crea `js/modules/nuevo.js` con `HC.register({ id, title, inputs, compute, theory, ... })` e inclúyelo en `index.html`.
