import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("the production bundle contains the independent Laboratorio Matricial UNC application", async () => {
  const worker = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");
  const clientManifest = await readFile(new URL("../dist/client/.vite/manifest.json", import.meta.url), "utf8");
  const assetsDirectory = new URL("../dist/client/assets/", import.meta.url);
  const assets = await readdir(assetsDirectory);
  const appAsset = assets.find((name) => /^lab-app-.*\.js$/.test(name));
  assert.ok(appAsset, "the lab application client chunk must exist");
  const app = await readFile(new URL(appAsset, assetsDirectory), "utf8");

  assert.match(worker, /Laboratorio Matricial UNC/i);
  assert.match(app, /Cuaderno 27 pasos/i);
  assert.match(app, /example_1\.ipynb/i);
  assert.match(app, /example_2\.ipynb/i);
  assert.match(app, /II-1-Metodo-Matricial-de-Regidez\(3\)\.pdf/i);
  assert.match(app, /Apoyos, fuerzas, ejes locales y deformada/i);
  assert.match(app, /Cuatro figuras, un solo modelo/i);
  assert.match(app, /Del diseño del concreto a la matriz de rigidez/i);
  assert.match(app, /26 hojas Mathcad clasificadas y descargables/i);
  assert.match(app, /DISEÑO DE MEZCLAS COMPLETO/i);
  assert.match(app, /Comparar métodos/i);
  assert.match(app, /Usar f′c=/i);
  assert.match(app, /Biblioteca Mathcad/i);
  assert.match(app, /Cambiar colores de la aplicación/i);
  assert.match(clientManifest, /lab-app/i);
  assert.doesNotMatch(`${worker}\n${app}`, /codex-preview/i);
});

test("the 26 Mathcad resources are included in the public library", async () => {
  const resources = await readdir(new URL("../public/recursos/mathcad/", import.meta.url));
  assert.equal(resources.filter((name) => name.endsWith(".mcdx")).length, 26);
  assert.ok(resources.includes("Diagramas de Vigas (DFC-DMF).mcdx"));
  assert.ok(resources.includes("Diseño de Zapata Combinada (NTP. E.060).mcdx"));
});

test("mix-design row labels stay visible and carry their corresponding data", async () => {
  const css = await readFile(new URL("../src/components/mix-design/mix-design-source.css", import.meta.url), "utf8");
  const methods = await readFile(new URL("../src/components/mix-design/sections/methods-section.tsx", import.meta.url), "utf8");
  const aggregates = await readFile(new URL("../src/components/mix-design/sections/aggregates-section.tsx", import.meta.url), "utf8");

  assert.match(css, /\.data-table tbody th \{[^}]*background: var\(--sheet\);[^}]*color: var\(--ink\)/);
  assert.match(methods, /scope="row">Walker/);
  assert.match(methods, /scope="row">Bolomey/);
  assert.match(methods, /scope="row">\{sizeLabel\(size\)\}/);
  assert.match(aggregates, /scope="row">\{row\.sieve\}/);
  assert.match(aggregates, /scope="row">M-\{index \+ 1\}/);
});
