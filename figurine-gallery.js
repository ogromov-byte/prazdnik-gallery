/* Prazdnik canonical gallery: one front image + five changing previews + 24 real frames. */
(()=>{
'use strict';
const slug=document.body.dataset.figurine;
if(!slug)return;
const base='assets/'+slug+'/';
const source=slug==='moryak'?[1,4,7,12,18,21]:slug==='snezhinka'?[1,4,7,13,19,21]:[1,4,7,13,19,22];
const spinCount=(slug==='moryak'||slug==='snezhinka')?23:24;
const angle=['0°','45°','90°','180°','−90°','−45°'];
const stills=source.map((_,i)=>base+'photo-'+String(i+1).padStart(2,'0')+'-showcase.webp'+'?v=20261024-360');
const large=source.map((_,i)=>base+'photo-'+String(i+1).padStart(2,'0')+'-large.webp?v=20261024-360');
const spins=Array.from({length:spinCount},(_,i)=>base+'spin-'+String(i+1).padStart(2,'0')+'.webp'+'?v=20261024-360');
function pieroPreview(img,frame){
 const url=spins[frame-1],raw=new Image();
 raw.onload=()=>{
  try{
   const c=document.createElement('canvas');c.width=raw.naturalWidth;c.height=raw.naturalHeight;
   const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(raw,0,0);
   const image=ctx.getImageData(0,0,c.width,c.height),d=image.data,w=c.width,h=c.height;
   /* Rotation frames may contain an opaque photographic backdrop. Remove only
      background connected to the outside, keeping light parts of the artwork. */
   const corner=[0,(w-1)*4,((h-1)*w)*4,(h*w-1)*4];
   const bg=[0,1,2].map(k=>corner.reduce((a,p)=>a+d[p+k],0)/4);
   const seen=new Uint8Array(w*h),stack=[];
   function eligible(i){
    const p=i*4;
    if(d[p+3]<12)return true;
    const dist=Math.abs(d[p]-bg[0])+Math.abs(d[p+1]-bg[1])+Math.abs(d[p+2]-bg[2]);
    return dist<55;
   }
   function add(i){if(i>=0&&i<w*h&&!seen[i]&&eligible(i)){seen[i]=1;stack.push(i)}}
   for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}
   for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
   while(stack.length){
    const i=stack.pop(),x=i%w;
    if(x>0)add(i-1);if(x<w-1)add(i+1);
    if(i>=w)add(i-w);if(i<w*(h-1))add(i+w);
   }
   let left=w,top=h,right=-1,bottom=-1;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,p=i*4;
    if(seen[i])d[p+3]=0;
    if(d[p+3]>25){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
   }
   if(right<left||bottom<top){img.src=url;return}
   ctx.putImageData(image,0,0);
   const pad=Math.ceil(Math.max(right-left,bottom-top)*0.035);
   left=Math.max(0,left-pad);top=Math.max(0,top-pad);
   right=Math.min(w-1,right+pad);bottom=Math.min(h-1,bottom+pad);
   const out=document.createElement('canvas');out.width=180;out.height=220;
   const o=out.getContext('2d'),cw=right-left+1,ch=bottom-top+1;
   const k=Math.min(170/cw,210/ch);
   o.drawImage(c,left,top,cw,ch,(180-cw*k)/2,(220-ch*k)/2,cw*k,ch*k);
   img.src=out.toDataURL('image/png');
  }catch(e){img.src=url}
 };
 raw.onerror=()=>{img.src=url};
 raw.src=url;
}

const view=document.querySelector('.product-hero .photo-view'),frame=view?.querySelector('.photo-frame'),img=document.getElementById('main-photo');
const strip=document.getElementById('photo-thumbnails'),counter=document.getElementById('photo-count');
const modePhoto=document.getElementById('mode-photo'),mode360=document.getElementById('mode-360');
const prev=document.getElementById('photo-prev'),next=document.getElementById('photo-next'),zoom=document.getElementById('detail-link'),note=document.getElementById('rotation-note');
if(!view||!frame||!img||!strip||!counter||!modePhoto||!mode360)return;
view.classList.add('canonical-figurine');
if(slug==='zaychik')view.classList.add('rabbit-extra-ear');
let current=0,rotation=0,mode='photo',startX=null,delta=0,activePointer=null;
let fitEpoch=0;
let previewEpoch=0;
const pieroPreviewCache=new Map();


function fitImage(){
 img.style.removeProperty('transform');
 img.style.removeProperty('height');
 img.style.removeProperty('width');
 img.style.removeProperty('max-height');
 img.style.removeProperty('max-width');
 img.style.removeProperty('object-fit');
}
function render(){
 view.classList.toggle('rotation',mode==='360');
 modePhoto.classList.toggle('active',mode==='photo');
 mode360.classList.toggle('active',mode==='360');
 modePhoto.disabled=false;mode360.disabled=false;
 modePhoto.setAttribute('aria-pressed',String(mode==='photo'));
 mode360.setAttribute('aria-pressed',String(mode==='360'));
 const src=mode==='360'?spins[rotation]:stills[current];
 img.onerror=()=>{if(mode==='photo'&&!img.dataset.fallback){img.dataset.fallback='1';img.src=spins[source[current]-1]}};
 img.dataset.fallback='';img.src=src;
 img.alt=mode==='360'?'Фигурка, 360°, кадр '+(rotation+1)+' из '+spinCount:'Фигурка, фото '+(current+1)+' из 6';
 counter.hidden=mode==='360';counter.textContent=mode==='360'?'':(current+1)+' / 6';
 strip.hidden=mode==='360';
 // Keep all six preview DOM nodes mounted. No flash, image reload, or angle text on selection.
 if(!strip.dataset.stablePreviews){
  strip.dataset.stablePreviews='1';
  strip.replaceChildren();
  stills.forEach((file,i)=>{
   const button=document.createElement('button');button.type='button';
   button.className='photo-thumbnail';button.setAttribute('aria-label','Ракурс '+angle[i]);
   const thumb=document.createElement('img');thumb.alt='';thumb.draggable=false;
   thumb.onerror=()=>{if(!thumb.dataset.fallback){thumb.dataset.fallback='1';thumb.src=spins[source[i]-1]}};
   if(slug==='piero'){
    thumb.src=spins[source[i]-1];
    pieroPreview({set src(value){
     pieroPreviewCache.set(source[i],value);
     if(thumb.isConnected)thumb.src=value;
    }},source[i]);
   }else thumb.src=file;
   button.append(thumb);
   button.onclick=()=>{
    if(mode!=='photo'||current===i)return;
    const next=new Image();next.src=stills[i];
    const apply=()=>{current=i;render()};
    if(next.complete)apply();else{next.onload=apply;next.onerror=apply}
   };
   strip.append(button);
  });
 }
 [...strip.children].forEach((button,i)=>{
  button.style.setProperty('display',mode==='photo'&&i!==current?'':'none','important');
 });
 if(note)note.textContent=mode==='360'?'Поверни фигурку мышью или пальцем':'Шесть ракурсов работы';
 fitImage();
}
function whenLoaded(url,go){const im=new Image();im.src=url;if(im.complete&&im.naturalWidth)go();else{im.onload=go;im.onerror=go}}
/* Switch views only after the target picture is decoded: the old picture never shows inside the new frame size. */
modePhoto.onclick=()=>{if(mode==='photo')return;whenLoaded(stills[current],()=>{mode='photo';render()})};
mode360.onclick=()=>{if(mode==='360')return;const r=source[current]-1;whenLoaded(spins[r],()=>{mode='360';rotation=r;render();spins.forEach(s=>{const im=new Image();im.src=s})})};
if(prev)prev.onclick=()=>{if(mode==='photo'){current=(current+5)%6;render()}};
if(next)next.onclick=()=>{if(mode==='photo'){current=(current+1)%6;render()}};
function rotate(dx){delta+=dx;const steps=Math.trunc(delta/12);if(steps){rotation=((rotation-steps)%spinCount+spinCount)%spinCount;delta-=steps*12;render()}}
frame.addEventListener('pointerdown',e=>{if(mode!=='360'||e.pointerType==='touch'||e.target.closest('button'))return;startX=e.clientX;activePointer=e.pointerId;delta=0;try{frame.setPointerCapture(e.pointerId)}catch(_){ }e.preventDefault()});
frame.addEventListener('pointermove',e=>{if(mode!=='360'||activePointer!==e.pointerId||startX===null)return;rotate(e.clientX-startX);startX=e.clientX});
const stop=()=>{startX=null;activePointer=null};
frame.addEventListener('pointerup',stop);frame.addEventListener('pointercancel',stop);
let touchX=null;
frame.addEventListener('touchstart',e=>{if(mode!=='360'||!e.touches.length)return;touchX=e.touches[0].clientX;delta=0},{passive:true});
frame.addEventListener('touchmove',e=>{if(mode!=='360'||touchX===null||!e.touches.length)return;e.preventDefault();let x=e.touches[0].clientX;rotate(x-touchX);touchX=x},{passive:false});
frame.addEventListener('touchend',()=>{touchX=null},{passive:true});
frame.addEventListener('dragstart',e=>e.preventDefault());
frame.tabIndex=0;
frame.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();if(mode==='360'){rotation=(rotation+(e.key==='ArrowLeft'?spinCount-1:1))%spinCount;render()}else{current=(current+(e.key==='ArrowLeft'?5:1))%6;render()}},true);
if(zoom){zoom.onclick=e=>{
 e.preventDefault();
 let dialog=document.getElementById('canonical-loupe');
 if(!dialog){
  dialog=document.createElement('dialog');dialog.id='canonical-loupe';
  dialog.innerHTML='<div class="loupe-surface"><button type="button" class="canonical-close" aria-label="Закрыть">×</button><button type="button" class="loupe-arrow loupe-prev" aria-label="Предыдущее фото">‹</button><img class="loupe-photo" alt="Увеличенное изображение" tabindex="0"><button type="button" class="loupe-arrow loupe-next" aria-label="Следующее фото">›</button><span class="loupe-index" aria-live="polite"></span></div>';
  document.body.append(dialog);
  const pic=dialog.querySelector('.loupe-photo');
  const draw=()=>{
   pic.classList.remove('is-zoomed');
   pic.src=large[dialog._photoIndex];
   pic.onerror=()=>{pic.onerror=null;pic.src=stills[dialog._photoIndex]};
   pic.alt=(document.querySelector('.product-copy h1')?.textContent?.trim()||'Фигурка')+', ракурс '+(dialog._photoIndex+1)+' из 6';
   dialog.querySelector('.loupe-index').textContent=(dialog._photoIndex+1)+' / 6';
  };
  const step=dir=>{dialog._photoIndex=(dialog._photoIndex+dir+6)%6;draw()};
  dialog.querySelector('.loupe-prev').onclick=()=>step(-1);
  dialog.querySelector('.loupe-next').onclick=()=>step(1);
  dialog.querySelector('.canonical-close').onclick=()=>dialog.close();
  pic.onclick=()=>pic.classList.toggle('is-zoomed');
  dialog.addEventListener('keydown',ev=>{
   if(ev.key==='ArrowLeft'){ev.preventDefault();step(-1)}
   if(ev.key==='ArrowRight'){ev.preventDefault();step(1)}
  });
  dialog.addEventListener('click',ev=>{if(ev.target===dialog)dialog.close()});
  dialog._draw=draw;
 }
 dialog._photoIndex=mode==='360'?Math.min(5,source.reduce((best,f,i)=>Math.abs(f-1-rotation)<Math.abs(source[best]-1-rotation)?i:best,0)):current;
 dialog._draw();
 if(!dialog.open)dialog.showModal();
}};

img.addEventListener('load',fitImage);
window.addEventListener('resize',()=>{if(img.complete)fitImage()},{passive:true});

// Only approved, actually published figurines participate in viewing history.
const recentKnown={piero:{name:'Пьеро',url:'piero.html',image:'assets/piero/recent-thumb.webp?v=20261024-studio'},moryak:{name:'Моряк',url:'moryak.html',image:'assets/moryak/recent-thumb.webp?v=20261024-studio'},unicorn:{name:'Девочка с единорогом',url:'unicorn.html',image:'assets/unicorn/recent-thumb.webp?v=20261024-studio'},horse:{name:'Мальчик с лошадкой',url:'horse.html',image:'assets/horse/recent-thumb.webp?v=20261024-studio'},teddy:{name:'Мальчик с мишкой',url:'teddy.html',image:'assets/teddy/recent-thumb.webp?v=20261024-studio'},angel:{name:'Ангел с дудочкой',url:'angel.html',image:'assets/angel/recent-thumb.webp?v=20261024-studio'},kolombina:{name:'Коломбина',url:'kolombina.html',image:'assets/kolombina/recent-thumb.webp?v=20261024-studio'},snezhinka:{name:'Снежинка',url:'snezhinka.html',image:'assets/snezhinka/recent-thumb.webp?v=20261024-studio'},'angel-svirel':{name:'Ангел со свирелью',url:'angel-svirel.html',image:'assets/angel-svirel/recent-thumb.webp?v=20261024-studio'},zaychik:{name:'Зайчик',url:'zaychik.html',image:'assets/zaychik/recent-thumb.webp?v=20261024-studio'}};
try{
 const key='prazdnik-figurine-recent';
 const old=JSON.parse(localStorage.getItem(key)||'[]');
 const values=Array.isArray(old)?old.filter(x=>typeof x==='string'&&recentKnown[x]&&x!==slug):[];
 localStorage.setItem(key,JSON.stringify([slug,...values].slice(0,10)));
 const box=document.getElementById('recently-viewed'),grid=document.getElementById('recent-grid');
 if(box&&grid&&values.length){
  for(const id of values){
   const item=recentKnown[id],a=document.createElement('a');a.href=item.url;
   const img=document.createElement('img');img.src=item.image;img.alt=item.name;img.loading='lazy';
   const cap=document.createElement('span');cap.textContent=item.name;
   a.append(img,cap);grid.append(a);
  }
  box.hidden=false;
 }
}catch(_){}
render();
})();