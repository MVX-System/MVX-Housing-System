import { useCallback, useEffect, useRef, useState } from 'react';
import {boundedZoom, clampPan, movedPan, panBounds, zoomAt} from '../utils/meterDocumentViewerMath.mjs';

// PR-10K.6M.4 — separate same-origin, transient reader window.
// Only an authenticated in-memory blob URL is rendered; no external viewer or public R2 URL.
const labels = {
  ru: {fit:'По размеру',plus:'Увеличить',minus:'Уменьшить',close:'Закрыть',loading:'Загрузка документа…',
    help:'Колесо мыши / + − · перетаскивание · щипок двумя пальцами · двойной щелчок',failed:'Не удалось открыть файл'},
  lv: {fit:'Ietilpināt',plus:'Palielināt',minus:'Samazināt',close:'Aizvērt',loading:'Ielādē dokumentu…',
    help:'Peles ritenītis / + − · pārvilkšana · divu pirkstu žests · dubultklikšķis',failed:'Neizdevās atvērt failu'},
  en: {fit:'Fit',plus:'Zoom in',minus:'Zoom out',close:'Close',loading:'Loading document…',
    help:'Mouse wheel / + − · drag · pinch with two fingers · double-click',failed:'Could not open file'}
};

function ImageReader({url,title,win,text}) {
  const viewport=useRef(null),img=useRef(null);
  const transform=useRef({zoom:1,x:0,y:0});
  const [current,setCurrent]=useState(transform.current);
  const pointers=useRef(new Map());
  const gesture=useRef(null);
  const [imageDimensions,setImageDimensions]=useState({width:0,height:0});

  const measurements=useCallback(()=>{
    const rect=viewport.current?.getBoundingClientRect();
    if (!rect) return null;
    const width=img.current?.naturalWidth||0;
    const height=img.current?.naturalHeight||0;
    return {rect,view:{width:rect.width,height:rect.height},image:{width,height}};
  },[]);
  const apply=useCallback((next)=>{
    const m=measurements();
    if (!m) return;
    const zoom=boundedZoom(next.zoom);
    const pan=clampPan(next,panBounds(m.view.width,m.view.height,m.image.width,m.image.height,zoom));
    const result={zoom,...pan};
    transform.current=result;
    setCurrent(result);
  },[measurements]);
  const scale=useCallback((next,clientX,clientY)=>{
    const m=measurements();
    if (!m) return;
    apply(zoomAt(transform.current,next,
      {x:clientX-m.rect.left,y:clientY-m.rect.top},m.view,m.image));
  },[apply,measurements]);
  const scaleCenter=useCallback((factor)=>{
    const m=measurements();
    if (!m) return;
    scale(transform.current.zoom*factor,m.rect.left+m.rect.width/2,m.rect.top+m.rect.height/2);
  },[measurements,scale]);
  const reset=useCallback(()=>apply({zoom:1,x:0,y:0}),[apply]);

  useEffect(()=>{
    const node=viewport.current;
    if (!node) return undefined;
    const wheel=(e)=>{
      e.preventDefault();
      scale(transform.current.zoom*(e.deltaY<0?1.18:1/1.18),e.clientX,e.clientY);
    };
    node.addEventListener('wheel',wheel,{passive:false});
    return ()=>node.removeEventListener('wheel',wheel);
  },[scale]);
  useEffect(()=>{
    const handler=(e)=>{
      if (['+','=','-','0','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
        e.preventDefault();
        if (e.key==='Escape') win.close();
        else if (e.key==='+'||e.key==='=') scaleCenter(1.3);
        else if (e.key==='-') scaleCenter(1/1.3);
        else if (e.key==='0') reset();
        else {
          const m=measurements();
          if (m) apply(movedPan(transform.current,
            e.key==='ArrowLeft'?-70:e.key==='ArrowRight'?70:0,
            e.key==='ArrowUp'?-70:e.key==='ArrowDown'?70:0,m.view,m.image));
        }
      }
    };
    const onResize=()=>apply(transform.current);
    win.addEventListener('keydown',handler);
    win.addEventListener('resize',onResize);
    return ()=>{win.removeEventListener('keydown',handler);win.removeEventListener('resize',onResize);};
  },[win,scaleCenter,measurements,apply,reset]);

  function setupGesture() {
    const points=[...pointers.current.values()];
    if (points.length>=2) {
      const [a,b]=points;
      gesture.current={mode:'pinch',distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),
        center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},start:{...transform.current}};
    } else if (points.length===1) {
      gesture.current={mode:'pan',at:points[0],start:{...transform.current}};
    } else gesture.current=null;
  }
  function down(e) {
    if (e.pointerType==='mouse' && e.button!==0) return;
    e.preventDefault();
    try {e.currentTarget.setPointerCapture(e.pointerId);} catch {} // Safari may not support capture in all contexts.
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    setupGesture();
  }
  function move(e) {
    if (!pointers.current.has(e.pointerId)) return;
    e.preventDefault();
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const g=gesture.current;
    const m=measurements();
    if (!g||!m) return;
    if (g.mode==='pinch' && pointers.current.size>=2) {
      const [a,b]=[...pointers.current.values()];
      const distance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
      const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      const zoom=boundedZoom(g.start.zoom*distance/g.distance);
      const ratio=zoom/g.start.zoom;
      const oldCX=g.center.x-m.rect.left-m.view.width/2;
      const oldCY=g.center.y-m.rect.top-m.view.height/2;
      const newCX=center.x-m.rect.left-m.view.width/2;
      const newCY=center.y-m.rect.top-m.view.height/2;
      apply({zoom,x:newCX-ratio*(oldCX-g.start.x),y:newCY-ratio*(oldCY-g.start.y)});
    } else if (g.mode==='pan' && pointers.current.size===1) {
      apply(movedPan(g.start,e.clientX-g.at.x,e.clientY-g.at.y,m.view,m.image));
    }
  }
  function up(e) {
    pointers.current.delete(e.pointerId);
    try {e.currentTarget.releasePointerCapture(e.pointerId);} catch {}
    setupGesture();
  }
  const control={background:'#263244',color:'#fff',border:'1px solid #5d718d',borderRadius:6,
    padding:'8px 12px',cursor:'pointer',fontSize:16,flexShrink:0,minHeight:40};
  return <div style={{display:'flex',flexDirection:'column',width:'100%',height:'100dvh',minHeight:'100vh',
      overflow:'hidden',background:'#101821',color:'#fff',fontFamily:'system-ui,-apple-system,sans-serif'}}>
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'#172331',flexWrap:'wrap'}}>
      <strong style={{flex:'1 1 160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={title}>{title}</strong>
      <button style={control} type="button" title={text.minus} aria-label={text.minus} onClick={()=>scaleCenter(1/1.3)}>−</button>
      <span style={{minWidth:52,textAlign:'center',fontVariantNumeric:'tabular-nums'}}>{Math.round(current.zoom*100)}%</span>
      <button style={control} type="button" title={text.plus} aria-label={text.plus} onClick={()=>scaleCenter(1.3)}>+</button>
      <button style={control} type="button" onClick={reset}>{text.fit}</button>
      <button style={control} type="button" onClick={()=>win.close()}>{text.close}</button>
    </div>
    <div ref={viewport} role="img" aria-label={title} style={{position:'relative',flex:1,minHeight:0,
      overflow:'hidden',touchAction:'none',cursor:current.zoom>1?'grab':'zoom-in',userSelect:'none'}}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onDoubleClick={e=>scale(current.zoom>1.1?1:2.3,e.clientX,e.clientY)}>
      <img ref={img} src={url} alt={title} draggable="false"
        onLoad={e=>{setImageDimensions({width:e.currentTarget.naturalWidth,height:e.currentTarget.naturalHeight});reset();}}
        onDragStart={e=>e.preventDefault()}
        style={{display:'block',position:'absolute',width:'100%',height:'100%',objectFit:'contain',top:0,left:0,
          pointerEvents:'none',transform:`translate3d(${current.x}px,${current.y}px,0) scale(${current.zoom})`,
          transformOrigin:'center center'}} />
    </div>
    <div style={{padding:'5px 12px',fontSize:12,color:'#cbd5e1',textAlign:'center'}}>
      {text.help} {imageDimensions.width>0?` · ${imageDimensions.width} × ${imageDimensions.height}`:''}
    </div>
  </div>;
}

export default function MeterDocumentWindow({win,preview,language='ru',onClose}) {
  const text=labels[language]||labels.en;
  useEffect(()=>{
    const body=win.document.body;
    body.style.margin='0';body.style.padding='0';body.style.overflow='hidden';
    win.document.title=preview?.title||'MVX Document';
    let meta=win.document.querySelector('meta[name="viewport"]');
    if (!meta) {meta=win.document.createElement('meta');meta.name='viewport';win.document.head.appendChild(meta);}
    meta.content='width=device-width, initial-scale=1';
    let referrer=win.document.querySelector('meta[name="referrer"]');
    if (!referrer) {referrer=win.document.createElement('meta');referrer.name='referrer';win.document.head.appendChild(referrer);}
    referrer.content='no-referrer';
  },[win,preview?.title]);
  if (!preview?.url) return <div style={{padding:24,fontFamily:'system-ui,sans-serif'}}>
    {preview?.error?`${text.failed}: ${preview.error}`:text.loading}
    <button style={{display:'block',marginTop:24}} type="button" onClick={onClose}>{text.close}</button>
  </div>;
  if (preview.type==='image') return <ImageReader key={preview.url} url={preview.url} title={preview.title} win={win} text={text} />;
  return <div style={{display:'flex',flexDirection:'column',height:'100dvh',minHeight:'100vh',background:'#172331',color:'#fff'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',fontFamily:'system-ui',padding:'8px 12px'}}>
      <strong style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{preview.title}</strong>
      <button type="button" onClick={onClose}>{text.close}</button>
    </div>
    <iframe title={preview.title} src={preview.url} referrerPolicy="no-referrer"
      style={{display:'block',width:'100%',flex:1,minHeight:0,border:0,background:'#fff'}} />
  </div>;
}
