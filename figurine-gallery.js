/* Prazdnik canonical gallery: one front image + five changing previews + 24 real frames. */
(()=>{
'use strict';
const slug=document.body.dataset.figurine;
if(!slug)return;
const base='assets/'+slug+'/';
const source=[1,4,7,13,19,22];
const angle=['0°','45°','90°','180°','−90°','−45°'];
const stills=source.map((_,i)=>slug==='piero'&&i===4?base+'spin-19.webp':base+'photo-'+String(i+1).padStart(2,'0')+'-showcase.webp');
const large=source.map((_,i)=>base+'photo-'+String(i+1).padStart(2,'0')+'-large.webp');
const spins=Array.from({length:24},(_,i)=>base+'spin-'+String(i+1).padStart(2,'0')+'.webp');
function pieroPreview(img,frame){
 const url=spins[frame-1],raw=new Image();
 raw.onload=()=>{
  try{
   const c=document.createElement('canvas');c.width=raw.naturalWidth;c.height=raw.naturalHeight;
   const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(raw,0,0);
   const pixels=ctx.getImageData(0,0,c.width,c.height).data;
   let left=c.width,top=c.height,right=-1,bottom=-1;
   const stride=2;
   for(let y=0;y<c.height;y+=stride)for(let x=0;x<c.width;x+=stride){
    if(pixels[(y*c.width+x)*4+3]>20){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}
   }
   if(right<left||bottom<top){img.src=url;return}
   const w=right-left+2,h=bottom-top+2,out=document.createElement('canvas');
   out.width=180;out.height=220;const o=out.getContext('2d');
   const k=Math.min(162/w,204/h);
   o.drawImage(c,left,top,w,h,(180-w*k)/2,(220-h*k)/2,w*k,h*k);
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
 img.alt=mode==='360'?'Фигурка, 360°, кадр '+(rotation+1)+' из 24':'Фигурка, фото '+(current+1)+' из 6';
 counter.hidden=mode==='360';counter.textContent=mode==='360'?'':(current+1)+' / 6';
 strip.hidden=mode==='360';
 strip.replaceChildren();
 if(mode==='photo')stills.forEach((file,i)=>{
  if(i===current)return;
  const b=document.createElement('button');b.className='photo-thumbnail';b.type='button';b.setAttribute('aria-label','Ракурс '+angle[i]);
  const t=document.createElement('img');t.alt='Ракурс '+angle[i];t.draggable=false;t.onerror=()=>{if(!t.dataset.fallback){t.dataset.fallback='1';t.src=spins[source[i]-1]}};if(slug==='piero')pieroPreview(t,source[i]);else t.src=file;b.append(t);
  b.onclick=()=>{current=i;render()};strip.append(b);
 });
 if(note)note.textContent=mode==='360'?'Поверни фигурку мышью или пальцем':'Шесть ракурсов работы';
 fitImage();
}
modePhoto.onclick=()=>{mode='photo';render()};
mode360.onclick=()=>{mode='360';rotation=source[current]-1;render();spins.forEach(s=>{const im=new Image();im.src=s})};
if(prev)prev.onclick=()=>{if(mode==='photo'){current=(current+5)%6;render()}};
if(next)next.onclick=()=>{if(mode==='photo'){current=(current+1)%6;render()}};
function rotate(dx){delta+=dx;const steps=Math.trunc(delta/12);if(steps){rotation=((rotation-steps)%24+24)%24;delta-=steps*12;render()}}
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
frame.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();if(mode==='360'){rotation=(rotation+(e.key==='ArrowLeft'?23:1))%24;render()}else{current=(current+(e.key==='ArrowLeft'?5:1))%6;render()}},true);
if(zoom){zoom.onclick=e=>{
 e.preventDefault();const p=mode==='360'?spins[rotation]:large[current];
 let dialog=document.getElementById('canonical-loupe');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='canonical-loupe';dialog.innerHTML='<button class="canonical-close" aria-label="Закрыть">×</button><img alt="Увеличенное изображение">';document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('click',ev=>{if(ev.target===dialog)dialog.close()});}
 dialog.querySelector('img').src=p;dialog.showModal();
}}
img.addEventListener('load',fitImage);
window.addEventListener('resize',()=>{if(img.complete)fitImage()},{passive:true});
render();
})();