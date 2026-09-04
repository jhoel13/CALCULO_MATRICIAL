# Laboratorio Matricial UNC

Aplicación web independiente para el análisis real de armaduras y pórticos planos mediante el método matricial de rigidez. Fue construida para calculo matricial.

Autor del proyecto: **Jhoel Tocas Cercado**  
Universidad Nacional de Cajamarca · Ingeniería Hidráulica

## Aplicación publicada

[**Abrir la versión actual: Laboratorio Matricial + Concreto UNC**](https://laboratorio-matricial-concreto-unc.jhoel-tocas.chatgpt.site)

Esta es la versión vigente, con la suite de diseño de mezclas y la corrección de las tablas que aparecían sin datos.

## Ampliación: concreto + matrices

La aplicación incorpora una sección adicional que conserva el laboratorio original y conecta sus resultados con 26 hojas Mathcad de vigas, columnas, losas, escaleras, nudos y cimentaciones.

- Suite completa integrada desde [`jhoel13/Dise-o-De-Mezclas`](https://github.com/jhoel13/Dise-o-De-Mezclas): resumen, ACI 211.1, comparación ACI/Walker/Bolomey, Fuller, ajuste de prueba, dosificaciones, agregados, probetas, informes y teoría.
- Guardado local automático e importación/exportación JSON, PDF, fichas técnicas y Excel.
- Calculadora interactiva de `f'c → Ec → EI → k' → K`.
- Matriz local 6×6 regenerada con la sección y longitud ingresadas.
- Transferencia directa de `f'c` desde el diseño de mezcla hacia el cálculo matricial.
- Envío directo de `Ec` al catálogo de materiales del estudio matricial.
- Biblioteca filtrable con clasificación **Matricial**, **Ambos** y **Concreto**.
- Descarga individual de las hojas `.mcdx` originales.
- Acceso permanente a la versión original desde la ampliación.
- Selector persistente con seis paletas de color, compatible con los modos claro y oscuro.

## Alcance

- Motor de armaduras 2D: 2 GDL por nodo, matrices elementales 4×4, deformación, esfuerzo y fuerza axial.
- Motor de pórticos 2D: 3 GDL por nodo, matrices 6×6, axial, corte, momento y cargas aplicadas en barras.
- Unidades convertidas internamente a SI sin cambiar la estructura física.
- Ensamblaje global con rastro por celda, particiones KLL/KLR/KRL/KRR y solución sin inversión explícita.
- Cuaderno auditable de 27 pasos, geometría interactiva, deformada, teoría vinculada a las fuentes y control de equilibrio.
- Importación JSON/XLSX; pegado de nodos desde Excel/CSV; exportación PDF, Excel, CSV y JSON.
- Borrador local, inicio de sesión con ChatGPT y proyectos versionados en Cloudflare D1.

## Casos incluidos

1. Armadura de 6 nodos y 9 barras del primer notebook: A=25 cm² y E=2×10⁶ kgf/cm².
2. Armadura de 28 nodos y 58 barras del segundo notebook: A=625 cm² y E=21 000 kN/cm².
3. Pórtico triangular de las páginas 36–50 del PDF.
4. Pórtico en V de las páginas 51–62.
5. Pórtico con cargas en barras de las páginas 63–69.

Todos se resuelven al cargar el modelo; sus resultados no están precalculados en la interfaz.

## Desarrollo local

Requiere Node.js 22.13 o posterior.

```bash
npm ci
npm run dev
```

Comandos principales:

```bash
npm run lint
npm run test:engine
npm test
npm run db:generate
```

`npm test` ejecuta las pruebas numéricas, compila la aplicación de producción y comprueba que el paquete generado contiene la experiencia correcta.

## Persistencia

El esquema está en `db/schema.ts` y la migración en `drizzle/0000_last_timeslip.sql`. El binding D1 se denomina `DB` en `.openai/hosting.json`. Las rutas de escritura verifican la identidad del usuario en el servidor mediante los encabezados de Sign in with ChatGPT.

## Convención matemática

La aplicación presenta λ con la disposición de la imagen adjunta y usa T=λᵀ para transformar desplazamientos:

```text
u′ = T u
Ke = Tᵀ k′ T
KLL UL = FL − KLR UR
R = K U − F
```

La solución usa Cholesky LLᵀ cuando corresponde y eliminación gaussiana con pivoteo como respaldo. No calcula `inv(KLL)`.
