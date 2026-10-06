/* Worker is optional; local file opening uses the cooperative main-thread fallback. */
importScripts('sim-engine.js?v=4.0','sim-advisor.js?v=4.0');
self.onmessage=async({data})=>{
  try{const result=await self.SimAdvisor.analyze(data.cfg,{onProgress:p=>self.postMessage({type:'progress',progress:p})});self.postMessage({type:'result',result});}
  catch(e){self.postMessage({type:'error',message:e.message});}
};
