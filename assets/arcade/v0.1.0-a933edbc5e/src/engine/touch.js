// Native controls share real input actions; utilities belong to the game header.
const icons={
 sound:'<path d="M1 6h3l4-3v10l-4-3H1z"/><path d="M10 5h1v6h-1zM12 3h1v10h-1z"/>',
 muted:'<path d="M1 6h3l4-3v10l-4-3H1zM10 5h2v2h-2zM12 7h2v2h-2zM10 9h2v2h-2zM14 5h1v2h-1zM14 9h1v2h-1z"/>',
 controls:'<path d="M2 3h12v1H2zM1 4h1v8H1zM14 4h1v8h-1zM2 12h12v1H2zM4 6h1v4H4zM3 7h3v1H3zM9 7h2v2H9zM12 6h1v2h-1z"/>',
 fullscreen:'<path d="M1 1h5v2H3v3H1zM10 1h5v5h-2V3h-3zM1 10h2v3h3v2H1zM13 10h2v5h-5v-2h3z"/>',
 close:'<path d="M3 2h2v2H3zM5 4h2v2H5zM7 6h2v2H7zM9 8h2v2H9zM11 10h2v2h-2zM11 2h2v2h-2zM9 4h2v2H9zM5 8h2v2H5zM3 10h2v2H3z"/>',
 exit:'<path d="M4 1h2v5H1V4h3zM10 1h2v3h3v2h-5zM1 10h5v5H4v-3H1zM10 10h5v2h-3v3h-2z"/>',
};
export function createTouchControls(container,canvas,input,{onPress,onGesture,onClose,onExpand,onMute,onExit}){
 const panel=document.createElement('div');panel.className='cc-touch-controls';
 panel.setAttribute('role','group');panel.setAttribute('aria-label','Game touch controls');
 const header=document.createElement('div');header.className='cc-game-tools';
 header.setAttribute('role','group');header.setAttribute('aria-label','Game utilities');
 const style=document.createElement('style');
 style.textContent=`
 @font-face{font-family:"CC Arcade";src:url("${new URL('../../art/font/DepartureMono-Regular.woff2',import.meta.url).href}") format("woff2");font-display:swap;}
 .cc-game-stage{display:flex;align-items:center;justify-content:center;flex:none;width:100%;height:180px}
 @media(min-width:700px){.cc-game-stage{height:360px}}
 .cc-game-shell[data-expanded=true] .cc-game-stage{height:auto;flex:1 1 0}
 .cc-game-tools{position:relative;box-sizing:border-box;display:flex;justify-content:flex-end;gap:4px;flex:none;width:100%;height:52px;padding:4px 8px;background:#19232D;color:#FFF6DC;font:11px/16px "CC Arcade",monospace;z-index:2}
 .cc-game-tools button,.cc-touch-controls button{box-sizing:border-box;min-width:44px;min-height:44px;border:1px solid #48525A;border-radius:0;background:#19232D;color:#FFF6DC;font:11px "CC Arcade",monospace;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}
 .cc-game-tools .cc-icon{display:grid;place-items:center;width:44px;height:44px;padding:0}
 .cc-game-tools .cc-icon[aria-pressed=true]{color:#FFD400;border-color:#B98A24}
 .cc-game-tools button:focus-visible,.cc-touch-controls button:focus-visible{outline:2px solid #FFD400;outline-offset:-3px}
 .cc-game-tools button:hover{background:#294B58}
 .cc-game-tools button:active,.cc-touch-controls button:active,.cc-touch-controls button[data-held=true]{background:#FFD400;color:#19232D}
 .cc-touch-controls{display:none;box-sizing:border-box;flex:none;width:100%;padding:8px max(10px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));background:#19232D;color:#F5E6C8;font:11px/16px "CC Arcade",monospace}
 .cc-touch-row{display:grid;grid-template-columns:repeat(5,minmax(44px,1fr));gap:8px;max-width:520px;margin:auto}
 .cc-touch-controls button{background:#294B58;border-color:#9E9B8C}
 .cc-touch-controls button[data-action=attack]{border-color:#FFD400;color:#FFD400}
 .cc-touch-controls button:disabled,.cc-game-tools button:disabled{opacity:.45;cursor:default}
 .cc-control-help{position:absolute;top:52px;right:8px;box-sizing:border-box;width:min(300px,calc(100% - 16px));max-height:240px;overflow:auto;padding:12px;border:2px solid #9E9B8C;background:#FFF6DC;color:#19232D}
 .cc-control-help[hidden]{display:none}
 .cc-control-help p{margin:0 0 8px}
 .cc-control-help kbd{font:inherit;border:1px solid #9E9B8C;padding:1px 3px}
 .cc-control-help button{width:100%;background:#19232D;color:#FFF6DC}
 @media(any-pointer:coarse){.cc-touch-controls{display:block}}
 `;
 const row=document.createElement('div');row.className='cc-touch-row';
 const help=document.createElement('div');help.className='cc-control-help';help.hidden=true;
 help.setAttribute('role','region');help.setAttribute('aria-label','Controls help');
 help.innerHTML='<p><kbd>Arrows / A D</kbd> Move</p><p><kbd>Space x3 / J</kbd> Punch, punch, kick</p><p><kbd>L / C</kbd> Dodge</p><p><kbd>Esc</kbd> Leave fullscreen</p>';
 const active=new Map(),buttons={};let last='',expanded=false;
 function release(){active.clear();input.releaseAll();for(const button of Object.values(buttons))delete button.dataset.held;}
 for(const [action,text,label] of [['left','LEFT','Walk left'],['right','RIGHT','Walk right'],['attack','PUNCH','Attack'],['dodge','DODGE','Dodge'],['enter','START','Start game'],['skip','Skip fights','Skip fights']]){
  const button=document.createElement('button');button.type='button';button.textContent=text;
  button.dataset.action=action;button.setAttribute('aria-label',label);buttons[action]=button;
  button.addEventListener('pointerdown',event=>{
   if(button.disabled||event.button>0)return;
   event.preventDefault();canvas.focus({preventScroll:true});if(!onPress(action))return;
   active.set(event.pointerId,{action,button});button.dataset.held='true';input.touch(action,true);button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointerup',event=>{const held=active.get(event.pointerId);if(!held)return;active.delete(event.pointerId);if(![...active.values()].some(p=>p.action===action)){input.touch(action,false);delete button.dataset.held;}});
  for(const name of ['pointercancel','lostpointercapture'])button.addEventListener(name,event=>{if(active.has(event.pointerId))release();});
  button.addEventListener('click',event=>{onGesture(action);if(event.detail===0&&onPress(action)){input.touch(action,true);input.touch(action,false);}});
  (action==='skip'?help:row).appendChild(button);
 }
 function icon(button,name,label){button.innerHTML=`<svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">${icons[name]}</svg>`;button.setAttribute('aria-label',label);button.title=label;}
 function tool(name,label,callback){const button=document.createElement('button');button.type='button';button.className='cc-icon';icon(button,name,label);button.addEventListener('click',callback);header.appendChild(button);return button;}
 const sound=tool('muted','Unmute sound',onMute);
 const helpButton=tool('controls','Controls',()=>{help.hidden=!help.hidden;helpButton.setAttribute('aria-expanded',String(!help.hidden));});helpButton.setAttribute('aria-expanded','false');
 const fullscreen=tool('fullscreen','Fullscreen',()=>{if(expanded)onClose();else onExpand();});
 if(onExit)tool('close','Close arcade',onExit);
 function closeHelp(){if(help.hidden)return false;help.hidden=true;helpButton.setAttribute('aria-expanded','false');if(help.contains(document.activeElement))helpButton.focus();return true;}
 header.addEventListener('keydown',event=>{if(event.key==='Escape'&&closeHelp()){event.preventDefault();event.stopPropagation();helpButton.focus();}});
 header.append(help);panel.append(style,row);container.prepend(header);container.appendChild(panel);canvas.addEventListener('blur',release);
 return {
  release,closeHelp,
  get height(){return header.getBoundingClientRect().height+panel.getBoundingClientRect().height;},
  update({scene,blocked,skip,replay=false,muted=false,activated=false,needsGesture=false,canInteract=true}){
   const state=`${scene}:${blocked}:${skip}:${replay}:${muted}:${activated}:${needsGesture}:${canInteract}`;if(state===last)return;last=state;
   const playing=scene==='overworld'||scene==='room';
   for(const [action,button] of Object.entries(buttons))button.disabled=blocked||(!playing&&action!=='enter');
   buttons.enter.textContent=replay||playing&&!canInteract?'NEXT LAP':playing?'USE':'START';
   buttons.enter.setAttribute('aria-label',replay||playing&&!canInteract?'Next lap':playing?(scene==='room'?'Interact':'Enter door'):'Start game');
   if(playing&&!replay&&!canInteract)buttons.enter.disabled=true;
   const on=activated&&!muted&&!needsGesture;icon(sound,on||needsGesture?'sound':'muted',needsGesture?'Start sound':on?'Mute sound':'Unmute sound');sound.setAttribute('aria-pressed',String(on));
   buttons.skip.setAttribute('aria-pressed',String(skip));buttons.skip.textContent=skip?'Fights skipped':'Skip fights';if(blocked)release();
  },
  setExpanded(value){release();expanded=value;closeHelp();icon(fullscreen,expanded?'exit':'fullscreen',expanded?'Exit fullscreen':'Fullscreen');},
  destroy(){release();canvas.removeEventListener('blur',release);header.remove();panel.remove();},
 };
}
