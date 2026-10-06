import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = path.join(root, "public");

test("the embedded simulator and download resolve to complete local resources", async () => {
  const tab = await readFile(path.join(root, "src/components/piezometer-tab.tsx"), "utf8");
  const links = [...tab.matchAll(/(?:simulatorPath = |href=)"(\/[^" ]+)"/g)].map(match => match[1]);
  assert.equal(links.length, 1);
  for (const link of links) await access(path.join(publicRoot, link.split(/[?#]/)[0]));
  assert.match(tab, /https:\/\/github.com\/jhoel13\/CALCULO_MATRICIAL\/archive\/refs\/heads\/main.zip/);
  for (const page of ["simulador.html", "index.html", "INICIAR.html"]) {
    const dir = path.join(publicRoot, "piezometro");
    const html = await readFile(path.join(dir, page), "utf8");
    const resources = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => match[1]);
    for (const resource of resources) {
      if (/^(?:https?:|data:|mailto:)/.test(resource)) continue;
      const local = path.resolve(dir, resource.split(/[?#]/)[0]);
      assert.ok(local.startsWith(publicRoot + path.sep), resource);
      await access(local);
    }
  }
});

test("the solution worker retains its engine and advisor in the new location", async () => {
  const dir = path.join(publicRoot, "piezometro/js");
  const source = await readFile(path.join(dir, "sim-advisor-worker.js"), "utf8");
  const imports = source.match(/importScripts\(([^)]+)\)/)[1];
  const files = [...imports.matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1].split("?")[0]);
  assert.equal(files.length, 2);
  for (const file of files) await access(path.join(dir, file));
});
