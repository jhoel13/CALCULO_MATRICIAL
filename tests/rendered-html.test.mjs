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
  assert.match(clientManifest, /lab-app/i);
  assert.doesNotMatch(`${worker}\n${app}`, /codex-preview/i);
});
