/* Homepage-only studio composition: real 15-degree frames, normalized silhouette bounds. */
(()=>{
const items=[...document.querySelectorAll('.collection-grid .product-card')];
const active=new Set(['zaychik','piero','moryak','angel','unicorn','horse','snezhinka']);
function normalize(card){
 const slug=(card.getAttribute('href')||'').replace(/\.html.*$/,'');
 if(!active.has(slug))return;
 const img=card.querySelector('.product-image img');
 const host=card.querySelector('.product-image');
 if(!img||!host)return;
 const source=new Image();
 const key=img.getAttribute('src');
 source.onload=()=>{
  if(img.getAttribute('src')!==key)return;
  try{
   const W=120,H=Math.round(source.naturalHeight*W/source.naturalWidth);
   const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,W,H);
   const pixels=ctx.getImageData(0,0,W,H).data;
   let min=H,max=0;
   for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(pixels[(y*W+x)*4+3]>45){min=Math.min(min,y);max=Math.max(max,y+1)}
   if(max<=min)return;
   const room=host.getBoundingClientRect().height;
   const visible=slug==='zaychik'?room-44:room-80;
   const scale=Math.min(room*2.8,visible/((max-min)/H));
   const cy=(min+max)/(2*H);
   img.style.setProperty('height',scale+'px','important');
   img.style.setProperty('width','auto','important');
   img.style.setProperty('max-width','none','important');
   img.style.setProperty('max-height','none','important');
   img.style.setProperty('flex','none','important');
   img.style.setProperty('transform','translateY('+((.5-cy)*scale)+'px)','important');
   img.style.setProperty('object-fit','contain','important');
  }catch(_){}
 };
 source.src=key;
}
function run(){items.forEach(normalize)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(run,180)},{passive:true});
})();