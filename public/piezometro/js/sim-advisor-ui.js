(function(root){
  'use strict';
  const $=id=>document.getElementById(id),clone=o=>JSON.parse(JSON.stringify(o));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=(v,d=2)=>Number.isFinite(v)?new Intl.NumberFormat('es-PE',{maximumFractionDigits:d}).format(v):'—';
  const kind={casa:'Casa',pozo:'Pozo: fondo',abatimiento:'Pozo: límite',fosa:'Excavación',caudal:'Bombeo'};
  function rowTable(summary) {
    return `<div class="table-wrap"><table class="data"><thead><tr><th>Elemento / criterio</th><th>Resultado</th><th>Objetivo</th><th>Evaluación</th></tr></thead><tbody>${summary.rows.map(r=>`<tr><td><b>${esc(r.name)}</b><small class="advisor-small">${kind[r.kind]} · ${esc(r.criterion)}</small></td><td>${n(r.value)} ${r.unit}</td><td>${r.kind==='caudal'?'=':r.kind==='abatimiento'||r.kind==='pozo'?'≤':'≥'} ${n(r.required)} ${r.unit}</td><td><span class="pill ${r.violation>1e-6?'bad':'ok'}">${r.violation>1e-6?'Pendiente':'Cumple'}</span>${r.when!==null?`<small class="advisor-small">${r.kind==='fosa'?'Primer secado':'Umbral'}: día ${n(r.when,1)}</small>`:''}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function numericalAnswers(sim,cfg,problem){
    const s=root.SimAdvisor.summarize(sim),g=sim.g;
    let lo=Infinity,hi=-Infinity;for(const v of sim.h){lo=Math.min(lo,v);hi=Math.max(hi,v);}
    const houses=Object.values(sim.mon.casa),wells=Object.values(sim.mon.pozo),river=cfg.elements.find(e=>e.type==='rio'&&e.flood?.on);
    const detail=river?`<p>El pico del río ocurre el día ${n(river.flood.tStart+river.flood.rise,1)}. La respuesta calculada en cada casa es:</p><div class="table-wrap"><table class="data"><thead><tr><th>Casa</th><th>Ascenso máximo</th><th>Día del pico</th><th>Retraso</th></tr></thead><tbody>${houses.map(m=>`<tr><td>${esc(m.el.name)}</td><td>${n(m.maxH-g.h0)} m</td><td>${n(m.tMax,1)}</td><td>${n(m.tMax-river.flood.tStart-river.flood.rise,1)} d</td></tr>`).join('')}</tbody></table></div>`:
      wells.length?`<p>Abatimientos máximos calculados: ${wells.map(m=>`${esc(m.el.name)}: <b>${n(m.sMax)} m</b>${m.tLimit!==null?' (supera el límite el día '+n(m.tLimit,1)+')':''}`).join('; ')}.</p><p>Las soluciones de Theis y las fórmulas con T constante son referencias del modelo lineal. Estos valores proceden del cálculo con espesor variable.</p>`:
      `<p>Al final, la carga hidráulica varía de <b>${n(lo)} a ${n(hi)} m</b>. Las profundidades bajo el terreno van de ${n(g.zg-hi)} a ${n(g.zg-lo)} m. Son valores al horizonte simulado; no se identifican automáticamente con un estado estacionario.</p>`;
    const drainDetail=cfg.elements.some(e=>e.type==='dren')?`<p>Los drenes captan <b>${n(sim.series.drain.at(-1),1)} m³/día</b> al final del horizonte y <b>${n(sim.budget.drain,0)} m³</b> acumulados durante ${n(cfg.tEnd,0)} días. Son drenes ideales; ese caudal debe evacuarse.</p>`:'';
    return problem.questions.map((_,i)=>i===0?`<p>Evaluación numérica de ${n(cfg.tEnd,0)} días desde el estado inicial:</p>${s.rows.length?rowTable(s):'<p>Añade casas, pozos o una excavación para definir los criterios.</p>'}`:i===1?detail+drainDetail:`<p>Use <b>Solucionar</b> para comparar medidas con este mismo modelo, malla y horizonte. Se muestran los cambios de cada alternativa, los criterios pendientes y los resultados antes/después; la propuesta puede aplicarse y deshacerse.</p>`);
  }
  function create(api){
    let job=null,result=null,selected=null,applied=false,ownChange=false;
    const key=cfg=>JSON.stringify(cfg);
    function cancel(){if(job){job.controller.abort();job.worker?.terminate();job.reject?.(Object.assign(new Error('Análisis cancelado.'),{name:'AbortError'}));job=null;}$('advisor-progress').hidden=true;$('btn-advisor').disabled=false;}
    function invalidate(){
      if(ownChange)return;
      if(job){cancel();$('advisor-status').textContent='Los datos cambiaron. Vuelve a pulsar Solucionar.';}
      if(result&&key(api.getState().cfg)!==key(result.baseline.cfg)&&key(api.getState().cfg)!==key(selected?.cfg)){
        result=null;selected=null;applied=false;$('advisor-results').hidden=true;$('btn-advisor-undo').hidden=true;
        $('advisor-status').textContent='La comparación anterior se descartó porque cambiaron los datos.';
      }
    }
    function progress(p){
      $('advisor-bar').style.width=Math.min(100,p.fraction*100)+'%';
      $('advisor-phase').textContent=`${p.title} · ${Math.round(p.fraction*100)} %`;
    }
    async function calculate(cfg,current){
      if(location.protocol!=='file:'&&root.Worker){
        try{return await new Promise((resolve,reject)=>{
          const worker=new Worker('js/sim-advisor-worker.js?v=4.0');current.worker=worker;current.reject=reject;
          worker.onmessage=({data})=>{if(data.type==='progress')progress(data.progress);else if(data.type==='result'){worker.terminate();current.worker=null;resolve(data.result);}else if(data.type==='error'){worker.terminate();reject(new Error(data.message));}};
          worker.onerror=()=>{worker.terminate();current.worker=null;reject(Object.assign(new Error('worker unavailable'),{fallback:true}));};worker.postMessage({cfg});
        });}catch(e){if(!e.fallback)throw e;}
      }
      return root.SimAdvisor.analyze(cfg,{signal:current.controller.signal,onProgress:progress});
    }
    function metrics(summary){return `<div class="advisor-stats"><span><b>${summary.violations}</b>Criterios pendientes</span><span><b>${summary.critical}</b>Umbrales críticos</span><span><b>${n(summary.budget.pumping-summary.budget.unmet,0)} m³</b>Bombeo efectivo</span><span><b>${n(summary.budget.drain,0)} m³</b>Captado por drenes</span></div>`;}
    function renderSelected(){
      if(!result||!selected)return;
      const base=result.baseline.summary,s=selected.summary;
      $('advisor-choice').innerHTML=`<div class="advisor-choice-head"><div><span class="pill ${s.feasible?'ok':'warn'}">${s.feasible?'Cumple en el horizonte':'Quedan criterios pendientes'}</span><h3>${esc(selected.title)}</h3></div><span class="advisor-model">${api.getState().cfg.model==='unconfined'?'Acuífero libre':'Modelo lineal'} · ${n(s.t,0)} días · misma malla</span></div><p>${esc(selected.id===result.best.id?result.reason:s.feasible?'Esta alternativa cumple los criterios de la simulación.':'Revisa los criterios pendientes antes de aplicar esta alternativa.')}</p>${selected.changes.length?`<ul>${selected.changes.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`:'<p>Se conservan los parámetros actuales.</p>'}<div class="advisor-before-after"><section><h4>Antes · escenario actual</h4>${metrics(base)}</section><section><h4>Después · alternativa seleccionada</h4>${metrics(s)}</section></div>${rowTable(s)}<p class="hint">Se evalúa desde el día 0 hasta el horizonte completo. Casas: peor profundidad, con 0,50 m de margen sobre la cimentación. Pozos: peor abatimiento y al menos 1 m sobre el fondo. Excavaciones: secado al final del horizonte. No se evalúan coste, demanda mínima de abastecimiento ni capacidad real de drenes ideales.</p>`;
      $('btn-advisor-apply').disabled=selected.id==='baseline';
      $('btn-advisor-apply').textContent=applied?'Aplicar esta alternativa y simular':'Aplicar propuesta y simular';
      $('btn-advisor-download').disabled=selected.id==='baseline';
    }
    function render(){
      const variants=[result.baseline,...result.alternatives];
      $('advisor-results').hidden=false;
      $('advisor-comparison').innerHTML=`<p class="step-tag">${variants.length} escenarios calculados</p><h3>Compara las alternativas</h3><p>Se prioriza cumplir los criterios; después, menos criterios pendientes, menor incumplimiento y menor intensidad de cambios. No es una optimización global.</p><div class="table-wrap"><table class="data"><thead><tr><th>Alternativa</th><th>Pendientes</th><th>Evaluación</th><th></th></tr></thead><tbody>${variants.map(v=>`<tr class="${v.id===result.best.id?'advisor-recommended':''}"><td><b>${esc(v.title)}</b>${v.id===result.best.id?'<small class="advisor-small">Mejor alternativa ensayada</small>':''}</td><td>${v.summary.violations}</td><td><span class="pill ${v.summary.feasible?'ok':'warn'}">${v.summary.feasible?'Cumple':'Pendiente'}</span></td><td><button type="button" class="btn btn-small" data-advice="${esc(v.id)}">Ver</button></td></tr>`).join('')}</tbody></table></div>`;
      renderSelected();
    }
    async function start(){
      cancel();api.stop();const cfg=clone(api.getState().cfg),current={controller:new AbortController(),worker:null};job=current;
      $('advisor-results').hidden=true;$('advisor-progress').hidden=false;$('btn-advisor').disabled=true;
      $('advisor-status').textContent='Calculando desde el estado inicial. Puedes cancelar o continuar explorando la vista.';
      progress({fraction:0,title:'Preparando el análisis'});
      try{
        const value=await calculate(cfg,current);
        if(job!==current||current.controller.signal.aborted||key(cfg)!==key(api.getState().cfg))return;
        result=value;selected=value.best;applied=false;$('btn-advisor-undo').hidden=true;render();
        $('advisor-status').textContent=value.reason;
      }catch(e){if(job===current)$('advisor-status').textContent=e.name==='AbortError'?'Análisis cancelado.':'No se pudo comparar: '+e.message;}
      finally{if(job===current){job=null;$('advisor-progress').hidden=true;$('btn-advisor').disabled=false;}}
    }
    $('btn-advisor').addEventListener('click',start);
    $('btn-advisor-cancel').addEventListener('click',()=>{cancel();$('advisor-status').textContent='Análisis cancelado. El escenario se conserva.';});
    $('advisor-comparison').addEventListener('click',e=>{const b=e.target.closest('[data-advice]');if(!b||!result)return;selected=[result.baseline,...result.alternatives].find(v=>v.id===b.dataset.advice);renderSelected();});
    $('btn-advisor-apply').addEventListener('click',()=>{
      if(!selected||selected.id==='baseline')return;ownChange=true;
      try{api.applyConfig(clone(selected.cfg),true);applied=true;$('btn-advisor-undo').hidden=false;$('advisor-status').textContent='Propuesta aplicada. La animación muestra la evolución desde el día 0.';renderSelected();}
      finally{ownChange=false;}
    });
    $('btn-advisor-undo').addEventListener('click',()=>{if(!result)return;ownChange=true;try{api.applyConfig(clone(result.baseline.cfg),false);applied=false;$('btn-advisor-undo').hidden=true;$('advisor-status').textContent='Escenario original restaurado desde el día 0.';renderSelected();}finally{ownChange=false;}});
    $('btn-advisor-download').addEventListener('click',()=>{if(selected&&selected.id!=='baseline')api.download('propuesta_piezometro_v4.json',JSON.stringify(selected.cfg,null,2),'application/json');});
    return {invalidate,cancel,start,getReport:()=>result?{baseline:result.baseline.summary,choice:selected,reason:result.reason}:null};
  }
  root.SimAdvisorUI={create,numericalAnswers};
})(window);
