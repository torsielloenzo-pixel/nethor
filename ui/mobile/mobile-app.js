(function(){
'use strict';

const root=document.querySelector('[data-mobile-app-shell]');
const viewHost=document.querySelector('[data-mobile-view-host]');
const navHost=document.querySelector('[data-mobile-nav-host]');
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
function onRouteEvent(event){
  const view=String(event?.detail?.view||requestedView());
  syncActive(view);
  root.dataset.mobileView=view
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
  root.dataset.router='ready';
  root.dataset.ready='1';
  await mobileRouter.start({host:viewHost,nav:navHost});
  syncLegacyLinks();
  syncActive();
  window.dispatchEvent(new CustomEvent('nethor:mobile-app-ready',{detail:{
    phase:2,
    view:requestedView(),
    platform:platform(),
    router:true,
    registered:mobileRouter.registeredViews?.()||[]
  }}))
}

window.NethorMobileApp=Object.freeze({
  phase:2,
  platform,
  isMobile,
  requestedView,
  legacyUrl,
  router,
  root:()=>root,
  viewHost:()=>viewHost,
  navHost:()=>navHost
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();