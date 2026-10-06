# Piezómetro 3D — Versión mejorada V4

Extrae todo el ZIP y abre **INICIAR.html** en Chrome o Edge. Esta entrada abre el modo de acuífero libre. **simulador.html** abre los ejercicios con el modelo lineal; **index.html** conserva los dos escenarios y el desarrollo de la versión original, con ajustes visuales.

Pulsa **Simular** para ver la evolución o **Ir al final** para completar el horizonte. En **Modelo físico** puedes comparar el modelo lineal con el libre; cambiar de modelo reinicia el cálculo. Para guardar los gráficos utiliza **Guardar vista PNG**. **Campo CSV** exporta la carga, profundidad y descarga específica de Darcy del estado transitorio actual. **Guardar escenario** exporta los parámetros en JSON para volver a cargarlos.

## Nuevo: Solucionar

Pulsa **Solucionar** para evaluar el escenario desde el día 0 hasta el horizonte completo. El análisis compara revestimientos, geomembranas, regulación del bombeo y drenes, según los elementos presentes. Mantiene el suelo, modelo, malla, horizonte y elementos protegidos. Puedes cancelar mientras calcula.

La tabla muestra el escenario actual y las alternativas; **Ver** permite revisar cada una. Se destaca la mejor alternativa ensayada y se muestran los criterios antes/después. **Aplicar propuesta y simular** incorpora los cambios y reproduce su evolución. **Volver al escenario original** restaura el escenario usado en la comparación. **Guardar propuesta JSON** exporta un JSON que puede cargarse como escenario. Cambiar los parámetros descarta las comparaciones desactualizadas.

Criterios: las casas mantienen el agua al menos 0,50 m bajo la cimentación durante todo el horizonte; los pozos respetan su límite de abatimiento y mantienen al menos 1 m de agua sobre el fondo; las excavaciones cumplen su profundidad y margen al final del horizonte. El bombeo imposible se identifica como incumplimiento. Una condición inicial insegura no desaparece del diagnóstico por mejorar después.

Se prioriza cumplir los criterios, después menos incumplimientos y menor intensidad de intervención. Es una comparación finita, no una optimización global ni económica. Los drenes son ideales y no calculan una capacidad constructiva; reducir el bombeo exige revisar la demanda de agua. Ninguna propuesta se aplica automáticamente. Si ninguna cumple, la pantalla indica lo que queda pendiente.

**Resolver y ver solución** también ofrece respuestas numéricas en el modelo libre, basadas en el horizonte completo. El cálculo se realiza por bloques para mantener la interfaz disponible. El informe PDF incluye la comparación cuando está calculada.

## Mejoras visuales

- Iluminación, sombras y materiales en 3D; terreno y cortes con textura ilustrativa.
- Superficie freática interpolada desde la solución, edificios con ventanas y puertas, pozos con tubería.
- Cortes del bloque visibles desde los cuatro lados; zona saturada azul y no saturada ocre.
- Estilo natural o colores de profundidad; controles para ver el subsuelo, cambiar la cámara y mostrar el flujo.
- Curvas de carga hidráulica, flechas de flujo y perfil A–A′ móvil en el mapa.
- Balance acumulado de agua, paso usado, residuo numérico y bombeo no satisfecho.

Las flechas muestran la **dirección** de Darcy, con longitud visual uniforme; no representan velocidades de partículas. Las texturas no representan capas con diferentes propiedades hidráulicas. La exageración vertical en 3D es el factor real indicado en el control (20× al iniciar). Los ejes horizontal y vertical del perfil tienen escalas independientes.

## Motor numérico

Modelo lineal: S ∂h/∂t = ∇·(T ∇h) + Qs, T = K·b constante.

Modelo libre, bajo la aproximación de Dupuit–Boussinesq: Sy ∂h/∂t = ∇·(K·h ∇h) + Qs. La base horizontal se fija en 0 m y el espesor saturado es max(h,0). Se usa transmisividad media aritmética entre nodos, válida para el suelo homogéneo implementado. No es MODFLOW ni pretende reproducir sus paquetes.

El esquema explícito usa flujos conservativos, áreas de control reducidas en bordes y esquinas, y un paso estable según la mayor transmisividad. Los pasos se dividen exactamente en los cambios de bombeo, la lluvia estacional, las fases del hidrograma y el horizonte final. La geometría cubre todo el dominio aunque sus dimensiones no sean múltiplos de la resolución: el panel muestra Δx y Δy reales.

La infiltración de pozas se integra con el área que se superpone a cada celda. El dren sólo extrae agua; el rezume descarga el exceso que supera el terreno. Las celdas no pueden presentar carga negativa bajo la base: la extracción imposible se contabiliza como bombeo no satisfecho. El intercambio de nivel fijo incluye el agua necesaria para imponer la variación del nivel del río.

El balance acumulado se verifica con:

Δalmacenamiento = recarga − bombeo solicitado + bombeo no satisfecho + intercambio de bordes − drenes − rezume.

El porcentaje mostrado es el residuo absoluto dividido por la suma de magnitudes de los volúmenes acumulados. Un residuo pequeño comprueba conservación discreta, no calibración ni exactitud respecto a un sitio real.

## Alcance y comparación

Se mantienen los ocho problemas originales. Sus respuestas analíticas automáticas corresponden al **modelo lineal**. En el modo libre se muestran resultados numéricos y una indicación explícita para evitar aplicar esas fórmulas fuera de su supuesto. El script MATLAB heredado es una referencia lineal V2: no reproduce las mejoras de integración de áreas y eventos de V3. Para los resultados V4, usa **Datos MATLAB** o **Campo CSV**.

El modelo supone terreno plano, acuífero homogéneo, conductividad isotrópica y flujo horizontal. Ríos de nivel prescrito y drenes ideales; la recarga neta entra directamente en el acuífero. No calcula flujo vertical, tiempo de infiltración en suelo no saturado, evapotranspiración explícita, transporte de contaminantes ni resistencia hidráulica de pozos o lechos de río. Los ejemplos son didácticos; no hay calibración con mediciones de campo.

Referencia del principio T = K × espesor saturado: [USGS — Block-Centered Flow Package](https://water.usgs.gov/ogw/modflow/MODFLOW-2005-Guide/bcf.htm).

## Conexión y compatibilidad

La vista 3D, el motor, el mapa, el perfil y las exportaciones del simulador están incluidos localmente. Si Plotly no está disponible, el simulador usa un gráfico temporal básico en canvas. Las gráficas avanzadas y la página original **index.html** requieren conexión para cargar Plotly desde su CDN. Las fuentes externas son opcionales; existe una alternativa del sistema.

Probado en navegador con WebGL. Se recomienda Chrome o Edge reciente. Mallas muy finas, conductividades altas u horizontes largos pueden requerir bastante tiempo porque el método es explícito. El máximo es 40 000 nodos.

## Verificación realizada

23 comprobaciones automáticas: recarga uniforme en dominio cerrado, área exacta de poza, bombeo con fechas fraccionarias, secado y extracción no satisfecha, bordes con crecida, drenes, celdas no cuadradas, solución analítica de montículo en los dos modelos, lluvia anual estacional, conservación durante redistribución interna, rechazo de parámetros inválidos y los ocho problemas originales. Resultado en **VERIFICACION.json**; pruebas reproducibles en **tests/verify-engine.cjs** con Node.js.

En V3 se revisaron también en el navegador el cambio de modelo, cálculo completo, visualización, reinicio, reproducción/pausa, perfil y disposición de escritorio y pantalla estrecha. La revisión visual de los controles nuevos de V4 quedó pendiente porque el navegador no pudo conectarse a la vista previa local.

## Verificación del solucionador V4

11 comprobaciones adicionales en **VERIFICACION_SOLUCIONADOR.json** y **tests/verify-advisor.cjs**: conservación de parámetros, escenario ya seguro, ausencia de objetivos, riesgo inicial, cancelación, criterios de pozos y excavación, cambios de caudal y orden de propuestas. Los problemas 1, 2 y 7 se calcularon en modo libre durante su horizonte completo: sus mejores alternativas reducen los criterios pendientes de 5, 3 y 2, respectivamente, a 0.

11 pruebas de integración adicionales en **VERIFICACION_CONTROLES.json** y **tests/verify-advisor-ui.cjs**: mostrar propuestas, aplicar/deshacer, exportar JSON, descartar resultados al editar, cancelar, escenario seguro, respuestas numéricas, worker, presencia de controles, actualización conjunta de respuestas y vistas, y rechazo de resultados obsoletos. Se usa un DOM de prueba para los controles y el motor real para verificar el worker.

## Integración web en CÁLCULO_MATRICIAL

Esta copia web carga las bibliotecas Three.js, OrbitControls, MathJax, jsPDF y html2canvas desde jsDelivr con las mismas versiones originales. Requiere conexión al abrirla. El motor, comparador y visualizaciones de cálculo permanecen locales. La entrega V4 original del ZIP es independiente de esta integración.
