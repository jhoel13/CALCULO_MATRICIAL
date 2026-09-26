(()=>{
const F=(key,label,value,help='',min=0,max)=>({key,label,value,help,min,max});
const s=(title,math,note='')=>({title,math,note});
const n=x=>Number(x.toFixed(5));
const bar=(pairs,unit='')=>window.GeoCharts.bar(pairs,unit);

window.GEOLAB_CALCS=[
 {id:'phases',chapter:1,title:'Relaciones de fases',desc:'A partir de volúmenes y pesos medidos calcula e, n, w, saturación y peso unitario natural.',fields:[F('vs','Volumen de sólidos Vs (m³)',.65,'Volumen de partículas',.000001),F('vw','Volumen de agua Vw (m³)',.22,'Agua en poros'),F('va','Volumen de aire Va (m³)',.13,'Aire en poros'),F('ws','Peso de sólidos Ws (kN)',17,'Peso de partículas',.000001),F('ww','Peso de agua Ww (kN)',2.16,'Peso de agua')],solve:v=>{const vv=v.vw+v.va,V=v.vs+vv;if(vv<=0)throw Error('El volumen de vacíos debe ser mayor que cero.');const e=vv/v.vs,nv=vv/V,w=v.ww/v.ws,S=v.vw/vv,g=(v.ws+v.ww)/V;if(S>1)throw Error('El volumen de agua no puede superar el volumen de vacíos.');return {label:'Peso unitario natural γ',value:g,unit:'kN/m³',steps:[s('Suma de fases',String.raw`V_v=V_w+V_a=${v.vw}+${v.va}=${n(vv)}\;m^3;\quad V=V_s+V_v=${n(V)}\;m^3`),s('Relación de vacíos',String.raw`e=V_v/V_s=${n(vv)}/${v.vs}=${n(e)}`),s('Porosidad',String.raw`n=V_v/V=${n(vv)}/${n(V)}=${n(nv)}=${n(nv*100)}\%`),s('Contenido de agua',String.raw`w=W_w/W_s=${v.ww}/${v.ws}=${n(w)}=${n(w*100)}\%`),s('Grado de saturación',String.raw`S_r=V_w/V_v=${v.vw}/${n(vv)}=${n(S)}=${n(S*100)}\%`),s('Peso unitario natural',String.raw`\gamma=(W_s+W_w)/V=(${v.ws}+${v.ww})/${n(V)}=${n(g)}\;kN/m^3`)],chart:window.GeoCharts.phases([['Sólidos',v.vs],['Agua',v.vw],['Aire',v.va]],'m³'),chartLabel:'Volúmenes de las fases',note:'Se desprecia el peso del aire. Entradas en m³ y kN, resultado en kN/m³.'}}}
];
window.GEOLAB_HELPERS={F,s,n,bar};
})();
