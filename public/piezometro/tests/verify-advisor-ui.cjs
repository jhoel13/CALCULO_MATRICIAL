const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const E=require('../js/sim-engine.js'),A=require('../js/sim-advisor.js');
const read=f=>fs.readFileSync(path.join(__dirname,'../',f),'utf8');
const copy=o=>JSON.parse(JSON.stringify(o));
const cfg={K:2,S:.2,b:10,depth0:3,Lx:100,Ly:80,dx:10,tEnd:5,rain:{R:0,seasonal:false},bc:{west:'fijo',east:'fijo',south:'impermeable',north:'impermeable'},elements:[{type:'casa',id:'c',name:'Casa <1>',x:50,y:40,cim:2}],model:'unconfined'};
class Element {
  constructor(){this.hidden=false;this.disabled=false;this.style={};this.listeners={};this.textContent='';this.innerHTML='';}
  addEventListener(k,fn){this.listeners[k]=fn;}
  async fire(k,event={}){return this.listeners[k]?.(event);}
}
const nodes={},document={getElementById:id=>nodes[id]??(nodes[id]=new Element())};
const window={SimAdvisor:A};
vm.runInNewContext(read('js/sim-advisor-ui.js'),{window,document,location:{protocol:'file:'},AbortController,Intl,console});
const checks=[];
async function check(name,fn){await fn();checks.push({check:name,status:'PASS'});console.log('PASS '+name);}
(async()=>{
  const summary=A.summarize(await A.run(cfg));
  const proposal=copy(cfg);proposal.elements.push({type:'dren',id:'d',name:'Dren',x1:30,y1:0,x2:30,y2:80,depth:3});
  const fixture={baseline:{id:'baseline',title:'Actual',cfg:copy(cfg),changes:[],summary},alternatives:[{id:'drain',title:'Propuesta',cfg:proposal,changes:['Dren ideal'],summary}],reason:'Comparación de prueba'};fixture.best=fixture.alternatives[0];
  const state={cfg:copy(cfg)},calls=[],downloads=[];
  window.SimAdvisor={...A,analyze:async()=>copy(fixture)};
  let ui;
  ui=window.SimAdvisorUI.create({getState:()=>state,stop:()=>{},download:(...args)=>downloads.push(args),applyConfig:(c,animate)=>{calls.push(animate);state.cfg=c;ui.invalidate();}});
  await check('results show comparison, goals and escaped element names',async()=>{await ui.start();assert.equal(nodes['advisor-results'].hidden,false);assert.match(nodes['advisor-comparison'].innerHTML,/Mejor alternativa ensayada/);assert.match(nodes['advisor-choice'].innerHTML,/Casa &lt;1&gt;/);assert.equal(nodes['btn-advisor-apply'].disabled,false);});
  await check('applying starts simulation and undo restores original configuration',async()=>{await nodes['btn-advisor-apply'].fire('click');assert.deepEqual(copy(state.cfg),proposal);assert.equal(calls.at(-1),true);assert.equal(nodes['btn-advisor-undo'].hidden,false);assert.ok(ui.getReport());await nodes['btn-advisor-undo'].fire('click');assert.deepEqual(copy(state.cfg),cfg);assert.equal(calls.at(-1),false);assert.equal(nodes['btn-advisor-undo'].hidden,true);});
  await check('proposal download contains the selected scenario',async()=>{await nodes['btn-advisor-download'].fire('click');assert.equal(downloads[0][0],'propuesta_piezometro_v4.json');assert.deepEqual(JSON.parse(downloads[0][1]),proposal);});
  await check('editing discards obsolete results and disables stale application',async()=>{state.cfg.K=4;ui.invalidate();assert.equal(ui.getReport(),null);assert.equal(nodes['advisor-results'].hidden,true);const old=copy(state.cfg);await nodes['btn-advisor-apply'].fire('click');assert.deepEqual(copy(state.cfg),old);});
  await check('cancelling a pending analysis leaves the scenario unchanged',async()=>{window.SimAdvisor.analyze=async(_,options)=>new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('cancel'),{name:'AbortError'})));});const old=copy(state.cfg),pending=ui.start();await nodes['btn-advisor-cancel'].fire('click');await pending;assert.deepEqual(copy(state.cfg),old);assert.equal(nodes['btn-advisor'].disabled,false);assert.equal(nodes['advisor-progress'].hidden,true);assert.match(nodes['advisor-status'].textContent,/cancelado/);});
  await check('safe scenario has no applicable or downloadable intervention',async()=>{state.cfg=copy(cfg);window.SimAdvisor.analyze=A.analyze;await ui.start();assert.equal(nodes['btn-advisor-apply'].disabled,true);assert.equal(nodes['btn-advisor-download'].disabled,true);assert.equal(ui.getReport().choice.id,'baseline');});
  await check('free-aquifer numerical answers include computed goals',async()=>{const answers=window.SimAdvisorUI.numericalAnswers(await A.run(cfg),cfg,{questions:['a','b','c']});assert.match(answers[0],/Casa &lt;1&gt;/);assert.match(answers[0],/Cumple/);assert.match(answers[1],/horizonte simulado/);assert.match(answers[2],/Solucionar/);});
  await check('worker completes actual engine calculation and sends progress',async()=>{
    const messages=[],worker={self:null,performance,setTimeout,clearTimeout,console};worker.self=worker;
    const context=vm.createContext(worker);
    worker.importScripts=(...files)=>files.forEach(f=>vm.runInContext(read('js/'+f.split('?')[0]),context));
    worker.postMessage=data=>messages.push(data);
    vm.runInContext(read('js/sim-advisor-worker.js'),context);
    await worker.onmessage({data:{cfg:copy(cfg)}});
    assert.ok(messages.some(m=>m.type==='progress'));const result=messages.find(m=>m.type==='result');assert.ok(result);assert.equal(result.result.best.summary.t,cfg.tEnd);assert.equal(result.result.best.summary.violations,0);
  });
  await check('page includes all advisor controls and loads scripts before the app',async()=>{const html=read('simulador.html');for(const id of Object.keys(nodes))assert.ok(html.includes('id="'+id+'"'),id);assert.ok(html.indexOf('js/sim-advisor-ui.js')<html.indexOf('js/sim-app.js'));});
  const solveSource=read('js/sim-app.js').split('  function solve() {')[1].split('  /* ------------------------------------------------------------------ */')[0];
  const solveState={cfg:copy(cfg),problem:{questions:['a','b','c']},sim:null,view3d:{update:sim=>assert.equal(sim.t,cfg.tEnd)},steady:{exists:true},steadyStale:true};
  const solveDocument={...document,querySelector:()=>({})};
  const solveContext=vm.createContext({state:solveState,window,document:solveDocument,$:document.getElementById,clone:copy,stop:()=>{},E,performance,fmt:String,fmtg:String,esc:String,viewField:()=>null,drawPlan:()=>{},updateClock:()=>{},renderStatus:()=>{},renderEvents:()=>{},renderChart:()=>{},typeset:()=>{}});
  vm.runInContext('function solve() {'+solveSource+';globalThis.solveTest=solve;',solveContext);
  await check('answer solver updates horizon, answers and transient view together',async()=>{document.getElementById('view').value='steady';await solveContext.solveTest();assert.equal(solveState.sim.t,cfg.tEnd);assert.equal(solveState.solved,true);assert.equal(solveState.steady,null);assert.equal(nodes.view.value,'depth');assert.match(nodes['ans-0'].innerHTML,/Cumple/);assert.equal(nodes['btn-solve'].disabled,false);});
  await check('answer solver rejects obsolete results after parameters change',async()=>{const previous=solveState.sim,pending=solveContext.solveTest();solveState.cfg.K=4;await assert.rejects(pending,/datos cambiaron/);assert.equal(solveState.sim,previous);assert.equal(nodes['btn-solve'].disabled,false);});
  fs.writeFileSync(path.join(__dirname,'../VERIFICACION_CONTROLES.json'),JSON.stringify({checks,note:'Pruebas de integración de controles con DOM de prueba y motor real del worker. No sustituyen una revisión visual en navegador.'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
