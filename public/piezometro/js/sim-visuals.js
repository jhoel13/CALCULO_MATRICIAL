/* Render-only diagnostics. All profiles and arrows sample the computed hydraulic field. */
(function(root) {
  'use strict';
  const E = root.SimEngine;
  function overlays(ctx, g, h, toPx, options) {
    ctx.save();
    if(options.contours) {
      let lo=Infinity, hi=-Infinity; for(const v of h){lo=Math.min(lo,v);hi=Math.max(hi,v);}
      const raw=(hi-lo)/8, p=10**Math.floor(Math.log10(Math.max(raw,1e-9)));
      const step=[1,2,5,10].map(v=>v*p).find(v=>v>=raw);
      if(hi-lo>1e-5) for(let level=Math.ceil(lo/step)*step;level<hi;level+=step) {
        ctx.beginPath(); let anchor=null;
        for(let j=0;j<g.Ny-1;j++) for(let i=0;i<g.Nx-1;i++) {
          const k=j*g.Nx+i;
          const pts=[[g.x[i],g.y[j],h[k]],[g.x[i+1],g.y[j],h[k+1]],[g.x[i+1],g.y[j+1],h[k+g.Nx+1]],[g.x[i],g.y[j+1],h[k+g.Nx]]];
          const hit=[];
          for(let q=0;q<4;q++) {
            const a=pts[q],b=pts[(q+1)%4];
            if((a[2]<level)!==(b[2]<level)) {const t=(level-a[2])/(b[2]-a[2]);hit.push(toPx(a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])));}
          }
          // Resolve saddle ambiguity using the cell-center sign.
          if(hit.length===4 && (pts.reduce((n,p)=>n+p[2],0)/4>=level)!==(pts[0][2]>=level)) hit.push(hit.shift());
          for(let q=0;q+1<hit.length;q+=2) {ctx.moveTo(...hit[q]);ctx.lineTo(...hit[q+1]);if(!anchor && i>g.Nx/5 && j>g.Ny/5) anchor=hit[q];}
        }
        ctx.strokeStyle='rgba(255,255,255,.74)';ctx.lineWidth=1.2;ctx.stroke();
        if(anchor) {ctx.font='10px Segoe UI';ctx.textAlign='center';ctx.fillStyle='#153e50';ctx.fillRect(anchor[0]-19,anchor[1]-8,38,15);ctx.fillStyle='#fff';ctx.fillText(level.toFixed(1)+' m',anchor[0],anchor[1]+3);}
      }
    }
    if(options.flow) for(let i=1;i<12;i++) for(let j=1;j<10;j++) {
      const x=g.cfg.Lx*i/12,y=g.cfg.Ly*j/10,v=E.flow(g,h,x,y),mag=Math.hypot(v.x,v.y);
      if(mag<1e-7)continue;
      const p=toPx(x,y),dx=v.x/mag*10,dy=-v.y/mag*10;
      ctx.beginPath();ctx.moveTo(p[0]-dx/2,p[1]-dy/2);ctx.lineTo(p[0]+dx/2,p[1]+dy/2);
      const a=Math.atan2(dy,dx);for(const d of [-.6,.6]) {ctx.moveTo(p[0]+dx/2,p[1]+dy/2);ctx.lineTo(p[0]+dx/2-4*Math.cos(a+d),p[1]+dy/2-4*Math.sin(a+d));}
      ctx.strokeStyle='rgba(9,45,58,.85)';ctx.lineWidth=1.4;ctx.stroke();
    }
    if(options.profile !== undefined) {
      const y=g.cfg.Ly*options.profile/100,a=toPx(0,y),b=toPx(g.cfg.Lx,y);
      ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle='#f6d27a';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.stroke();ctx.setLineDash([]);
      ctx.font='bold 11px Segoe UI';ctx.fillStyle='#193e45';ctx.fillText('A',a[0]+8,a[1]-6);ctx.fillText('A′',b[0]-20,b[1]-6);
    }
    ctx.restore();
  }
  function profile(canvas,g,h,percent) {
    const w=Math.max(280,canvas.parentElement.clientWidth-24),height=210,dpr=Math.min(2,root.devicePixelRatio||1);
    canvas.width=w*dpr;canvas.height=height*dpr;canvas.style.height=height+'px';
    const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
    const cs=getComputedStyle(document.documentElement),ink=cs.getPropertyValue('--ink').trim();
    const left=45,right=w-18,top=20,bottom=174,y=g.cfg.Ly*percent/100;
    let maxH=g.zg;for(const v of h)maxH=Math.max(maxH,v);maxH*=1.08;
    const X=x=>left+x/g.cfg.Lx*(right-left),Y=v=>bottom-v/maxH*(bottom-top);
    ctx.fillStyle=cs.getPropertyValue('--surface').trim();ctx.fillRect(0,0,w,height);
    ctx.fillStyle='#be9d78';ctx.fillRect(left,Y(g.zg),right-left,bottom-Y(g.zg));
    ctx.beginPath();ctx.moveTo(left,bottom);
    for(let i=0;i<=180;i++){const x=g.cfg.Lx*i/180;ctx.lineTo(X(x),Y(E.interp(g,h,x,y)));}
    ctx.lineTo(right,bottom);ctx.closePath();ctx.fillStyle='#4b9fb2';ctx.fill();
    ctx.beginPath();for(let i=0;i<=180;i++){const x=g.cfg.Lx*i/180;const p=[X(x),Y(E.interp(g,h,x,y))];if(i===0)ctx.moveTo(...p);else ctx.lineTo(...p);}ctx.strokeStyle='#08758a';ctx.lineWidth=2.5;ctx.stroke();
    ctx.strokeStyle='#b8cdc8';ctx.lineWidth=.6;ctx.font='11px Segoe UI';ctx.fillStyle=ink;ctx.textAlign='right';
    for(let i=0;i<=4;i++){const v=maxH*i/4;ctx.beginPath();ctx.moveTo(left,Y(v));ctx.lineTo(right,Y(v));ctx.stroke();ctx.fillText(v.toFixed(1),left-6,Y(v)+4);}
    ctx.textAlign='center';for(let i=0;i<=4;i++){const x=g.cfg.Lx*i/4;ctx.fillText(Math.round(x),X(x),193);}
    ctx.fillText('x [m]',(left+right)/2,207);ctx.fillText('Cota [m]',left,12);
    ctx.setLineDash([6,4]);ctx.strokeStyle='#8b643a';ctx.beginPath();ctx.moveTo(left,Y(g.zg));ctx.lineTo(right,Y(g.zg));ctx.stroke();ctx.setLineDash([]);
    ctx.textAlign='right';ctx.fillStyle=ink;ctx.fillText('Terreno',right-5,Y(g.zg)-5);
  }
  function timeChart(host,data,layout) {
    host.innerHTML='';const cv=document.createElement('canvas');host.appendChild(cv);
    const w=Math.max(280,host.clientWidth),height=host.clientHeight||340,dpr=Math.min(2,root.devicePixelRatio||1);
    cv.width=w*dpr;cv.height=height*dpr;cv.style.width='100%';cv.style.height=height+'px';
    const ctx=cv.getContext('2d');ctx.scale(dpr,dpr);ctx.fillStyle=layout.paper_bgcolor;ctx.fillRect(0,0,w,height);
    let lo=Infinity,hi=-Infinity;for(const line of data)for(const v of line.y||[])if(Number.isFinite(v)){lo=Math.min(lo,v);hi=Math.max(hi,v);}
    if(!Number.isFinite(lo)){lo=0;hi=1;}if(hi-lo<1e-7){lo-=.5;hi+=.5;}const pad=(hi-lo)*.08;lo-=pad;hi+=pad;
    const left=58,right=w-20,top=30,bottom=height-70,xmax=layout.xaxis.range[1],rev=layout.yaxis.autorange==='reversed';
    const X=x=>left+x/xmax*(right-left),Y=y=>rev?top+(y-lo)/(hi-lo)*(bottom-top):bottom-(y-lo)/(hi-lo)*(bottom-top);
    ctx.font='11px Segoe UI';ctx.fillStyle=layout.font.color;ctx.strokeStyle='#cfdedb';ctx.lineWidth=.5;
    for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;ctx.beginPath();ctx.moveTo(left,Y(v));ctx.lineTo(right,Y(v));ctx.stroke();ctx.textAlign='right';ctx.fillText(v.toFixed(2),left-7,Y(v)+4);ctx.textAlign='center';ctx.fillText((xmax*i/4).toFixed(0),X(xmax*i/4),bottom+18);}
    for(const line of data){ctx.beginPath();let started=false;for(let i=0;i<(line.y||[]).length;i++){if(!Number.isFinite(line.y[i])){started=false;continue;}const p=[X(line.x[i]),Y(line.y[i])];if(started)ctx.lineTo(...p);else{ctx.moveTo(...p);started=true;}}ctx.strokeStyle=line.line?.color||'#087f8c';ctx.lineWidth=line.line?.width||2;ctx.setLineDash(line.line?.dash?[4,4]:[]);ctx.stroke();ctx.setLineDash([]);}
    ctx.fillStyle=layout.font.color;ctx.textAlign='left';ctx.fillText(layout.yaxis.title.text,left,16);ctx.textAlign='center';ctx.fillText('Tiempo [días]',(left+right)/2,bottom+35);
    let xx=left,yy=height-15;ctx.textAlign='left';for(const line of data.filter(s=>s.showlegend!==false)){const tw=ctx.measureText(line.name).width+26;if(xx+tw>right)break;ctx.fillStyle=line.line?.color||'#087f8c';ctx.fillRect(xx,yy-6,12,2);ctx.fillStyle=layout.font.color;ctx.fillText(line.name,xx+17,yy);xx+=tw;}
  }
  root.SimVisuals={overlays,profile,timeChart};
})(window);
