export type MathFn=(x:number)=>number;
const funcs:Record<string,(x:number)=>number>={sin:Math.sin,cos:Math.cos,tan:Math.tan,tg:Math.tan,ctg:x=>1/Math.tan(x),cot:x=>1/Math.tan(x),asin:Math.asin,acos:Math.acos,atan:Math.atan,sqrt:Math.sqrt,abs:Math.abs,ln:Math.log,log:Math.log10,exp:Math.exp,floor:Math.floor,ceil:Math.ceil};
/** Parse a bounded math grammar. Never execute JavaScript from a formula. */
export function compileExpression(input:string):MathFn{
 const source=input.trim().toLowerCase().replace(/^y\s*=/,'').replace(/π/g,'pi').replace(/²/g,'^2').replace(/³/g,'^3').replace(/[−–]/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/\*\*/g,'^').replace(/,/g,'.');
 if(!source||source.length>300)throw Error('Введите функцию длиной до 300 символов');
 const raw:string[]=[];let rest=source;
 while(rest.length){const m=rest.match(/^\s*(\d*\.?\d+(?:e[+-]?\d+)?|[a-z]+|[+\-*/^()])/);if(!m)throw Error('Неизвестный символ: '+rest.trim()[0]);raw.push(m[1]);rest=rest.slice(m[0].length);if(!rest.trim())break;}
 const tokens:string[]=[];const isNum=(s:string)=>/^\d*\.?\d/.test(s);const atomEnd=(s:string)=>isNum(s)||['x','pi','e',')'].includes(s),atomStart=(s:string)=>isNum(s)||['x','pi','e','('].includes(s)||Object.hasOwn(funcs,s);
 for(const t of raw){const prev=tokens[tokens.length-1];if(prev&&atomEnd(prev)&&atomStart(t))tokens.push('*');tokens.push(t)}
 let i=0,depth=0;const error=()=>new Error('Проверьте скобки и запись функции');
 function primary():MathFn{if(++depth>60)throw Error('Слишком сложная функция');const t=tokens[i++];let result:MathFn;
 if(isNum(t||'')){const n=Number(t);result=()=>n}else if(t==='x')result=x=>x;else if(t==='pi')result=()=>Math.PI;else if(t==='e')result=()=>Math.E;
 else if(t==='('){result=sum();if(tokens[i++]!==')')throw error()}
 else if(Object.hasOwn(funcs,t)){if(tokens[i++]!=='(')throw Error('После '+t+' нужны скобки');const arg=sum();if(tokens[i++]!==')')throw error();result=x=>funcs[t](arg(x))}
 else throw Error(t?'Неизвестное имя: '+t:'Функция не закончена');depth--;return result;}
 function power():MathFn{const a=primary();if(tokens[i]==='^'){i++;const b=unary();return x=>Math.pow(a(x),b(x))}return a}
 function unary():MathFn{if(tokens[i]==='+'){i++;return unary()}if(tokens[i]==='-'){i++;const a=unary();return x=>-a(x)}return power()}
 function product():MathFn{let a=unary();while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++],left=a,right=unary();a=op==='*'?x=>left(x)*right(x):x=>left(x)/right(x)}return a}
 function sum():MathFn{let a=product();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],left=a,right=product();a=op==='+'?x=>left(x)+right(x):x=>left(x)-right(x)}return a}
 const result=sum();if(i!==tokens.length)throw error();return result;
}
export function presetExpression(o:any):string{if(o.expression!==undefined)return o.expression;const a=o.a??1,b=o.b??0,c=o.c??0;switch(o.variant){case 'axes':return '';case 'linear':return `${a}*x+(${b})`;case 'quadratic':return `${a}*x^2+(${b})*x+(${c})`;case 'cubic':return `${a}*x^3+(${b})`;case 'abs':return `${a}*abs(x)+(${b})`;case 'sqrt':return `${a}*sqrt(x)+(${b})`;case 'reciprocal':return `${a}/x+(${b})`;case 'exp':return `exp(x)+(${b})`;case 'log':return `${a}*ln(x)+(${b})`;default:return `${a}*${o.variant==='cos'?'cos':o.variant==='tan'?'tan':'sin'}(x)+(${b})`}}
