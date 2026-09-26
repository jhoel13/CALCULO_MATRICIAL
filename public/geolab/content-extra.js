(()=>{
const C=window.GEOLAB_CHAPTERS;
const T=(title,body,formula,note='',tag='TEORÍA')=>({title,body,formula,note,tag});
C[1].topics=[
 T('Plasticidad y estados de consistencia','El suelo fino cambia de comportamiento con el contenido de agua. Los límites líquido, plástico y de contracción separan estados convencionales.',String.raw`w_L>w_P>w_S`,'Se determinan mediante ensayos normalizados.'),
 T('Índice plástico','La amplitud del intervalo plástico permite describir la plasticidad de la fracción fina.',String.raw`I_P=w_L-w_P`),
 T('Curva de fluidez','La relación aproximada entre humedad y número de golpes es lineal en escala semilogarítmica. La humedad a 25 golpes define el límite líquido en el método de Casagrande.',String.raw`w=-I_F\log_{10}(N)+C`),
 T('Índices de liquidez y consistencia','Sitúan la humedad natural respecto de los límites de plasticidad; valores fuera del intervalo 0–1 son posibles y tienen interpretación física.',String.raw`I_L=(w-w_P)/I_P,\quad I_C=(w_L-w)/I_P`),
 T('Tenacidad','El índice de tenacidad relaciona plasticidad y pendiente de la curva de fluidez.',String.raw`I_T=I_P/I_F`),
 T('Límite de contracción','Es la humedad bajo la cual el volumen deja de disminuir apreciablemente al secarse. Puede calcularse con masas y volúmenes de una probeta.',String.raw`w_S=\frac{(M_h-M_s)-\rho_w(V_h-V_s)}{M_s}\times100`,'M y V deben estar en unidades consistentes; ρw≈1 g/cm³.')
];
C[2].topics=[
 T('AASHTO (AASHO)','Separa materiales granulares cuando pasa 35 % o menos por tamiz Nº 200 y materiales limoarcillosos cuando pasa más de 35 %. Usa granulometría y límites de Atterberg.',String.raw`F=P_{200}`),
 T('Índice de grupo','La clasificación vial añade un índice empírico no negativo, redondeado al entero más cercano.',String.raw`IG=(F-35)[0.2+0.005(w_L-40)]+0.01(F-15)(I_P-10)`,'Cada término negativo se toma como cero y se aplican límites a sus variables.'),
 T('SUCS: fracción gruesa y fina','Más del 50 % retenido en Nº 200: suelo grueso (G o S); 50 % o más pasando: suelo fino (M, C u orgánico según ensayos).',String.raw`P_{200}<50\%\Rightarrow\text{suelo grueso}`),
 T('Carta de plasticidad','La línea A separa, en general, limos debajo de la línea y arcillas encima. LL=50 % divide baja y alta plasticidad.',String.raw`I_{P,A}=0.73(w_L-20)`,'La identificación orgánica requiere pruebas adicionales.'),
 T('Gradación de arenas y gravas','El coeficiente de uniformidad y curvatura se calculan con D10, D30 y D60. La condición de buena gradación depende de si predomina grava o arena.',String.raw`C_u=D_{60}/D_{10},\quad C_c=D_{30}^2/(D_{10}D_{60})`),
 T('Public Roads Administration','La clasificación triangular histórica representa proporciones de arena, limo y arcilla. Su lectura depende de los límites del triángulo empleado.',String.raw`A+L+C=100\%`,'La herramienta muestra una interpretación textural orientativa y el punto ternario; no sustituye la carta original.')
];
C[3].topics=[
 T('Esfuerzo vertical total','Se obtiene sumando el peso unitario de cada estrato por su espesor sobre el punto considerado; las sobrecargas se agregan aparte.',String.raw`\sigma_v=q+\sum_i\gamma_i H_i`),
 T('Presión neutra o intersticial','En condición hidrostática, debajo del nivel freático es el peso unitario del agua por la profundidad bajo ese nivel.',String.raw`u=\gamma_w(z-z_w)`),
 T('Presión efectiva','Es la parte del esfuerzo total transmitida por el esqueleto del suelo y controla gran parte de la deformación y resistencia.',String.raw`\sigma_v^{\prime}=\sigma_v-u`),
 T('Suelo sumergido','Para un estrato completamente saturado bajo el agua, el gradiente de presión efectiva usa el peso unitario sumergido.',String.raw`\gamma^{\prime}=\gamma_{sat}-\gamma_w`,'La succión capilar requiere medición y no se incluye en la calculadora hidrostática.')
];
C[4].topics=[
 T('Boussinesq: carga puntual','Solución para un semiespacio homogéneo, isótropo y elástico sometido a una carga vertical puntual en superficie.',String.raw`\Delta\sigma_z=\frac{3P}{2\pi z^2}\left[1+(r/z)^2\right]^{-5/2}`),
 T('Zona rectangular uniformemente cargada','El incremento de tensión puede obtenerse integrando la solución puntual sobre el área. La herramienta realiza la suma numérica en una malla.',String.raw`\Delta\sigma_z=\int_A\frac{3qz^3}{2\pi(r^2+z^2)^{5/2}}\,dA`,'La precisión depende de la resolución de la malla.'),
 T('Carta de Newmark','Se coloca la planta de la carga a escala y se cuentan las áreas de influencia que cubre; cada área aporta un valor I a la presión vertical.',String.raw`\Delta\sigma_z=q\,n\,I`,'El conteo de áreas se introduce a partir de la carta disponible.'),
 T('Alcance de los modelos','Boussinesq y Newmark estiman incremento de esfuerzo; el esfuerzo efectivo exige considerar también presión de poros.',String.raw`\Delta\sigma_v^{\prime}=\Delta\sigma_v-\Delta u`)
];
C[5].topics=[
 T('Compresibilidad','El coeficiente av relaciona el cambio de vacíos con el incremento de presión; mv lo refiere al volumen inicial.',String.raw`a_v=\Delta e/\Delta\sigma^{\prime},\quad m_v=a_v/(1+e_0)`),
 T('Arcilla normalmente consolidada','El asentamiento primario resulta del cambio de relación de vacíos entre presiones efectivas inicial y final.',String.raw`S_c=\frac{C_cH}{1+e_0}\log_{10}\frac{\sigma_0^{\prime}+\Delta\sigma^{\prime}}{\sigma_0^{\prime}}`),
 T('Arcilla preconsolidada','Si la presión final supera la presión de preconsolidación, el cálculo se divide en recomprensión (Cr) y compresión virgen (Cc).',String.raw`S_c=\frac{H}{1+e_0}\left[C_r\log_{10}\frac{\sigma_p^{\prime}}{\sigma_0^{\prime}}+C_c\log_{10}\frac{\sigma_f^{\prime}}{\sigma_p^{\prime}}\right]`),
 T('Consolidación en el tiempo','El tiempo se relaciona con el factor Tv, el coeficiente cv y la longitud máxima de drenaje Hdr.',String.raw`T_v=c_vt/H_{dr}^2`),
 T('Drenaje simple y doble','En drenaje doble, Hdr=H/2; en drenaje simple, Hdr=H. Este cambio modifica el tiempo estimado por un factor de cuatro.',String.raw`t=T_vH_{dr}^2/c_v`)
];
C[6].topics=[
 T('Plano de esfuerzos y círculo de Mohr','Con los esfuerzos principales se obtienen el esfuerzo normal y cortante en un plano. El radio del círculo es (σ1−σ3)/2.',String.raw`\sigma_n=\frac{\sigma_1+\sigma_3}{2}+\frac{\sigma_1-\sigma_3}{2}\cos2\theta,\quad\tau=\frac{\sigma_1-\sigma_3}{2}\sin2\theta`),
 T('Criterio de Mohr-Coulomb','Para esfuerzos efectivos, la resistencia de corte se aproxima por cohesión efectiva y fricción.',String.raw`\tau_f=c^{\prime}+\sigma_n^{\prime}\tan\phi^{\prime}`),
 T('Suelo no cohesivo','Al tomar c′≈0, la envolvente de falla pasa por el origen. La relación de esfuerzos principales en compresión triaxial se expresa mediante Nφ.',String.raw`\sigma_1^{\prime}/\sigma_3^{\prime}=\tan^2(45^\circ+\phi^{\prime}/2)`),
 T('Suelo cohesivo','La cohesión añade intercepto a la envolvente. En esfuerzos totales de arcilla no drenada suele usarse φu≈0 cuando el ensayo lo respalda.',String.raw`\tau_f=c+\sigma_n\tan\phi`),
 T('Ecuación revisada de Terzaghi','La formulación revisada reconoce que la resistencia de corte depende del esfuerzo efectivo y de la presión intersticial.',String.raw`\tau_f=c^{\prime}+(\sigma_n-u)\tan\phi^{\prime}`)
];
C[7].topics=[
 T('Equilibrio plástico','Al moverse el muro lo suficiente se movilizan los estados activo o pasivo. En Rankine para relleno horizontal, Ka y Kp dependen de φ.',String.raw`K_a=\tan^2(45^\circ-\phi/2),\quad K_p=\tan^2(45^\circ+\phi/2)`),
 T('Rankine: suelo sin cohesión','Para relleno horizontal seco y pared vertical lisa, la presión es triangular y la resultante actúa a H/3 desde la base.',String.raw`P_a=\tfrac12K_a\gamma H^2,\quad P_p=\tfrac12K_p\gamma H^2`),
 T('Rankine: suelo cohesivo','La cohesión reduce la presión activa teórica; aparece una profundidad de grieta de tracción que requiere tratamiento físico separado.',String.raw`\sigma_{h,a}=K_a\gamma z-2c\sqrt{K_a},\quad z_0=2c/(\gamma\sqrt{K_a})`),
 T('Coulomb','La teoría de cuña incorpora rozamiento muro-suelo e inclinaciones. La calculadora aplica una forma definida para muro vertical y trasdós horizontal.',String.raw`P_a=\tfrac12K_{a,C}\gamma H^2`,'No aplicar la fórmula simplificada si cambian la geometría o cargas.'),
 T('Culmann','Método gráfico de cuñas de falla. Se dibujan posibles planos, se calcula el equilibrio de cada cuña y se obtiene el empuje máximo de la curva.',String.raw`P_a=\max_{\text{cuñas}}P(\alpha)`,'La herramienta numérica de Coulomb cubre una geometría simplificada; Culmann se presenta como procedimiento gráfico.')
];
C[8].topics=[
 T('Ley de Darcy','Para flujo laminar en medio poroso, el caudal es proporcional al gradiente hidráulico y al área transversal.',String.raw`Q=k,i,A,\quad i=\Delta h/L`),
 T('Velocidades de flujo','La velocidad de descarga es Q/A; la velocidad media en vacíos se obtiene dividiendo por la porosidad efectiva.',String.raw`v=ki,\quad v_s=v/n_e`),
 T('Velocidad real','La tortuosidad relaciona la longitud real de trayectoria Lm con la longitud recta L.',String.raw`v_r=v_s(L_m/L)`,'La tortuosidad requiere estimación o medición.'),
 T('Permeámetro de carga constante','En muestra de longitud L, área A y diferencia de carga h constante, se deduce k del volumen medido durante t.',String.raw`k=VL/(Aht)`),
 T('Permeámetro de carga variable','La carga desciende de h1 a h2 en un tubo de área a conectado a muestra de área A y longitud L.',String.raw`k=\frac{aL}{At}\ln(h_1/h_2)`),
 T('Estratificación','Para flujo paralelo a las capas se promedian permeabilidades con espesor; para flujo perpendicular se promedian resistencias hidráulicas.',String.raw`k_\parallel=\frac{\sum k_iH_i}{\sum H_i},\quad k_\perp=\frac{\sum H_i}{\sum H_i/k_i}`),
 T('Ascensión capilar','El equilibrio entre tensión superficial y peso del agua explica la altura ideal en un tubo de radio r.',String.raw`h_c=2T\cos\theta/(\rho_wgr)`,'En suelo real, radio de poros y conectividad varían.')
];
C[9].topics=[
 T('Red de flujo','Conjunto de líneas de corriente y equipotenciales aproximadamente ortogonales para flujo bidimensional estacionario.',String.raw`\nabla^2h=0`),
 T('Gasto de filtración','Cada canal de flujo transporta la misma fracción de caudal si la red está formada por cuadros curvilíneos.',String.raw`q=kH(N_f/N_d)`,'Caudal por unidad de ancho perpendicular al plano.'),
 T('Subpresión','La presión del agua bajo una estructura depende de la carga piezométrica local, la elevación y γw.',String.raw`u=\gamma_w(h-z)`),
 T('Sifonaje por levantamiento','El levantamiento del suelo puede iniciar cuando la fuerza de filtración anula aproximadamente el peso sumergido.',String.raw`i_c=(G_s-1)/(1+e),\quad FS=i_c/i_{salida}`),
 T('Tubificación','La erosión interna progresa si el flujo moviliza partículas y no existe un filtro adecuado. El gradiente crítico es solo una primera comprobación.',String.raw`i_{salida}=\Delta h/L`,'Revisar estabilidad de filtros, granulometría y trayectoria del flujo.')
];
C[10].topics=[
 T('Capacidad portante de Terzaghi','Para cimentación corrida bajo carga vertical centrada se suman aportes de cohesión, sobrecarga y peso del terreno.',String.raw`q_{ult}=cN_c+qN_q+\tfrac12\gamma BN_\gamma,\quad q=\gamma D_f`),
 T('Factores de capacidad','Nq y Nc pueden calcularse a partir de φ; Nγ depende de la expresión adoptada. La calculadora declara la variante usada.',String.raw`N_q=e^{\pi\tan\phi}\tan^2(45^\circ+\phi/2),\quad N_c=(N_q-1)\cot\phi`),
 T('Arcilla no drenada','Para φ=0 y zapata corrida, Nc≈5.14, Nq=1 y Nγ=0; la capacidad bruta añade la sobrecarga al nivel de desplante.',String.raw`q_{ult}=5.14c_u+\gamma D_f`),
 T('Suelos sueltos','En materiales granulares sueltos, la carga admisible suele quedar controlada por deformación; la densificación y el nivel freático modifican la respuesta.',String.raw`q_{adm}=\min(q_{capacidad},q_{asentamiento})`),
 T('Asentamiento y presión admisible','La carga admisible debe satisfacer capacidad de carga y asentamiento permitido; se toma el criterio más restrictivo.',String.raw`q_{adm}=\min(q_{ult}/FS,\,q_{asent})`,'El límite por asentamiento exige un análisis geotécnico separado.')
];
C[11].topics=[
 T('Pilote aislado: punta y fuste','La resistencia última axial se descompone en contribución de punta y de rozamiento o adhesión a lo largo del fuste.',String.raw`Q_u=Q_p+Q_s=A_pq_p+\sum A_{s,i}f_{s,i}`),
 T('Suelo cohesivo','Para análisis no drenado idealizado, la punta se modela con Nc cu y el fuste con αcu.',String.raw`Q_p=A_pN_cc_u,\quad Q_s=\alpha c_uA_s`),
 T('Suelo friccionante','Una formulación estática idealizada usa esfuerzo efectivo en la punta y fricción de fuste ligada al esfuerzo medio efectivo.',String.raw`Q_p=A_p\sigma_{v,p}^{\prime}N_q,\quad Q_s=A_sK\sigma_{v,med}^{\prime}\tan\delta`),
 T('Fórmulas dinámicas','El trabajo entregado por un golpe se compara con penetración y pérdidas idealizadas. La fórmula dinámica se usa solo como contraste preliminar.',String.raw`Q_{adm}=\eta Wh/[FS(s+C)]`,'No reemplaza pruebas de carga ni análisis de hinca.'),
 T('Grupo de pilotes','La capacidad del grupo se compara entre suma de pilotes con eficiencia y falla en bloque; controla la menor.',String.raw`Q_{grupo}=\min(\eta_gnQ_{u,1},\,Q_{bloque})`,'Además deben revisarse asentamientos y efectos de interacción.')
];
})();
