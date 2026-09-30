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
function legacyUrl(raw){
  const url=new URL(raw||'home.html',location.href);
  if(platform()==='mobile-preview')url.searchParams.set('mobile_preview','1');
  return url.pathname.split('/').pop()+url.search+url.hash
}
function requestedView(){
  try{
    const raw=String(new URLSearchParams(location.search).get('view')||'home').trim().toLowerCase();
    return raw||'home'
  }catch(_){return'home'}
}
function syncLegacyLinks(){
  navHost.querySelectorAll('[data-legacy-href]').forEach(link=>{
    link.href=legacyUrl(link.getAttribute('data-legacy-href')||'home.html')
  })
}
function syncActive(){
  const current=requestedView();
  navHost.querySelectorAll('[data-mobile-destination]').forEach(link=>{
    const active=link.getAttribute('data-mobile-destination')===current;
    if(active)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current')
  })
}
function boot(){
  if(!isMobile()){
    location.replace(new URL('home.html',location.href).href);
    return
  }
  syncLegacyLinks();
  syncActive();
  root.dataset.ready='1';
  window.dispatchEvent(new CustomEvent('nethor:mobile-app-ready',{detail:{phase:1,view:requestedView(),platform:platform()}}))
}

window.NethorMobileApp=Object.freeze({
  phase:1,
  platform,
  isMobile,
  requestedView,
  legacyUrl,
  root:()=>root,
  viewHost:()=>viewHost,
  navHost:()=>navHost
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
