'use client';
import {boardRequest,readBoard,joinBoard,uploadPdf,disconnectBoard} from '../src/backend';
import {auth,pdfUploadsEnabled} from '../src/firebase';
import {signOut} from 'firebase/auth';
import { templates, UnitCircle } from './templates';
import {Drawing} from './board-renderer';
import {BoardPresence} from './board-presence';
import {LessonControl} from './lesson-control';
import {BoardCanvas} from './board-canvas';
import {exportArtwork,type ExportFormat,type ExportRegion} from './export-board';
import {ObjectInspector} from './object-inspector';
import {PdfPage} from './pdf-page';
import {type Obj,resizeObject,insertNotebookPage,placementInView} from './board-model';
import {presetExpression} from './math-expression';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUpRight, MousePointer2, Hand, PenLine, PenTool, Eraser, Type, Square, Triangle, Circle, Minus, MoveUpRight, ChartNoAxesCombined, Shapes, BookOpen, Users, Layers, Plus, X, ChevronDown, ChevronRight, ChevronLeft, Undo2, Redo2, LockKeyhole, Unlock, Trash2, Copy, Download, Upload, Check, CheckCheck, Settings2, Keyboard, Expand, ZoomIn, ZoomOut, MoreHorizontal, ArrowLeft, Link, Search, StickyNote, Magnet, Orbit, Move, FileText, PanelRightClose, PanelRightOpen, CheckCircle2, Wifi, CloudOff, ArrowRight } from 'lucide-react';
const uid = () => crypto.randomUUID();
const palette = ['#233b55', '#2183b7', '#19a69b', '#7b6bd5', '#e9a246', '#e96e79'];
const toolsList = [['select', MousePointer2, 'Выделение', 'V'], ['hand', Hand, 'Перемещение', 'H'], ['pen', PenLine, 'Ручка', 'P'], ['brush', PenTool, 'Перо с нажимом', 'B'], ['chalk', PenLine, 'Мел', 'C'], ['eraser', Eraser, 'Ластик', 'E'], ['text', Type, 'Текст', 'T'], ['line', Minus, 'Прямая', 'L'], ['arrow', MoveUpRight, 'Вектор', 'A'], ['rect', Square, 'Прямоугольник', 'R'], ['ellipse', Circle, 'Окружность', 'O'], ['triangle', Triangle, 'Треугольник', 'G'], ['sticky', StickyNote, 'Заметка', 'N']] as const;
export default function BoardApp() {
    const [search, setSearch] = useState(''), [category, setCategory] = useState('graphs'), [boards, setBoards] = useState<any[]>([]), [authError, setAuthError] = useState('');
    const [items, setItems] = useState<Obj[]>([]), [board, setBoard] = useState<any>(null), [user, setUser] = useState<any>(null), [members, setMembers] = useState<any[]>([]), [students, setStudents] = useState<any[]>([]);
    const [tool, setTool] = useState('select'), [color, setColor] = useState(palette[0]), [stroke, setStroke] = useState(3), [lineStyle,setLineStyle]=useState<'solid'|'dashed'|'dotted'>('solid'), [selected, setSelectedValue] = useState<string | null>(null), [tab, setTab] = useState('materials'), [panel, setPanel] = useState(false), [modal, setModal] = useState(''), [toast, setToast] = useState(''), [status, setStatus] = useState('Загрузка…'), [online, setOnline] = useState(false), [snap, setSnap] = useState(false), [bg, setBg] = useState('dots'), [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 }), [notebook, setNotebook] = useState<string | null>(null), [pageIndex, setPageIndex] = useState(0), [busy, setBusy] = useState(false), [draft, setDraft] = useState<any>({});
    const [eraserMode,setEraserMode]=useState<'object'|'precision'>('object'),[eraserSize,setEraserSize]=useState(16);
    const [selection,setSelectionIds]=useState<string[]>([]);
    function setSelected(id:string|null){setSelectedValue(id);setSelectionIds(id?[id]:[])}
    function setSelection(ids:string[]){flushLive();setSelectionIds(ids);setSelectedValue(ids.length===1?ids[0]:null);if(ids.length)setPanel(false)}
    const [surface,setSurface]=useState('white'),[exportFormat,setExportFormat]=useState<ExportFormat>('pdf'),[exportTarget,setExportTarget]=useState('view'),[exportRegion,setExportRegion]=useState<ExportRegion|null>(null),[exportProgress,setExportProgress]=useState('');
    const [home,setHome]=useState(false),[newTitle,setNewTitle]=useState(''),[inspector,setInspector]=useState(true);
    const cursorRef=useRef<{x:number;y:number;scope:string}|null>(null),liveChanges=useRef(new Map<string,{before:Obj;after:Obj;timer:any}>()),mutationVersion=useRef(0),saveQueue=useRef(Promise.resolve()),boardGeneration=useRef(0);
    const previousTool = useRef('select');
    const itemsRef = useRef(items);
    itemsRef.current = items;
    const gesture = useRef<any>(null), pending = useRef(0), history = useRef<any[]>([]), future = useRef<any[]>([]);
    const [, refresh] = useState(0);
    const boardRef = useRef<any>(null), userRef = useRef<any>(null), onlineRef = useRef(false);
    const pdfCache = useRef<any>({});
    const [pdfImage, setPdfImage] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const notify = (s: string) => { setToast(s); setTimeout(() => setToast(''), 4200); };
    const request = (data:any) => boardRequest({...data,board:boardRef.current?.id});
    const load = useCallback(async (initial = false) => {
        if(!initial&&(document.hidden||gesture.current||pending.current||liveChanges.current.size))return;
        const version=mutationVersion.current,generation=boardGeneration.current;
        try {
            const params = new URLSearchParams(location.search);
            let bid = boardRef.current?.id || params.get('board');
            if (initial && params.get('join')) {
                bid = await joinBoard(params.get('join')!);
                historyReplace(bid);
            }
            const data:any = await readBoard(bid);
            if(generation!==boardGeneration.current)return;
            boardRef.current = data.board;
            userRef.current = data.user;
            onlineRef.current = true;
            setBoard(data.board);
            setUser(data.user);
            setMembers(data.members);
            setStudents(data.students);
            setOnline(true);
            if (!gesture.current && !pending.current && !liveChanges.current.size && version===mutationVersion.current) {
                setItems(previous=>{const old=new Map(previous.map(o=>[o.id,o]));const next=data.items.map((o:Obj)=>{const prior=old.get(o.id);return prior&&JSON.stringify(prior)===JSON.stringify(o)?prior:o});return next.length===previous.length&&next.every((o:Obj,i:number)=>o===previous[i])?previous:next});
                setStatus('Все изменения сохранены');
            }

        }
        catch (e: any) {
            if(generation!==boardGeneration.current)return;
            if(initial){onlineRef.current=false;setAuthError(e.message||'Нет доступа к доске');setModal('access');setStatus('Доска недоступна');setOnline(false)}else setStatus('Нет соединения · повторяем');
        }
    }, []);
    useEffect(() => { if (window.innerWidth < 850)
        setPanel(false); load(true); const i = setInterval(() => { if (onlineRef.current)
        load(); }, 3000); return () => {clearInterval(i);disconnectBoard()}; }, [load]);
    useEffect(()=>{const el=document.querySelector('.board-area');if(!el)return;const r=el.getBoundingClientRect();setZoom(Math.min(1,(r.width-40)/1030,(r.height-120)/730));setPan({x:0,y:45})},[]);
    useEffect(()=>{if(!board?.id)return;try{const saved=JSON.parse(localStorage.getItem('vektor-background:'+board.id)||'{}');setSurface(saved.surface||'white');setBg(saved.bg||'dots')}catch{}},[board?.id]);
    function changeBackground(nextSurface:string,nextBg:string){setSurface(nextSurface);setBg(nextBg);if(board?.id)localStorage.setItem('vektor-background:'+board.id,JSON.stringify({surface:nextSurface,bg:nextBg}));if(['black','green','red'].includes(nextSurface)&&color===palette[0])setColor('#f4f0df');if(['white','beige'].includes(nextSurface)&&['#f4f0df','#ffffff'].includes(color.toLowerCase()))setColor(palette[0])}
    function historyReplace(id: string) { window.history.replaceState({}, '', `?board=${id}`); }
    const persist = async (after: Obj | null, before: Obj | null, record = true) => { const id = after?.id || before?.id; if (!id)
        return; mutationVersion.current++;const version=mutationVersion.current;if (record) {
        history.current.push({ before, after });
        future.current = [];
        refresh(v => v + 1);
    } setItems(a => after ? a.some(x => x.id === id) ? a.map(x => x.id === id ? after : x) : [...a, after] : a.filter(x => x.id !== id)); if (!onlineRef.current)
        return; pending.current++; setStatus('Сохраняем…'); try {
        const task=saveQueue.current.then(()=>request(after ? { action: 'put', item: after } : { action: 'delete', id }));saveQueue.current=task.catch(()=>{});await task;
        setStatus('Все изменения сохранены');
    }
    catch (e: any) {
        notify(e.message);
        setStatus('Ошибка сохранения');
        if(mutationVersion.current===version)setItems(a => before ? a.some(x => x.id === id) ? a.map(x => x.id === id ? before : x) : [...a, before] : a.filter(x => x.id !== id));
    }
    finally {
        pending.current--;
    } };
    function flushLive(id?:string){const entries=id?[[id,liveChanges.current.get(id)] as const]:Array.from(liveChanges.current.entries());for(const [key,v] of entries){if(!v)continue;clearTimeout(v.timer);liveChanges.current.delete(key);persist(v.after,v.before)}}
    function changeObject(patch:Partial<Obj>){if(!current||!editable(current))return;const before=liveChanges.current.get(current.id)?.before||structuredClone(current),after={...current,...patch};if(current.type==='text'&&patch.text!==undefined){const size=after.stroke||22;after.w=Math.max(30,Math.max(...patch.text.split('\n').map(s=>s.length))*size*.65);after.h=patch.text.split('\n').length*size*1.35+8}const old=liveChanges.current.get(current.id);if(old)clearTimeout(old.timer);mutationVersion.current++;setItems(a=>a.map(x=>x.id===after.id?after:x));liveChanges.current.set(after.id,{before,after,timer:setTimeout(()=>flushLive(after.id),450)})}
    useEffect(()=>{const unload=(e:BeforeUnloadEvent)=>{if(liveChanges.current.size||pending.current){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload)},[]);
    const undo = (redo = false) => { flushLive(); const src = redo ? future : history, dst = redo ? history : future; const step = src.current.pop(); if (!step)
        return; dst.current.push(step); for(const change of step.changes||[step])persist(redo ? change.after : change.before, redo ? change.before : change.after, false); refresh(v => v + 1); };
    const current = items.find(o => o.id === selected);const activeStroke=current&&['pen','brush','chalk','line','arrow','rect','ellipse','triangle'].includes(current.type)?current.stroke||stroke:stroke;const book = items.find(o => o.id === notebook);
    const page = book?.pages?.[pageIndex];
    const scope = book && page ? book.id + ':' + page.id : 'board';
    const editable = (o: Obj) => o.owner === userRef.current?.userId;
    function insertPosition(w:number,h:number){
      const cursor=cursorRef.current;const view=document.querySelector('.board-area')?.getBoundingClientRect();const visible=book||(cursor&&view&&cursor.x*zoom+pan.x>=0&&cursor.x*zoom+pan.x<=view.width&&cursor.y*zoom+pan.y>=0&&cursor.y*zoom+pan.y<=view.height);if(cursor?.scope===scope&&visible){if(book)return {x:Math.max(10,Math.min(730-w,cursor.x-w/2)),y:Math.max(10,Math.min(970-h,cursor.y-h/2))};if(view){const left=(16-pan.x)/zoom,top=(16-pan.y)/zoom;return {x:Math.max(left,Math.min((view.width-16-pan.x)/zoom-w,cursor.x-w/2)),y:Math.max(top,Math.min((view.height-16-pan.y)/zoom-h,cursor.y-h/2))}}}
      if(book){const el=document.querySelector(`[data-page-id="${page?.id}"] .paper-canvas`),r=el?.getBoundingClientRect();const viewport=document.querySelector('.notebook-ribbon')?.getBoundingClientRect();return {x:(740-w)/2,y:r&&viewport?Math.max(25,Math.min(980-h,(viewport.top+viewport.height/2-r.top)*980/r.height-h/2)):120}}
      const r=document.querySelector('.board-area')?.getBoundingClientRect();return placementInView(r||{width:900,height:700},pan,zoom,w,h)
    }
    const create=(type:string,x?:number,y?:number,extra:any={})=>{const size={w:300,h:180,...extra};const at=insertPosition(size.w,size.h);return {id:uid(),type,owner:userRef.current?.userId||'local',x:x??at.x,y:y??at.y,color,scope,stroke,...size} as Obj};
    const openTemplates = (c: string) => { setCategory(c); setSearch(''); setModal('templates'); };
    const addTemplate = (variant: string) => { const cat = templates.find(t => t[1] === variant)?.[0] || 'graphs'; const type = cat === 'graphs' ? 'graph' : cat === 'trig' ? 'unit' : cat; const o = create(type, undefined, undefined, { variant, w: type === 'graph' ? 520 : type === 'unit' ? 380 : 360, h: type === 'graph' ? 380 : type === 'unit' ? 390 : 300, color, a: 1, b: 0, c: 0, angle: 45 }); persist(o, null); setSelected(o.id);setInspector(true);setPanel(false); setModal(''); setTool('select'); };
    function persistBatch(changes:{before:Obj|null;after:Obj|null}[]){if(!changes.length)return;history.current.push({changes});future.current=[];changes.forEach(c=>persist(c.after,c.before,false));refresh(v=>v+1)}
    const remove=()=>{flushLive();const targets=itemsRef.current.filter(o=>selection.includes(o.id)&&editable(o)&&!o.locked&&o.scope===scope);persistBatch(targets.map(before=>({before,after:null})));setSelected(null)};
    useEffect(() => { const fn = (e: KeyboardEvent) => { if ((e.target as HTMLElement).closest('input,textarea,select,[contenteditable]'))
        return; if (e.key === 'Escape') {
        setModal('');
        setSelected(null);
        setTool('select');
        return;
    } if (modal)
        return; if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat)
            previousTool.current = tool;
        setTool('hand');
        return;
    } if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='a'){e.preventDefault();setSelection(items.filter(o=>o.scope===scope&&editable(o)&&!o.locked).map(o=>o.id));return} if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo(e.shiftKey);
        return;
    } if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (current && editable(current))
            persist({ ...current, id: uid(), x: current.x + 25, y: current.y + 25, locked: false }, null);
        return;
    } if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        remove();
        return;
    } const found = toolsList.find(t => ('Key' + t[3]) === e.code || t[3].toLowerCase() === e.key.toLowerCase()); if (found)
        setTool(found[0]); }; const keyup = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target as HTMLElement).closest('input,textarea,select'))
        setTool(previousTool.current); }; window.addEventListener('keydown', fn); window.addEventListener('keyup', keyup); return () => { window.removeEventListener('keydown', fn); window.removeEventListener('keyup', keyup); }; }, [modal, current, items, tool, selection]);
    const beginEdit=(o:Obj)=>{if(!editable(o)){notify('Это элемент другого участника');return}setSelected(o.id);setInspector(true);setTool('select')};
    useEffect(() => { const el = document.querySelector('.board-area'); if (!el)
        return; const wheel = (e: any) => {if((e.target as Element).closest('.object-inspector,.notebook-ribbon,.notebook-toolbar'))return; e.preventDefault();cursorRef.current=null; if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        setZoom(old => { const next = Math.max(.2, Math.min(3, old * Math.exp(-e.deltaY * .005))); setPan(p => ({ x: x - (x - p.x) * next / old, y: y - (y - p.y) * next / old })); return next; });
    }
    else
        setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY })); }; el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel); }, []);
    function onSelect(id:string|null){flushLive();setSelected(id);setInspector(true);if(id)setPanel(false)}
    function openNotebook(id:string){flushLive();if(['#f4f0df','#ffffff'].includes(color.toLowerCase()))setColor(palette[0]);setNotebook(id);setPageIndex(0);setSelected(null);setPanel(false);cursorRef.current=null}
    const canvasProps={items,tool,color,stroke,eraserMode,eraserSize,lineStyle,onOpenNotebook:openNotebook,userId:user?.userId||'local',selected,selection,setSelection,persistBatch,exportRegion:modal==='export'&&exportTarget==='region'?exportRegion:null,setSelected:onSelect,setItems,persist,pan,zoom,setPan,bg,surface,onRegion:(r:ExportRegion)=>{setExportRegion(r);setExportTarget('region');setTool('select');setModal('export')},snap,gesture,onEdit:beginEdit,onText:(type:string,p:{x:number;y:number},targetScope:string)=>{setDraft(create(type,p.x,p.y,{scope:targetScope,text:'',color:type==='sticky'?'#e7f4ed':color,stroke:type==='text'?22:stroke,w:310,h:160}));setModal('text')},onCursor:(p:{x:number;y:number;scope:string})=>{cursorRef.current=p},notify};
    async function leaveBoard(){flushLive();await saveQueue.current;setHome(true);setNotebook(null);setSelected(null);if(online)try{const j=await request({action:'boards'});setBoards(j.boards)}catch(e:any){notify(e.message)}}
    async function openBoard(id:string){flushLive();await saveQueue.current;boardGeneration.current++;historyReplace(id);boardRef.current={id};history.current=[];future.current=[];setItems([]);setSelected(null);setNotebook(null);setModal('');setPanel(false);setHome(false);setPan({x:35,y:70});setZoom(1);cursorRef.current=null;await load(true)}
    async function makeBoard(){if(!online){notify('Дождитесь подключения, чтобы создать доску');return}try{const j=await request({action:'createBoard',title:newTitle||'Новое занятие'});await openBoard(j.board);setNewTitle('')}catch(e:any){notify(e.message)}}
    function goPage(index:number){setPageIndex(index);setSelected(null);cursorRef.current=null;const target=book?.pages?.[index];if(target)document.querySelector(`[data-page-id="${target.id}"]`)?.scrollIntoView({behavior:'smooth',block:'start'})}
    function addPageAfter(index:number){if(!book||!editable(book))return;const next={id:uid(),style:'grid'};persist({...book,pages:insertNotebookPage(book.pages||[],index,next)},book);setPageIndex(index+1);setSelected(null);cursorRef.current=null;requestAnimationFrame(()=>document.querySelector(`[data-page-id="${next.id}"]`)?.scrollIntoView({behavior:'smooth',block:'start'}))}
    async function newNotebook(file?: File) { const at=insertPosition(260,330);if (file && !online) {
        notify('Для загрузки PDF войдите в аккаунт');
        return;
    } setBusy(true); try {
        let pages = [{ id: uid(), style: 'grid' }], key;
        let title = 'Новая тетрадь';
        if (file) {
            if (file.size > 20 * 1024 * 1024)
                throw Error('Максимальный размер PDF — 20 МБ');
            const pdfjs = await import('pdfjs-dist');
            pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
            const bytes = await file.arrayBuffer();
            const doc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
            pages = Array.from({ length: doc.numPages }, (_, i) => ({ id: uid(), style: 'blank', pdfPage: i + 1 }));
            key = await uploadPdf(board.id,bytes);
            title = file.name.replace(/\.pdf$/i, '');
            pdfCache.current[key] = doc;
        }
        const o = create('notebook', at.x, at.y, { scope: 'board',w:260,h:330,color:'#298d84',text:title,pages,file:key });
        await persist(o, null);
        setNotebook(null);setPanel(false);setSelected(o.id);setInspector(true);setTool('select');cursorRef.current=null;
        setPageIndex(0);
        setModal('');
        notify('Тетрадь на доске. Нажмите «Открыть тетрадь» или дважды щёлкните по карточке.');
    }
    catch (e: any) {
        notify(e.message || 'Не удалось загрузить PDF');
    }
    finally {
        setBusy(false);
    } }
    function exportBoard(){setExportTarget(book?'page':'view');setExportRegion(null);setModal('export')}
    async function downloadArtwork(){setBusy(true);setExportProgress('Подготавливаем…');try{
      flushLive();let pages:{svg:SVGSVGElement;region:ExportRegion;file?:string;pdfPage?:number}[]=[];
      if(book){const wanted=exportTarget==='notebook'?book.pages||[]:[page];pages=wanted.map(pg=>{const svg=document.querySelector(`[data-page-id="${pg.id}"] .paper-canvas`) as SVGSVGElement;if(!svg)throw Error('Откройте тетрадь перед экспортом');return {svg,region:{x:0,y:0,w:740,h:980},file:book.file,pdfPage:pg.pdfPage}})}
      else {const svg=document.querySelector('.board-canvas') as SVGSVGElement;const region=exportTarget==='region'&&exportRegion?exportRegion:{x:-pan.x/zoom,y:-pan.y/zoom,w:svg.clientWidth/zoom,h:svg.clientHeight/zoom};pages=[{svg,region}]}
      await exportArtwork({format:exportFormat,title:book?.text||board?.title||'Доска',pages,onProgress:n=>setExportProgress(`Подготовлено ${n} / ${pages.length}`)});setModal('');notify('Файл подготовлен для скачивания');
    }catch(e:any){notify(e.message||'Не удалось экспортировать')}finally{setBusy(false);setExportProgress('')}}
    const notebooks = items.filter(o => o.type === 'notebook');
    return <div className="app-shell">
 <header className="topbar"><button className="exit-board" title="Выйти с доски" onClick={leaveBoard}><ArrowLeft size={18}/></button><a className="brand" href="/" title="Вектор"><span className="brand-mark"><ArrowUpRight size={25}/></span><b>вектор<span>.</span></b></a><span className="header-divider"/><div className="board-heading"><div><span className="crumb">Моё пространство</span><ChevronRight size={13}/><span>Доска занятия</span></div><button onClick={() => { setDraft({ title: board?.title || 'Квадратичная функция' }); setModal('rename'); if (online)
        request({ action: 'boards' }).then(j => setBoards(j.boards)).catch(e => notify(e.message)); }}>{board?.title || 'Квадратичная функция'}<ChevronDown size={15}/></button></div><div className="top-spacer"/><span className={'save-state ' + (!online ? 'offline' : '')} title={status}>{online ? <CheckCheck size={15}/> : <CloudOff size={15}/>}<span>{status}</span></span>{!home&&board?.id&&user?.userId&&<BoardPresence board={board.id} uid={user.userId} teacher={user.role==='teacher'} members={members} notify={notify} getView={()=>{const r=document.querySelector('.board-area')!.getBoundingClientRect();return {x:(r.width/2-pan.x)/zoom,y:(r.height/2-pan.y)/zoom,zoom,notebook,page:pageIndex}}} go={v=>{if(gesture.current){notify('Завершите перемещение или рисование и повторите переход');return false}const r=document.querySelector('.board-area')!.getBoundingClientRect();setZoom(v.zoom);setPan({x:r.width/2-v.x*v.zoom,y:r.height/2-v.y*v.zoom});setNotebook(v.notebook);setPageIndex(v.page);setSelected(null);setModal('');if(v.notebook)setTimeout(()=>document.querySelectorAll('.ribbon-page')[v.page]?.scrollIntoView({block:'start'}),100)}}/>}<div className="avatars" title="Участники доски"><span className="avatar teacher">{user?.displayName?.[0]?.toUpperCase() || 'В'}</span>{members.length > 1 && <span className="avatar student">+{members.length - 1}</span>}</div><button className="icon-button user-exit" title="Выход / смена пользователя" onClick={async () => { flushLive();await saveQueue.current;disconnectBoard();await signOut(auth);window.location.href='/'; }}> <ArrowLeft size={16}/></button><button className="primary share" onClick={() => setModal('share')}><Users size={16}/>Пригласить</button></header>
 <div className={'workspace '+(home?'workspace-hidden':'')}><aside className="tools"><div className="tool-stack">{toolsList.map(([key, Icon, label, hotkey], i) => <React.Fragment key={key}>{[2, 5, 10].includes(i) && <div className="tool-divider"/>}<button className={'tool ' + (tool === key ? 'active' : '')} onClick={() => { setTool(key); setSelected(null); }} title={`${label} (${hotkey})`} aria-label={`${label} (${hotkey})`}><Icon size={20} strokeWidth={1.7}/><span className="shortcut-mini">{hotkey}</span></button></React.Fragment>)}</div><div className="left-palette" aria-label="Цвет и толщина">{palette.map(c=><button key={c} className={'swatch '+(color===c?'chosen':'')} style={{background:c}} title={'Цвет '+c} onClick={()=>{setColor(c);if(current&&editable(current)&&!current.locked)changeObject({color:c})}}/>)}<input type="color" aria-label="Свой цвет" value={color} onChange={e=>{setColor(e.target.value);if(current&&editable(current)&&!current.locked)changeObject({color:e.target.value})}}/><label title="Толщина ручки и пера"><input aria-label="Толщина инструмента" type="range" min="1" max="24" value={activeStroke} onChange={e=>{const v=Number(e.target.value);setStroke(v);if(current&&editable(current)&&!current.locked&&['pen','brush','chalk','line','arrow','rect','ellipse','triangle'].includes(current.type))changeObject({stroke:v})}}/><span>{activeStroke} px</span></label><div className="stroke-style-picker" aria-label="Тип линии">{([['solid','Сплошная','━━━━'],['dashed','Пунктирная','╍ ╍ ╍'],['dotted','В точку','• • •']] as const).map(([value,label,sign])=><button key={value} title={label} aria-label={label} aria-pressed={(current?.lineStyle||lineStyle)===value} onClick={()=>{setLineStyle(value);if(current&&editable(current)&&!current.locked&&['pen','brush','chalk','line','arrow'].includes(current.type))changeObject({lineStyle:value})}}><svg width="38" height="12" viewBox="0 0 38 12" aria-hidden="true"><path d="M4 6H34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray={value==='dashed'?'6 4':value==='dotted'?'0.1 5':undefined}/></svg></button>)}</div></div><button className="tool lower-tool" onClick={() => setModal('keys')} title="Горячие клавиши"><Keyboard size={20}/></button></aside>
 <main className={'board-area background-' + bg+(book?' notebook-active':'')}><div className="board-top"><button className="secondary board-background-button" onClick={()=>setModal('background')}><Shapes size={17}/>Фон доски</button><LessonControl key={board?.id||'demo'} boardId={board?.id||'demo'}/></div>
 {book?<div className="notebook-workspace"><div className="notebook-toolbar ribbon-toolbar"><button onClick={()=>{flushLive();setNotebook(null);setSelected(null);cursorRef.current=null;if(['black','green','red'].includes(surface)&&color===palette[0])setColor('#f4f0df')}}><ArrowLeft size={17}/>На доску</button><input aria-label="Название тетради" value={book.text||''} disabled={!editable(book)} onChange={e=>{const value=e.target.value;persist({...book,text:value},book)}}/><span>{pageIndex+1} / {book.pages?.length}</span><button title="Скачать тетрадь или страницу" onClick={exportBoard}><Download size={17}/></button><button disabled={!editable(book)} onClick={()=>addPageAfter(pageIndex)}><Plus size={16}/>Страница после текущей</button></div><div className="notebook-ribbon" onScroll={e=>{cursorRef.current=null;const root=e.currentTarget,r=root.getBoundingClientRect();let closest=pageIndex,visible=-1;root.querySelectorAll('[data-page-index]').forEach(el=>{const box=el.getBoundingClientRect();const amount=Math.max(0,Math.min(box.bottom,r.bottom)-Math.max(box.top,r.top));if(amount>visible){visible=amount;closest=Number(el.getAttribute('data-page-index'))}});setPageIndex(closest)}}>{book.pages?.map((pg,index)=><React.Fragment key={pg.id}><div className="page-caption"><button onClick={()=>goPage(index)}>Страница {index+1}</button><select aria-label={'Разметка страницы '+(index+1)} value={pg.style} disabled={!editable(book)||!!pg.pdfPage} onChange={e=>persist({...book,pages:book.pages!.map(p=>p.id===pg.id?{...p,style:e.target.value}:p)},book)}><option value="grid">В клетку</option><option value="lines">В линейку</option><option value="dots">В точку</option><option value="blank">Без разметки</option></select><button disabled={!editable(book)} title={'Добавить страницу после '+(index+1)} onClick={()=>addPageAfter(index)}><Plus size={15}/></button></div><PdfPage file={book.file} page={pg} index={index} active={pageIndex===index} onActive={()=>setPageIndex(index)}><BoardCanvas {...canvasProps} scope={book.id+':'+pg.id} page={pg} onActive={()=>setPageIndex(index)}/></PdfPage><button className="insert-page-between" disabled={!editable(book)} onClick={()=>addPageAfter(index)}><Plus size={14}/>Добавить страницу здесь</button></React.Fragment>)}</div></div>:<BoardCanvas {...canvasProps} scope="board"/>}
 {tool==='eraser'&&<section className="eraser-settings" aria-label="Настройки ластика"><strong>Ластик</strong><label>Режим<select aria-label="Режим ластика" value={eraserMode} onChange={e=>setEraserMode(e.target.value as 'object'|'precision')}><option value="object">Удалять элемент целиком</option><option value="precision">Точно · участками</option></select></label>{eraserMode==='precision'&&<><label>Диаметр: {eraserSize} px<input aria-label="Размер ластика" type="range" min="4" max="80" step="2" value={eraserSize} onChange={e=>setEraserSize(Number(e.target.value))}/></label><small>Стирает фрагменты ваших элементов. Исходная страница PDF остаётся целой. Ctrl / ⌘ Z отменяет проход.</small></>}</section>}
 {selection.length>1&&<div className="multi-selection" data-ui="true"><b>Выбрано: {selection.length}</b><button onClick={remove}><Trash2 size={16}/>Удалить</button><button onClick={()=>setSelected(null)}>Снять выделение</button></div>}
 {current&&inspector&&<ObjectInspector key={current.id} o={current} editable={editable(current)} onChange={changeObject} onOpenNotebook={()=>openNotebook(current.id)} onClose={()=>{flushLive();setInspector(false)}} onDelete={()=>{flushLive();remove()}} onDuplicate={()=>{flushLive();persist({...current,id:uid(),x:current.x+25,y:current.y+25},null)}}/>}
 <div className="bottom-left"><button title="Отменить (Ctrl / ⌘ Z)" disabled={!history.current.length} onClick={() => undo()}><Undo2 size={18}/></button><button title="Повторить (Ctrl / ⌘ Shift Z)" disabled={!future.current.length} onClick={() => undo(true)}><Redo2 size={18}/></button><span /><button title="Фон доски" onClick={() => setModal('background')}><Shapes size={17}/></button><button title="Скачать доску" onClick={exportBoard}><Download size={17}/></button><button title={snap ? 'Отключить привязку к сетке' : 'Привязка к сетке (10 px)'} onClick={() => setSnap(v => !v)} style={{ color: snap ? '#198e89' : undefined }}><Magnet size={17}/></button></div>
 <div className="board-tip"><LockKeyhole size={13}/>Чужие элементы защищены от изменений</div>
 <div className="zoom-controls"><button title="Уменьшить" onClick={() => setZoom(v => Math.max(.3, v - .1))}><Minus size={16}/></button><button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Сбросить масштаб">{Math.round(zoom * 100)}%</button><button title="Увеличить" onClick={() => setZoom(v => Math.min(2.5, v + .1))}><Plus size={16}/></button><span /><button title="Показать всю доску" onClick={() => { const rect=document.querySelector('.board-area')!.getBoundingClientRect(),visible=items.filter(o=>o.scope==='board');if(!visible.length){setZoom(1);setPan({x:0,y:0});return}const left=Math.min(...visible.map(o=>Math.min(o.x,o.x+o.w)))-40,top=Math.min(...visible.map(o=>Math.min(o.y,o.y+o.h)))-40,right=Math.max(...visible.map(o=>Math.max(o.x,o.x+o.w)))+40,bottom=Math.max(...visible.map(o=>Math.max(o.y,o.y+o.h)))+40,z=Math.max(.1,Math.min(1.5,(rect.width-50)/(right-left),(rect.height-100)/(bottom-top)));setZoom(z);setPan({x:(rect.width-(right-left)*z)/2-left*z,y:35-top*z}); }}><Expand size={17}/></button></div>
 {!panel && <button className="show-panel" onClick={() => {setPanel(true);setInspector(false)}} title="Открыть материалы"><PanelRightOpen size={20}/></button>}
 </main>
 {panel && <aside className="side-panel"><div className="panel-heading"><h2>Всё для занятия</h2><button className="icon-button" onClick={() => setPanel(false)} title="Скрыть панель"><PanelRightClose size={17}/></button></div><div className="panel-tabs">{[['materials', 'Материалы'], ['students', 'Ученики'], ['layers', 'Слои']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
 <div className="panel-scroll">{tab === 'materials' ? <><div className="section-title"><h3>Библиотека инструментов</h3></div><p className="muted small">От идеи до понятного рисунка</p><div className="template-grid"><button onClick={() => openTemplates('graphs')}><span className="template-art graph-art"><svg viewBox="0 0 110 62"><path d="M15 48H96M55 55V8" stroke="#adc7d5"/><path d="M20 8Q55 88 90 8" fill="none" stroke="#269c98" strokeWidth="2.5"/></svg></span><strong>Графики</strong><span>Функции и оси</span></button><button onClick={() => openTemplates('geometry')}><span className="template-art geo-art"><svg viewBox="0 0 110 62"><path d="M24 48L50 10L80 48Z" fill="#e6edfc" stroke="#7898cb" strokeWidth="1.5"/><circle cx="71" cy="29" r="19" fill="none" stroke="#8bafe3" strokeWidth="1.5"/></svg></span><strong>Геометрия</strong><span>Фигуры и линии</span></button><button onClick={() => openTemplates('physics')}><span className="template-art"><Orbit size={34} color="#e6aa67" strokeWidth={1.25}/></span><strong>Физика</strong><span>Схемы и векторы</span></button><button onClick={() => { setDraft(create('text', undefined, undefined, { text: 'E = mc²', stroke: 28, w: 260, h: 50 })); setModal('text'); }}><span className="template-art formula-art">x² + y²</span><strong>Формулы</strong><span>Текст и символы</span></button></div>
 <button className="library-more" onClick={() => openTemplates('stereo')}><Shapes size={16}/><span>Стереометрия и 3D-фигуры</span><ChevronRight size={14}/></button><button className="library-more" onClick={() => openTemplates('trig')}><Circle size={16}/><span>Тригонометрическая окружность</span><ChevronRight size={14}/></button><div className="library-total">{templates.length} шаблонов · выберите элемент для настройки</div><div className="section-title notebook-title"><h3>Тетради</h3><span className="count">{notebooks.length}</span><button className="icon-button" onClick={() => setModal('notebook')} title="Добавить тетрадь"><Plus size={17}/></button></div>{notebooks.length ? notebooks.map((n, i) => <button className="notebook-row" key={n.id} onClick={() => { openNotebook(n.id); }}><span className={'book-icon book-' + i % 2}><BookOpen size={21}/></span><span><strong>{n.text}</strong><small>{n.pages?.length} стр. · {n.file ? 'PDF с пометками' : 'Тетрадь'}</small></span><ChevronRight size={15}/></button>) : <div className="empty-notebooks"><BookOpen size={25}/><strong>Место для решений</strong><span>Добавьте PDF или начните<br />с чистой страницы</span></div>}<button className="add-notebook" onClick={() => setModal('notebook')}><Plus size={16}/>Добавить тетрадь</button>
</> : tab === 'students' ? <><button className="account-access" onClick={()=>setModal('share')}><LockKeyhole size={17}/><span>Ссылка для учеников</span><ChevronRight size={15}/></button><div className="section-title"><h3>Ученики и цели</h3><button className="icon-button" onClick={() => { setDraft({ id: uid(), name: '', grade: '', goal: '', homework: '', done: false }); setModal('student'); }} title="Добавить ученика"><Plus size={18}/></button></div>{students.length ? students.map(s => <div className="student-card" key={s.id}><div className="student-head"><span className="avatar student">{s.name[0]}</span><div><b>{s.name}</b><small>{s.grade || 'Индивидуальные занятия'}</small></div><button className="icon-button" onClick={() => { setDraft(s); setModal('student'); }} title="Редактировать ученика"><Settings2 size={15}/></button></div><label>ЦЕЛЬ</label><p>{s.goal || 'Цель пока не добавлена'}</p><label>ДОМАШНЕЕ ЗАДАНИЕ</label><button className={'homework ' + (s.done ? 'done' : '')} onClick={async () => { try {
                await request({ action: 'student', student: { ...s, done: !s.done } });
                setStudents(a => a.map(x => x.id === s.id ? { ...s, done: !s.done } : x));
            }
            catch (e: any) {
                notify(e.message);
            } }}><span>{s.done ? <Check size={13}/> : null}</span>{s.homework || 'Пока нет задания'}</button></div>) : <div className="empty-notebooks"><Users size={25}/><strong>У каждого свой вектор</strong><span>Сохраните цели и домашние<br />задания ваших учеников.</span></div>}<button className="add-notebook" onClick={() => { setDraft({ id: uid(), name: '', grade: '', goal: '', homework: '', done: false }); setModal('student'); }}><Plus size={16}/>Добавить ученика</button></> : <><div className="section-title"><h3>Элементы доски</h3><span className="count">{items.filter(o => o.scope === scope).length}</span></div><p className="small muted">Выберите слой для точного выделения.<br />Заблокированные объекты не цепляются.</p>{items.filter(o => o.scope === scope).slice().reverse().map(o => <div key={o.id} className={'layer-row ' + (selected === o.id ? 'active' : '')}><button onClick={() => { if (editable(o))
                onSelect(o.id);
            else
                notify('Элемент другого участника'); }}><Layers size={15}/><span>{o.text?.split('\n')[0] || ({ pen: 'Штрих', brush:'Перо',chalk:'Мел',geometry:'Фигура',stereo:'Объёмная фигура',unit:'ЕТО',notebook:'Тетрадь', graph: 'График', physics: 'Физическая схема', rect: 'Прямоугольник', ellipse: 'Окружность', triangle: 'Треугольник', line: 'Прямая', arrow: 'Вектор' } as any)[o.type] || o.type}</span></button><button className="icon-button" title={o.locked ? 'Разблокировать' : 'Заблокировать'} onClick={() => { if (editable(o))
                persist({ ...o, locked: !o.locked }, o);
            else
                notify('Элемент другого участника'); }}>{o.locked || !editable(o) ? <LockKeyhole size={14}/> : <Unlock size={14}/>}</button></div>)}</>}
 </div></aside>}
 </div>
 {home&&<main className="boards-home"><div className="home-heading"><span className="modal-kicker">ВАШЕ ПРОСТРАНСТВО</span><h1>Каждое занятие — новая идея</h1><p>Откройте доску или создайте чистую. Доски сохраняются в вашем аккаунте.</p></div>{user?.role!=='student'&&<form className="new-board-form" onSubmit={e=>{e.preventDefault();makeBoard()}}><input aria-label="Название новой доски" placeholder="Название нового занятия" value={newTitle} onChange={e=>setNewTitle(e.target.value)}/><button className="primary"><Plus size={17}/>Создать доску</button></form>}<div className="home-board-grid">{boards.map(b=><button key={b.id} onClick={()=>openBoard(b.id)}><BookOpen size={28}/><strong>{b.title}</strong><span>Открыть доску <ArrowRight size={15}/></span></button>)}<button onClick={()=>setHome(false)}><ArrowLeft size={28}/><strong>{board?.title||'Текущая доска'}</strong><span>Вернуться к занятию</span></button></div></main>}
 {modal && <div className={'modal-backdrop'+(modal==='export'&&exportRegion&&exportTarget==='region'?' export-region-backdrop':'')} onMouseDown={e => { if (e.target === e.currentTarget)
            setModal(''); }}><section className={'modal modal-' + modal}><button className="modal-close icon-button" onClick={() => setModal('')} title="Закрыть"><X size={21}/></button>
 {modal === 'background' ? <><h2>Фон доски</h2><p>Настройки вашего рабочего пространства. Фон тетрадей меняется отдельно, у каждой страницы.</p><label>Цвет поверхности</label><div className="background-choices">{[['white','Белый','#ffffff'],['beige','Бежевый','#f7eedc'],['black','Чёрный','#22282a'],['green','Зелёный мел','#244e43'],['red','Красный мел','#733e3e']].map(([value,label,ink])=><button key={value} aria-pressed={surface===value} onClick={()=>changeBackground(value,bg)}><span style={{background:ink}}/>{label}{surface===value&&<Check size={16}/>}</button>)}</div><label>Разметка</label><div className="background-choices">{[['dots','Точки'],['grid','Клетка'],['lines','Линейка'],['plain','Без разметки']].map(([value,label])=><button key={value} aria-pressed={bg===value} onClick={()=>changeBackground(surface,value)}>{label}{bg===value&&<Check size={16}/>}</button>)}</div><button className="primary full" onClick={()=>setModal('')}>Готово</button></> : modal === 'access' ? <><h2>Не удалось открыть доску</h2><p className="form-error">{authError}</p><button className="primary full" onClick={()=>{window.location.href='/'}}>Открыть мои доски</button><button className="secondary full" onClick={()=>load(true)}>Повторить</button></> : modal === 'share' ? <><span className="modal-icon"><Users size={26}/></span><h2>Учиться интереснее вместе</h2><p>Участники видят общую доску и могут изменять только свои элементы. Синхронизация — каждые 3 секунды.</p>{board?.invite ? <><label>Ссылка для ученика · без пароля</label>{typeof location!=='undefined'&&['127.0.0.1','localhost'].includes(location.hostname)&&<div className="info-box">Сейчас доска работает только на вашем компьютере. После публикации откройте сайт по HTTPS и скопируйте приглашение оттуда.</div>}<div className="copy-field"><input readOnly value={typeof location !== 'undefined' ? location.origin + '/?join=' + board.invite : ''}/><button className="primary" onClick={async () => { try {
            await navigator.clipboard.writeText(location.origin + '/?join=' + board.invite);
            notify('Ссылка скопирована');
        }
        catch {
            notify('Выделите и скопируйте ссылку из поля');
        } }}><Copy size={16}/></button></div><div className="info-box"><LockKeyhole size={18}/><span>Ученик открывает ссылку и входит в свой аккаунт по email и паролю или регистрируется. Он может редактировать свои элементы, чужие — только просматривать. Аккаунт работает на любом устройстве.</span></div></> : <p>{online ? 'Приглашения создаёт преподаватель.' : 'Войдите, чтобы сохранять доску и приглашать участников.'}</p>}{!online && <button className="primary" onClick={()=>location.reload()}>Повторить подключение</button>}<div className="member-list">{members.map(m => <div key={m.user}><span className="avatar">{m.name[0]}</span><span>{m.name}</span><small>{m.user === board?.owner ? 'Преподаватель' : 'Участник'}</small></div>)}</div></> : modal === 'notebook' ? <><span className="modal-icon"><BookOpen size={27}/></span><h2>Новая тетрадь</h2><p>Решения, задачи и заметки — в одном месте.</p><button className="upload-zone" disabled={busy||!pdfUploadsEnabled} onClick={() => inputRef.current?.click()}><Upload size={29}/><b>{!pdfUploadsEnabled?'Загрузка PDF — позже':busy?'Открываем PDF…':'Загрузить PDF'}</b><span>{pdfUploadsEnabled?'До 20 МБ · пометки на каждой странице':'Обычные тетради доступны. Хранилище PDF подключим отдельно.'}</span></button><input hidden ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={e => { if (e.target.files?.[0])
            newNotebook(e.target.files[0]); e.target.value = ''; }}/><div className="or-divider">или</div><button className="secondary full" disabled={busy} onClick={() => newNotebook()}><Plus size={17}/>Создать пустую тетрадь</button></> : modal === 'templates' ? <><span className="modal-kicker">{templates.length} ШАБЛОНОВ ДЛЯ ВАШИХ ЗАНЯТИЙ</span><h2>От идеи к пониманию</h2><p>Готовая основа для объяснений. Каждый шаблон можно перемещать и настраивать.</p><div className="template-search"><Search size={17}/><input autoFocus placeholder="Найти: пирамида, синус, линза…" value={search} onChange={e => setSearch(e.target.value)}/></div><div className="library-tabs">{[['graphs', 'Графики'], ['geometry', 'Планиметрия'], ['stereo', 'Стереометрия'], ['physics', 'Физика'], ['trig', 'Тригонометрия']].map(([k, n]) => <button key={k} className={category === k ? 'active' : ''} onClick={() => { setCategory(k); setSearch(''); }}>{n}</button>)}</div><div className="library-cards">{templates.filter(t => (search ? t.join(' ').toLowerCase().includes(search.toLowerCase()) : t[0] === category)).map(([cat, id, title, sub]) => <button key={id} onClick={() => addTemplate(id)}><svg viewBox={cat === 'graphs' ? '0 0 520 380' : cat === 'trig' ? '0 0 380 390' : '0 0 360 300'}><Drawing o={{ id: 'preview' + id, type: cat === 'graphs' ? 'graph' : cat === 'trig' ? 'unit' : cat, variant: id, x: 0, y: 0, w: cat === 'graphs' ? 520 : cat === 'trig' ? 380 : 360, h: cat === 'graphs' ? 380 : cat === 'trig' ? 390 : 300, scope: 'preview', color: '#299d96', owner: 'preview', a: 1, b: 0, c: 0 }}/></svg><strong>{title}</strong><small>{sub}</small><span className="add-template-icon"><Plus size={14}/></span></button>)}</div>{!templates.some(t => search ? t.join(' ').toLowerCase().includes(search.toLowerCase()) : t[0] === category) && <p>Ничего не найдено. Попробуйте другое название.</p>}</> : modal === 'text' ? <><h2>{draft.type === 'sticky' ? 'Мысль на заметку' : 'Текст и формулы'}</h2><p>Введите текст. Можно использовать математические символы.</p><textarea autoFocus rows={5} value={draft.text || ''} onChange={e => setDraft({ ...draft, text: e.target.value })}/><div className="symbol-row">{['²', '³', '√', 'π', '±', '∞', 'α', 'β', 'Δ', '∑', '→', '≈', '≤', '≥', 'θ', '₀', '₁', '₂'].map(c => <button key={c} onClick={() => setDraft({ ...draft, text: (draft.text || '') + c })}>{c}</button>)}</div><button className="primary full" disabled={!draft.text?.trim()} onClick={() => { const before = items.find(o => o.id === draft.id) || null; persist({ ...draft, w: draft.type==='text'?Math.max(30,Math.max(...draft.text.split('\n').map((s:string)=>s.length))*(draft.stroke||22)*.65):draft.w,h:draft.type==='text'?draft.text.split('\n').length*(draft.stroke||22)*1.35+8:draft.h }, before); setModal(''); setTool('select'); }}>Добавить на доску</button></> : modal === 'graph' ? <><h2>Настройки графика</h2><p>{templates.find(t => t[1] === draft.variant)?.[3]}</p><div className="coefficient-grid">{(draft.variant === 'quadratic' ? ['a', 'b', 'c'] : ['a', 'b']).map(k => <label key={k}>{k}<input type="number" step=".25" value={draft[k] ?? 0} onChange={e => setDraft({ ...draft, [k]: Number(e.target.value) })}/></label>)}</div><label>Масштаб сетки<input type="range" min="15" max="70" value={draft.unit || 32} onChange={e => setDraft({ ...draft, unit: Number(e.target.value) })}/></label><button className="primary full" onClick={() => { persist(draft, current || null); setModal(''); }}>Построить график</button></> : modal === 'student' ? <><h2>{students.some(s => s.id === draft.id) ? 'Карточка ученика' : 'Новый ученик'}</h2><p>Понятная цель помогает двигаться вперёд.</p><form onSubmit={async (e) => { e.preventDefault(); if (!online) {
            notify('Войдите, чтобы сохранять учеников');
            return;
        } try {
            await request({ action: 'student', student: draft });
            setStudents(v => v.some(s => s.id === draft.id) ? v.map(s => s.id === draft.id ? draft : s) : [...v, draft]);
            setModal('');
            notify('Карточка сохранена');
        }
        catch (e: any) {
            notify(e.message);
        } }}><label>Имя ученика<input required autoFocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Например, Анна Смирнова"/></label><label>Класс / направление<input value={draft.grade} onChange={e => setDraft({ ...draft, grade: e.target.value })} placeholder="9 класс · ОГЭ по математике"/></label><label>Цель<textarea rows={2} value={draft.goal} onChange={e => setDraft({ ...draft, goal: e.target.value })} placeholder="Уверенно решать задания второй части"/></label><label>Домашнее задание<textarea rows={2} value={draft.homework} onChange={e => setDraft({ ...draft, homework: e.target.value })} placeholder="Что нужно сделать к следующему занятию?"/></label><button className="primary full">Сохранить карточку</button></form></> : modal === 'rename' ? <><h2>Мои доски</h2><div className="board-list">{boards.map(b => <button key={b.id} className={board?.id === b.id ? 'active' : ''} onClick={() => openBoard(b.id)}><BookOpen size={16}/>{b.title}<ChevronRight size={14}/></button>)}</div><label>Название текущего занятия</label><input autoFocus value={draft.title || ''} onChange={e => setDraft({ ...draft, title: e.target.value })}/><button className="primary full" onClick={async () => { if (!draft.title.trim())
            return; try {
            if (online)
                await request({ action: 'rename', title: draft.title });
            setBoard({ ...board, title: draft.title });
            setModal('');
        }
        catch (e: any) {
            notify(e.message);
        } }}>Сохранить</button><button className="secondary full" onClick={exportBoard}><Download size={16}/>Скачать доску</button>{online && user?.role !== 'student' && <button className="secondary full" onClick={async () => { try {
            const j = await request({ action: 'createBoard', title: 'Новое занятие' });
            await openBoard(j.board);
        }
        catch (e: any) {
            notify(e.message);
        } }}><Plus size={16}/>Создать отдельную доску</button>}</> : null}
 </section></div>}
 {toast && <div className="toast" role="status"><CheckCircle2 size={18}/>{toast}</div>}
 {!online && modal!=='access' && <button className="demo-banner" onClick={() => { setDraft({}); load(true); }}>Нет соединения · Повторить<ArrowRight size={13}/></button>}
 </div>;
}
