(function(){
'use strict';

const root=document.querySelector('[data-mobile-app-shell]');
const viewHost=document.querySelector('[data-mobile-view-host]');
const navHost=document.querySelector('[data-mobile-nav-host]');
const toolHost=document.querySelector('[data-mobile-app-tools]');
const headerHost=document.querySelector('[data-mobile-app-header]');
const notificationBadge=document.querySelector('[data-mobile-notification-badge]');
const mobileWordmark=document.querySelector('.nethorMobileWordmark');
const defaultWordmarkHtml=mobileWordmark?.innerHTML||'';
const chromeDefaults=new WeakMap();
let configuredSiteConfig={};
const MOBILE_LAUNCH_CACHE_KEY='nethorMobileLaunchBrandV1';
const MOBILE_LAUNCH_SESSION_KEY='nethorMobileLaunchShownV1';
const MOBILE_LAUNCH_MIN_MS=1900;
[...navHost?.querySelectorAll('[data-mobile-destination]')||[],...headerHost?.querySelectorAll('[data-mobile-destination]')||[]].forEach(link=>{const icon=link.getAttribute('data-mobile-destination')==='notifications'?link.querySelector('.nethorMobileNavIconWrap>span'):link.querySelector(':scope > span');if(icon)chromeDefaults.set(icon,icon.innerHTML)});
if(!root||!viewHost||!navHost||!toolHost||!headerHost)return;

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
function applyConfiguredLink(link,id,config,{top=false,userMenu=false,fixedIcon=false}={}){
 if(!link)return;
 const {page,override}=mobilePageConfig(config,id),controls=config?.platform_ui?.mobile?.controls||{};
 const controlKey=top?(userMenu?'user_menu':id==='notifications'?'notifications':''):'',control=controlKey&&controls?.[controlKey]&&typeof controls[controlKey]==='object'?controls[controlKey]:{};
 const labelOverride=String(control.label||override.nav_label||override.label||'').trim();
 const label=labelOverride||(userMenu?'Menu utilisateur':String(page.nav_label||page.label||link.querySelector('small')?.textContent||id).trim());
 const iconContainer=id==='notifications'&&top?link.querySelector('.nethorMobileNavIconWrap>span'):link.querySelector(':scope > span');
 if(!fixedIcon)setChromeIcon(iconContainer,String(control.url||override.image_url||''));
 const accent=safeHex(override.color);if(accent)link.style.setProperty('--nethor-mobile-item-accent',accent);else link.style.removeProperty('--nethor-mobile-item-accent');
 if(top){link.dataset.configuredLabel=label;link.setAttribute('aria-label',label);link.title=String(control.subtitle||label)}
 else{const small=link.querySelector('small');if(small)small.textContent=label;link.setAttribute('aria-label',label)}
}
function profileInitials(profile){
 const name=String(profile?.display_name||'Utilisateur').trim();
 return name.split(/\s+/).slice(0,2).map(part=>part.charAt(0).toUpperCase()).join('')||'U'
}
function syncHeaderProfileAvatar(profile=services()?.profile,url=services()?.avatarUrl){
 const avatar=headerHost?.querySelector('[data-mobile-profile-avatar]');
 if(!avatar)return;
 avatar.textContent=profileInitials(profile);
 avatar.style.backgroundColor=safeHex(profile?.profile_color)||'#ff5a2a';
 avatar.style.backgroundImage='';
 if(url){
  avatar.style.backgroundImage='url("'+String(url).replace(/"/g,'%22')+'")';
  avatar.textContent=''
 }
}
function applyProfileShortcut(link,config){
 if(!link)return;
 const {page,override}=mobilePageConfig(config,'profile');
 const label=String(override.nav_label||override.label||page.nav_label||page.label||'Mon profil').trim()||'Mon profil';
 const accent=safeHex(override.color);if(accent)link.style.setProperty('--nethor-mobile-item-accent',accent);else link.style.removeProperty('--nethor-mobile-item-accent');
 link.dataset.configuredLabel=label;link.setAttribute('aria-label',label);link.title=label;
 syncHeaderProfileAvatar()
}
function mobileTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
function mobileThemedAssetNode(node){
 if(!node||typeof node!=='object')return{};
 const theme=mobileTheme(),variant=node?.[theme],light=node?.light;
 if(variant&&typeof variant==='object'&&String(variant.url||'').trim())return variant;
 if(theme==='dark'&&light&&typeof light==='object'&&String(light.url||'').trim())return light;
 if(String(node.url||'').trim())return node;
 return{}
}
function mobileThemedAsset(node,fallback=''){
 const asset=mobileThemedAssetNode(node);
 return String(asset?.url||fallback||'').trim()
}
function mobileWelcomeAnimationHost(url,tag,name){
 const q=new URLSearchParams({src:String(url||''),theme:mobileTheme(),mode:'media',name:String(name||'Utilisateur')});
 if(tag)q.set('tag',String(tag));
 return 'welcome-animation-host.html?v=5&'+q.toString()
}
function ensureMobileLaunchWelcome(){
 let overlay=document.querySelector('[data-mobile-launch-welcome]');
 if(overlay)return overlay;
 overlay=document.createElement('section');
 overlay.className='nethorMobileLaunchWelcome show';
 overlay.setAttribute('data-mobile-launch-welcome','');
 overlay.setAttribute('aria-live','polite');
 overlay.setAttribute('aria-hidden','false');
 overlay.innerHTML='<div class="nethorMobileLaunchWelcomeInner"><div class="nethorMobileLaunchWelcomeMark" data-mobile-launch-welcome-mark aria-hidden="true">N</div><strong class="nethorMobileLaunchWelcomeText" data-mobile-launch-welcome-text>Bienvenue</strong><span class="nethorMobileLaunchWelcomeSub" data-mobile-launch-welcome-sub>Nethor</span><small class="nethorMobileLaunchWelcomeStatus" data-mobile-launch-welcome-status>Préparation de ton espace…</small></div>';
 document.body.prepend(overlay);
 return overlay
}
function cachedMobileLaunchConfig(){
 try{
  const value=JSON.parse(localStorage.getItem(MOBILE_LAUNCH_CACHE_KEY)||'null');
  return value&&typeof value==='object'&&value.config&&typeof value.config==='object'?value.config:{}
 }catch(_){return{}}
}
function rememberMobileLaunchConfig(config,profile=services()?.profile){
 if(!config||typeof config!=='object')return;
 const mobile=config?.platform_ui?.mobile||{},prefs=profile?.ui_preferences&&typeof profile.ui_preferences==='object'?profile.ui_preferences:{};
 const theme=prefs.theme==='dark'||prefs.theme==='light'?prefs.theme:mobileTheme();
 const compact={
  brand:config.brand&&typeof config.brand==='object'?{name:config.brand.name||'',subtitle:config.brand.subtitle||''}:{},
  platform_ui:{mobile:{welcome_media:mobile.welcome_media&&typeof mobile.welcome_media==='object'?mobile.welcome_media:{}}},
  launch_theme:theme
 };
 try{localStorage.setItem(MOBILE_LAUNCH_CACHE_KEY,JSON.stringify({config:compact,at:Date.now()}))}catch(_){}
}
function renderMobileLaunchWelcome(state){
 const overlay=ensureMobileLaunchWelcome(),profile=state?.profile||services()?.profile||null,config=state?.siteConfig||services()?.siteConfig||cachedMobileLaunchConfig()||{};
 const name=String(profile?.display_name||'').trim();
 const brand=config?.brand||{},brandName=String(brand.name||'Nethor').trim()||'Nethor',brandSub=String(brand.subtitle||'Espace outils').trim()||'Espace outils';
 const text=overlay.querySelector('[data-mobile-launch-welcome-text]'),sub=overlay.querySelector('[data-mobile-launch-welcome-sub]'),mark=overlay.querySelector('[data-mobile-launch-welcome-mark]');
 if(text)text.textContent=name?'Bienvenue '+name+' 👋':'Bienvenue';
 if(sub)sub.textContent=brandName+' · '+brandSub;
 if(!mark)return overlay;
 const media=config?.platform_ui?.mobile?.welcome_media||{},variant=mobileThemedAssetNode(media),url=String(variant?.url||'').trim(),type=String(media.type||'image'),tag=String(variant?.tag||'');
 const signature=url?(type+'|'+url+'|'+tag+'|'+mobileTheme()):'fallback|'+mobileTheme();
 const bootstrapMedia=mark.dataset.bootstrapMedia==='1';
 if(mark.dataset.mediaSignature===signature&&!bootstrapMedia)return overlay;
 delete mark.dataset.bootstrapMedia;
 mark.dataset.mediaSignature=signature;
 mark.classList.remove('hasMedia');
 mark.replaceChildren();
 if(!url){mark.innerHTML='N';return overlay}
 mark.classList.add('hasMedia');
 const safeUrl=String(url).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
 if(type==='animation'&&/\.js(?:$|\?)/i.test(url)){
  const host=mobileWelcomeAnimationHost(url,tag,name||'Utilisateur');
  mark.innerHTML='<iframe src="'+String(host).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" title="Animation Nethor" sandbox="allow-scripts" tabindex="-1"></iframe>'
 }else if(type==='animation'&&/\.(mp4|webm)(?:$|\?)/i.test(url)){
  mark.innerHTML='<video src="'+safeUrl+'" autoplay muted loop playsinline preload="auto"></video>'
 }else mark.innerHTML='<img src="'+safeUrl+'" alt="" draggable="false">';
 return overlay
}
function mobileLaunchAlreadyShown(){
 try{return sessionStorage.getItem(MOBILE_LAUNCH_SESSION_KEY)==='1'}catch(_){return false}
}
function markMobileLaunchShown(){
 try{sessionStorage.setItem(MOBILE_LAUNCH_SESSION_KEY,'1')}catch(_){}
 try{document.documentElement.dataset.nethorLaunchSplash='skip'}catch(_){}
}
function skipMobileLaunchWelcome(){
 const overlay=document.querySelector('[data-mobile-launch-welcome]');
 if(overlay){
  overlay.classList.remove('show','leaving');
  overlay.setAttribute('aria-hidden','true')
 }
 root.inert=false;
 root.removeAttribute('aria-hidden')
}
function prepareMobileLaunchWelcome(){
 const overlay=renderMobileLaunchWelcome({siteConfig:cachedMobileLaunchConfig()});
 root.inert=true;
 root.setAttribute('aria-hidden','true');
 overlay.setAttribute('aria-hidden','false');
 overlay.classList.remove('leaving');
 overlay.classList.add('show');
 const status=overlay.querySelector('[data-mobile-launch-welcome-status]');
 if(status)status.textContent='Préparation de ton espace…';
 return performance.now()
}
async function finishMobileLaunchWelcome(startedAt){
 const overlay=ensureMobileLaunchWelcome(),reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 const minMs=reduced?900:MOBILE_LAUNCH_MIN_MS,elapsed=performance.now()-Number(startedAt||0);
 if(elapsed<minMs)await new Promise(resolve=>setTimeout(resolve,minMs-elapsed));
 const status=overlay.querySelector('[data-mobile-launch-welcome-status]');
 if(status)status.textContent='Prêt';
 overlay.classList.add('leaving');
 overlay.classList.remove('show');
 await new Promise(resolve=>setTimeout(resolve,reduced?20:430));
 overlay.setAttribute('aria-hidden','true');
 overlay.classList.remove('leaving');
 root.inert=false;
 root.removeAttribute('aria-hidden');
 markMobileLaunchShown()
}
async function prewarmMobileViews(){
 const overlay=document.querySelector('[data-mobile-launch-welcome]');
 const status=overlay?.querySelector?.('[data-mobile-launch-welcome-status]');
 const setStatus=value=>{if(status&&overlay?.classList.contains('show'))status.textContent=value};
 const tasks=[
  {id:'home',label:'Accueil',promise:Promise.resolve(services()?.ready?.()).then(()=>true)},
  {id:'planning',label:'Planning',promise:window.NethorMobilePlanningView?.preload?.()},
  {id:'chat',label:'Chat',promise:window.NethorMobileChatView?.preload?.()}
 ].filter(item=>item.promise&&typeof item.promise.then==='function');
 if(!tasks.length){root.dataset.prewarm='ready';return[]}
 root.dataset.prewarm='running';
 setStatus('Chargement Accueil · Planning · Chat…');
 const results=await Promise.allSettled(tasks.map(item=>item.promise));
 const failed=results.filter(result=>result.status==='rejected').length;
 root.dataset.prewarm=failed?'partial':'ready';
 setStatus(failed?'Préparation terminée':'Accueil · Planning · Chat prêts');
 return results
}

function mobileIconMime(url){const x=String(url||'').split('?')[0].toLowerCase();return x.endsWith('.png')?'image/png':x.endsWith('.webp')?'image/webp':x.endsWith('.ico')?'image/x-icon':'image/svg+xml'}
function migrateLegacyMobileIcon(url){
 const value=String(url||'').trim();
 return /(?:^|\/)app-icon-mobile-v73\.svg(?:\?|$)/i.test(value)?'assets/app-icon-mobile-v74.svg?v=74':value
}
function applyMobileSystemIcons(config={}){
 const mobile=config?.platform_ui?.mobile||{},apple=migrateLegacyMobileIcon(mobile?.home_screen_icon?.url||'');
 if(apple){
  let link=document.getElementById('nethorMobileConfiguredAppleTouch');if(!link){link=document.createElement('link');link.id='nethorMobileConfiguredAppleTouch';link.rel='apple-touch-icon';document.head?.appendChild(link)}link.href=apple
 }
 const manifest=document.querySelector('link[rel="manifest"]');
 if(manifest){
  if(!manifest.dataset.nethorDefaultHref)manifest.dataset.nethorDefaultHref=manifest.getAttribute('href')||'manifest.webmanifest';
  if(apple){
   const icon=new URL(apple,location.href).href,base=new URL('./',location.href).href,start=new URL('mobile.html?view=home',location.href).href,appId=new URL('home.html',location.href).href;
   const data={name:'Nethor',short_name:'Nethor',description:'Nethor — planning, stock et outils pratiques pour l’équipe.',start_url:start,scope:base,display:'standalone',background_color:'#f7f8fa',theme_color:'#ff5a2a',orientation:'any',icons:[{src:icon,sizes:'any',type:mobileIconMime(icon),purpose:'any'}],id:appId};
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
 applyConfiguredLink(headerHost.querySelector('[data-mobile-destination="user-menu"]'),'profile',config,{top:true,userMenu:true,fixedIcon:true});
 applyProfileShortcut(toolHost.querySelector('[data-mobile-destination="profile"]'),config);
 applyMobileSystemIcons(config)
}

const mobileBrandThemeObserver=typeof MutationObserver!=='undefined'?new MutationObserver(list=>{if(list.some(x=>x.attributeName==='data-theme'))applyConfiguredChrome(configuredSiteConfig)}):null;
mobileBrandThemeObserver?.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

function navigationLinks(){
  return [...new Set([...navHost.querySelectorAll('[data-mobile-destination]'),...headerHost.querySelectorAll('[data-mobile-destination]')])]
}
function syncLegacyLinks(){
  navigationLinks().forEach(link=>{
    const id=link.getAttribute('data-mobile-destination')||'home';
    const target=router()?.legacyUrl?.(id);
    link.href=target||legacyUrl(link.getAttribute('data-legacy-href')||'home.html')
  })
}
function syncActive(view=requestedView()){
  const menuViews=new Set(['user-menu','settings','notification-settings','report-problem']);
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
  const config=detail?.siteConfig||services()?.siteConfig||{};
  applyConfiguredChrome(config);
  if(config&&Object.keys(config).length)rememberMobileLaunchConfig(config);
  const launch=document.querySelector('[data-mobile-launch-welcome]');
  if(launch?.classList.contains('show')&&(detail?.profile||services()?.profile)){
    renderMobileLaunchWelcome({profile:detail?.profile||services()?.profile,siteConfig:config})
  }
  syncNotificationBadge(detail?.unread??services()?.unread??0)
}
function onRouteEvent(event){
  const view=String(event?.detail?.view||requestedView());
  syncActive(view);
  root.dataset.mobileView=view
}

let mobileSwipeState=null;
let suppressSwipeClickUntil=0;
function mobileSwipeOrder(){
  const allowed=new Set(['home','planning','chat']),seen=new Set(),order=[];
  navHost.querySelectorAll(':scope > [data-mobile-destination]').forEach(link=>{
    const id=String(link.getAttribute('data-mobile-destination')||'').trim().toLowerCase();
    if(allowed.has(id)&&!seen.has(id)){seen.add(id);order.push(id)}
  });
  return order
}
function mobileSwipeHorizontalScroller(target){
  let node=target?.nodeType===1?target:target?.parentElement;
  while(node&&node!==viewHost){
    try{
      const style=getComputedStyle(node);
      if(/auto|scroll/.test(style.overflowX)&&node.scrollWidth>node.clientWidth+6)return node
    }catch(_){}
    node=node.parentElement
  }
  return null
}
function mobileSwipeBlocked(target){
  if(!target?.closest)return false;
  if(target.closest('input,textarea,select,[contenteditable="true"],[data-mobile-swipe-ignore]'))return true;
  return !!mobileSwipeHorizontalScroller(target)
}
function clearMobileSwipeState(){
  mobileSwipeState=null;
  root.removeAttribute('data-mobile-swipe')
}
function bindMobileSwipeNavigation(){
  if(viewHost.dataset.mobileSwipeBound==='1')return;
  viewHost.dataset.mobileSwipeBound='1';
  viewHost.dataset.mobileSwipeReady='1';

  viewHost.addEventListener('touchstart',event=>{
    if(event.touches.length!==1||root.dataset.keyboard==='open')return clearMobileSwipeState();
    const touch=event.touches[0],order=mobileSwipeOrder(),view=requestedView(),index=order.indexOf(view);
    if(index<0||mobileSwipeBlocked(event.target))return clearMobileSwipeState();
    const width=Math.max(1,viewHost.clientWidth||window.innerWidth||1);
    if(touch.clientX<14||touch.clientX>width-14)return clearMobileSwipeState();
    mobileSwipeState={
      x:touch.clientX,y:touch.clientY,lastX:touch.clientX,lastY:touch.clientY,
      startedAt:performance.now(),index,order,locked:false,cancelled:false
    }
  },{passive:true});

  viewHost.addEventListener('touchmove',event=>{
    const state=mobileSwipeState;
    if(!state||state.cancelled||event.touches.length!==1)return;
    const touch=event.touches[0],dx=touch.clientX-state.x,dy=touch.clientY-state.y;
    state.lastX=touch.clientX;state.lastY=touch.clientY;
    const ax=Math.abs(dx),ay=Math.abs(dy);
    if(!state.locked){
      if(ax<10&&ay<10)return;
      if(ay>ax*.92){state.cancelled=true;root.removeAttribute('data-mobile-swipe');return}
      if(ax>ay*1.12){state.locked=true;root.dataset.mobileSwipe='tracking'}
      else return
    }
    if(state.locked)event.preventDefault()
  },{passive:false});

  viewHost.addEventListener('touchend',event=>{
    const state=mobileSwipeState;
    if(!state){clearMobileSwipeState();return}
    const touch=event.changedTouches?.[0],endX=touch?.clientX??state.lastX,endY=touch?.clientY??state.lastY;
    const dx=endX-state.x,dy=endY-state.y,elapsed=Math.max(1,performance.now()-state.startedAt);
    const width=Math.max(1,viewHost.clientWidth||window.innerWidth||1);
    const threshold=Math.max(52,Math.min(86,width*.16));
    const velocity=Math.abs(dx)/elapsed;
    const qualifies=state.locked&&!state.cancelled&&Math.abs(dx)>Math.abs(dy)*1.18&&(Math.abs(dx)>=threshold||(Math.abs(dx)>=38&&velocity>=.62));
    clearMobileSwipeState();
    if(!qualifies)return;
    const step=dx>0?1:-1; // Consigne Nethor : swipe vers la droite = élément suivant de la barre.
    const next=state.order[state.index+step];
    if(!next)return;
    event.preventDefault();
    suppressSwipeClickUntil=performance.now()+450;
    root.dataset.mobileSwipe='navigating';
    Promise.resolve(router()?.open?.(next,{source:'swipe'})).finally(()=>root.removeAttribute('data-mobile-swipe'))
  },{passive:false});

  viewHost.addEventListener('touchcancel',clearMobileSwipeState,{passive:true});
  viewHost.addEventListener('click',event=>{
    if(performance.now()>=suppressSwipeClickUntil)return;
    event.preventDefault();
    event.stopPropagation()
  },true)
}
function editableTarget(el){
  if(!el||el.disabled||el.readOnly)return false;
  if(el.matches?.('textarea,[contenteditable="true"]'))return true;
  if(!el.matches?.('input'))return false;
  return !['button','checkbox','radio','range','color','file','submit','reset','hidden'].includes(String(el.type||'text').toLowerCase())
}
function focusedScrollContainer(el){
  let node=el?.parentElement||null;
  while(node&&node!==viewHost){
    try{
      const style=getComputedStyle(node),overflow=style.overflowY;
      if(/auto|scroll/.test(overflow)&&node.scrollHeight>node.clientHeight+2)return node
    }catch(_){}
    node=node.parentElement
  }
  return viewHost
}
function keepFocusedEditableVisible(){
  const active=document.activeElement;
  if(!editableTarget(active)||!viewHost.contains(active))return;
  /* Le Chat possède son propre gestionnaire de viewport et de suivi du dernier message. */
  if(root.dataset.mobileView==='chat'&&active.id==='message')return;
  const vv=window.visualViewport,viewportTop=Math.max(0,Math.round(vv?.offsetTop||0));
  const viewportHeight=Math.max(1,Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||0));
  const viewportBottom=viewportTop+viewportHeight;
  const headerBottom=Math.max(viewportTop,Math.round(headerHost.getBoundingClientRect().bottom||0));
  const safeTop=headerBottom+10,safeBottom=viewportBottom-12,rect=active.getBoundingClientRect();
  if(rect.bottom<=safeBottom&&rect.top>=safeTop)return;
  const scroller=focusedScrollContainer(active);
  if(!scroller)return;
  const delta=rect.bottom>safeBottom?rect.bottom-safeBottom+14:rect.top<safeTop?rect.top-safeTop-14:0;
  if(delta)scroller.scrollTop+=delta
}
function syncEnvironmentState(){
  const rootEl=document.documentElement;
  const vv=window.visualViewport;
  const active=document.activeElement;
  const focused=editableTarget(active);
  const viewportTop=Math.max(0,Math.round(vv?.offsetTop||0));
  const viewportHeight=Math.max(1,Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||0));
  const layoutHeight=Math.max(window.innerHeight||0,document.documentElement.clientHeight||0,viewportTop+viewportHeight);
  const obscured=Math.max(0,layoutHeight-(viewportTop+viewportHeight));
  const keyboard=focused&&(obscured>70||rootEl.classList.contains('nettoKeyboardFocus'));
  rootEl.classList.toggle('nettoKeyboardOpen',keyboard);
  root.dataset.keyboard=keyboard?'open':'closed';
  root.dataset.orientation=window.matchMedia?.('(orientation: landscape)')?.matches?'landscape':'portrait';
  const standalone=window.matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone===true;
  root.dataset.displayMode=standalone?'standalone':'browser';
  root.dataset.online=navigator.onLine===false?'0':'1';
  root.dataset.viewportScale=String(Number(vv?.scale||1).toFixed(3));
  if(vv){
    rootEl.style.setProperty('--nethor-visual-viewport-height',viewportHeight+'px');
    rootEl.style.setProperty('--nethor-visual-viewport-top',viewportTop+'px')
  }else{
    rootEl.style.setProperty('--nethor-visual-viewport-height',viewportHeight+'px');
    rootEl.style.setProperty('--nethor-visual-viewport-top','0px')
  }
  if(keyboard)requestAnimationFrame(keepFocusedEditableVisible)
}
function bindEnvironmentState(){
  let raf=0,revealTimers=[];
  const clearRevealTimers=()=>{revealTimers.forEach(clearTimeout);revealTimers=[]};
  const scheduleReveal=()=>{
    clearRevealTimers();
    keepFocusedEditableVisible();
    [60,160,320].forEach(delay=>revealTimers.push(setTimeout(keepFocusedEditableVisible,delay)))
  };
  const sync=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(syncEnvironmentState)};
  window.addEventListener('resize',sync,{passive:true});
  window.addEventListener('orientationchange',()=>{sync();scheduleReveal()},{passive:true});
  window.addEventListener('online',sync,{passive:true});
  window.addEventListener('offline',sync,{passive:true});
  window.visualViewport?.addEventListener('resize',()=>{sync();scheduleReveal()},{passive:true});
  window.visualViewport?.addEventListener('scroll',()=>{sync();scheduleReveal()},{passive:true});
  document.addEventListener('focusin',event=>{
    if(editableTarget(event.target)){
      document.documentElement.classList.add('nettoKeyboardFocus');
      sync();
      scheduleReveal()
    }
  },true);
  document.addEventListener('focusout',()=>{
    setTimeout(()=>{
      if(!editableTarget(document.activeElement)){
        document.documentElement.classList.remove('nettoKeyboardFocus');
        clearRevealTimers()
      }
      sync()
    },60)
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
  const launchStarted=mobileLaunchAlreadyShown()?null:prepareMobileLaunchWelcome();
  if(launchStarted===null)skipMobileLaunchWelcome();
  const mobileRouter=router();
  if(!mobileRouter){
    root.dataset.router='missing';
    syncLegacyLinks();
    syncActive();
    if(launchStarted!==null)await finishMobileLaunchWelcome(launchStarted);
    return
  }
  window.addEventListener('nethor:mobile-route-change',onRouteEvent);
  window.addEventListener('nethor:mobile-route-fallback',onRouteEvent);
  window.addEventListener('nethor:mobile-route-idle',onRouteEvent);
  syncLegacyLinks();
  syncActive();
  bindEnvironmentState();
  bindMobileSwipeNavigation();
  enforceShellGeometry();
  root.dataset.router='ready';
  root.dataset.ready='1';

  const servicePromise=bootServices();
  const routerPromise=mobileRouter.start({host:viewHost,nav:[navHost,headerHost]});
  const prewarmPromise=new Promise(resolve=>{
    requestAnimationFrame(()=>resolve(prewarmMobileViews()))
  }).then(value=>value);

  const serviceState=await servicePromise;
  if(services()?.status==='signed-out')return;
  const liveConfig=services()?.siteConfig||serviceState?.siteConfig||{};
  if(liveConfig&&Object.keys(liveConfig).length)rememberMobileLaunchConfig(liveConfig,services()?.profile||serviceState?.profile);
  applyConfiguredChrome(liveConfig);
  renderMobileLaunchWelcome({profile:services()?.profile||serviceState?.profile,siteConfig:liveConfig});

  await routerPromise;
  await prewarmPromise;
  applyConfiguredChrome(services()?.siteConfig||{});
  syncLegacyLinks();
  syncActive();
  syncNotificationBadge(services()?.unread||0);
  if(launchStarted!==null)await finishMobileLaunchWelcome(launchStarted);
  else skipMobileLaunchWelcome();
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