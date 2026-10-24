export function validateItem(o:any){
 if(!o||typeof o.id!=='string'||!o.id)throw Error('Неверный элемент');
 if(!['pen','brush','chalk','rect','ellipse','triangle','line','arrow','text','sticky','graph','note','physics','geometry','stereo','unit','notebook'].includes(o.type)||!['x','y','w','h'].every(k=>typeof o[k]==='number'&&Number.isFinite(o[k])&&Math.abs(o[k])<100000)||typeof o.scope!=='string'||typeof o.color!=='string'||o.color.length>30||o.text&&typeof o.text!=='string'||o.points&&(!Array.isArray(o.points)||o.points.length>12000||!o.points.every((p:any)=>Array.isArray(p)&&(p.length===2||p.length===3)&&p.every((n:any)=>typeof n==='number'&&Number.isFinite(n))))||o.pages&&(!Array.isArray(o.pages)||o.pages.length>2000))throw Error('Неверные параметры элемента');
 if(o.groupId!==undefined&&(typeof o.groupId!=='string'||o.groupId.length>128))throw Error('Неверная группа');
 if(o.erasures!==undefined&&(!Array.isArray(o.erasures)||o.erasures.length>200||o.erasures.some((c:any)=>!c||!['rx','ry'].every(k=>typeof c[k]==='number'&&Number.isFinite(c[k])&&c[k]>0&&c[k]<100000)||!Array.isArray(c.points)||c.points.length<1||c.points.length>4000||!c.points.every((p:any)=>Array.isArray(p)&&p.length===2&&p.every((n:any)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<100000)))))throw Error('Неверные параметры ластика');
 if(o.erasures?.reduce((total:number,c:any)=>total+c.points.length,0)>20000)throw Error('Слишком много участков стирания');
 if(o.expressions&&(!Array.isArray(o.expressions)||o.expressions.length>4||!o.expressions.every((s:any)=>typeof s==='string'&&s.length<=300)))throw Error('Неверные функции');
 if(o.lineStyle!==undefined&&!['solid','dashed','dotted'].includes(o.lineStyle))throw Error('Неверный тип линии');
 if(o.geometry!==undefined&&(!o.geometry||typeof o.geometry!=='object'||Array.isArray(o.geometry)||Object.keys(o.geometry).length>20||!Object.values(o.geometry).every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1000)))throw Error('Неверная геометрия');
 if(o.physics!==undefined&&(!o.physics||typeof o.physics!=='object'||Array.isArray(o.physics)||Object.keys(o.physics).length>30||!Object.values(o.physics).every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1000)))throw Error('Неверные параметры опыта');
 if(o.simulation!==undefined&&(!o.simulation||typeof o.simulation.playing!=='boolean'||!['time','startedAt'].every(k=>typeof o.simulation[k]==='number'&&Number.isFinite(o.simulation[k])&&o.simulation[k]>=0)))throw Error('Неверное время опыта');
 if(o.probeMode!==undefined&&!['off','free','curve'].includes(o.probeMode))throw Error('Неверный режим точки');
 if(o.probe!==undefined&&(!o.probe||!['x','y'].every(k=>typeof o.probe[k]==='number'&&Number.isFinite(o.probe[k]))))throw Error('Неверные координаты точки');
 if(['angle','unit','stroke','a','b','c'].some(k=>o[k]!==undefined&&(typeof o[k]!=='number'||!Number.isFinite(o[k])||Math.abs(o[k])>10000)))throw Error('Неверные числовые параметры');
 if(o.labels&& (typeof o.labels!=='object'||Array.isArray(o.labels)||Object.keys(o.labels).length>100||!Object.values(o.labels).every(v=>typeof v==='string'&&v.length<300)))throw Error('Неверные подписи');
 if(['formula','description','expression'].some(k=>o[k]!==undefined&&(typeof o[k]!=='string'||o[k].length>10000)))throw Error('Неверный текст');
 if(o.type==='unit'&&o.angle!==undefined)o.angle=Math.max(0,Math.min(360,Math.round(o.angle)));

return o;
}
