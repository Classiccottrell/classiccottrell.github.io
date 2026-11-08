// Native buttons share real input actions; the game canvas remains unobscured.
export function createTouchControls(container,canvas,input,{onPress,onGesture,onClose}){
  const panel=document.createElement('div');panel.className='cc-touch-controls';
  panel.setAttribute('role','group');panel.setAttribute('aria-label','Game touch controls');
  const style=document.createElement('style');
  style.textContent=`
    .cc-touch-controls{display:none;box-sizing:border-box;background:#19232D;color:#F5E6C8;border-top:2px solid #FFD400;padding:10px max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));}
    .cc-touch-controls .cc-touch-row{display:none;grid-template-columns:repeat(5,minmax(44px,1fr));gap:8px;max-width:520px;margin:auto}
    .cc-touch-controls button{min-width:44px;min-height:44px;border:2px solid #9E9B8C;border-radius:0;background:#294B58;color:#FFF6DC;font:bold 12px monospace;touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer}
    .cc-touch-controls button[data-action=attack]{border-color:#FFD400;color:#FFD400}
    .cc-touch-controls button:focus-visible{outline:3px solid #FFD400;outline-offset:2px}
    .cc-touch-controls button:active,.cc-touch-controls button[data-held=true]{background:#FFD400;color:#19232D;border-color:#FFD400}
    .cc-touch-controls button:disabled{opacity:.45;cursor:default}
    .cc-touch-controls .cc-touch-tools{display:flex;justify-content:space-between;gap:8px;max-width:520px;margin:8px auto 0}
    .cc-touch-controls .cc-touch-tools button{padding:0 12px;background:transparent;font-size:11px}
    .cc-touch-controls .cc-touch-tools [data-action=skip]{display:none}
    .cc-touch-controls[data-expanded=true]{display:block;position:absolute;left:0;right:0;bottom:0;z-index:1}
    @media(any-pointer:coarse){.cc-touch-controls{display:block}.cc-touch-controls .cc-touch-row{display:grid}.cc-touch-controls .cc-touch-tools [data-action=skip]{display:block}}
  `;
  const row=document.createElement('div');row.className='cc-touch-row';
  const tools=document.createElement('div');tools.className='cc-touch-tools';
  const active=new Map(),buttons={};let last='';
  function release(){
    active.clear();input.releaseAll();
    for(const button of Object.values(buttons))delete button.dataset.held;
  }
  for(const [action,text,label] of [['left','LEFT','Walk left'],['right','RIGHT','Walk right'],['attack','PUNCH','Attack'],['dodge','DODGE','Dodge'],['enter','START','Start game'],['skip','Skip fights','Skip fights']]){
    const button=document.createElement('button');button.type='button';button.textContent=text;
    button.dataset.action=action;button.setAttribute('aria-label',label);buttons[action]=button;
    button.addEventListener('pointerdown',event=>{
      if(button.disabled||event.button>0)return;
      event.preventDefault();canvas.focus({preventScroll:true});
      if(!onPress(action))return;
      active.set(event.pointerId,{action,button});button.dataset.held='true';
      input.touch(action,true);button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointerup',event=>{
      const held=active.get(event.pointerId);if(!held)return;
      active.delete(event.pointerId);
      if(![...active.values()].some(p=>p.action===action)){input.touch(action,false);delete button.dataset.held;}
    });
    for(const name of ['pointercancel','lostpointercapture'])button.addEventListener(name,event=>{if(active.has(event.pointerId))release();});
    button.addEventListener('click',event=>{
      onGesture(action);
      if(event.detail===0&&onPress(action)){input.touch(action,true);input.touch(action,false);}
    });
    (action==='skip'?tools:row).appendChild(button);
  }
  const close=document.createElement('button');close.type='button';close.textContent='Close game';close.hidden=true;close.style.marginLeft='auto';
  close.addEventListener('click',onClose);tools.appendChild(close);
  panel.append(style,row,tools);container.after(panel);canvas.addEventListener('blur',release);
  return {
    release,
    get height(){return panel.getBoundingClientRect().height;},
    update({scene,blocked,skip,replay=false}){
      const state=`${scene}:${blocked}:${skip}:${replay}`;if(state===last)return;last=state;
      const playing=scene==='overworld'||scene==='room';
      for(const [action,button] of Object.entries(buttons))button.disabled=blocked||(!playing&&action!=='enter');
      buttons.enter.textContent=replay?'NEXT LAP':playing?'USE':'START';
      buttons.enter.setAttribute('aria-label',replay?'Next lap':playing?(scene==='room'?'Interact':'Enter door'):'Start game');
      buttons.skip.setAttribute('aria-pressed',String(skip));
      buttons.skip.textContent=skip?'Fights skipped':'Skip fights';
      if(blocked)release();
    },
    setExpanded(expanded){
      release();panel.dataset.expanded=String(expanded);close.hidden=!expanded;
      if(expanded)container.appendChild(panel);else container.after(panel);
    },
    destroy(){release();canvas.removeEventListener('blur',release);panel.remove();},
  };
}
