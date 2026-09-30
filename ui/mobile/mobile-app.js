(function(){
'use strict';

const root=document.querySelector('[data-mobile-app-shell]');
const viewHost=document.querySelector('[data-mobile-view-host]');
const navHost=document.querySelector('[data-mobile-nav-host]');
const notificationBadge=document.querySelector('[data-mobile-notification-badge]');
if(!root||!viewHost||!navHost)return;

function platform(){
  try{return String(window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'desktop').toLowerCase()}
  catch(_){return'desktop'}
}
function isMobile(){
  const kind=platform();
  return kind==='mobile'||kind==='mobile-preview'
}
function router(){return window.NethorMobileRouter||window.MobileRouter||null}
function services(){return window.NethorMobileServices||window.MobileServices||null}
function legacyUrl(raw){
  const url=new URL(raw||'home.html',location.href);
  if(platform()==='mobile-preview')url.searchParams.set('mobile_preview','1');
  return url.pathname.split('/').pop()+url.search+url.hash
}
function requestedView(){
  const active=router()?.current?.();
  if(active)return active;
  try{
    const raw=String(new URLSearchParams(location.search).get('view')||'home').trim().toLowerCase();
    return raw||'home'
  }catch(_){return'home'}
}
function enforceShellGeometry(){
  if(!root||!navHost)return;
  root.classList.add('nethorShellGeometryRepair');
  const repair=()=>{
    try{
      const navRect=navHost.getBoundingClientRect();
      const appRect=root.getBoundingClientRect();
      const max=Math.max(120,Math.min(180,appRect.height*.18));
      root.dataset.navGeometry=navRect.height>max?'repaired':'ok';
      if(navRect.height>max){
        navHost.style.height='calc(var(--mobile-app-nav-h) + env(safe-area-inset-bottom))';
        navHost.style.minHeight='calc(var(--mobile-app-nav-h) + env(safe-area-inset-bottom))';
        navHost.style.maxHeight='calc(var(--mobile-app-nav-h) + env(safe-area-inset-bottom))'
      }
    }catch(_){}
  };
  repair();
  requestAnimationFrame(repair);
  setTimeout(repair,120);
}

function syncLegacyLinks(){
  navHost.querySelectorAll('[data-mobile-destination]').forEach(link=>{
    const id=link.getAttribute('data-mobile-destination')||'home';
    const target=router()?.legacyUrl?.(id);
    link.href=target||legacyUrl(link.getAttribute('data-legacy-href')||'home.html')
  })
}
function syncActive(view=requestedView()){
  navHost.querySelectorAll('[data-mobile-destination]').forEach(link=>{
    const active=link.getAttribute('data-mobile-destination')===view;
    if(active)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current')
  })
}
function syncNotificationBadge(value){
  if(!notificationBadge)return;
  const unread=Math.max(0,Number(value)||0);
  notificationBadge.textContent=unread>99?'99+':String(unread);
  notificationBadge.hidden=unread<1;
  const item=notificationBadge.closest('[data-mobile-destination="notifications"]');
  if(item){
    const label=unread?('Notifications, '+unread+' non lue'+(unread>1?'s':'')):'Notifications';
    item.setAttribute('aria-label',label);
    item.title=label
  }
}
function onServiceEvent(detail){
  const status=String(detail?.status||services()?.status||'');
  if(status)root.dataset.services=status;
  syncNotificationBadge(detail?.unread??services()?.unread??0)
}
function onRouteEvent(event){
  const view=String(event?.detail?.view||requestedView());
  syncActive(view);
  root.dataset.mobileView=view
}
function editableTarget(el){
  if(!el||el.disabled||el.readOnly)return false;
  if(el.matches?.('textarea,[contenteditable="true"]'))return true;
  if(!el.matches?.('input'))return false;
  return !['button','checkbox','radio','range','color','file','submit','reset','hidden'].includes(String(el.type||'text').toLowerCase())
}
function syncEnvironmentState(){
  const rootEl=document.documentElement;
  const vv=window.visualViewport;
  const active=document.activeElement;
  const focused=editableTarget(active);
  const obscured=vv?Math.max(0,window.innerHeight-vv.height-(vv.offsetTop||0)):0;
  const keyboard=focused&&(obscured>70||rootEl.classList.contains('nettoKeyboardFocus'));
  rootEl.classList.toggle('nettoKeyboardOpen',keyboard);
  root.dataset.keyboard=keyboard?'open':'closed';
  root.dataset.orientation=window.matchMedia?.('(orientation: landscape)')?.matches?'landscape':'portrait';
  const standalone=window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true;
  root.dataset.displayMode=standalone?'standalone':'browser';
  root.dataset.online=navigator.onLine===false?'0':'1';
  if(vv){
    rootEl.style.setProperty('--nethor-visual-viewport-height',Math.round(vv.height)+'px');
    rootEl.style.setProperty('--nethor-visual-viewport-top',Math.round(vv.offsetTop||0)+'px')
  }
}
function bindEnvironmentState(){
  let raf=0;
  const sync=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(syncEnvironmentState)};
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('orientationchange',sync,{passive:true});
  window.addEventListener('online',sync,{passive:true});
  window.addEventListener('offline',sync,{passive:true});
  window.visualViewport?.addEventListener('resize',sync,{passive:true});
  window.visualViewport?.addEventListener('scroll',sync,{passive:true});
  document.addEventListener('focusin',event=>{
    if(editableTarget(event.target)){
      document.documentElement.classList.add('nettoKeyboardFocus');
      sync()
    }
  },true);
  document.addEventListener('focusout',()=>{
    setTimeout(()=>{
      if(!editableTarget(document.activeElement))document.documentElement.classList.remove('nettoKeyboardFocus');
      sync()
    },40)
  },true);
  sync()
}

async function bootServices(){
  const shared=services();
  if(!shared){
    root.dataset.services='missing';
    return null
  }
  root.dataset.services='starting';
  const unsubscribe=shared.subscribe?.(onServiceEvent);
  if(typeof unsubscribe==='function')root.__nethorServicesUnsubscribe=unsubscribe;
  try{
    const value=await shared.start();
    root.dataset.services=shared.status||'ready';
    syncNotificationBadge(shared.unread);
    return value
  }catch(error){
    console.error('[Nethor MobileApp] services',error);
    root.dataset.services='error';
    return null
  }
}
async function boot(){
  if(!isMobile()){
    location.replace(new URL('home.html',location.href).href);
    return
  }
  const mobileRouter=router();
  if(!mobileRouter){
    root.dataset.router='missing';
    syncLegacyLinks();
    syncActive();
    return
  }
  window.addEventListener('nethor:mobile-route-change',onRouteEvent);
  window.addEventListener('nethor:mobile-route-fallback',onRouteEvent);
  window.addEventListener('nethor:mobile-route-idle',onRouteEvent);
  syncLegacyLinks();
  syncActive();
  bindEnvironmentState();
  enforceShellGeometry();
  root.dataset.router='ready';
  root.dataset.ready='1';

  const serviceState=await bootServices();
  if(services()?.status==='signed-out')return;

  await mobileRouter.start({host:viewHost,nav:navHost});
  syncLegacyLinks();
  syncActive();
  syncNotificationBadge(services()?.unread||0);
  window.dispatchEvent(new CustomEvent('nethor:mobile-app-ready',{detail:{
    phase:9,
    view:requestedView(),
    platform:platform(),
    router:true,
    services:services()?.isReady===true,
    serviceState,
    registered:mobileRouter.registeredViews?.()||[]
  }}))
}

window.NethorMobileApp=Object.freeze({
  phase:9,
  platform,
  isMobile,
  requestedView,
  legacyUrl,
  router,
  services,
  root:()=>root,
  viewHost:()=>viewHost,
  navHost:()=>navHost
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();