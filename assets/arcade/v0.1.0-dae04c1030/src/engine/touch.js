// Native buttons share real input actions; the game canvas remains unobscured.
export function createTouchControls(container,canvas,input,{onPress,onGesture,onClose,onExpand,onMute,onLayout}){
  const panel=document.createElement('div');panel.className='cc-touch-controls';
  panel.setAttribute('role','group');panel.setAttribute('aria-label','Game controls');
  const style=document.createElement('style');
  style.textContent=`
    @font-face{font-family:"CC Arcade";src:url("${new URL('../../art/font/DepartureMono-Regular.woff2',import.meta.url).href}") format("woff2");font-display:swap;}
    .cc-touch-controls{display:block;flex:none;width:100%;max-height:38%;overflow-y:auto;box-sizing:border-box;background:#19232D;color:#F5E6C8;border-top:2px solid #FFD400;padding:8px max(10px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));font:11px/1.5 "CC Arcade",monospace;}
    .cc-touch-controls .cc-touch-row{display:none;grid-template-columns:repeat(5,minmax(44px,1fr));gap:8px;max-width:520px;margin:auto}
    .cc-touch-controls button{min-width:44px;min-height:44px;border:2px solid #9E9B8C;border-radius:0;background:#294B58;color:#FFF6DC;font:11px "CC Arcade",monospace;touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer}
    .cc-touch-controls button[data-action=attack]{border-color:#FFD400;color:#FFD400}
    .cc-touch-controls button:focus-visible{outline:3px solid #FFD400;outline-offset:2px}
    .cc-touch-controls button:active,.cc-touch-controls button[data-held=true]{background:#FFD400;color:#19232D;border-color:#FFD400}
    .cc-touch-controls button:disabled{opacity:.45;cursor:default}
    .cc-touch-controls .cc-touch-tools{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;max-width:640px;margin:0 auto}
    .cc-touch-controls .cc-touch-tools button{padding:0 12px;background:transparent;font-size:11px}
    .cc-touch-controls .cc-touch-tools [data-action=skip]{display:none}
    .cc-touch-controls .cc-control-help{max-width:640px;margin:0 auto;max-height:112px;overflow:auto;}
    .cc-touch-controls .cc-control-help p{margin:8px 0 0}
    .cc-touch-controls kbd{font:inherit;color:#FFD400}
    @media(any-pointer:coarse){.cc-touch-controls .cc-touch-row{display:grid;margin-bottom:8px}.cc-touch-controls .cc-touch-tools [data-action=skip]{display:block}}
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
  function tool(label,callback){const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',callback);tools.appendChild(button);return button;}
  const sound=tool('Sound off',onMute);
  const help=document.createElement('div');help.className='cc-control-help';help.hidden=true;
  help.innerHTML='<p><kbd>Arrows / A D</kbd> move · <kbd>Space / J</kbd> punch, punch, kick · <kbd>L / C</kbd> dodge · <kbd>F</kbd> skip fights · <kbd>Esc</kbd> leave fullscreen. Tap Punch three times to chain the kick. Collect Terry for a power boost. Beat the boss, then walk right for the next lap.</p>';
  const helpButton=tool('Controls',()=>{help.hidden=!help.hidden;helpButton.setAttribute('aria-expanded',String(!help.hidden));onLayout?.();});helpButton.setAttribute('aria-expanded','false');
  const fullscreen=tool('Fullscreen',onExpand);
  const close=tool('Close game',onClose);close.hidden=true;
  panel.append(style,row,tools,help);container.appendChild(panel);canvas.addEventListener('blur',release);
  return {
    release,
    get height(){return panel.getBoundingClientRect().height;},
    update({scene,blocked,skip,replay=false,muted=false,activated=false,canInteract=true}){
      const state=`${scene}:${blocked}:${skip}:${replay}:${muted}:${activated}:${canInteract}`;if(state===last)return;last=state;
      const playing=scene==='overworld'||scene==='room';
      for(const [action,button] of Object.entries(buttons))button.disabled=blocked||(!playing&&action!=='enter');
      buttons.enter.textContent=replay||playing&&!canInteract?'NEXT LAP':playing?'USE':'START';
      buttons.enter.setAttribute('aria-label',replay||playing&&!canInteract?'Next lap':playing?(scene==='room'?'Interact':'Enter door'):'Start game');
      if(playing&&!replay&&!canInteract)buttons.enter.disabled=true;
      sound.textContent=activated&&!muted?'Sound on':'Sound off';sound.setAttribute('aria-pressed',String(activated&&!muted));
      buttons.skip.setAttribute('aria-pressed',String(skip));
      buttons.skip.textContent=skip?'Fights skipped':'Skip fights';
      if(blocked)release();
    },
    setExpanded(expanded){
      release();panel.dataset.expanded=String(expanded);close.hidden=!expanded;fullscreen.hidden=expanded;
    },
    destroy(){release();canvas.removeEventListener('blur',release);panel.remove();},
  };
}
