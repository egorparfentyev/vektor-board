import type {Obj} from './board-model';
export function bounds(items:Obj[]){const x=Math.min(...items.map(o=>Math.min(o.x,o.x+o.w))),y=Math.min(...items.map(o=>Math.min(o.y,o.y+o.h)));return {x,y,w:Math.max(...items.map(o=>Math.max(o.x,o.x+o.w)))-x,h:Math.max(...items.map(o=>Math.max(o.y,o.y+o.h)))-y}}
export function cloneElements(items:Obj[],owner:string,scope:string,at:{x:number;y:number},id=()=>crypto.randomUUID()):Obj[]{
 if(!items.length)return [];const box=bounds(items),groups=new Map<string,string>();return items.map(source=>{const o=structuredClone(source);if(o.groupId&&!groups.has(o.groupId))groups.set(o.groupId,id());return {...o,id:id(),owner,scope,x:o.x-box.x+at.x,y:o.y-box.y+at.y,locked:false,groupId:o.groupId?groups.get(o.groupId):undefined,simulation:o.simulation?{...o.simulation,playing:false,startedAt:0}:undefined}})
}
export type Alignment='left'|'centerX'|'top'|'centerY'|'spaceX'|'spaceY';
export function alignElements(items:Obj[],mode:Alignment):Obj[]{
 if(items.length<2)return items;const box=bounds(items);if(mode==='spaceX'||mode==='spaceY'){if(items.length<3)return items;const axis=mode==='spaceX'?'x':'y',size=axis==='x'?'w':'h',sorted=[...items].sort((a,b)=>Math.min(a[axis],a[axis]+a[size])-Math.min(b[axis],b[axis]+b[size]));const gap=(box[size]-items.reduce((sum,o)=>sum+Math.abs(o[size]),0))/(items.length-1);let pos=box[axis];const out=new Map<string,Obj>();for(const o of sorted){out.set(o.id,{...o,[axis]:pos-Math.min(0,o[size])});pos+=Math.abs(o[size])+gap}return items.map(o=>out.get(o.id)!)}
 return items.map(o=>({...o,...(mode==='left'?{x:box.x-Math.min(0,o.w)}:mode==='top'?{y:box.y-Math.min(0,o.h)}:mode==='centerX'?{x:box.x+box.w/2-o.w/2}:{y:box.y+box.h/2-o.h/2})}));
}
export type Kit={id:string;name:string;items:Obj[]};
function recipe(name:string,parts:Partial<Obj>[]):Kit{return {id:name,name,items:parts.map((p,i)=>({id:String(i),owner:'',scope:'board',type:'line',x:0,y:0,w:100,h:0,color:'#2183b7',stroke:3,groupId:'kit',...p}))}}
const label=(text:string,x:number,y:number):Partial<Obj>=>({type:'text',text,x,y,w:Math.max(50,text.length*14),h:32,stroke:20,color:'#233b55'});
export const starterKits:Kit[]=[
 recipe('Тело и силы', [{type:'rect',x:110,y:100,w:90,h:65},{type:'arrow',x:155,y:130,w:0,h:-110},label('N',170,12),{type:'arrow',x:155,y:130,w:0,h:120},label('mg',170,224),{type:'arrow',x:155,y:130,w:140,h:0},label('F',280,90),{type:'line',x:40,y:165,w:280,h:0,color:'#607d8b'}]),
 recipe('Вектор и проекции', [{type:'arrow',x:40,y:240,w:270,h:0,color:'#607d8b'},{type:'arrow',x:40,y:240,w:0,h:-220,color:'#607d8b'},label('x',300,250),label('y',12,0),{type:'arrow',x:40,y:240,w:200,h:-150},label('A',150,60),{type:'line',x:240,y:90,w:0,h:150,lineStyle:'dashed',color:'#19a69b'},{type:'line',x:40,y:90,w:200,h:0,lineStyle:'dashed',color:'#19a69b'},label('Aₓ',130,250),label('Aᵧ',0,110)]),
 recipe('Луч и нормаль', [{type:'line',x:0,y:180,w:360,h:0,color:'#607d8b'},{type:'line',x:180,y:0,w:0,h:290,lineStyle:'dashed',color:'#607d8b'},{type:'arrow',x:50,y:50,w:130,h:130},{type:'arrow',x:180,y:180,w:130,h:-130},label('нормаль',195,0),label('α',125,100),label('β',213,100)]),
 recipe('Заряды и поле', [{type:'ellipse',x:40,y:100,w:60,h:60},label('+q',52,112),{type:'ellipse',x:280,y:100,w:60,h:60,color:'#e96e79'},label('−q',290,112),{type:'arrow',x:115,y:130,w:145,h:0},label('E',175,85),{type:'line',x:70,y:205,w:240,h:0,lineStyle:'dashed'},label('r',185,210)])
];
