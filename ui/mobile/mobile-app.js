(function(){
'use strict';

const root=document.querySelector('[data-mobile-app-shell]');
const viewHost=document.querySelector('[data-mobile-view-host]');
const navHost=document.querySelector('[data-mobile-nav-host]');
const toolHost=document.querySelector('[data-mobile-app-tools]');
const notificationBadge=document.querySelector('[data-mobile-notification-badge]');
const mobileWordmark=document.querySelector('.nethorMobileWordmark');
const defaultWordmarkHtml=mobileWordmark?.innerHTML||'';
const chromeDefaults=new WeakMap();
let configuredSiteConfig={};
[...navHost?.querySelectorAll('[data-mobile-destination]')||[],...toolHost?.querySelectorAll('[data-mobile-destination]')||[]].forEach(link=>{const icon=link.getAttribute('data-mobile-destination')==='notifications'?link.querySelector('.nethorMobileNavIconWrap>span'):link.querySelector(':scope > span');if(icon)chromeDefaults.set(icon,icon.innerHTML)});
if(!root||!viewHost||!navHost||!toolHost)return;

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


function safeHex(value){return /^#[0-9a-f]{6}$/i.test(String(value||''))?String(value):''}
function mobilePageConfig(config,id){
 const p=config?.pages?.[id]&&typeof config.pages[id]==='object'?config.pages[id]:{};
 const o=p.platform_overrides?.mobile&&typeof p.platform_overrides.mobile==='object'?p.platform_overrides.mobile:{};
 return {page:p,override:o}
}
function setChromeIcon(container,url){
 if(!container)return;
 const custom=String(url||'').trim();
 if(!custom){const original=chromeDefaults.get(container);if(original!==undefined&&container.innerHTML!==original)container.innerHTML=original;return}
 container.innerHTML='';
 const img=document.createElement('img');img.src=custom;img.alt='';img.draggable=false;img.className='nethorMobileConfiguredIcon';container.appendChild(img)
}
function applyConfiguredLink(link,id,config,{top=false,userMenu=false}={}){
 if(!link)return;
 const {page,override}=mobilePageConfig(config,id),controls=config?.platform_ui?.mobile?.controls||{};
 const controlKey=top?(userMenu?'user_menu':id==='notifications'?'notifications':''):'',control=controlKey&&controls?.[controlKey]&&typeof controls[controlKey]==='object'?controls[controlKey]:{};
 const labelOverride=String(control.label||override.nav_label||override.label||'').trim();
 const label=labelOverride||(userMenu?'Menu utilisateur':String(page.nav_label||page.label||link.querySelector('small')?.textContent||id).trim());
 const iconContainer=id==='notifications'&&top?link.querySelector('.nethorMobileNavIconWrap>span'):link.querySelector(':scope > span');
 setChromeIcon(iconContainer,String(control.url||override.image_url||''));
 const accent=safeHex(override.color);if(accent)link.style.setProperty('--nethor-mobile-item-accent',accent);else link.style.removeProperty('--nethor-mobile-item-accent');
 if(top){link.dataset.configuredLabel=label;link.setAttribute('aria-label',label);link.title=String(control.subtitle||label)}
 else{const small=link.querySelector('small');if(small)small.textContent=label;link.setAttribute('aria-label',label)}
}
function mobileTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
function mobileThemedAsset(node,fallback=''){
 if(!node||typeof node!=='object')return fallback;
 const theme=mobileTheme(),variant=node?.[theme],light=node?.light;
 return String(variant?.url||((theme==='dark')?light?.url:'')||node?.url||fallback||'').trim()
}
function mobileIconMime(url){const x=String(url||'').split('?')[0].toLowerCase();return x.endsWith('.png')?'image/png':x.endsWith('.webp')?'image/webp':x.endsWith('.ico')?'image/x-icon':'image/svg+xml'}
function applyMobileSystemIcons(config={}){
 const mobile=config?.platform_ui?.mobile||{},apple=String(mobile?.home_screen_icon?.url||'').trim();
 if(apple){
  let link=document.getElementById('nethorMobileConfiguredAppleTouch');if(!link){link=document.createElement('link');link.id='nethorMobileConfiguredAppleTouch';link.rel='apple-touch-icon';document.head?.appendChild(link)}link.href=apple
 }
 const manifest=document.querySelector('link[rel="manifest"]');
 if(manifest){
  if(!manifest.dataset.nethorDefaultHref)manifest.dataset.nethorDefaultHref=manifest.getAttribute('href')||'manifest.webmanifest';
  if(apple){
   const icon=new URL(apple,location.href).href,base=new URL('./',location.href).href,start=new URL('home.html',location.href).href;
   const data={name:'Nethor',short_name:'Nethor',description:'Nethor — planning, stock et outils pratiques pour l’équipe.',start_url:start,scope:base,display:'standalone',background_color:'#f7f8fa',theme_color:'#ff5a2a',orientation:'any',icons:[{src:icon,sizes:'any',type:mobileIconMime(icon),purpose:'any'}],id:start};
   manifest.href='data:application/manifest+json;charset=utf-8,'+encodeURIComponent(JSON.stringify(data))
  }else manifest.href=manifest.dataset.nethorDefaultHref
 }
}
function applyConfiguredChrome(config={}){
 configuredSiteConfig=config&&typeof config==='object'?config:{};
 const mobileUi=config?.platform_ui?.mobile||{},headerUrl=mobileThemedAsset(mobileUi?.header_logo,String(config?.brand?.header_logo_url||'').trim());
 if(mobileWordmark){
  if(headerUrl){
   mobileWordmark.innerHTML='';const img=document.createElement('img');img.src=headerUrl;img.alt='';img.draggable=false;img.className='nethorMobileConfiguredBrand';mobileWordmark.appendChild(img);mobileWordmark.classList.add('configured')
  }else{if(mobileWordmark.innerHTML!==defaultWordmarkHtml)mobileWordmark.innerHTML=defaultWordmarkHtml;mobileWordmark.classList.remove('configured')}
 }
 const allowed=['home','planning','chat'],raw=Array.isArray(config?.mobile_bar?.items)?config.mobile_bar.items:[],order=[],seen=new Set();
 raw.forEach(item=>{const id=String(item?.id||'');if(allowed.includes(id)&&!seen.has(id)){seen.add(id);order.push(id)}});
 allowed.forEach(id=>{if(!seen.has(id))order.push(id)});
 order.slice(0,3).forEach(id=>{const link=navHost.querySelector('[data-mobile-destination="'+id+'"]');if(link)navHost.appendChild(link)});
 root.classList.toggle('nethorMobileNavDisabled',config?.mobile_bar?.enabled===false);
 navHost.setAttribute('aria-hidden',config?.mobile_bar?.enabled===false?'true':'false');
 allowed.forEach(id=>applyConfiguredLink(navHost.querySelector('[data-mobile-destination="'+id+'"]'),id,config));
 applyConfiguredLink(toolHost.querySelector('[data-mobile-destination="notifications"]'),'notifications',config,{top:true});
 applyConfiguredLink(toolHost.querySelector('[data-mobile-destination="user-menu"]'),'profile',config,{top:true,userMenu:true});
 applyMobileSystemIcons(config)
}

const mobileBrandThemeObserver=typeof MutationObserver!=='undefined'?new MutationObserver(list=>{if(list.some(x=>x.attributeName==='data-theme'))applyConfiguredChrome(configuredSiteConfig)}):null;
mobileBrandThemeObserver?.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

function navigationLinks(){
  return [...navHost.querySelectorAll('[data-mobile-destination]'),...toolHost.querySelectorAll('[data-mobile-destination]')]
}
function syncLegacyLinks(){
  navigationLinks().forEach(link=>{
    const id=link.getAttribute('data-mobile-destination')||'home';
    const target=router()?.legacyUrl?.(id);
    link.href=target||legacyUrl(link.getAttribute('data-legacy-href')||'home.html')
  })
}
function syncActive(view=requestedView()){
  const menuViews=new Set(['user-menu','profile','settings','notification-settings','report-problem']);
  navigationLinks().forEach(link=>{
    const id=link.getAttribute('data-mobile-destination')||'';
    const active=id===view||(id==='user-menu'&&menuViews.has(view));
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
    const base=String(item.dataset.configuredLabel||'Notifications');
    const label=unread?(base+', '+unread+' non lue'+(unread>1?'s':'')):base;
    item.setAttribute('aria-label',label);
    item.title=label
  }
}
function onServiceEvent(detail){
  const status=String(detail?.status||services()?.status||'');
  if(status)root.dataset.services=status;
  applyConfiguredChrome(detail?.siteConfig||services()?.siteConfig||{});
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
    applyConfiguredChrome(shared.siteConfig||value?.siteConfig||{});
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

  await mobileRouter.start({host:viewHost,nav:[navHost,toolHost]});
  applyConfiguredChrome(services()?.siteConfig||{});
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
  navHost:()=>navHost,
  toolHost:()=>toolHost
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();