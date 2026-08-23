import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the four notebook figures are dynamic SVGs with image downloads", async () => {
  const gallery = await readFile(new URL("../src/components/graphics-gallery.tsx", import.meta.url), "utf8");
  const figure = await readFile(new URL("../src/components/structure-figure.tsx", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/components/lab-app.tsx", import.meta.url), "utf8");

  for (const mode of ["supports", "forces", "local", "deformed"]) {
    assert.match(gallery, new RegExp(`mode: "${mode}"`));
  }
  assert.match(figure, /"Armadura"/);
  assert.match(figure, /Apoyos/);
  assert.match(figure, /Cargas aplicadas/);
  assert.match(figure, /Eje x′/);
  assert.match(figure, /Tracción/);
  assert.match(figure, /Compresión/);
  assert.match(gallery, /image\/png/);
  assert.match(gallery, /image\/svg\+xml/);
  assert.match(app, /id: "graphics"/);
  assert.doesNotMatch(gallery, /<img\b/);
});
