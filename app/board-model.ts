export type Erasure={rx:number;ry:number;points:number[][]};
export type Obj={erasures?:Erasure[];id:string;type:string;owner:string;x:number;y:number;w:number;h:number;color:string;scope:string;locked?:boolean;points?:number[][];text?:string;variant?:string;stroke?:number;pages?:any[];file?:string;a?:number;b?:number;c?:number;angle?:number;unit?:number;expression?:string;expressions?:string[];formula?:string;description?:string;labels?:Record<string,string>;lineStyle?:'solid'|'dashed'|'dotted';geometry?:Record<string,number>;physics?:Record<string,number>;simulation?:{playing:boolean;time:number;startedAt:number};probeMode?:'off'|'free'|'curve';probe?:{x:number;y:number;curve?:number};baseW?:number;baseH?:number};
export function resizeObject(o:Obj,w:number,h:number):Obj{
 const next={...o,w,h};
 if(o.erasures){const sx=w/(o.w||1),sy=h/(o.h||1);next.erasures=o.erasures.map(c=>({...c,rx:Math.max(.001,Math.abs(c.rx*sx)),ry:Math.max(.001,Math.abs(c.ry*sy)),points:c.points.map(p=>[p[0]*sx,p[1]*sy])}))}
 if(o.points){const sx=w/(o.w||1),sy=h/(o.h||1);next.points=o.points.map(p=>[p[0]*sx,p[1]*sy,...p.slice(2)]);}
 if(o.type==='text')next.stroke=(o.stroke||22)*h/(o.h||h);
 return next;
}
export function normalizeStroke(o:Obj):Obj{const points=o.points||[];if(!points.length)return o;const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),minY=Math.min(...ys);return {...o,x:o.x+minX,y:o.y+minY,w:Math.max(.1,Math.max(...xs)-minX),h:Math.max(.1,Math.max(...ys)-minY),points:points.map(p=>[p[0]-minX,p[1]-minY,...p.slice(2)])}}
export function pressureWidth(size:number,pressure:number){return size*(.15+Math.max(0,Math.min(1,pressure))*1.85)}
export function insertNotebookPage(pages:any[],after:number,page:any){return [...pages.slice(0,after+1),page,...pages.slice(after+1)]}
export function placementInView(rect:{width:number;height:number},pan:{x:number;y:number},zoom:number,w:number,h:number,cursor?:{x:number;y:number}){return {x:((cursor?.x??rect.width/2)-pan.x)/zoom-w/2,y:((cursor?.y??rect.height/2)-pan.y)/zoom-h/2}}

export function strokeDash(style:string|undefined,width:number){return style==='dashed'?`${width*4} ${width*3}`:style==='dotted'?`0.01 ${width*3}`:undefined}
export function integerAngle(a:number){return Math.max(0,Math.min(360,Math.round(a)))}

export function radians(degrees:number){const n=Math.round(degrees*10);if(!n)return '0';let a=Math.abs(n),b=1800;while(b){const r=a%b;a=b;b=r}const top=n/a,bottom=1800/a;return `${top===1?'':top===-1?'−':top}π${bottom===1?'':'/'+bottom}`}
export function angleText(degrees:number){return `${radians(degrees)} рад (${Number(degrees.toFixed(1))}°)`}

export function gridDetail(zoom:number){const step=24*2**Math.ceil(Math.log2(1/Math.max(.05,zoom)));return {step,detail:Math.max(0,Math.min(1,(step*zoom-24)/24))}}
