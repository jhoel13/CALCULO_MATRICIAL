/* Exportación: script y datos MATLAB, script Python, CSV, JSON e informe PDF. */
(function (root) {
  'use strict';
  const { fmt, fmtg, days } = root.F;

  const n = (v) => (v === null || v === undefined || Number.isNaN(v) ? 'NaN' : Number.isInteger(v) ? String(v) : String(+v.toPrecision(10)));
  const bcCode = { neumann: 0, dirichlet: 1, ramp: 2 };
  const stamp = () => new Date().toLocaleString('es-PE');
  const ascii = (s) => String(s).replace(/[—–]/g, '-').replace(/[“”]/g, '"');

  function sidesMatlab(p) {
    return ['W', 'E', 'S', 'N'].map((k) => {
      const b = p.bc[{ W: 'west', E: 'east', S: 'south', N: 'north' }[k]];
      return `bc${k} = struct('tipo', ${bcCode[b.type]}, 'valor', ${n(b.value ?? 0)}, 'h1', ${n(b.h1 ?? 0)}, 'h2', ${n(b.h2 ?? 0)}, 'tf', ${n(b.tf ?? 1)});  % ${ascii(b.label || '')}`;
    }).join('\n');
  }
  const src = (p, type) => (p.sources || []).find((s) => s.type === type) || { enabled: false, x: 0, y: 0, q: 0, Q: 0, lining: { enabled: false, y1: 0, y2: 0, eff: 0 } };

  /* ---------------- MATLAB: script que recalcula ---------------- */
  function matlab(R) {
    const p = R.p, L = src(p, 'line'), P = src(p, 'point'), lin = L.lining || { enabled: false, y1: 0, y2: 0, eff: 0 };
    const dr = p.drain || { enabled: false, x: 0, h: 0 };
    return `%% Piezometro 2D - ${ascii(p.name)}
% Modelamiento numerico de flujo subterraneo 2D (UNC - Modelamiento Numerico en Ingenieria)
%   Transitorio : S dh/dt = T (d2h/dx2 + d2h/dy2) + Qs      -> esquema FTCS
%   Estacionario: d2h/dx2 + d2h/dy2 = -Qs/T                -> Gauss-Seidel / SOR
% Generado automaticamente el ${stamp()}. Compatible con MATLAB R2016b+ y GNU Octave.
clear; clc; close all;

%% 1. Datos del problema (editables)
Lx = ${n(p.Lx)}; Ly = ${n(p.Ly)};        % dimensiones del dominio [m]
dx = ${n(p.dx)}; dy = ${n(p.dy)};        % paso de malla [m]
T  = ${n(p.T)};                 % transmisividad [m2/dia]
S  = ${n(p.S)};                 % almacenamiento [-]
h0 = ${n(p.h0)};                % condicion inicial uniforme [m]
tEnd = ${n(p.tEnd)};            % horizonte simulado [dias]
dtFactor = ${n(p.dtFactor)};    % dt = dtFactor * dtmax  (debe ser < 1)
tol = ${n(p.tol)};              % tolerancia de SOR [m]
omegaModo = '${R.omegaMode === 'manual' ? 'manual' : R.omegaMode === 'HT6' ? 'ht6' : 'optimo'}';   % 'optimo' | 'ht6' | 'manual'
omegaManual = ${n(R.omegaUsed)};

% Fronteras: tipo 0 = Neumann (dh/dn = 0), 1 = Dirichlet fijo, 2 = Dirichlet en rampa h1 -> h2 en tf dias
${sidesMatlab(p)}

% Fuentes y medidas
canal = struct('activo', ${L.enabled ? 'true' : 'false'}, 'x', ${n(L.x)}, 'q', ${n(L.q ?? 0)}, ...      % q_inf [m3/dia por m]
               'rev', ${lin.enabled ? 'true' : 'false'}, 'y1', ${n(lin.y1)}, 'y2', ${n(lin.y2)}, 'ef', ${n(lin.eff)});  % revestimiento [%]
pozo  = struct('activo', ${P.enabled ? 'true' : 'false'}, 'x', ${n(P.x)}, 'y', ${n(P.y ?? 0)}, 'Q', ${n(P.Q ?? 0)});   % Q [m3/dia], negativo = bombeo
dren  = struct('activo', ${dr.enabled ? 'true' : 'false'}, 'x', ${n(dr.x)}, 'h', ${n(dr.h)});
monNombre = {${R.mons.map((m) => `'${ascii(m.name)}'`).join(', ')}};
monX = [${R.mons.map((m) => n(m.x)).join(' ')}];
monY = [${R.mons.map((m) => n(m.y)).join(' ')}];
limite = ${p.limitRise == null ? 'NaN' : n(p.limitRise)};     % cambio admisible |h - h0| [m]

%% 2. Malla
Nx = round(Lx/dx) + 1;  Ny = round(Ly/dy) + 1;
x = (0:Nx-1)*dx;  y = (0:Ny-1)*dy;
D = T/S;
fprintf('Malla %d x %d = %d nodos, D = T/S = %.4g m2/dia\\n', Nx, Ny, Nx*Ny, D);
% Convencion: h(j,i) ~ h(x_i, y_j)  (fila = y, columna = x)

%% 3. Termino fuente Qs [m/dia]
Qs = zeros(Ny, Nx);
if canal.activo
    ic = min(max(round(canal.x/dx) + 1, 1), Nx);
    q = canal.q/dx * ones(Ny, 1);                 % fuente lineal: q_inf / dx
    if canal.rev
        k = (y >= canal.y1 - 1e-9) & (y <= canal.y2 + 1e-9);
        q(k) = q(k) * (1 - canal.ef/100);
    end
    Qs(:, ic) = Qs(:, ic) + q;
end
if pozo.activo
    ip = min(max(round(pozo.x/dx) + 1, 1), Nx);  jp = min(max(round(pozo.y/dy) + 1, 1), Ny);
    Qs(jp, ip) = Qs(jp, ip) + pozo.Q/(dx*dy);     % fuente puntual: Q / (dx dy)
end
f = Qs / T;

%% 4. Clasificacion de nodos (Dirichlet prevalece en los vertices)
fijo = false(Ny, Nx); valor = zeros(Ny, Nx);
esRampa = false(Ny, Nx); rH1 = zeros(Ny, Nx); rH2 = zeros(Ny, Nx); rTf = ones(Ny, Nx);
lados = {bcS, bcN, bcW, bcE};
for s = 1:4
    b = lados{s};
    if b.tipo == 0, continue; end
    M = false(Ny, Nx);
    switch s
        case 1, M(1, :) = true;
        case 2, M(Ny, :) = true;
        case 3, M(:, 1) = true;
        case 4, M(:, Nx) = true;
    end
    if b.tipo == 1
        fijo(M) = true; esRampa(M) = false; valor(M) = b.valor;
    else
        esRampa(M) = true; fijo(M) = false; rH1(M) = b.h1; rH2(M) = b.h2; rTf(M) = b.tf;
    end
end
if dren.activo
    id = min(max(round(dren.x/dx) + 1, 1), Nx);
    M = false(Ny, Nx); M(:, id) = true; M = M & ~fijo & ~esRampa;
    fijo(M) = true; valor(M) = dren.h;
end
g = @(t) rH1 + (rH2 - rH1) .* min(max(t, 0) ./ rTf, 1);   % Dirichlet variable
actualiza = ~fijo & ~esRampa;
fprintf('Nodos: %d Dirichlet fijos, %d variables, %d actualizados\\n', nnz(fijo), nnz(esRampa), nnz(actualiza));

% Vecinos con reflexion = nodo fantasma de Neumann (h_{-1} = h_{1})
iW = [2, 1:Nx-1];  iE = [2:Nx, Nx-1];
jS = [2, 1:Ny-1];  jN = [2:Ny, Ny-1];

%% 5. Transitorio: esquema FTCS
dtmax = 1 / (2*D*(1/dx^2 + 1/dy^2));
dt = dtFactor * dtmax;
rx = D*dt/dx^2;  ry = D*dt/dy^2;
nPasos = round(tEnd/dt);
fprintf('dtmax = %.6g dias, dt = %.6g dias, rx = %.4f, ry = %.4f, rx+ry = %.4f, pasos = %d\\n', dtmax, dt, rx, ry, rx+ry, nPasos);
if rx + ry > 0.5, warning('rx + ry > 1/2: el esquema FTCS es INESTABLE'); end

h = h0 * ones(Ny, Nx);
h(fijo) = valor(fijo);  G = g(0);  h(esRampa) = G(esRampa);
hIni = h;
im = min(max(round(monX/dx) + 1, 1), Nx);  jm = min(max(round(monY/dy) + 1, 1), Ny);
km = sub2ind([Ny Nx], jm, im);
cada = max(1, floor(nPasos/1500));
tSerie = 0;  hMon = h(km);
for n = 1:nPasos
    hn = h + rx*(h(:, iE) - 2*h + h(:, iW)) + ry*(h(jN, :) - 2*h + h(jS, :)) + dt/S*Qs;
    hn(fijo) = valor(fijo);
    G = g(n*dt);  hn(esRampa) = G(esRampa);      % g(t_{n+1}), no g(t_n)
    h = hn;
    if mod(n, cada) == 0 || n == nPasos
        tSerie(end+1, 1) = n*dt;  hMon(end+1, :) = h(km);
    end
    if any(abs(h(:)) > 1e6), warning('Divergencia en el paso %d', n); break; end
end
hFTCS = h;

%% 6. Estacionario: SOR con formula ponderada
wx = 1/dx^2;  wy = 1/dy^2;
% numero de onda del modo mas lento: D-D -> pi/N, D-N -> pi/(2N), N-N -> 0
theta = @(a, b, N) (a > 0 && b > 0)*pi/N + xor(a > 0, b > 0)*pi/(2*N);
thx = theta(bcW.tipo, bcE.tipo, Nx-1);  thy = theta(bcS.tipo, bcN.tipo, Ny-1);
rhoJ = (wx*cos(thx) + wy*cos(thy)) / (wx + wy);
omegaOpt = 2/(1 + sqrt(1 - rhoJ^2));
rhoHT6 = 0.5*(cos(pi/Nx) + cos(pi/Ny));  omegaHT6 = 2/(1 + sqrt(1 - rhoHT6^2));
switch omegaModo
    case 'ht6', omega = omegaHT6;
    case 'manual', omega = omegaManual;
    otherwise, omega = omegaOpt;
end
fprintf('rhoJ = %.5f, omega_opt = %.4f, omega_HT6 = %.4f, omega usado = %.4f\\n', rhoJ, omegaOpt, omegaHT6, omega);

he = h0 * ones(Ny, Nx);
he(fijo) = valor(fijo);  he(esRampa) = rH2(esRampa);   % la rampa toma su valor final
historia = [];
for it = 1:200000
    cambio = 0;
    for j = 1:Ny
        for i = 1:Nx
            if ~actualiza(j, i), continue; end
            hGS = (wx*(he(j, iE(i)) + he(j, iW(i))) + wy*(he(jN(j), i) + he(jS(j), i)) + f(j, i)) / (2*(wx + wy));
            nuevo = (1 - omega)*he(j, i) + omega*hGS;
            cambio = max(cambio, abs(nuevo - he(j, i)));
            he(j, i) = nuevo;
        end
    end
    historia(end+1) = cambio; %#ok<AGROW>
    if cambio <= tol, break; end
end
fprintf('SOR convergio en %d iteraciones\\n', it);

%% 7. Resultados en los puntos de control
fprintf('\\n%-16s %10s %12s %12s %10s\\n', 'Punto', 'h0', 'h(tEnd)', 'h estac.', 'cambio');
for k = 1:numel(km)
    fprintf('%-16s %10.4f %12.4f %12.4f %10.4f\\n', monNombre{k}, hIni(km(k)), hFTCS(km(k)), he(km(k)), hFTCS(km(k)) - hIni(km(k)));
    if ~isnan(limite)
        idx = find(abs(hMon(:, k) - hMon(1, k)) >= limite, 1);
        if isempty(idx), fprintf('   no supera el limite de %.3g m en %.1f dias\\n', limite, tEnd);
        else, fprintf('   supera el limite de %.3g m a los %.1f dias\\n', limite, tSerie(idx)); end
    end
end

%% 8. Graficas
figure('Name', 'Modelo 3D');
subplot(1, 2, 1); surf(x, y, hFTCS); shading interp; colorbar; xlabel('x [m]'); ylabel('y [m]'); zlabel('h [m]');
title(sprintf('FTCS, t = %.1f dias', tSerie(end))); view(-35, 30);
subplot(1, 2, 2); surf(x, y, he); shading interp; colorbar; xlabel('x [m]'); ylabel('y [m]'); zlabel('h [m]');
title('Estacionario (SOR)'); view(-35, 30);

figure('Name', 'Planta');
contourf(x, y, hFTCS, 20); colorbar; axis equal tight; hold on;
plot(x(im), y(jm), 'ko', 'MarkerFaceColor', 'w');
text(x(im), y(jm), monNombre, 'VerticalAlignment', 'bottom');
xlabel('x [m]'); ylabel('y [m]'); title('Isolineas de h al final del transitorio');

figure('Name', 'Series de tiempo');
plot(tSerie, hMon, 'LineWidth', 1.5); grid on; hold on;
for k = 1:numel(km), plot([0 tSerie(end)], [he(km(k)) he(km(k))], ':', 'Color', [.4 .4 .4]); end
xlabel('t [dias]'); ylabel('h [m]'); legend(monNombre, 'Location', 'best'); title('Evolucion en los puntos de control');

figure('Name', 'Perfil y convergencia');
jc = round((Ny - 1)/2) + 1;
subplot(1, 2, 1); plot(x, hIni(jc, :), ':', x, hFTCS(jc, :), '-o', x, he(jc, :), '-', 'LineWidth', 1.2); grid on;
legend('Inicial', 'FTCS', 'SOR'); xlabel('x [m]'); ylabel('h [m]'); title(sprintf('Perfil en y = %.0f m', y(jc)));
subplot(1, 2, 2); semilogy(historia, 'LineWidth', 1.5); grid on; hold on; semilogy([1 numel(historia)], [tol tol], 'r:');
xlabel('Iteracion'); ylabel('max |cambio| [m]'); title(sprintf('SOR, omega = %.3f', omega));

save('resultados_piezometro2d.mat', 'x', 'y', 'hFTCS', 'he', 'tSerie', 'hMon', 'monNombre', 'historia');
fprintf('\\nResultados guardados en resultados_piezometro2d.mat\\n');

`;
  }

  /* ---------------- MATLAB: datos ya calculados ---------------- */
  function matrix(arr, Nx, Ny) {
    const rows = [];
    for (let j = 0; j < Ny; j++) {
      const r = [];
      for (let i = 0; i < Nx; i++) r.push(n(arr[j * Nx + i]));
      rows.push('  ' + r.join(' '));
    }
    return '[\n' + rows.join(';\n') + '\n]';
  }
  function matlabData(R) {
    const { p, m } = R;
    const ts = R.ftcs.tSeries;
    const series = ts.map((tt, k) => '  ' + [n(tt), ...R.mons.map((mo) => n(mo.series[k]))].join(' ')).join(';\n');
    return `%% Resultados calculados por Piezometro 2D - ${ascii(p.name)}
% Generado el ${stamp()}. Ejecute este archivo en MATLAB/Octave para cargar las variables.
% Convencion: h(j,i) ~ h(x_i, y_j). Unidades: m, dias.
param = struct('Lx', ${n(p.Lx)}, 'Ly', ${n(p.Ly)}, 'dx', ${n(p.dx)}, 'dy', ${n(p.dy)}, 'T', ${n(p.T)}, 'S', ${n(p.S)}, ...
  'D', ${n(m.D)}, 'h0', ${n(p.h0)}, 'dt', ${n(R.dt)}, 'dtmax', ${n(R.dtmax)}, 'rx', ${n(R.rx)}, 'ry', ${n(R.ry)}, ...
  'nPasos', ${R.nSteps}, 'omega', ${n(R.omegaUsed)}, 'omegaOpt', ${n(R.spectral.omegaOpt)}, 'rhoJ', ${n(R.spectral.rhoJ)}, ...
  'iterSOR', ${R.steady.iterations}, 'iterGS', ${R.gsIter}, 'tol', ${n(p.tol)});
x = [${m.x.map(n).join(' ')}];
y = [${m.y.map(n).join(' ')}];
Qs = ${matrix(m.Qs, m.Nx, m.Ny)};
h_inicial = ${matrix(R.ftcs.h0, m.Nx, m.Ny)};
h_ftcs = ${matrix(R.ftcs.h, m.Nx, m.Ny)};   % t = ${n(ts[ts.length - 1])} dias
h_estacionario = ${matrix(R.steady.h, m.Nx, m.Ny)};
monNombre = {${R.mons.map((mo) => `'${ascii(mo.name)}'`).join(', ')}};
monXY = [${R.mons.map((mo) => `${n(mo.x)} ${n(mo.y)}`).join('; ')}];
% columnas: t [dias], h en cada punto de control
serie = [
${series}
];
convergenciaSOR = [${R.steady.history.map(n).join(' ')}];

figure; surf(x, y, h_ftcs); shading interp; colorbar; xlabel('x [m]'); ylabel('y [m]'); zlabel('h [m]'); title('h FTCS final');
figure; plot(serie(:,1), serie(:,2:end), 'LineWidth', 1.5); grid on; legend(monNombre); xlabel('t [dias]'); ylabel('h [m]');
`;
  }

  /* ---------------- Python ---------------- */
  function python(R) {
    const p = R.p, L = src(p, 'line'), P = src(p, 'point'), lin = L.lining || { enabled: false, y1: 0, y2: 0, eff: 0 };
    const dr = p.drain || { enabled: false, x: 0, h: 0 };
    const pb = (b) => (b ? 'True' : 'False');
    const side = (k) => { const b = p.bc[k]; return `dict(tipo=${bcCode[b.type]}, valor=${n(b.value ?? 0)}, h1=${n(b.h1 ?? 0)}, h2=${n(b.h2 ?? 0)}, tf=${n(b.tf ?? 1)})`; };
    return `"""Piezometro 2D - ${ascii(p.name)}
S dh/dt = T lap(h) + Qs   (FTCS)   |   lap(h) = -Qs/T   (SOR)
Generado el ${stamp()}. Requiere numpy y matplotlib (funciona en Google Colab).
"""
import numpy as np
import matplotlib.pyplot as plt

# 1. Datos
Lx, Ly, dx, dy = ${n(p.Lx)}, ${n(p.Ly)}, ${n(p.dx)}, ${n(p.dy)}
T, S, h0 = ${n(p.T)}, ${n(p.S)}, ${n(p.h0)}
tEnd, dtFactor, tol, omega_modo = ${n(p.tEnd)}, ${n(p.dtFactor)}, ${n(p.tol)}, "${R.omegaMode === 'manual' ? 'manual' : R.omegaMode === 'HT6' ? 'ht6' : 'optimo'}"
omega_manual = ${n(R.omegaUsed)}
# tipo 0 = Neumann, 1 = Dirichlet, 2 = rampa h1 -> h2 en tf dias
bc = dict(W=${side('west')},
          E=${side('east')},
          S=${side('south')},
          N=${side('north')})
canal = dict(activo=${pb(L.enabled)}, x=${n(L.x)}, q=${n(L.q ?? 0)}, rev=${pb(lin.enabled)}, y1=${n(lin.y1)}, y2=${n(lin.y2)}, ef=${n(lin.eff)})
pozo = dict(activo=${pb(P.enabled)}, x=${n(P.x)}, y=${n(P.y ?? 0)}, Q=${n(P.Q ?? 0)})
dren = dict(activo=${pb(dr.enabled)}, x=${n(dr.x)}, h=${n(dr.h)})
monitores = [${R.mons.map((mo) => `("${ascii(mo.name)}", ${n(mo.x)}, ${n(mo.y)})`).join(', ')}]

# 2. Malla  (h[j, i] ~ h(x_i, y_j))
Nx, Ny = round(Lx / dx) + 1, round(Ly / dy) + 1
x, y = np.arange(Nx) * dx, np.arange(Ny) * dy
D = T / S

# 3. Termino fuente
Qs = np.zeros((Ny, Nx))
if canal["activo"]:
    ic = min(max(round(canal["x"] / dx), 0), Nx - 1)
    q = np.full(Ny, canal["q"] / dx)
    if canal["rev"]:
        k = (y >= canal["y1"] - 1e-9) & (y <= canal["y2"] + 1e-9)
        q[k] *= 1 - canal["ef"] / 100
    Qs[:, ic] += q
if pozo["activo"]:
    Qs[min(max(round(pozo["y"] / dy), 0), Ny - 1), min(max(round(pozo["x"] / dx), 0), Nx - 1)] += pozo["Q"] / (dx * dy)
f = Qs / T

# 4. Clasificacion de nodos
fijo = np.zeros((Ny, Nx), bool); valor = np.zeros((Ny, Nx))
rampa = np.zeros((Ny, Nx), bool); rH1 = np.zeros((Ny, Nx)); rH2 = np.zeros((Ny, Nx)); rTf = np.ones((Ny, Nx))
for lado, sl in (("S", np.s_[0, :]), ("N", np.s_[-1, :]), ("W", np.s_[:, 0]), ("E", np.s_[:, -1])):
    b = bc[lado]
    if b["tipo"] == 1:
        fijo[sl] = True; rampa[sl] = False; valor[sl] = b["valor"]
    elif b["tipo"] == 2:
        rampa[sl] = True; fijo[sl] = False; rH1[sl] = b["h1"]; rH2[sl] = b["h2"]; rTf[sl] = b["tf"]
if dren["activo"]:
    idr = min(max(round(dren["x"] / dx), 0), Nx - 1)
    col = ~fijo[:, idr] & ~rampa[:, idr]
    fijo[col, idr] = True; valor[col, idr] = dren["h"]
g = lambda t: rH1 + (rH2 - rH1) * np.minimum(max(t, 0) / rTf, 1)
actualiza = ~fijo & ~rampa
iW = np.r_[1, 0:Nx - 1]; iE = np.r_[1:Nx, Nx - 2]
jS = np.r_[1, 0:Ny - 1]; jN = np.r_[1:Ny, Ny - 2]

# 5. FTCS
dtmax = 1 / (2 * D * (1 / dx**2 + 1 / dy**2))
dt = dtFactor * dtmax
rx, ry = D * dt / dx**2, D * dt / dy**2
nPasos = round(tEnd / dt)
print(f"dtmax={dtmax:.6g} d, dt={dt:.6g} d, rx={rx:.4f}, ry={ry:.4f}, pasos={nPasos}")
h = np.full((Ny, Nx), float(h0)); h[fijo] = valor[fijo]; h[rampa] = g(0)[rampa]
h_ini = h.copy()
km = [(min(max(round(my / dy), 0), Ny - 1), min(max(round(mx / dx), 0), Nx - 1)) for _, mx, my in monitores]
cada = max(1, nPasos // 1500)
t_serie, h_mon = [0.0], [[h[k] for k in km]]
for n in range(1, nPasos + 1):
    h = h + rx * (h[:, iE] - 2 * h + h[:, iW]) + ry * (h[jN, :] - 2 * h + h[jS, :]) + dt / S * Qs
    h[fijo] = valor[fijo]; h[rampa] = g(n * dt)[rampa]
    if n % cada == 0 or n == nPasos:
        t_serie.append(n * dt); h_mon.append([h[k] for k in km])
h_ftcs, h_mon = h, np.array(h_mon)

# 6. SOR
wx, wy = 1 / dx**2, 1 / dy**2
def theta(a, b, N):
    return np.pi / N if (a and b) else (np.pi / (2 * N) if (a or b) else 0.0)
thx = theta(bc["W"]["tipo"] > 0, bc["E"]["tipo"] > 0, Nx - 1)
thy = theta(bc["S"]["tipo"] > 0, bc["N"]["tipo"] > 0, Ny - 1)
rhoJ = (wx * np.cos(thx) + wy * np.cos(thy)) / (wx + wy)
omega_opt = 2 / (1 + np.sqrt(1 - rhoJ**2))
rho6 = 0.5 * (np.cos(np.pi / Nx) + np.cos(np.pi / Ny)); omega_ht6 = 2 / (1 + np.sqrt(1 - rho6**2))
omega = {"ht6": omega_ht6, "manual": omega_manual}.get(omega_modo, omega_opt)
he = np.full((Ny, Nx), float(h0)); he[fijo] = valor[fijo]; he[rampa] = rH2[rampa]
historia = []
for it in range(1, 200001):
    cambio = 0.0
    for j in range(Ny):
        for i in range(Nx):
            if not actualiza[j, i]:
                continue
            hgs = (wx * (he[j, iE[i]] + he[j, iW[i]]) + wy * (he[jN[j], i] + he[jS[j], i]) + f[j, i]) / (2 * (wx + wy))
            nuevo = (1 - omega) * he[j, i] + omega * hgs
            cambio = max(cambio, abs(nuevo - he[j, i])); he[j, i] = nuevo
    historia.append(cambio)
    if cambio <= tol:
        break
print(f"rhoJ={rhoJ:.5f}  omega_opt={omega_opt:.4f}  omega={omega:.4f}  iteraciones SOR={it}")
for (nom, _, _), k, s in zip(monitores, km, h_mon.T):
    print(f"{nom:16s} h0={h_ini[k]:.4f}  h_ftcs={h_ftcs[k]:.4f}  h_est={he[k]:.4f}  cambio={h_ftcs[k]-h_ini[k]:.4f}")

# 7. Graficas
X, Y = np.meshgrid(x, y)
fig = plt.figure(figsize=(12, 5))
for k, (Z, tit) in enumerate(((h_ftcs, f"FTCS t={t_serie[-1]:.1f} d"), (he, "Estacionario SOR"))):
    ax = fig.add_subplot(1, 2, k + 1, projection="3d")
    ax.plot_surface(X, Y, Z, cmap="viridis"); ax.set_title(tit); ax.set_xlabel("x [m]"); ax.set_ylabel("y [m]")
plt.figure(); plt.plot(t_serie, h_mon); plt.legend([m[0] for m in monitores]); plt.xlabel("t [dias]"); plt.ylabel("h [m]"); plt.grid()
plt.figure(); plt.semilogy(historia); plt.axhline(tol, ls=":", c="r"); plt.xlabel("iteracion"); plt.ylabel("max cambio [m]"); plt.grid()
plt.show()
`;
  }

  /* ---------------- CSV y JSON ---------------- */
  function csv(R) {
    const { m } = R;
    const names = ['interior', 'neumann', 'vertice', 'dirichlet', 'dirichlet_variable', 'dren'];
    const lines = ['i,j,x_m,y_m,tipo_nodo,Qs_m_dia,h_inicial_m,h_ftcs_final_m,h_estacionario_m,cambio_m'];
    for (let j = 0; j < m.Ny; j++) for (let i = 0; i < m.Nx; i++) {
      const k = j * m.Nx + i;
      lines.push([i, j, m.x[i], m.y[j], names[m.type[k]], m.Qs[k], R.ftcs.h0[k], R.ftcs.h[k], R.steady.h[k], R.ftcs.h[k] - R.ftcs.h0[k]].map((v) => (typeof v === 'number' ? n(v) : v)).join(','));
    }
    return lines.join('\n');
  }
  const json = (p) => JSON.stringify(p, null, 2);

  /* ---------------- PDF ---------------- */
  async function pdf(R, ctx, onProgress) {
    const C = root.Charts;
    const host = document.getElementById('report-root');
    host.innerHTML = '';
    const rep = document.createElement('div');
    rep.className = 'rep';
    host.appendChild(rep);
    const add = (html) => { const d = document.createElement('div'); d.className = 'rep-block'; d.innerHTML = html; rep.appendChild(d); return d; };

    onProgress && onProgress('Generando gráficas…');
    const W = 1100, H = 560;
    const imgs = {
      s3d: await C.png(C.fig3d(R, 'ftcs', R.ftcs.snapshots.length - 1, ctx.zexag, 'light'), W, 640),
      map: await C.png(C.figMap(R, 'ftcs', R.ftcs.snapshots.length - 1, 'light'), W, H),
      st: await C.png(C.fig3d(R, 'steady', 0, ctx.zexag, 'light'), W, 640),
      series: await C.png(C.figSeries(R, 'light'), W, H),
      profile: await C.png(C.figProfile(R, 'light'), W, H),
      conv: await C.png(C.figConv(R, 'light'), W, H),
      extra: await C.png(C.figExtra(R, 'light'), W, H),
    };

    const p = R.p;
    add(`<h1>Piezómetro 2D · Informe de cálculo</h1>
      <p class="muted">${p.name} · ${p.team} · Generado el ${stamp()}</p>
      <p>${p.description}</p>`);
    add(`<h2>Datos del modelo</h2>${ctx.paramsTable}`);
    add(`<h2>Respuesta de ingeniería</h2>${ctx.kpiHTML}`);
    add(`<h2>Modelo 3D</h2><img src="${imgs.s3d}" alt="">`);
    add(`<img src="${imgs.st}" alt="">`);
    add(`<img src="${imgs.map}" alt="">`);
    add(`<h2>Resultados</h2><img src="${imgs.series}" alt="">`);
    add(`<img src="${imgs.profile}" alt="">`);
    add(`<img src="${imgs.extra}" alt="">`);
    add(`<img src="${imgs.conv}" alt="">`);

    const pushSections = (html, title) => {
      add(`<h2>${title}</h2>`);
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      tmp.querySelectorAll('details').forEach((d) => {
        const s = d.querySelector('summary');
        const h = document.createElement('h3');
        h.innerHTML = s ? s.innerHTML : '';
        s && s.remove();
        const wrap = document.createElement('div');
        wrap.appendChild(h);
        while (d.firstChild) wrap.appendChild(d.firstChild);
        d.replaceWith(wrap);
      });
      for (const sec of Array.from(tmp.children)) {
        // cada sección se parte en bloques pequeños para evitar cortes feos
        const parts = Array.from(sec.children);
        let buf = '';
        for (const el of parts) {
          if (el.tagName === 'DIV' && !el.classList.contains('math') && !el.classList.contains('callout') && !el.classList.contains('table-wrap') && el.children.length > 1) {
            if (buf) { add(buf); buf = ''; }
            for (const c of Array.from(el.children)) add(c.outerHTML);
          } else buf += el.outerHTML;
          if (buf.length > 2500) { add(buf); buf = ''; }
        }
        if (buf) add(buf);
      }
    };
    pushSections(root.Content.formulas(R), 'Formulación y métodos numéricos');
    pushSections(root.Content.development(R), 'Desarrollo del problema');

    return blocksToPdf(rep, host, onProgress);
  }


  /** Rasteriza los bloques de un informe (hijos de rep) en páginas A4 y devuelve el PDF como Blob. */
  async function blocksToPdf(rep, host, onProgress, footer) {
    const { jsPDF } = window.jspdf;
    // medir las alturas sólo cuando las imágenes ya están decodificadas
    await Promise.all(Array.from(rep.querySelectorAll('img')).map((im) => (im.decode ? im.decode().catch(() => {}) : null)));
    onProgress && onProgress('Componiendo fórmulas…');
    if (window.MathJax && MathJax.typesetPromise) { await MathJax.startup.promise; await MathJax.typesetPromise([rep]); }
    // html2canvas pintaría también el MathML oculto de accesibilidad: se retira sólo del informe
    rep.querySelectorAll('mjx-assistive-mml').forEach((e) => e.remove());
    await document.fonts.ready;

    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const PW = 210, PH = 297, MX = 14, MT = 18, MB = 16, CW = PW - 2 * MX, AV = PH - MT - MB, GAP = 2;
    const mmPerPx = CW / rep.offsetWidth;
    // 1) agrupar bloques en páginas según su altura real
    const pages = [];
    let cur = [], used = 0;
    for (const bl of Array.from(rep.children)) {
      const hmm = bl.offsetHeight * mmPerPx;
      if (hmm > AV) { if (cur.length) pages.push(cur); pages.push([bl]); cur = []; used = 0; continue; }
      if (used + hmm > AV && cur.length) { pages.push(cur); cur = []; used = 0; }
      cur.push(bl); used += hmm + GAP;
    }
    if (cur.length) pages.push(cur);
    const pageDivs = pages.map((blocks) => {
      const pd = document.createElement('div');
      pd.className = 'rep-page';
      pd.style.cssText = `display:flex;flex-direction:column;gap:${GAP / mmPerPx}px;background:#fff`;
      blocks.forEach((b) => pd.appendChild(b));
      return pd;
    });
    rep.innerHTML = '';
    pageDivs.forEach((pd) => rep.appendChild(pd));
    // 2) rasterizar cada página (sin clonar el resto de la aplicación)
    const skip = (el) => document.body.contains(el) && !host.contains(el) && !el.contains(host);
    for (let k = 0; k < pageDivs.length; k++) {
      onProgress && onProgress(`Componiendo página ${k + 1} de ${pageDivs.length}…`);
      const canvas = await window.html2canvas(pageDivs[k], { scale: 2, backgroundColor: '#ffffff', logging: false, ignoreElements: skip });
      const pxToMm = CW / canvas.width;
      if (k > 0) doc.addPage();
      let off = 0, y = MT;
      while (off < canvas.height) {
        const sliceH = Math.min(Math.floor(AV / pxToMm), canvas.height - off);
        const c2 = document.createElement('canvas');
        c2.width = canvas.width; c2.height = sliceH;
        c2.getContext('2d').drawImage(canvas, 0, off, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        doc.addImage(c2.toDataURL('image/jpeg', 0.9), 'JPEG', MX, y, CW, sliceH * pxToMm);
        off += sliceH;
        if (off < canvas.height) { doc.addPage(); y = MT; }
      }
    }
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 105, 110);
      doc.text(footer || 'Piezómetro 2D · Modelamiento Numérico en Ingeniería · UNC', MX, 10);
      doc.text(`${i} / ${total}`, PW - MX, 10, { align: 'right' });
      doc.setDrawColor(211, 220, 220); doc.line(MX, 12, PW - MX, 12);
    }
    host.innerHTML = '';
    return doc.output('blob');
  }

  root.Exporters = { matlab, matlabData, python, csv, json, pdf, blocksToPdf };
})(typeof window !== 'undefined' ? window : globalThis);
