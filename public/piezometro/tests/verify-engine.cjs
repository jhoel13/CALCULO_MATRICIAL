const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../js/sim-engine.js');
const base = () => ({K:2,S:.2,b:10,depth0:5,Lx:100,Ly:80,dx:10,tEnd:12.345,rain:{R:365,seasonal:false},bc:{west:'impermeable',east:'impermeable',south:'impermeable',north:'impermeable'},elements:[],seepage:true});
const results=[];
function check(name, fn) {fn();results.push({check:name,status:'PASS'}); console.log('PASS '+name);}
function budget(sim){const b=sim.budget;assert.ok(Math.abs(b.residual)<1e-5*Math.max(1,b.recharge,b.pumping,Math.abs(b.boundary)),JSON.stringify(b));assert.ok(sim.h.every(Number.isFinite));assert.ok(Math.min(...sim.h)>=0);}
for(const model of ['linear','unconfined']) {
  check(model+': closed uniform recharge and exact horizon',()=>{const c=base();c.model=model;const sim=new E.Sim(c).runToEnd();assert.equal(sim.t,c.tEnd);const expected=c.b+c.rain.R/365000*c.tEnd/c.S;for(const v of sim.h)assert.ok(Math.abs(v-expected)<1e-10);budget(sim);});
  check(model+': basin recharge matches exact geometric area',()=>{const c=base();c.model=model;c.rain.R=0;c.elements=[{type:'poza',id:'b',name:'Poza',x1:2,y1:7,x2:43,y2:36,inf:.01}];const g=E.grid(c),src=E.sources(g,E.layout(g,c.elements),c,0,false);let q=0;for(let k=0;k<g.N;k++)q+=src[k]*E.cellArea(g,k);assert.ok(Math.abs(q-41*29*.01)<1e-10);});
  check(model+': pumping schedule split at fractional dates',()=>{const c=base();c.model=model;c.rain.R=0;c.elements=[{type:'pozo',id:'w',name:'Pozo',x:50,y:40,Q:10,depth:15,t1:.123,t2:.987}];const sim=new E.Sim(c).runToEnd();assert.ok(Math.abs(sim.budget.pumping-8.64)<1e-8);budget(sim);});
  check(model+': drying reports unmet extraction',()=>{const c=base();c.model=model;c.rain.R=0;c.elements=[{type:'pozo',id:'w',name:'Pozo',x:50,y:40,Q:1e6,depth:15}];const sim=new E.Sim(c).runToEnd();assert.ok(sim.budget.unmet>0);assert.ok(sim.budget.unmet<=sim.budget.pumping);budget(sim);});
  check(model+': non-square cells, drains, flood stage and fixed boundaries',()=>{const c=base();c.model=model;c.Lx=103;c.Ly=83;c.tEnd=10;c.elements=[{type:'rio',id:'r',name:'Rio',x1:0,y1:0,x2:0,y2:83,dh:1,flood:{on:true,tStart:1,rise:2,fall:3,peak:2}},{type:'dren',id:'d',x1:80,y1:0,x2:80,y2:83,depth:6}];const sim=new E.Sim(c).runToEnd();assert.ok(sim.budget.drain>0);budget(sim);});
  check(model+': steady recharge mound agrees with analytical solution',()=>{const c=base();c.model=model;c.bc.west=c.bc.east='fijo';const st=E.steady(c,{tol:1e-10});assert.ok(st.converged);for(let i=0;i<st.g.Nx;i++){const x=st.g.x[i],R=c.rain.R/365000;const expected=model==='linear'?c.b+E.rainMound(R,c.K*c.b,c.Lx,x):Math.sqrt(c.b*c.b+R/c.K*x*(c.Lx-x));assert.ok(Math.abs(st.h[3*st.g.Nx+i]-expected)<1e-7);}});
}
check('seasonal rainfall integrates to annual net recharge',()=>{const c=base();c.rain.seasonal=true;c.tEnd=365;const sim=new E.Sim(c).runToEnd();assert.ok(Math.abs(sim.budget.recharge-c.Lx*c.Ly*.365)<1e-7);budget(sim);});
check('no-flow internal redistribution conserves water',()=>{const c=base();c.rain.R=0;const sim=new E.Sim(c);sim.h[30]+=1;sim.h0=Float64Array.from(sim.h);sim.runToEnd();assert.ok(Math.abs(sim.budget.storage)<1e-8);budget(sim);});
check('invalid input rejects before allocating mesh',()=>{const c=base();c.S=0;assert.throws(()=>new E.Sim(c));});
// Check all bundled teaching scenarios against invariants, including their original answers.
const sandbox={SimEngine:E};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../js/sim-problems.js'),'utf8'),{window:sandbox});
for(const pb of sandbox.SimProblems.PROBLEMS) check('teaching scenario '+pb.id,()=>{const c=pb.cfg();const sim=new E.Sim(c).runToEnd();budget(sim);const st=E.steady(c);assert.ok(!st.exists || st.h.every(Number.isFinite));const answers=pb.solve({sim,st,cfg:c});assert.ok(Array.isArray(answers));});
fs.writeFileSync(require('node:path').join(__dirname,'../VERIFICACION.json'),JSON.stringify({checks:results,note:'Pruebas numéricas de conservación y soluciones analíticas; no representan calibración con mediciones de campo.'},null,2));

