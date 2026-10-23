import type {Obj} from './board-model';
export type GeoSpec={key:string;label:string;value:number;min:number;max:number;step:number};
export type GeoPoint={x:number;y:number};
export type GeoHandle=GeoPoint&{key:string;label:string};
export function geometrySpecs(o:Obj):GeoSpec[]{
 const v=o.variant||'triangle',solid=o.type==='stereo';
 const definitions:Record<string,[string,number,number,number,number]>={width:['Длина a',7,1,10,.1],height:['Высота h',6,1,8,.1],depth:['Глубина b',4,1,6,.1],radius:['Радиус r',4,1,5,.1],edge:['Ребро a',6,1,8,.1],top:['Верхнее основание',4,1,8,.1],skew:['Сдвиг вершины',0,-3,3,.1],angle:['Угол, °',45,5,175,1],section:['Высота сечения, %',50,10,90,1]};
 let keys=solid?(['cube','section'].includes(v)?['edge',...(v==='section'?['section']:[])]:v==='sphere'?['radius']:['cylinder','cone'].includes(v)?['radius','height']:['width','height','depth']):['circle','tangent','inscribed','hexagon'].includes(v)?['radius']:v==='angle'?['angle']:['square','equilateral'].includes(v)?['edge']:['trapezoid','trapezoid-free'].includes(v)?['width','top','height',...(v==='trapezoid-free'?['skew']:[])]:['triangle','parallelogram'].includes(v)?['width','height','skew']:['width','height'];
 return keys.map(key=>{const [label,value,min,max,step]=definitions[key];return {key,label,value:o.geometry?.[key]??(v==='trapezoid-free'&&key==='skew'?1.5:value),min,max,step}});
}
export function geometryValues(o:Obj){return Object.fromEntries(geometrySpecs(o).map(s=>[s.key,s.value]))}
export function clampGeometry(o:Obj,key:string,value:number){const spec=geometrySpecs(o).find(s=>s.key===key);if(!spec)return o;const next=Math.max(spec.min,Math.min(spec.max,Math.round(value/spec.step)*spec.step));return {...o,geometry:{...o.geometry,[key]:Number(next.toFixed(2))}}}
export function geometryHandles(o:Obj):GeoHandle[]{
 const g=geometryValues(o),v=o.variant||'triangle';
 if(o.type==='stereo'){
 if(v==='sphere')return [{key:'radius',label:'Радиус',x:180+g.radius*20,y:170}];
 if(['cylinder','cone'].includes(v))return [{key:'radius',label:'Радиус',x:180+g.radius*18,y:250},{key:'height',label:'Высота',x:180,y:250-g.height*20}];
 const w=(g.edge??g.width)*20,h=(g.edge??g.height)*20,d=(g.edge??g.depth)*10;
 return [...(g.edge!==undefined?[{key:'edge',label:'Ребро',x:55+w,y:260}]:[{key:'width',label:'Длина',x:55+w,y:260},{key:'height',label:'Высота',x:55,y:260-h},{key:'depth',label:'Глубина',x:55+w+d,y:260-d*.65}]),...(v==='section'?[{key:'section',label:'Сечение',x:55+w/2,y:260-h*g.section/100}]:[])];
 }
 if(g.radius)return [{key:'radius',label:'Радиус',x:180+g.radius*20,y:170}];
 if(v==='angle'){const a=g.angle*Math.PI/180;return [{key:'angle',label:'Угол',x:180+130*Math.cos(a),y:250-130*Math.sin(a)}]}
 const w=(g.edge??g.width)*20,h=g.edge!==undefined?(v==='equilateral'?w*Math.sqrt(3)/2:w):g.height*20;
 return [...(g.edge!==undefined?[{key:'edge',label:'Сторона',x:180+w/2,y:250}]:[{key:'width',label:'Основание',x:180+w/2,y:250},{key:'height',label:'Высота',x:40,y:250-h}]),...(g.skew!==undefined?[{key:'skew',label:'Сдвиг',x:180+g.skew*20,y:250-h}]:[]),...(g.top!==undefined?[{key:'top',label:'Верхнее основание',x:180+(g.skew??0)*20+g.top*10,y:250-h}]:[])];
}
export function dragGeometry(o:Obj,key:string,p:GeoPoint){
 const g=geometryValues(o);let value=0;
 if(o.type==='stereo')value=key==='radius'?(p.x-180)/(o.variant==='sphere'?20:18):key==='height'?((['cone','cylinder'].includes(o.variant||'')?250:260)-p.y)/20:key==='depth'?(p.x-55-(g.width??g.edge)*20)/10:key==='section'?(260-p.y)/((g.edge??g.height)*20)*100:(p.x-55)/20;
 else value=key==='radius'?Math.hypot(p.x-180,p.y-170)/20:key==='angle'?Math.atan2(250-p.y,p.x-180)*180/Math.PI:key==='height'?(250-p.y)/20:key==='skew'?(p.x-180)/20:key==='top'?(p.x-180-(g.skew??0)*20)/10:(p.x-180)/10;
 return clampGeometry(o,key,value);
}
