/*
 * Escena 3D del simulador (Three.js r147): bloque de suelo en corte, superficie freática animada
 * y los elementos (casas, canales, pozos, pozas, drenes, ríos, fosas).
 * Convención: x → X, y (norte) → −Z, cota → Y. Escala vertical exagerada y común para el agua y las obras.
 */
(function (root) {
  'use strict';

  const C = {
    soil: 0x8a6a4a, soilTop: 0x6f8f4e, unsat: 0xb08a5e, water: 0x2a7fb8, waterDeep: 0x123f66,
    wall: 0xf1ece2, roof: 0xb4553a, found: 0x55504a, canal: 0x3b8fc4, canalLined: 0x9aa3a8,
    steel: 0x6d7880, pump: 0x2f5d50, poza: 0x4f8f6a, membrane: 0x2b2b2b, drain: 0x3f9b4f, river: 0x2f78b7,
    alerta: 0xe0952b, afectada: 0xd03b3b, inundada: 0x8b2fc9, ok: 0x2c9a5a,
  };

  /** Color de la superficie freática según la profundidad al agua d [m]. */
  function depthRGB(d) {
    const stops = [[-0.01, [0.55, 0.18, 0.79]], [0, [0.82, 0.23, 0.23]], [1, [0.9, 0.55, 0.15]], [2, [0.95, 0.83, 0.3]], [3, [0.45, 0.72, 0.85]], [6, [0.16, 0.45, 0.72]], [12, [0.07, 0.24, 0.42]]];
    if (d <= stops[0][0]) return stops[0][1];
    for (let k = 1; k < stops.length; k++) {
      if (d <= stops[k][0]) {
        const [a, ca] = stops[k - 1], [b, cb] = stops[k];
        const f = (d - a) / (b - a);
        return [ca[0] + f * (cb[0] - ca[0]), ca[1] + f * (cb[1] - ca[1]), ca[2] + f * (cb[2] - ca[2])];
      }
    }
    return stops[stops.length - 1][1];
  }

  function create(container) {
    const THREE = root.THREE;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, root.devicePixelRatio || 1));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 3000);
    camera.position.set(-70, 75, 115);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -6, 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.495;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a68, 0.9));
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const sun = new THREE.DirectionalLight(0xffffff, 0.75);
    sun.position.set(-60, 120, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -100, right: 100, top: 100, bottom: -100, near: 1, far: 350 });
    sun.shadow.bias = -0.0003;
    scene.add(sun);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshStandardMaterial({ color: 0xd9e3df, roughness: .95 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    const st = { g: null, s: 1, sz: 1, exag: 1, realistic: true, cut: true, arrows: true, flow: new THREE.Group(), lastSim: null, lastField: null, static: new THREE.Group(), elems: new THREE.Group(), dyn: {}, labels: [], dirty: true };
    scene.add(st.static); scene.add(st.elems); scene.add(st.flow);

    const X = (x) => (x - st.g.cfg.Lx / 2) * st.s;
    const Z = (y) => -(y - st.g.cfg.Ly / 2) * st.s;
    const Y = (z) => (z - st.g.zg) * st.sz;

    function clear(group) {
      while (group.children.length) {
        const o = group.children[group.children.length - 1]; group.remove(o);
        o.traverse((c) => { if (c.geometry) c.geometry.dispose(); if (c.material) { (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
      }
    }

    function label(text, color) {
      const cv = document.createElement('canvas');
      const ctx = cv.getContext('2d');
      const fs = 44;
      ctx.font = `600 ${fs}px "Source Sans 3", sans-serif`;
      const w = Math.ceil(ctx.measureText(text).width) + 28;
      cv.width = w; cv.height = fs + 22;
      ctx.font = `600 ${fs}px "Source Sans 3", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, 0, w, fs + 22, 12) : ctx.rect(0, 0, w, fs + 22); ctx.fill();
      ctx.fillStyle = color || '#13242c';
      ctx.fillText(text, 14, fs + 4);
      const tex = new THREE.CanvasTexture(cv);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      const h = 3.2;
      sp.scale.set(h * w / (fs + 22), h, 1);
      sp.renderOrder = 10;
      return sp;
    }

    function texture(kind) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const ctx = cv.getContext('2d'); let seed = 1947;
      const rnd = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
      ctx.fillStyle = kind === 'grass' ? '#81956b' : '#a98760'; ctx.fillRect(0, 0, 256, 256);
      if (kind !== 'grass') {
        ['#b59970','#947452','#c0a27b','#856447','#aa8d67'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * 52, 256, 53); });
      }
      for (let i = 0; i < 7500; i++) {
        ctx.fillStyle = rnd() > .5 ? 'rgba(255,244,207,.12)' : 'rgba(39,40,25,.14)';
        ctx.fillRect(rnd()*256, rnd()*256, 1+rnd()*3, kind==='grass' ? 1+rnd()*5 : 1+rnd()*2);
      }
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(kind === 'grass' ? 5 : 2, kind === 'grass' ? 5 : 1);
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return tex;
    }

    /** Construye la malla del bloque de suelo y la superficie freática para la malla actual. */
    function setGrid(g, exag) {
      st.g = g;
      st.exag = exag || st.exag;
      const L = Math.max(g.cfg.Lx, g.cfg.Ly);
      st.s = 100 / L;
      st.sz = st.s * st.exag;
      floor.position.y = Y(0) - 0.6;
      clear(st.static); clear(st.flow);
      const W = g.cfg.Lx * st.s, Dz = g.cfg.Ly * st.s, H = g.zg * st.sz;
      // bloque de suelo translúcido
      const box = new THREE.Mesh(new THREE.BoxGeometry(W, H, Dz), new THREE.MeshBasicMaterial({ color: C.soil, transparent: true, opacity: 0.08, depthWrite: false }));
      box.position.set(0, -H / 2, 0);
      st.static.add(box);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, Dz)), new THREE.LineBasicMaterial({ color: 0x5b4632, transparent: true, opacity: 0.6 }));
      edges.position.copy(box.position);
      st.static.add(edges);
      // superficie del terreno con cuadrícula
      const top = new THREE.Mesh(new THREE.PlaneGeometry(W, Dz), new THREE.MeshStandardMaterial({ map: texture("grass"), color: 0xffffff, roughness: .96, transparent: true, opacity: st.cut ? .12 : .97, depthWrite: !st.cut, side: THREE.DoubleSide }));
      top.rotation.x = -Math.PI / 2; top.position.y = 0.02;
      top.receiveShadow = true; st.static.add(top); st.top = top;
      const gl = [];
      const stepM = niceStep(L / 10);
      for (let x = 0; x <= g.cfg.Lx + 1e-6; x += stepM) gl.push(X(x), 0.03, Z(0), X(x), 0.03, Z(g.cfg.Ly));
      for (let y = 0; y <= g.cfg.Ly + 1e-6; y += stepM) gl.push(X(0), 0.03, Z(y), X(g.cfg.Lx), 0.03, Z(y));
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gl, 3));
      st.static.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0x48602f, transparent: true, opacity: 0.12 })));
      // flecha del norte
      const n = label('N ↑', '#13242c'); n.position.set(X(g.cfg.Lx) + 6, 2, Z(g.cfg.Ly)); st.static.add(n);

      // superficie freática
      const rx = Math.max(g.Nx, 65), ry = Math.max(g.Ny, 65), rn = rx * ry;
      st.rx = rx; st.ry = ry;
      const pos = new Float32Array(rn * 3), col = new Float32Array(rn * 3);
      for (let j = 0; j < ry; j++) for (let i = 0; i < rx; i++) {
        const k = j * rx + i;
        pos[3 * k] = X(i * g.cfg.Lx / (rx - 1)); pos[3 * k + 2] = Z(j * g.cfg.Ly / (ry - 1)); pos[3 * k + 1] = Y(g.h0);
      }
      const idx = [];
      for (let j = 0; j < ry - 1; j++) for (let i = 0; i < rx - 1; i++) {
        const a = j * rx + i, b = a + 1, c = a + rx, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      wg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      wg.setIndex(idx);
      wg.computeVertexNormals();
      const wm = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .23, metalness: .16, transparent: true, opacity: .9 }));
      st.static.add(wm);
      // cortinas (corte) en los bordes sur y este: zona saturada y no saturada
      const mkCurtain = (n) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
        const ii = [];
        for (let q = 0; q < n - 1; q++) { const a = 2 * q; ii.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        geo.setIndex(ii);
        const uv = new Float32Array(n * 4);
        for(let q=0;q<n;q++) uv.set([q/(n-1),0,q/(n-1),1],q*4);
        geo.setAttribute('uv', new THREE.BufferAttribute(uv,2));
        return geo;
      };
      const nS = g.Nx, nE = g.Ny;
      // materiales sin iluminación: el corte se ve igual desde cualquier ángulo
      const satM = () => new THREE.MeshStandardMaterial({ map: texture("soil"), color: 0x248cb5, roughness: .84, side: THREE.DoubleSide });
      const unsM = () => new THREE.MeshStandardMaterial({ map: texture("soil"), color: 0xf2e0c1, roughness: .95, side: THREE.DoubleSide });
      const satS = new THREE.Mesh(mkCurtain(nS), satM()), unsS = new THREE.Mesh(mkCurtain(nS), unsM());
      const satE = new THREE.Mesh(mkCurtain(nE), satM()), unsE = new THREE.Mesh(mkCurtain(nE), unsM());
      const satN = new THREE.Mesh(mkCurtain(nS), satM()), unsN = new THREE.Mesh(mkCurtain(nS), unsM());
      const satW = new THREE.Mesh(mkCurtain(nE), satM()), unsW = new THREE.Mesh(mkCurtain(nE), unsM());
      [satS, unsS, satE, unsE, satN, unsN, satW, unsW].forEach((m) => st.static.add(m));
      st.dyn = { wm, pos, col, satS, unsS, satE, unsE, satN, unsN, satW, unsW };
      const base = new THREE.Mesh(new THREE.BoxGeometry(W, .8, Dz), new THREE.MeshStandardMaterial({ color: 0x5b655e, roughness: 1 }));
      base.position.y = Y(0) - .4; base.castShadow = true; st.static.add(base);
      for (let i=1;i<12;i++) for(let j=1;j<12;j++) {
        const arrow = new THREE.ArrowHelper(new THREE.Vector3(1,0,0), new THREE.Vector3(), 2.3, 0xc7f3ee, .8, .4);
        arrow.userData = { x: g.cfg.Lx*i/12, y: g.cfg.Ly*j/12 };
        st.flow.add(arrow);
      }
      const scalebar = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(X(0),1,Z(0)+4),new THREE.Vector3(X(L/5),1,Z(0)+4)]),new THREE.LineBasicMaterial({color:0x2f5057}));
      st.static.add(scalebar); const scaleLabel = label(Math.round(L/5)+' m'); scaleLabel.position.set(X(L/10),3,Z(0)+4); st.static.add(scaleLabel);
      controls.target.set(0, -Math.min(H / 3, 15), 0);
      camera.far = Math.max(3000, H * 8); camera.updateProjectionMatrix();
      st.dirty = true;
    }

    function niceStep(v) { const p = 10 ** Math.floor(Math.log10(v)); return [1, 2, 5, 10].map((m) => m * p).find((m) => m >= v) || 10 * p; }

    /** Reconstruye los objetos de los elementos. */
    function setElements(elements, selectedId) {
      clear(st.elems);
      st.labels = [];
      const g = st.g; if (!g) return;
      const L = Math.max(g.cfg.Lx, g.cfg.Ly);
      const fp = Math.max(12, 0.028 * L) * st.s; // huella visible de una casa
      const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .8 }, o));
      const seg = (el, width, height, yTop, material) => {
        const len = Math.hypot(el.x2 - el.x1, el.y2 - el.y1) * st.s || 0.5;
        const m = new THREE.Mesh(new THREE.BoxGeometry(len, height, width), material);
        m.position.set((X(el.x1) + X(el.x2)) / 2, yTop - height / 2, (Z(el.y1) + Z(el.y2)) / 2);
        m.rotation.y = Math.atan2(-(Z(el.y2) - Z(el.y1)), X(el.x2) - X(el.x1));
        return m;
      };
      for (const el of elements) {
        const grp = new THREE.Group();
        grp.userData = { id: el.id, type: el.type };
        if (el.type === 'casa') {
          const wallH = fp * 0.55;
          const walls = new THREE.Mesh(new THREE.BoxGeometry(fp, wallH, fp * 0.8), mat(C.wall));
          walls.position.y = wallH / 2;
          const roof = new THREE.Mesh(new THREE.ConeGeometry(fp * 0.78, fp * 0.42, 4), mat(C.roof));
          roof.position.y = wallH + fp * 0.21; roof.rotation.y = Math.PI / 4; roof.scale.z = 0.8;
          const fd = new THREE.Mesh(new THREE.BoxGeometry(fp * 1.02, el.cim * st.sz, fp * 0.82), mat(C.found, { transparent: true, opacity: 0.85 }));
          fd.position.y = -el.cim * st.sz / 2;
          const ring = new THREE.Mesh(new THREE.RingGeometry(fp * 0.75, fp * 0.95, 32), new THREE.MeshBasicMaterial({ color: C.ok, side: THREE.DoubleSide }));
          ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06;
          grp.add(walls, roof, fd, ring);
          // Recessed windows and door give the buildings a readable human scale.
          for (const x of [-.28, .28]) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(fp*.19,wallH*.3,.05),mat(0x466777,{metalness:.3,roughness:.22}));
            win.position.set(x*fp,wallH*.61,fp*.4+.03); grp.add(win);
            const sill = new THREE.Mesh(new THREE.BoxGeometry(fp*.23,.07,.13),mat(0xd9d4c7)); sill.position.set(x*fp,wallH*.44,fp*.4+.03);grp.add(sill);
          }
          const door = new THREE.Mesh(new THREE.BoxGeometry(fp*.16,wallH*.55,.06),mat(0x685343)); door.position.set(0,wallH*.275,fp*.4+.04);grp.add(door);
          const chimney = new THREE.Mesh(new THREE.BoxGeometry(fp*.12,fp*.3,fp*.12),mat(0x9a7157));chimney.position.set(fp*.25,wallH+fp*.28,0);grp.add(chimney);
          grp.position.set(X(el.x), 0, Z(el.y));
          grp.userData.walls = walls; grp.userData.ring = ring;
          const lb = label(el.name); lb.position.set(0, wallH + fp * 0.55 + 1.6, 0); grp.add(lb);
        } else if (el.type === 'canal') {
          const w = Math.max(4, 0.012 * L) * st.s;
          grp.add(seg(el, w * 1.7, 0.5, 0.05, mat(el.lined ? C.canalLined : 0x7a5b3c)));
          grp.add(seg(el, w, 0.25, 0.09, mat(C.canal, { transparent: true, opacity: 0.9 })));
        } else if (el.type === 'pozo') {
          const r = Math.max(2, 0.006 * L) * st.s;
          const depth = el.depth * st.sz;
          const casing = new THREE.Mesh(new THREE.CylinderGeometry(r, r, depth, 16, 1, true), mat(C.steel, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
          casing.position.y = -depth / 2;
          const house = new THREE.Mesh(new THREE.BoxGeometry(fp * 0.45, fp * 0.35, fp * 0.45), mat(el.Q > 0 ? C.pump : C.steel));
          house.position.y = fp * 0.175;
          const lvl = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.6, r * 1.6, 0.25, 16), new THREE.MeshBasicMaterial({ color: 0x1e88e5 }));
          grp.add(casing, house, lvl);
          const pipe = new THREE.Mesh(new THREE.CylinderGeometry(r*.18,r*.18,depth,12),mat(0x354c59,{metalness:.6,roughness:.35}));pipe.position.y=-depth/2;grp.add(pipe);
          const cap = new THREE.Mesh(new THREE.CylinderGeometry(r*1.3,r*1.3,.3,24),mat(0xd5d9d5));cap.position.y=.15;grp.add(cap);
          grp.userData.level = lvl;
          grp.position.set(X(el.x), 0, Z(el.y));
          const lb = label(el.name); lb.position.set(0, fp * 0.35 + 2.2, 0); grp.add(lb);
        } else if (el.type === 'poza') {
          const w = Math.abs(el.x2 - el.x1) * st.s, d = Math.abs(el.y2 - el.y1) * st.s, hh = Math.max(0.6, 1.5 * st.sz);
          const basin = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat(el.membrane ? C.membrane : 0x6b5236));
          basin.position.y = -hh / 2;
          const water = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.96, d * 0.96), new THREE.MeshPhongMaterial({ color: C.poza, shininess: 80 }));
          water.rotation.x = -Math.PI / 2; water.position.y = 0.08;
          grp.add(basin, water);
          grp.position.set(X((el.x1 + el.x2) / 2), 0, Z((el.y1 + el.y2) / 2));
          const lb = label(el.name); lb.position.set(0, 3, 0); grp.add(lb);
        } else if (el.type === 'dren') {
          const r = Math.max(0.35, 0.6 * st.sz * 0.25);
          const yD = -el.depth * st.sz;
          grp.add(seg(el, r * 2, r * 2, yD + r, mat(C.drain)));
          // zanja de relleno
          grp.add(seg(el, r * 4, el.depth * st.sz, 0.02, mat(0x9d8a6d, { transparent: true, opacity: 0.35, depthWrite: false })));
        } else if (el.type === 'rio') {
          const w = Math.max(15, 0.03 * L) * st.s;
          const bed = seg(el, w * 1.4, 1, 0.04, mat(0x6e6252));
          grp.add(bed);
          const water = seg(el, w, 0.3, 0, new THREE.MeshPhongMaterial({ color: C.river, shininess: 90, transparent: true, opacity: 0.92 }));
          grp.add(water);
          grp.userData.water = water;
          const lb = label(el.name, '#14628a'); lb.position.set((X(el.x1) + X(el.x2)) / 2, 3, (Z(el.y1) + Z(el.y2)) / 2); grp.add(lb);
        } else if (el.type === 'fosa') {
          const w = Math.abs(el.x2 - el.x1) * st.s, d = Math.abs(el.y2 - el.y1) * st.s, hh = el.depth * st.sz;
          const pit = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat(0x4a3b2c, { transparent: true, opacity: 0.55, side: THREE.BackSide }));
          pit.position.y = -hh / 2;
          const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, hh, d)), new THREE.LineBasicMaterial({ color: 0xffb347 }));
          edge.position.y = -hh / 2;
          const water = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, d * 0.98), new THREE.MeshPhongMaterial({ color: C.water, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
          water.rotation.x = -Math.PI / 2;
          grp.add(pit, edge, water);
          grp.userData.water = water; grp.userData.edge = edge; grp.userData.bottom = -hh;
          grp.position.set(X((el.x1 + el.x2) / 2), 0, Z((el.y1 + el.y2) / 2));
          const lb = label(el.name); lb.position.set(0, 3, 0); grp.add(lb);
        }
        if (el.id === selectedId) {
          const bb = new THREE.Box3().setFromObject(grp);
          const helper = new THREE.Box3Helper(bb, 0xffb000);
          st.elems.add(helper);
        }
        grp.traverse(o => { if(o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
        st.elems.add(grp);
      }
      st.dirty = true;
    }

    /** Actualiza alturas y colores con el estado de la simulación. */
    function update(sim, field) {
      const g = st.g; if (!g || !st.dyn.pos) return;
      const h = field || sim.h;
      const { pos, col } = st.dyn;
      st.lastSim = sim; st.lastField = field;
      for (let j = 0; j < st.ry; j++) for (let i = 0; i < st.rx; i++) {
        const k = j * st.rx + i, hv = root.SimEngine.interp(g,h,i*g.cfg.Lx/(st.rx-1),j*g.cfg.Ly/(st.ry-1));
        pos[3*k+1] = Y(hv);
        const c = st.realistic ? [0.018,0.22,0.31] : depthRGB(g.zg-hv);
        col.set(c,3*k);
      }
      st.flow.visible = st.arrows;
      for (const arrow of st.flow.children) {
        const p = arrow.userData, v = root.SimEngine.flow(g,h,p.x,p.y), speed = Math.hypot(v.x,v.y);
        arrow.visible = speed > 1e-7;
        if (!arrow.visible) continue;
        arrow.position.set(X(p.x),Y(root.SimEngine.interp(g,h,p.x,p.y))+.3,Z(p.y));
        arrow.setDirection(new THREE.Vector3(v.x,0,-v.y).normalize());
      }
      const geo = st.dyn.wm.geometry;
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      // cortinas: borde sur (j = 0) y borde este (i = Nx−1)
      const fill = (mSat, mUns, n, idxOf, xOf, zOf) => {
        const a = mSat.geometry.attributes.position.array, b = mUns.geometry.attributes.position.array;
        for (let q = 0; q < n; q++) {
          const k = idxOf(q), xx = xOf(q), zz = zOf(q), yh = Y(h[k]), yb = Y(0), yg = 0;
          a.set([xx, yb, zz, xx, Math.min(yh, yg), zz], 6 * q);
          b.set([xx, Math.min(yh, yg), zz, xx, yg, zz], 6 * q);
        }
        mSat.geometry.attributes.position.needsUpdate = true; mUns.geometry.attributes.position.needsUpdate = true;
        mSat.geometry.computeVertexNormals(); mUns.geometry.computeVertexNormals();
        mSat.geometry.computeBoundingSphere(); mUns.geometry.computeBoundingSphere();
      };
      fill(st.dyn.satS, st.dyn.unsS, g.Nx, (q) => q, (q) => X(g.x[q]) , () => Z(0) + 0.01);
      fill(st.dyn.satE, st.dyn.unsE, g.Ny, (q) => q * g.Nx + g.Nx - 1, () => X(g.cfg.Lx) + 0.01, (q) => Z(g.y[q]));
      fill(st.dyn.satN, st.dyn.unsN, g.Nx, (q) => (g.Ny - 1) * g.Nx + q, (q) => X(g.x[q]), () => Z(g.cfg.Ly) - .01);
      fill(st.dyn.satW, st.dyn.unsW, g.Ny, (q) => q * g.Nx, () => X(0) - .01, (q) => Z(g.y[q]));
      // elementos dinámicos
      for (const grp of st.elems.children) {
        const u = grp.userData; if (!u || !u.id) continue;
        const el = sim.cfg.elements.find((e) => e.id === u.id); if (!el) continue;
        if (u.type === 'casa' && sim.mon.casa[u.id]) {
          const s = sim.mon.casa[u.id].state;
          const c = s === 'ok' ? C.ok : C[s];
          u.ring.material.color.setHex(c);
          u.walls.material.color.setHex(s === 'ok' ? C.wall : s === 'alerta' ? 0xf4c98a : s === 'afectada' ? 0xf0a0a0 : 0xd2a8ee);
        } else if (u.type === 'pozo' && sim.mon.pozo[u.id]) {
          u.level.position.y = Y(sim.h[sim.mon.pozo[u.id].k]);
        } else if (u.type === 'rio') {
          const stg = root.SimEngine.riverStage(el, g.h0, sim.t);
          u.water.position.y = Y(stg) - 0.15;
        } else if (u.type === 'fosa' && sim.mon.fosa[u.id]) {
          const m = sim.mon.fosa[u.id];
          const yy = Y(m.h ?? g.h0);
          u.water.visible = yy > u.bottom + 0.01;
          u.water.position.y = Math.min(yy, 0);
          u.edge.material.color.setHex(m.dryNow ? C.ok : 0xffb347);
        }
      }
      st.dirty = true;
    }

    function setAppearance(options) {
      Object.assign(st, options);
      if (st.top) { st.top.material.opacity = st.cut ? .12 : .97; st.top.material.depthWrite = !st.cut; }
      if (st.lastSim) update(st.lastSim, st.lastField);
      st.dirty = true;
    }
    function setCamera(mode) {
      if (mode === 'top') camera.position.set(0,170,.01);
      else if (mode === 'section') camera.position.set(80,25,100);
      else camera.position.set(-70,75,115);
      controls.target.set(0,-6,0); controls.update(); st.dirty = true;
    }
    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
      camera.aspect = w / h; camera.updateProjectionMatrix();
      st.dirty = true;
    }
    new ResizeObserver(resize).observe(container);
    controls.addEventListener('change', () => { st.dirty = true; });
    function setBackground(css) { scene.background = new THREE.Color(css); st.dirty = true; }
    (function loop() {
      requestAnimationFrame(loop);
      controls.update();
      if (st.dirty) { renderer.render(scene, camera); st.dirty = false; }
    })();
    function resetView() { camera.position.set(-70, 75, 115); controls.target.set(0, -6, 0); controls.update(); st.dirty = true; }
    function snapshot() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); }

    return { setAppearance, setCamera, setGrid, setElements, update, resize, setBackground, resetView, snapshot, get exag() { return st.exag; } };
  }

  root.Sim3D = { create, depthRGB };
})(window);
