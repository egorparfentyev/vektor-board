import type {Obj} from './board-model';
import {compileExpression,presetExpression} from './math-expression';
export function probeGraph(o:Obj,p:{x:number;y:number}):Obj{
 const unit=o.unit||32,x=(p.x-o.x-o.w/2)/unit,rawY=(o.h/2+15-(p.y-o.y))/unit;
 let y=rawY,curve:number|undefined;
 {
 let distance=Infinity;
 (o.expressions??[presetExpression(o)]).forEach((expression,index)=>{try{const value=compileExpression(expression)(x);if(Number.isFinite(value)&&o.h/2+15-value*unit>=22&&o.h/2+15-value*unit<=o.h-72&&Math.abs(value-rawY)<distance){distance=Math.abs(value-rawY);y=value;curve=index}}catch{}});
 if(curve===undefined)return {...o,probe:undefined};
 }
 return {...o,probeMode:'curve',probe:{x:Number(x.toFixed(4)),y:Number(y.toFixed(4)),curve}};
}
