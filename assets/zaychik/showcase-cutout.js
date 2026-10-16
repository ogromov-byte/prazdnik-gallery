/* Remove only the exterior, near-neutral studio backdrop.
   Figurine paintwork remains untouched; the 360 frames are never processed. */
(function(){
  'use strict';
  const cache=new Map();
  function eligible(r,g,b){
    const hi=Math.max(r,g,b),lo=Math.min(r,g,b);
    return lo>195 && hi-lo<34;
  }
  function removeBackdrop(image){
    const canvas=document.createElement('canvas');
    canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)return Promise.resolve(null);
    ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    const data=pixels.data,w=canvas.width,h=canvas.height,n=w*h;
    const seen=new Uint8Array(n),queue=new Int32Array(n);
    let head=0,tail=0;
    function visit(i){
      if(seen[i])return;
      seen[i]=1;
      const p=i*4;
      if(eligible(data[p],data[p+1],data[p+2]))queue[tail++]=i;
    }
    for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x)}
    for(let y=1;y<h-1;y++){visit(y*w);visit(y*w+w-1)}
    while(head<tail){
      const i=queue[head++],p=i*4;
      data[p+3]=0;
      if(i>=w)visit(i-w);
      if(i+w<n)visit(i+w);
      if(i%w)visit(i-1);
      if((i+1)%w)visit(i+1);
    }
    // Feather the exterior contour, leaving internal white paint intact.
    const boundary=[];
    for(let q=0;q<tail;q++){
      const i=queue[q],x=i%w,y=(i/w)|0;
      const checks=[x>0?i-1:-1,x+1<w?i+1:-1,y>0?i-w:-1,y+1<h?i+w:-1];
      for(const j of checks)if(j>=0&&!seen[j]&&data[j*4+3]>0)boundary.push(j);
    }
    for(const i of boundary){
      const p=i*4;
      const nearWhite=Math.min(data[p],data[p+1],data[p+2]);
      if(nearWhite>170 && Math.max(data[p],data[p+1],data[p+2])-nearWhite<48){
        data[p+3]=Math.min(data[p+3],Math.max(80,255-(nearWhite-170)*2));
      }
    }
    ctx.putImageData(pixels,0,0);
    return new Promise(resolve=>canvas.toBlob(blob=>resolve(blob?URL.createObjectURL(blob):null),'image/webp',0.9));
  }
  function get(src){
    if(!cache.has(src)){
      const task=new Promise((resolve,reject)=>{
        const img=new Image();
        img.onload=()=>removeBackdrop(img).then(resolve,reject);
        img.onerror=()=>reject(new Error('Showcase image failed to load: '+src));
        img.src=src;
      }).catch(()=>null);
      cache.set(src,task);
    }
    return cache.get(src);
  }
  function apply(img,src){
    get(src).then(url=>{
      if(!url||!img.isConnected)return;
      if(img.dataset.showcaseSource===src || img.getAttribute('src')===src){
        img.dataset.showcaseSource=src;
        img.src=url;
        img.style.webkitMaskImage='none';
        img.style.maskImage='none';
      }
    });
  }
  window.rabbitShowcase={get,apply};
  function start(){
    document.querySelectorAll('img[data-showcase-src]').forEach(img=>{
      const src=img.getAttribute('data-showcase-src');
      img.dataset.showcaseSource=src;
      apply(img,src);
    });
    document.querySelectorAll('img[src*="-showcase.webp"]').forEach(img=>{
      const src=img.getAttribute('src');
      img.dataset.showcaseSource=src;
      apply(img,src);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();