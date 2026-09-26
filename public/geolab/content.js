window.GEOLAB_CHAPTERS=[
  {id:1,short:'Relaciones volumétricas',title:'Relaciones volumétricas y gravimétricas',lead:'Examina las tres fases del suelo y calcula sus relaciones fundamentales.',topics:[]},
  {id:2,short:'Plasticidad',title:'Plasticidad de suelos',lead:'Interpreta límites de Atterberg, fluidez, tenacidad y contracción.',topics:[]},
  {id:3,short:'Clasificación',title:'Clasificación de suelos',lead:'Clasifica muestras con AASHTO, SUCS y el esquema triangular histórico.',topics:[]},
  {id:4,short:'Presiones en el suelo',title:'Presión efectiva y presión neutra',lead:'Construye el estado de esfuerzos verticales y la presión intersticial.',topics:[]},
  {id:5,short:'Cargas verticales',title:'Presiones bajo zonas cargadas',lead:'Estima incrementos de tensión con Boussinesq y Newmark.',topics:[]},
  {id:6,short:'Asentamientos',title:'Asentamientos y consolidación',lead:'Evalúa compresibilidad, asentamiento y tiempo de consolidación.',topics:[]},
  {id:7,short:'Resistencia al corte',title:'Resistencia al esfuerzo cortante',lead:'Relaciona esfuerzos principales y resistencia de Mohr-Coulomb.',topics:[]},
  {id:8,short:'Empuje de tierras',title:'Empuje de tierras contra muros',lead:'Calcula los estados activo y pasivo con Rankine y Coulomb.',topics:[]},
  {id:9,short:'Permeabilidad',title:'Permeabilidad de los suelos',lead:'Analiza el flujo de agua con Darcy y ensayos de permeámetro.',topics:[]},
  {id:10,short:'Red de flujo',title:'Redes de flujo y filtración',lead:'Estima caudal, subpresión y riesgo de sifonaje.',topics:[]},
  {id:11,short:'Cimentaciones superficiales',title:'Capacidad de carga superficial',lead:'Calcula capacidad portante y carga admisible para zapatas.',topics:[]},
  {id:12,short:'Cimentaciones profundas',title:'Capacidad de carga de pilotes',lead:'Evalúa punta, fuste, fórmulas dinámicas y grupos de pilotes.',topics:[]}
];
window.GEOLAB_SOURCES=[
  {title:'Mecánica de suelos y cimentaciones',author:'Ángel R. Huanca Borda',note:'Estructura de los doce capítulos y fórmulas principales del temario. Documento de 176 páginas.'},
  {title:'Mecánica de suelos',author:'Peter L. Berry y David Reid',note:'Ejemplo 1.3 de relaciones de fases (página impresa 33) adaptado como calculadora. La copia proporcionada está principalmente escaneada.'},
  {title:'Mecánica de suelos, tomo I',author:'Eulalio Juárez Badillo y Alfonso Rico Rodríguez',note:'Consulta sobre granulometría y análisis mecánico (página impresa 102). La copia proporcionada está principalmente escaneada.'},
  {title:'Mecánica de suelos',author:'Ataranxial NC / Edicions UPC',note:'Consulta complementaria para filtración, tensiones y cimentaciones.'},
  {title:'Métodos de diseño y análisis de seguridad empleados en ingeniería civil',author:'Monografía proporcionada',note:'Contexto para el factor de seguridad y los límites de los métodos deterministas.'}
];
window.GEOLAB_CHAPTERS[0].topics=[
  {title:'Esquema de tres fases',body:'La muestra se compone de sólidos, agua y aire. Su volumen total es la suma de esas tres fases; el peso del aire se desprecia.',formula:String.raw`V=V_s+V_w+V_a,\quad W=W_s+W_w`,diagram:'<svg viewBox="0 0 410 116" role="img" aria-label="Diagrama de las tres fases del suelo"><rect x="15" y="10" width="190" height="28" rx="5" fill="#d8eaf0"/><rect x="15" y="42" width="190" height="28" rx="5" fill="#78cbbb"/><rect x="15" y="74" width="190" height="28" rx="5" fill="#244960"/><text x="30" y="29" fill="#244960" font-size="14">Aire · Va</text><text x="30" y="61" fill="#173b4d" font-size="14">Agua · Vw · Ww</text><text x="30" y="93" fill="white" font-size="14">Sólidos · Vs · Ws</text><text x="230" y="29" fill="#516c7a" font-size="14">Vacíos: Va + Vw</text><text x="230" y="61" fill="#516c7a" font-size="14">Volumen: V total</text><text x="230" y="93" fill="#516c7a" font-size="14">Peso: Ws + Ww</text></svg>'},
  {title:'Relación de vacíos y porosidad',body:'La relación de vacíos compara el volumen de huecos con los sólidos; la porosidad lo compara con el volumen total.',formula:String.raw`e=V_v/V_s,\quad n=e/(1+e)`},
  {title:'Agua y saturación',body:'El contenido de agua es la razón entre peso de agua y peso de sólidos. El grado de saturación compara volumen de agua y volumen de vacíos.',formula:String.raw`w=W_w/W_s,\quad S_r=V_w/V_v`},
  {title:'Saturación parcial',body:'En suelos parcialmente saturados, el agua ocupa solo una fracción de los vacíos; estas dos relaciones permiten pasar entre humedad, saturación y peso unitario.',formula:String.raw`w=S_re/G_s,\quad\gamma=\gamma_w(G_s+S_re)/(1+e)`},
  {title:'Pesos unitarios',body:'El peso unitario seco usa solamente el peso de sólidos. En estado saturado todos los vacíos están llenos de agua; bajo agua se descuenta el empuje.',formula:String.raw`\gamma_d=G_s\gamma_w/(1+e),\quad\gamma_{sat}=(G_s+e)\gamma_w/(1+e),\quad\gamma^{\prime}=\gamma_{sat}-\gamma_w`},
  {title:'Densidad relativa',body:'Para arenas, compara el estado de vacíos actual con los estados de mayor y menor compacidad medidos en ensayo.',formula:String.raw`D_r=(e_{max}-e)/(e_{max}-e_{min})`,note:'La densidad relativa no sustituye ensayos de resistencia o deformación.'}
];
