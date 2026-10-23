import type {Obj,Erasure} from './board-model';
export type Point={x:number;y:number};
export function intersectsErase(o:Obj,a:Point,b:Point,r:number){const pad=Math.max(24,(o.stroke||3)*2)+r,left=Math.min(o.x,o.x+o.w)-pad,right=Math.max(o.x,o.x+o.w)+pad,top=Math.min(o.y,o.y+o.h)-pad,bottom=Math.max(o.y,o.y+o.h)+pad;let lo=0,hi=1;for(const [start,delta,min,max] of [[a.x,b.x-a.x,left,right],[a.y,b.y-a.y,top,bottom]]){if(Math.abs(delta)<1e-12){if(start<min||start>max)return false}else{const t1=(min-start)/delta,t2=(max-start)/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false}}return true}
export function addEraseSegment(o:Obj,a:Point,b:Point,r:number,index?:number):Obj{
 const erasures=(o.erasures||[]).slice();if(index===undefined){erasures.push({rx:r,ry:r,points:[[a.x-o.x,a.y-o.y],[b.x-o.x,b.y-o.y]]})}else{const cut=erasures[index];erasures[index]={...cut,points:[...cut.points,[b.x-o.x,b.y-o.y]]}}
 return {...o,erasures};
}
export function erasurePath(cut:Erasure){return cut.points.map((p,i)=>`${i?'L':'M'}${p[0]/cut.rx} ${p[1]/cut.ry}`).join(' ')+(cut.points.length===1?'l.001 0':'')}
