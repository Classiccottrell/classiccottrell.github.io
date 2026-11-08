// A reserved dialogue bubble keeps readable speech outside the cropped fight camera.
export function createDialogue(container){
 const element=document.createElement('div');element.className='cc-dialogue';
 element.setAttribute('role','status');element.setAttribute('aria-live','polite');element.setAttribute('aria-atomic','true');
 const style=document.createElement('style');style.textContent=`
 .cc-dialogue{box-sizing:border-box;flex:none;width:100%;height:140px;padding:10px max(12px,env(safe-area-inset-right)) 10px max(12px,env(safe-area-inset-left));background:#19232D;color:#19232D;font:22px/24px "CC Arcade",monospace;}
 .cc-dialogue-bubble{box-sizing:border-box;position:relative;max-width:680px;height:100%;margin:0 auto;padding:8px 12px;border:2px solid #9E9B8C;background:#FFF6DC;overflow:auto;}
 .cc-dialogue-speaker{display:block;margin:0 0 4px;font:11px/13px "CC Arcade",monospace;text-transform:uppercase;}
 .cc-dialogue p{margin:0;font:inherit;overflow-wrap:break-word;}
 @media(max-height:500px) and (orientation:landscape){.cc-dialogue{height:76px;font-size:11px;line-height:14px;padding-block:6px}.cc-dialogue-speaker{margin-bottom:2px}}
 `;
 const bubble=document.createElement('div');bubble.className='cc-dialogue-bubble';
 const speaker=document.createElement('span');speaker.className='cc-dialogue-speaker';
 const text=document.createElement('p');bubble.append(speaker,text);element.append(style,bubble);container.appendChild(element);
 let last='';
 return {get height(){return element.getBoundingClientRect().height;},update(message){
  const label=message?.speaker||'Controls',line=message?.text||'Move: A/D or arrows. Space x3: combo. L/C: dodge.';
  const key=label+'\n'+line;if(key===last)return;last=key;
  speaker.textContent=label;text.textContent=line;bubble.scrollTop=0;element.dataset.speaking=String(!!message);
 },destroy(){element.remove();}};
}
