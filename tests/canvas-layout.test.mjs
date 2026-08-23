import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the structural canvas styles do not resize toolbar icons", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const component = await readFile(new URL("../src/components/structure-canvas.tsx", import.meta.url), "utf8");

  assert.match(component, /className=\{`structure-canvas/);
  assert.match(component, /viewBox=\{`0 0 \$\{VIEW_WIDTH\} \$\{VIEW_HEIGHT\}`\}/);
  assert.match(component, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(component, /selected-halo/);
  assert.match(css, /\.structure-board\s*>\s*\.structure-canvas\s*\{/);
  assert.match(css, /\.tool-group button svg\s*\{[^}]*width:\s*15px;[^}]*height:\s*15px;/s);
  assert.doesNotMatch(css, /\.structure-board svg\s*\{/);
  assert.doesNotMatch(css, /\.selected-member[^}]*filter:/s);
});
