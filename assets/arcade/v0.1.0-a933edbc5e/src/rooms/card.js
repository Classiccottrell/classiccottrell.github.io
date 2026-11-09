// A proximity caption with an ordinary link; walking and native tab order stay available.
export function createProjectCaption(canvas,{title,blurb,href},onDismiss){
  const host=canvas.parentElement,el=document.createElement('section');
  el.className='cc-project-caption';el.hidden=true;el.setAttribute('aria-live','polite');
  const style=document.createElement('style');
  style.textContent=`
    .cc-project-caption{box-sizing:border-box;background:#19232D;color:#F5E6C8;border-top:2px solid #B98A24;font:15px/1.45 system-ui,sans-serif}
    .cc-project-caption[hidden]{display:none}
    .cc-project-caption .cc-caption-inner{display:flex;align-items:center;gap:20px;max-width:960px;margin:auto;padding:12px 16px}
    .cc-project-caption .cc-caption-copy{flex:1;min-width:0}
    .cc-project-caption h2{font:bold 17px/1.2 monospace;color:#FFE778;margin:0 0 5px}
    .cc-project-caption p{margin:0;text-wrap:pretty}
    .cc-project-caption .cc-caption-actions{display:flex;gap:8px;flex-shrink:0}
    .cc-project-caption a,.cc-project-caption button{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:8px 12px;border:2px solid #9E9B8C;border-radius:0;font:inherit;white-space:nowrap;cursor:pointer;text-decoration:none}
    .cc-project-caption a{background:#FFD400;border-color:#FFD400;color:#19232D;font-weight:700}
    .cc-project-caption button{background:transparent;color:#F5E6C8}
    .cc-project-caption a:focus-visible,.cc-project-caption button:focus-visible{outline:3px solid #FFF6DC;outline-offset:2px}
    .cc-project-caption[data-expanded=true]{position:absolute;top:0;left:0;right:0;z-index:1}
    @media(max-width:600px){.cc-project-caption .cc-caption-inner{flex-direction:column;align-items:stretch;gap:10px}.cc-project-caption .cc-caption-actions>*{flex:1}}
  `;
  const inner=document.createElement('div');inner.className='cc-caption-inner';
  const copy=document.createElement('div');copy.className='cc-caption-copy';
  const h=document.createElement('h2');h.id=`cc-caption-${Math.random().toString(36).slice(2,8)}`;h.textContent=title;el.setAttribute('aria-labelledby',h.id);
  const p=document.createElement('p');p.textContent=blurb;copy.append(h,p);
  const actions=document.createElement('div');actions.className='cc-caption-actions';
  const link=document.createElement('a');link.href=href;link.textContent='View project';
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='Keep exploring';
  function setVisible(visible){
    const changed=el.hidden===visible;
    if(!visible&&el.contains(document.activeElement))canvas.focus({preventScroll:true});
    el.hidden=!visible;return changed;
  }
  function close(){setVisible(false);onDismiss();}
  dismiss.addEventListener('click',close);
  el.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
  actions.append(link,dismiss);inner.append(copy,actions);el.append(style,inner);host.after(el);
  return {
    link,setVisible,
    get visible(){return !el.hidden;},
    get height(){return el.getBoundingClientRect().height;},
    setExpanded(expanded){el.dataset.expanded=String(expanded);if(expanded)host.appendChild(el);else host.after(el);},
    destroy(){setVisible(false);el.remove();},
  };
}
