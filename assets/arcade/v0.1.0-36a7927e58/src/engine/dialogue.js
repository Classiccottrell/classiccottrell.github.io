// Position speech in screen coordinates, after the cropped world camera transform.
export function createDialogue(stage,canvas){
 const element=document.createElement('div');element.className='cc-dialogue';element.hidden=true;
 element.setAttribute('role','status');element.setAttribute('aria-live','polite');element.setAttribute('aria-atomic','true');
 const style=document.createElement('style');style.textContent=`
 .cc-game-stage{position:relative}
 .cc-dialogue{position:absolute;box-sizing:border-box;background:#FFF6DC;color:#19232D;border:1px solid #19232D;font:11px/12px "CC Arcade",monospace;z-index:1;pointer-events:none;overflow-wrap:break-word;}
 .cc-dialogue[hidden]{display:none}.cc-dialogue p{margin:0;font:inherit}
 .cc-dialogue-tail{position:absolute;top:100%;left:var(--pointer-x);overflow:visible}
 `;
 const text=document.createElement('p');
 const tail=document.createElementNS('http://www.w3.org/2000/svg','svg');tail.classList.add('cc-dialogue-tail');tail.setAttribute('viewBox','0 0 8 6');tail.setAttribute('aria-hidden','true');tail.setAttribute('shape-rendering','crispEdges');
 tail.innerHTML='<path fill="#19232D" d="M0 0h8v1H6v1H4v1H2v2H0z"/><path fill="#FFF6DC" d="M1 0h5v1H4v1H2v1H1z"/>';
 element.append(style,text,tail);stage.appendChild(element);
 let last='',metrics='',height=0,width=0;
 return {get height(){return 0;},update(message){
  element.hidden=!message;if(!message)return;
  const scale=canvas.clientHeight/180,available=canvas.clientWidth;
  const key=message.actorId+'\n'+message.text;
  if(key!==last){last=key;text.textContent=message.text;element.dataset.speaker=message.speaker;element.setAttribute('aria-label',`${message.speaker}: ${message.text}`);}
  const sizeKey=key+'\n'+scale+':'+available;
  if(metrics!==sizeKey){
   metrics=sizeKey;element.style.fontSize=`${11*scale}px`;element.style.lineHeight=`${12*scale}px`;element.style.padding=`${4*scale}px`;element.style.borderWidth=`${scale}px`;
   element.style.width=`${Math.max(40,Math.min(available-16*scale,(message.text.length*7+10)*scale,300*scale))}px`;
   tail.style.width=`${8*scale}px`;tail.style.height=`${6*scale}px`;
   const box=element.getBoundingClientRect();width=box.width;height=box.height;
  }
  const headX=canvas.offsetLeft+message.x*2*scale,headY=canvas.offsetTop+message.y*scale;
  const left=Math.max(canvas.offsetLeft+4*scale,Math.min(canvas.offsetLeft+available-width-4*scale,headX-width/2));
  const top=Math.max(canvas.offsetTop+24*scale,Math.min(canvas.offsetTop+canvas.clientHeight-height-6*scale,headY-height-5*scale));
  element.style.left=`${Math.round(left)}px`;element.style.top=`${Math.round(top)}px`;
  element.style.setProperty('--pointer-x',`${Math.round(Math.max(4*scale,Math.min(width-10*scale,headX-left)))}px`);
 },destroy(){element.remove();}};
}
