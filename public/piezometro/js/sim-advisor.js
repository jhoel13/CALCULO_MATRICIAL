/* Finite, reproducible comparison of mitigation scenarios using the same transient model. */
(function(root){
  'use strict';
  const E=typeof module!=='undefined'&&module.exports?require('./sim-engine.js'):root.SimEngine;
  const clone=o=>JSON.parse(JSON.stringify(o));
  const abort=()=>{const e=new Error('Análisis cancelado.');e.name='AbortError';return e;};
  async function run(cfg,options={}) {
    const sim=new E.Sim(clone(cfg));
    const block=Math.max(1,Math.min(100,Math.floor(200000/sim.g.N)));
    let more=true;
    while(more){
      if(options.signal?.aborted)throw abort();
      const start=performance.now();
      do {more=sim.step(block);} while(more&&performance.now()-start<18);
      options.onProgress?.(sim.t/cfg.tEnd);
      if(more)await new Promise(r=>setTimeout(r,0));
    }
    sim.record(true);return sim;
  }
  function summarize(sim) {
    const g=sim.g,rows=[];
    for(const m of Object.values(sim.mon.casa)) {
      const margin=m.hCrit-m.maxH;
      rows.push({id:m.el.id,name:m.el.name,kind:'casa',value:g.zg-m.maxH,required:m.el.cim+.5,margin,violation:Math.max(0,.5-margin),critical:m.maxH>=m.hCrit-1e-8,when:m.tHit,peakDay:m.tMax,unit:'m',criterion:'Profundidad mínima ≥ cimentación + 0,50 m'});
    }
    for(const m of Object.values(sim.mon.pozo)) {
      if(m.el.limit>0)rows.push({id:m.el.id+'-limit',name:m.el.name,kind:'abatimiento',value:m.sMax,required:m.el.limit,violation:Math.max(0,m.sMax-m.el.limit),critical:m.sMax>m.el.limit+1e-8,when:m.tLimit,unit:'m',criterion:'Abatimiento máximo ≤ límite admisible'});
      const minHead=g.h0-m.sMax,minDepth=g.zg-minHead,bottomDepth=m.el.depth-1;
      if(m.el.depth>0)rows.push({id:m.el.id+'-dry',name:m.el.name,kind:'pozo',value:minDepth,required:bottomDepth,violation:Math.max(0,minDepth-bottomDepth),critical:minDepth>=bottomDepth-1e-8,when:m.tDry,unit:'m',criterion:'Agua al menos 1 m sobre el fondo del pozo'});
    }
    for(const m of Object.values(sim.mon.fosa)) {
      const margin=m.target-m.h;
      rows.push({id:m.el.id,name:m.el.name,kind:'fosa',value:g.zg-m.h,required:m.el.depth+(m.el.margin??.5),margin,violation:Math.max(0,-margin),critical:margin< -1e-8,when:m.tDry,unit:'m',criterion:'Al final: profundidad ≥ fondo + margen de excavación'});
    }
    const unmet=sim.budget.unmet,unmetFraction=unmet/Math.max(1,sim.budget.pumping);
    if(unmetFraction>1e-8)rows.push({id:'unmet',name:'Bombeo solicitado',kind:'caudal',value:unmet,required:0,violation:Math.max(.001,unmetFraction),critical:true,when:null,unit:'m³',criterion:'Volumen de bombeo no satisfecho = 0'});
    const failed=rows.filter(r=>r.violation>1e-6);
    const total=sim.budget.recharge+sim.budget.pumping+Math.abs(sim.budget.boundary)+sim.budget.drain+sim.budget.seep;
    const balanceError=Math.abs(sim.budget.residual)/Math.max(1,total);
    return {rows,violations:failed.length,critical:rows.filter(r=>r.critical).length,severity:failed.reduce((v,r)=>v+r.violation/Math.max(.5,Math.abs(r.required)),0),feasible:failed.length===0&&balanceError<1e-6,targets:rows.length,
      balanceError,steps:sim.n,t:sim.t,budget:clone(sim.budget),events:clone(sim.events)};
  }
  function candidates(cfg) {
    const out=[],keys=new Set([JSON.stringify(cfg)]);
    function add(id,title,c,changes,effort) {
      try{E.validate(c);}catch{return;}
      const key=JSON.stringify(c);if(keys.has(key))return;keys.add(key);
      out.push({id,title,cfg:c,changes,effort});
    }
    const canals=cfg.elements.filter(e=>e.type==='canal'&&e.q>0);
    const basins=cfg.elements.filter(e=>e.type==='poza'&&e.inf>0&&!e.membrane);
    for(const eff of [80,95]) if(canals.some(e=>!e.lined||e.eff<eff)) {
      const c=clone(cfg);const names=[];
      for(const e of c.elements)if(e.type==='canal'&&e.q>0&&(!e.lined||e.eff<eff)){e.lined=true;e.eff=eff;names.push(e.name);}
      add('lining'+eff,'Revestir canales al '+eff+' %',c,names.map(n=>n+': reducir pérdidas mediante revestimiento al '+eff+' %'),names.length+(eff===95?.15:0));
    }
    if(basins.length){const c=clone(cfg);for(const e of c.elements)if(e.type==='poza'&&e.inf>0)e.membrane=true;add('membrane','Impermeabilizar pozas',c,basins.map(e=>e.name+': activar geomembrana (reducción de infiltración del modelo: 99 %)'),basins.length);}
    const controlled=clone(cfg),controlChanges=[];
    for(const e of controlled.elements){if(e.type==='canal'&&e.q>0&&(!e.lined||e.eff<95)){e.lined=true;e.eff=95;controlChanges.push(e.name+': revestimiento al 95 %');}if(e.type==='poza'&&e.inf>0&&!e.membrane){e.membrane=true;controlChanges.push(e.name+': geomembrana');}}
    if(controlChanges.length>1)add('sources','Controlar las fuentes de infiltración',controlled,controlChanges,controlChanges.length+.25);
    const pumps=cfg.elements.filter(e=>e.type==='pozo'&&e.Q>0);
    if(pumps.length) {
      const excavation=cfg.elements.some(e=>e.type==='fosa');
      for(const factor of (excavation?[1.25,1.5,2]:[.75,.5,.25])) {
        const c=clone(cfg);for(const e of c.elements)if(e.type==='pozo'&&e.Q>0)e.Q*=factor;
        add('pump'+factor,(excavation?'Aumentar bombeo de abatimiento':'Regular bombeo')+' al '+Math.round(factor*100)+' %',c,pumps.map(e=>e.name+': '+e.Q.toFixed(1)+' → '+(e.Q*factor).toFixed(1)+' m³/día'),Math.abs(1-factor)*pumps.length+.2);
      }
    }
    const protectedEls=cfg.elements.filter(e=>e.type==='casa'||e.type==='fosa');
    if(protectedEls.length){
      const xs=protectedEls.map(e=>e.type==='casa'?e.x:(e.x1+e.x2)/2),ys=protectedEls.map(e=>e.type==='casa'?e.y:(e.y1+e.y2)/2);
      const mx=xs.reduce((a,b)=>a+b)/xs.length,my=ys.reduce((a,b)=>a+b)/ys.length;
      const sources=cfg.elements.filter(e=>e.type==='canal'||e.type==='rio'||e.type==='poza');
      let nearest=null,dist=Infinity;
      for(const e of sources){const x=(e.x1+e.x2)/2,y=(e.y1+e.y2)/2,d=Math.hypot(x-mx,y-my);if(d<dist){dist=d;nearest={x,y};}}
      const vertical=!nearest||Math.abs(nearest.x-mx)>=Math.abs(nearest.y-my);
      const positions=vertical?xs:ys,span=vertical?cfg.Lx:cfg.Ly;
      const sourcePos=nearest?(vertical?nearest.x:nearest.y):0,center=vertical?mx:my;
      const before=sourcePos<=center?Math.min(...positions)-2*cfg.dx:Math.max(...positions)+2*cfg.dx;
      const after=sourcePos<=center?Math.max(...positions)+2*cfg.dx:Math.min(...positions)-2*cfg.dx;
      const clip=v=>Math.max(cfg.dx,Math.min(span-cfg.dx,v));
      const depth=Math.min(cfg.b+cfg.depth0-.5,Math.max(...protectedEls.map(e=>e.type==='casa'?e.cim+1:e.depth+(e.margin??.5)+.5)));
      const makeDrains=(two)=>{
        const list=[];
        for(const [i,p] of (two?[before,after]:[before]).entries()) {
          const d={type:'dren',id:'advisor-dren-'+i,name:'Dren propuesto '+(i+1),depth};
          while(cfg.elements.some(e=>e.id===d.id))d.id+='-nuevo';
          if(vertical)Object.assign(d,{x1:clip(p),x2:clip(p),y1:0,y2:cfg.Ly});else Object.assign(d,{x1:0,x2:cfg.Lx,y1:clip(p),y2:clip(p)});
          if(!list.some(e=>e.x1===d.x1&&e.y1===d.y1&&e.x2===d.x2&&e.y2===d.y2))list.push(d);
        }
        return list;
      };
      for(const two of [false,true]){const c=clone(cfg),drains=makeDrains(two);c.elements.push(...drains);add(two?'double-drain':'drain',two?'Drenaje a ambos lados':'Dren de intercepción',c,drains.map(d=>d.name+': profundidad '+depth.toFixed(2)+' m, longitud '+Math.hypot(d.x2-d.x1,d.y2-d.y1).toFixed(0)+' m; dren ideal'),drains.length+1.5);}
      if(controlChanges.length){const c=clone(controlled),drains=makeDrains(false);c.elements.push(...drains);add('combined','Control de infiltración y dren',c,[...controlChanges,...drains.map(d=>d.name+': '+depth.toFixed(2)+' m de profundidad; dren ideal')],controlChanges.length+3);}
    }
    return out;
  }
  function compare(a,b){
    return Number(b.summary.feasible)-Number(a.summary.feasible)||a.summary.violations-b.summary.violations||a.summary.severity-b.summary.severity||a.effort-b.effort;
  }
  async function analyze(cfg,options={}) {
    E.validate(cfg);const source=clone(cfg),variants=candidates(source);
    options.onProgress?.({fraction:0,title:'Analizando el escenario actual',index:0,total:variants.length+1});
    const baseSim=await run(source,{signal:options.signal,onProgress:p=>options.onProgress?.({fraction:p/(variants.length+1),title:'Escenario actual',index:0,total:variants.length+1})});
    const baseline={id:'baseline',title:'Escenario actual',cfg:source,changes:[],effort:0,summary:summarize(baseSim)};
    if(baseline.summary.feasible||!baseline.summary.targets){options.onProgress?.({fraction:1,title:'Análisis completo',index:1,total:1});return {baseline,alternatives:[],best:baseline,reason:baseline.summary.targets?'Los criterios ya se cumplen durante el horizonte; no se propone una intervención innecesaria.':'Añade casas, pozos o una excavación para definir qué se quiere proteger.'};}
    const alternatives=[];
    for(let i=0;i<variants.length;i++){
      if(options.signal?.aborted)throw abort();
      const v=variants[i],sim=await run(v.cfg,{signal:options.signal,onProgress:p=>options.onProgress?.({fraction:(i+1+p)/(variants.length+1),title:v.title,index:i+1,total:variants.length+1})});
      alternatives.push({...v,summary:summarize(sim)});
    }
    const ranked=[baseline,...alternatives].sort(compare),best=ranked[0];
    options.onProgress?.({fraction:1,title:'Comparación completa',index:variants.length+1,total:variants.length+1});
    return {baseline,alternatives,best,reason:best.summary.feasible?'Esta alternativa cumple los criterios en la simulación del horizonte analizado.':best.id==='baseline'?'Ninguna alternativa ensayada mejora los criterios del escenario actual.':'Esta alternativa reduce los riesgos, pero quedan criterios sin cumplir. No se presenta como una solución completa.'};
  }
  const api={run,summarize,candidates,compare,analyze};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SimAdvisor=api;
})(typeof window!=='undefined'?window:globalThis);
