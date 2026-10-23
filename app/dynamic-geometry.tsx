import React from 'react';
import {geometryValues} from './geometry-model';
import type {Obj} from './board-model';
export function DynamicGeometry({o,title}:{o:Obj;title:string}){
 const v=o.variant||'triangle',g=geometryValues(o),c=o.color||'#259d94',fill='none';
 const label=(x:number,y:number,key:string,value?:number)=>value!==undefined?null:<text x={x} y={y} stroke="none" fill={c} fontSize="13">{o.labels?.[key]??key}</text>;
 const poly=(pts:number[][],color=fill)=> <polygon points={pts.map(p=>p.join(',')).join(' ')} fill={color}/>;
 const line=(a:number[],b:number[],dashed=false)=><path d={`M${a}L${b}`} strokeDasharray={dashed?'5 5':undefined}/>;
 let shape:React.ReactNode;
 if(o.type==='stereo'){
 const w=(g.edge??g.width??6)*20,h=(g.edge??g.height??6)*20,d=(g.edge??g.depth??4)*10,x=55,y=260,dx=d,dy=-d*.65;
 const A=[x,y],B=[x+w,y],C=[x+w+dx,y+dy],D=[x+dx,y+dy],At=[x,y-h],Bt=[x+w,y-h],Ct=[x+w+dx,y-h+dy],Dt=[x+dx,y-h+dy];
 if(['cube','cuboid','section'].includes(v))shape=<>{poly([A,B,Bt,At])}{poly([At,Bt,Ct,Dt],'none')}{poly([B,C,Ct,Bt],'none')}{line(A,D,true)}{line(D,C,true)}{line(D,Dt,true)}{v==='section'&&poly([[x,y-h*g.section/100],[x+w,y-h*g.section/100],[x+w+dx,y+dy-h*g.section/100],[x+dx,y+dy-h*g.section/100]],'#9adcd380')}{label(x+w/2-15,y+22,'a',g.edge??g.width)}{label(x+w+dx+4,y-h/2+dy,'h',g.edge??g.height)}{label(x+w+dx/2+4,y+dy/2+18,'b',g.edge??g.depth)}</>;
 else if(v==='prism')shape=<>{poly([A,B,D])}{poly([At,Bt,Dt],'none')}{line(A,At)}{line(B,Bt)}{line(D,Dt,true)}{label(x+w+8,y-h/2,'h',g.height)}{label(x+w/2,y+20,'a',g.width)}{label(x+dx/2-20,y+dy/2,'b',g.depth)}</>;
 else if(['pyramid','tetrahedron'].includes(v)){const peak=[x+w/2+dx/2,y+dy/2-h];shape=<>{poly(v==='tetrahedron'?[A,B,D]:[A,B,C,D])}{poly([A,B,peak],'none')}{v!=='tetrahedron'&&line(peak,C)}{line(peak,D,true)}{line(peak,[peak[0],y+dy/2],true)}{label(peak[0]+7,y+dy/2-h/2,'h',g.height)}{label(x+w/2,y+20,'a',g.width)}{label(x+w+dx/2,y+dy/2+17,'b',g.depth)}</>}
 else if(['cylinder','cone'].includes(v)){const r=g.radius*18,yy=250-g.height*20,ry=r*.3;shape=<>{v==='cylinder'?<><path d={`M${180-r} ${yy}V250A${r} ${ry} 0 0 0 ${180+r} 250V${yy}`} fill={fill}/><ellipse cx={180} cy={yy} rx={r} ry={ry} fill="none"/></>:<path d={`M180 ${yy}L${180-r} 250A${r} ${ry} 0 0 0 ${180+r} 250Z`} fill={fill}/>}<ellipse cx={180} cy={250} rx={r} ry={ry} strokeDasharray="5 5"/>{line([180,yy],[180,250],true)}{line([180,250],[180+r,250],true)}{label(188,(yy+250)/2,'h',g.height)}{label(183+r/2,244,'r',g.radius)}</>}
 else {const r=g.radius*20;shape=<><circle cx="180" cy="170" r={r} fill={fill}/><ellipse cx="180" cy="170" rx={r} ry={r*.3} strokeDasharray="5 5"/>{line([180,170],[180+r,170])}{label(188,162,'R',g.radius)}</>}
 }else{
 const w=(g.edge??g.width??7)*20,h=g.edge!==undefined?(v==='equilateral'?w*Math.sqrt(3)/2:w):(g.height??6)*20,left=180-w/2,right=180+w/2,top=250-h,skew=(g.skew??0)*20;
 if(['triangle','right','equilateral','isosceles'].includes(v)){const apex=v==='right'?left:180+skew;shape=<>{poly([[left,250],[right,250],[apex,top]])}{line([apex,top],[apex,250],true)}{label(apex-7,top-12,'A')}{label(left-15,270,'B')}{label(right+4,270,'C')}{label(173,273,'a',w/20)}{label(apex+7,(top+250)/2,'h',h/20)}</>}
 else if(['rectangle','square','parallelogram','trapezoid','trapezoid-free','rhombus'].includes(v)){const points=v==='rhombus'?[[180,top],[right,(top+250)/2],[180,250],[left,(top+250)/2]]:['trapezoid','trapezoid-free'].includes(v)?[[left,250],[right,250],[180+skew+g.top*10,top],[180+skew-g.top*10,top]]:[[left,250],[right,250],[right+skew,top],[left+skew,top]];shape=<>{poly(points)}{line(points[0],points[2],true)}{label(173,273,'a',w/20)}{label(right+8,(top+250)/2,'h',h/20)}{v==='trapezoid'&&label(173,top-10,'b',g.top)}</>}
 else if(g.radius){const r=g.radius*20;shape=<><circle cx="180" cy="170" r={r} fill={fill}/>{v==='hexagon'?poly(Array.from({length:6},(_,i)=>[180+r*Math.cos(i*Math.PI/3),170+r*Math.sin(i*Math.PI/3)]),'none'):v==='inscribed'?poly([-90,30,150].map(a=>[180+r*Math.cos(a*Math.PI/180),170+r*Math.sin(a*Math.PI/180)]),'none'):line([180,170],[180+r,170])}{v==='tangent'&&line([180+r,55],[180+r,280])}{label(167,189,'O')}{label(190,161,'r',g.radius)}</>}
 else {const a=g.angle*Math.PI/180;shape=<>{line([180,250],[320,250])}{line([180,250],[180+130*Math.cos(a),250-130*Math.sin(a)])}<path d={`M225 250A45 45 0 0 0 ${180+45*Math.cos(a)} ${250-45*Math.sin(a)}`}/>{label(235,230,'α',g.angle)}</>}
 }
 return <svg width={o.w} height={o.h} viewBox="0 0 360 300" overflow="visible"><g data-geometry={v} stroke={c} strokeWidth="2" fill="none" strokeLinejoin="round">{shape}</g></svg>;
}
