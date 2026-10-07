(function(){
'use strict';
function resolvedPlatformKind(){
 try{
  const kind=window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'';
  return ['desktop','mobile','mobile-preview'].includes(kind)?kind:''
 }catch(_){return''}
}
function isMobilePreviewContext(){
 const kind=resolvedPlatformKind();
 if(kind)return kind==='mobile-preview';
 try{return new URLSearchParams(location.search).get('mobile_preview')==='1'}catch(_){return false}
}
function isMobileViewport(){
 const kind=resolvedPlatformKind();
 if(kind)return kind==='mobile'||kind==='mobile-preview';
 if(isMobilePreviewContext())return true;
 try{
  if(navigator.userAgentData?.mobile===true)return true;
  const ua=String(navigator.userAgent||'');
  if(/iPhone|iPod|iPad|Android|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua))return true;
  if(String(navigator.platform||'')==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1)return true;
  const coarse=window.matchMedia?.('(hover:none) and (pointer:coarse)')?.matches===true;
  const touch=Number(navigator.maxTouchPoints||0)>0;
  const sw=Number(screen.width)||0,sh=Number(screen.height)||0;
  return coarse&&touch&&sw>0&&sh>0&&Math.min(sw,sh)<=768
 }catch(_){return false}
}
function ensureMobileMeta(name,content){
 let el=document.head?.querySelector('meta[name="'+name+'"]');
 if(!el&&document.head){el=document.createElement('meta');el.name=name;document.head.appendChild(el)}
 if(el)el.content=content
}
function lockMobileAppViewport(){
 if(!isMobileViewport())return;
 const root=document.documentElement;root.classList.add('nettoMobileAppLocked');
 let viewport=document.head?.querySelector('meta[name="viewport"]');
 if(!viewport&&document.head){viewport=document.createElement('meta');viewport.name='viewport';document.head.appendChild(viewport)}
 if(viewport)viewport.content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
 ensureMobileMeta('mobile-web-app-capable','yes');
 ensureMobileMeta('apple-mobile-web-app-capable','yes');
 ensureMobileMeta('apple-mobile-web-app-status-bar-style','default');
 if(root.dataset.mobileGesturesLocked==='1')return;root.dataset.mobileGesturesLocked='1';
 const stopGesture=e=>e.preventDefault();
 ['gesturestart','gesturechange','gestureend'].forEach(type=>document.addEventListener(type,stopGesture,{passive:false}));
 document.addEventListener('touchmove',e=>{if(e.touches&&e.touches.length>1)e.preventDefault()},{passive:false});
 document.addEventListener('dblclick',stopGesture,{passive:false})
}

lockMobileAppViewport();

function isNethorPhoneDevice(){return isMobileViewport()}
function isNethorPhysicalLandscape(){
 if(isMobilePreviewContext())return window.innerWidth>window.innerHeight;
 try{
  const type=screen.orientation?.type;
  if(type)return String(type).startsWith('landscape');
  const legacy=Number(window.orientation);
  if(Number.isFinite(legacy))return Math.abs(legacy)===90
 }catch(_){}
 return window.innerWidth>window.innerHeight
}
function markNethorPhoneDevice(){
 document.documentElement.classList.toggle('nethorPhoneDevice',isNethorPhoneDevice())
}
function setupMobileLandscapeParity(){
 if(window.__nethorLandscapeParity)return;
 window.__nethorLandscapeParity=true;
 markNethorPhoneDevice();

 const style=document.createElement('style');
 style.id='nethorLandscapeParityStyle';
 document.head?.appendChild(style);

 const rebuild=()=>{
  if(document.head&&style.parentNode===document.head)document.head.appendChild(style);
  markNethorPhoneDevice();
  if(!isNethorPhoneDevice()||!isNethorPhysicalLandscape()){
   style.textContent='';
   return
  }
  const sw=isMobilePreviewContext()?window.innerWidth:(Number(screen.width)||window.innerWidth),sh=isMobilePreviewContext()?window.innerHeight:(Number(screen.height)||window.innerHeight);
  const shortSide=Math.min(sw,sh);
  const chunks=[];
  const visit=rules=>{
   if(!rules)return;
   for(const rule of rules){
    if(rule===style.sheet)continue;
    if(rule.type===4&&rule.media){
     const mediaText=String(rule.media.mediaText||'').trim();
     const m=mediaText.match(/^\(\s*max-width\s*:\s*([\d.]+)px\s*\)$/i);
     if(!m)continue;
     const max=Number(m[1]);
     if(!Number.isFinite(max)||max>900||shortSide>max)continue;
     try{if(window.matchMedia(mediaText).matches)continue}catch(_){}
     try{
      for(const child of rule.cssRules||[])chunks.push(child.cssText)
     }catch(_){}
    }
   }
  };
  for(const sheet of Array.from(document.styleSheets)){
   if(sheet.ownerNode===style)continue;
   try{visit(sheet.cssRules)}catch(_){}
  }
  style.textContent=chunks.join('\n')
 };

 const refresh=()=>{requestAnimationFrame(rebuild);setTimeout(rebuild,180)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',rebuild,{once:true});
 else rebuild();
 window.addEventListener('load',rebuild,{once:true});
 window.addEventListener('orientationchange',refresh,{passive:true});
 window.addEventListener('resize',refresh,{passive:true});
 try{screen.orientation?.addEventListener?.('change',refresh)}catch(_){}
}

setupMobileLandscapeParity();


function enableStableMobileNavigation(){
 if(!isMobileViewport()||document.getElementById('nettoMobileStableNavigationStyle'))return;
 const style=document.createElement('style');
 style.id='nettoMobileStableNavigationStyle';
 style.textContent='@view-transition{navigation:auto}::view-transition-old(root),::view-transition-new(root){animation:none!important}';
 document.head?.appendChild(style);
 try{history.scrollRestoration='auto'}catch(_){}
}
enableStableMobileNavigation();

function captureMobileNavigationPerf(){
 if(!isMobileViewport()||!window.performance?.getEntriesByType)return;
 const record=()=>{
  try{
   const nav=performance.getEntriesByType('navigation')?.[0];if(!nav)return;
   const item={
    at:new Date().toISOString(),
    page:(location.pathname.split('/').pop()||'home.html').toLowerCase(),
    type:String(nav.type||'navigate'),
    ttfb:Math.max(0,Math.round(nav.responseStart-nav.requestStart)),
    dom:Math.max(0,Math.round(nav.domContentLoadedEventEnd-nav.startTime)),
    load:Math.max(0,Math.round(nav.loadEventEnd-nav.startTime)),
    transfer:Number(nav.transferSize||0),
    sw:Number(nav.workerStart||0)>0
   };
   const key='nethorMobilePerfV1',list=JSON.parse(localStorage.getItem(key)||'[]');
   list.push(item);localStorage.setItem(key,JSON.stringify(list.slice(-30)));
   window.NethorPerf=Object.freeze({
    last:()=>item,
    history:()=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(_){return[]}},
    clear:()=>{try{localStorage.removeItem(key)}catch(_){}}
   })
  }catch(_){}
 };
 if(document.readyState==='complete')setTimeout(record,0);
 else window.addEventListener('load',()=>setTimeout(record,0),{once:true})
}
captureMobileNavigationPerf();

const warmedMobileRoutes=new Set();
function warmMobileRoutes(urls=[]){
 if(!isMobileViewport()||!document.head)return;
 const run=()=>{
  const toWarm=[];
  for(const raw of urls){
   try{
    const u=new URL(raw||'',location.href);
    if(u.origin!==location.origin)continue;
    u.hash='';
    if(u.pathname===location.pathname&&u.search===location.search)continue;
    const key=u.pathname+u.search;
    if(warmedMobileRoutes.has(key))continue;
    warmedMobileRoutes.add(key);toWarm.push(u.href);
    const link=document.createElement('link');
    link.rel='prefetch';link.href=u.href;
    link.dataset.nettoWarmRoute='1';
    document.head.appendChild(link)
   }catch(_){}
  }
  if(toWarm.length){
   try{navigator.serviceWorker?.controller?.postMessage?.({type:'WARM_NAVIGATION_ROUTES',urls:toWarm.slice(0,8)})}catch(_){}
  }
 };
 if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:650});
 else setTimeout(run,80)
}

/* Mobile keyboard: global state only. Chat owns its own visual viewport sizing. */
function isMobileTextEntry(el){
 if(!el||el.nodeType!==1||el.disabled||el.readOnly)return false;
 if(el.isContentEditable)return true;
 const tag=String(el.tagName||'').toUpperCase();
 if(tag==='TEXTAREA')return true;
 if(tag!=='INPUT')return false;
 const type=String(el.type||'text').toLowerCase();
 return !['button','checkbox','radio','range','file','submit','reset','color','hidden','image'].includes(type)
}
let mobileKeyboardViewportBaseline=0;
function currentMobileVisualHeight(){
 const vv=window.visualViewport;
 return Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||0)
}
function refreshMobileKeyboardBaseline(force=false){
 if(!isMobileViewport()){mobileKeyboardViewportBaseline=0;return}
 if(force||!isMobileTextEntry(document.activeElement)){
  mobileKeyboardViewportBaseline=Math.max(mobileKeyboardViewportBaseline,currentMobileVisualHeight())
 }
}
function syncMobileKeyboardState(){
 const root=document.documentElement,body=document.body;
 const focused=isMobileViewport()&&isMobileTextEntry(document.activeElement);
 const current=currentMobileVisualHeight();
 const baseline=Math.max(mobileKeyboardViewportBaseline,current);
 const threshold=Math.max(120,Math.round(baseline*.16));
 const viewportReduced=!!window.visualViewport&&baseline-current>=threshold;
 const active=focused&&(!window.visualViewport||viewportReduced);
 root.classList.toggle('nettoKeyboardOpen',active);
 body?.classList.toggle('nettoKeyboardOpen',active);
 if(!focused)refreshMobileKeyboardBaseline()
}
function bindMobileKeyboardState(){
 if(window.__nettoMobileKeyboardBound)return;
 window.__nettoMobileKeyboardBound=true;
 refreshMobileKeyboardBaseline(true);
 document.addEventListener('focusin',()=>requestAnimationFrame(syncMobileKeyboardState),true);
 document.addEventListener('focusout',()=>setTimeout(syncMobileKeyboardState,120),true);
 window.addEventListener('resize',syncMobileKeyboardState,{passive:true});
 window.addEventListener('orientationchange',()=>setTimeout(()=>{mobileKeyboardViewportBaseline=0;refreshMobileKeyboardBaseline(true);syncMobileKeyboardState()},180),{passive:true});
 try{
  window.visualViewport?.addEventListener?.('resize',syncMobileKeyboardState,{passive:true});
  window.visualViewport?.addEventListener?.('scroll',syncMobileKeyboardState,{passive:true})
 }catch(_){}
 syncMobileKeyboardState()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindMobileKeyboardState,{once:true});
else bindMobileKeyboardState();

const FAST_ACCESS_TTL=1800000;
const GLOBAL_UI_CACHE_TTL=1800000;
const GLOBAL_UI_REFRESH_TTL=120000;
const FAST_ACCESS_ROUTES=Object.freeze({
 profile:'profile.html',stock:'index.html',planning:'planning.html',chat:'chat.html',articles:'articles.html',
 scanner:'scanner.html',notifications:'notifications.html',notification_settings:'notification-settings.html',
 problem_report:'report-problem.html',fl_assistant:'fl-assistant.html',
 rewards:'rewards.html',bakery:'bakery.html',accounts:'accounts.html',
 portal_admin:'admin-portal.html',settings:'settings.html'
});
function storedSupabaseUserId(){
 try{
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i)||'';
   if(!/^sb-.*-auth-token$/.test(key))continue;
   const raw=JSON.parse(localStorage.getItem(key)||'null');
   const uid=raw?.user?.id||raw?.currentSession?.user?.id||raw?.session?.user?.id;
   if(uid)return String(uid)
  }
 }catch(_){}
 return''
}
function fastAccessSelector(file){
 const q=String(file||'').replace(/"/g,'');
 if(q==='index.html')return 'a[href*="index.html"]:not(.logout):not(.logoutItem):not(.userLogout):not(.brandLogout),button[onclick*="index.html"]:not(.logout):not(.logoutItem):not(.userLogout):not(.brandLogout)';
 return 'a[href*="'+q+'"],button[onclick*="'+q+'"]'
}
function readFastAccessSnapshot(){
 try{
  const uid=storedSupabaseUserId();if(!uid)return null;
  const x=JSON.parse(localStorage.getItem('nettoGlobalUI:'+uid)||'null');
  if(!x||Date.now()-Number(x.saved_at||0)>FAST_ACCESS_TTL)return null;
  const snap=x.accessSnapshot;
  if(!snap||!Array.isArray(snap.allowed))return null;
  return {uid,allowed:new Set(snap.allowed),role:snap.role||x.profile?.role||''}
 }catch(_){return null}
}
function applyFastAccessBoot(){
 const root=document.documentElement,snap=readFastAccessSnapshot(),all=Object.entries(FAST_ACCESS_ROUTES);
 let style=document.getElementById('nettoFastAccessStyle');
 if(!style){style=document.createElement('style');style.id='nettoFastAccessStyle';document.head?.appendChild(style)}
 const denied=snap?all.filter(([id])=>id!=='settings'&&!snap.allowed.has(id)):all.filter(([id])=>id!=='settings');
 const rules=denied.map(([,file])=>fastAccessSelector(file)).join(',');
 style.textContent=(rules?rules+'{display:none!important;}':'')+
  'html.nettoAccessPageVerifying main{visibility:hidden!important}';
 const current=(location.pathname.split('/').pop()||'home.html').toLowerCase();
 const currentEntry=all.find(([,file])=>file===current);
 if(currentEntry&&currentEntry[0]!=='settings'&&(!snap||!snap.allowed.has(currentEntry[0])))root.classList.add('nettoAccessPageVerifying');
 root.dataset.nettoFastAccess=snap?'cache':'pending'
}
applyFastAccessBoot();

const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co';
const KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const ROLE={admin:'Administrateur',responsable:'Responsable',lecture:'Lecture seule',employe:'Employé','role_point-de-vente':'Point de vente'};
const AVATAR_FRAMES=Object.freeze({
 admin:'assets/avatar-frame-admin.svg',
 responsable:'assets/avatar-frame-responsable.svg',
 point_vente:'assets/avatar-frame-point-vente.svg',
 employe:'assets/avatar-frame-employe.svg',
 lecture:'assets/avatar-frame-lecture.svg'
});
function validAvatarFrame(v){v=String(v||'').trim();return Object.prototype.hasOwnProperty.call(AVATAR_FRAMES,v)?v:''}
function avatarFrameAsset(v){v=validAvatarFrame(v);return v?AVATAR_FRAMES[v]:''}
function setAvatarFrame(el,frame){if(!el)return;const v=validAvatarFrame(frame);if(v)el.dataset.avatarFrame=v;else delete el.dataset.avatarFrame}
const BASE_MODULES=Object.freeze([
 {id:'home',label:'Accueil',homeLabel:'Accueil',subtitle:'Retour au portail',url:'home.html',icon:'⌂',asset:'assets/logo-home.svg',roles:null,rolesLocked:true,enabledLocked:true,home:false,userMenu:true,defaultHome:false,defaultUser:true,kicker:'PORTAIL',description:'Revenir à l’accueil principal de Nethor.',action:'Ouvrir l’accueil',cardClass:'homeCard',group:'principal',platform:'all'},
 {id:'profile',label:'Mon profil',homeLabel:'Mon profil',subtitle:'Profil et notifications',url:'profile.html',icon:'☺',asset:'assets/logo-profile.svg?v=3',roles:null,home:true,userMenu:true,defaultHome:false,defaultUser:true,kicker:'MON COMPTE',description:'Gérer ta photo, ton apparence et la sécurité de ton compte.',action:'Ouvrir mon profil',cardClass:'profileCard',group:'principal',platform:'all'},
 {id:'stock',label:'Stock F&L',homeLabel:'Stock F&L',subtitle:'Gestion du stock',url:'index.html',homeUrl:'index.html?mode=stock',asset:'assets/logo-stock.svg',roles:null,home:true,userMenu:true,defaultHome:true,defaultUser:true,kicker:'OPÉRATIONS',description:'Contrôler les quantités, préparer les commandes et administrer le référentiel produits depuis un espace optimisé terrain.',action:'Ouvrir le stock',cardClass:'stock',group:'principal',platform:'all'},
 {id:'planning',label:'Planning',homeLabel:'Planning équipe',subtitle:'Horaires de l’équipe',url:'planning.html',asset:'assets/logo-planning.svg',roles:null,home:true,userMenu:true,defaultHome:true,defaultUser:true,kicker:'ORGANISATION',description:'Consulter les horaires, importer les plannings Excel et suivre précisément chaque modification.',action:'Consulter le planning',cardClass:'planning',group:'principal',platform:'all'},
 {id:'chat',label:'Chat',homeLabel:'Chat',subtitle:'Messagerie interne',url:'chat.html',asset:'assets/logo-chat.svg',roles:null,home:true,userMenu:true,defaultHome:true,defaultUser:true,kicker:'COMMUNICATION',description:'Centraliser les échanges, la présence des membres et les informations utiles au fonctionnement quotidien.',action:'Ouvrir le chat',cardClass:'chatCard',group:'principal',platform:'all'},
 {id:'scanner',label:'Scanner (bêta)',homeLabel:'Scanner (bêta)',subtitle:'EAN13 vers fiche article',url:'scanner.html',icon:'⌁',roles:null,home:false,userMenu:true,defaultHome:false,defaultUser:true,kicker:'OUTIL MOBILE',description:'Scanner un code-barres ou saisir une référence courte pour retrouver rapidement une fiche article.',action:'Ouvrir le scanner',cardClass:'scannerCard',group:'terrain',platform:'mobile',mobileBar:true},
 {id:'articles',label:'Fiches articles',homeLabel:'Fiches articles',subtitle:'Référentiel articles',url:'articles.html',asset:'assets/logo-article.svg',roles:null,home:true,userMenu:true,defaultHome:true,defaultUser:true,kicker:'RÉFÉRENTIEL',description:'Retrouver rapidement les références, codes et informations produit utilisées dans les procédures du rayon.',action:'Ouvrir le référentiel',cardClass:'articlesCard',group:'principal',platform:'all'},
 {id:'notifications',label:'Notifications',homeLabel:'Notifications',subtitle:'Centre d’activité',url:'notifications.html',icon:'◇',roles:null,home:false,userMenu:false,defaultHome:false,defaultUser:false,kicker:'INFORMATIONS',description:'Consulter les notifications et informations reçues dans Nethor.',action:'Ouvrir les notifications',cardClass:'notificationsCard',group:'communication',platform:'all',mobileBar:true},
 {id:'notification_settings',label:'Réglages des notifications',homeLabel:'Réglages des notifications',subtitle:'Préférences et alertes',url:'notification-settings.html',icon:'♢',roles:null,home:false,userMenu:true,defaultHome:false,defaultUser:true,kicker:'PRÉFÉRENCES',description:'Choisir les canaux et types de notifications à recevoir.',action:'Régler les notifications',cardClass:'notificationSettingsCard',group:'communication',platform:'all'},
 {id:'problem_report',label:'Signaler un problème',homeLabel:'Signaler un problème',subtitle:'Décrire et envoyer un bug',url:'report-problem.html',icon:'⚠',roles:null,home:false,userMenu:true,defaultHome:false,defaultUser:true,kicker:'ASSISTANCE',description:'Envoyer à l’administration un signalement détaillé depuis Nethor.',action:'Signaler un problème',cardClass:'problemReportCard',group:'communication',platform:'mobile'},
 {id:'fl_assistant',label:'Assistant Précommande',homeLabel:'Assistant Précommande',subtitle:'Analyse Fruits & Légumes',url:'fl-assistant.html',icon:'▤',roles:['admin','responsable'],home:false,userMenu:false,defaultHome:false,defaultUser:false,kicker:'F&L',description:'Analyser les données utiles à la préparation des précommandes Fruits & Légumes.',action:'Ouvrir l’assistant',cardClass:'assistantCard',group:'terrain',platform:'all'},
 {id:'rewards',label:'Défis & Boutique',homeLabel:'Défis & Boutique',subtitle:'Missions et récompenses',url:'rewards.html',icon:'✦',asset:'assets/logo-rewards.svg?v=3',roles:['admin'],home:true,userMenu:true,defaultHome:true,defaultUser:true,kicker:'ADMINISTRATION',description:'Créer les défis, gérer les récompenses et utiliser librement le catalogue administrateur.',action:'Ouvrir Défis & Boutique',cardClass:'rewardsCard',group:'administration',platform:'all'},
  {id:'bakery',label:'Boulangerie',homeLabel:'Boulangerie',subtitle:'Stock • Consulter • Gestion',url:'bakery.html',asset:'assets/logo-boulangerie.svg?v=3',roles:['admin'],home:true,userMenu:true,defaultHome:true,defaultUser:true,kicker:'ADMINISTRATION',description:'Gérer le stock, consulter les articles et administrer les catégories propres à la famille Boulangerie.',action:'Ouvrir la Boulangerie',cardClass:'bakeryCard',group:'administration',platform:'all'},
 {id:'accounts',label:'Gestion des comptes',homeLabel:'Gestion des comptes',subtitle:'Utilisateurs, accès et journal',url:'accounts.html',icon:'♙',asset:'assets/logo-accounts.svg',roles:['admin'],rolesLocked:true,enabledLocked:true,home:false,userMenu:false,defaultHome:false,defaultUser:false,kicker:'ADMINISTRATION',description:'Gérer les utilisateurs, leurs rôles, les demandes de mot de passe et le journal d’activité.',action:'Gérer les comptes',cardClass:'accountsCard',group:'administration',platform:'all'},
 {id:'portal_admin',label:'Gestion',homeLabel:'Gestion',subtitle:'Portail, comptes et permissions',url:'admin-portal.html',icon:'✦',asset:'assets/logo-admin-portal.svg',roles:['admin'],rolesLocked:true,enabledLocked:true,home:true,userMenu:true,defaultHome:false,defaultUser:true,kicker:'ADMINISTRATION',description:'Administrer le portail, les comptes, les rôles, les permissions, les notifications et les journaux depuis un espace unique.',action:'Ouvrir la gestion',cardClass:'portalAdminCard',group:'administration',platform:'all'},
 {id:'settings',label:'Personnalisation',homeLabel:'Personnalisation',subtitle:'Mon accueil et mes raccourcis',url:'settings.html',icon:'⚙',asset:'assets/logo-settings.svg',roles:null,rolesLocked:true,enabledLocked:true,home:true,userMenu:false,defaultHome:false,defaultUser:true,kicker:'PRÉFÉRENCES',description:'Choisir les outils visibles sur ton accueil et dans ta barre utilisateur selon tes droits.',action:'Personnaliser mon portail',cardClass:'settingsCard',group:'principal',platform:'all'},
 {id:'maintenance',label:'Maintenance',homeLabel:'Maintenance',subtitle:'Page d’indisponibilité',url:'maintenance.html',icon:'⚙',roles:null,rolesLocked:true,enabledLocked:true,placementLocked:true,home:false,userMenu:false,defaultHome:false,defaultUser:false,kicker:'SYSTÈME',description:'Page affichée automatiquement lorsque le mode maintenance du portail est activé.',action:'Voir la page',cardClass:'maintenanceCard',group:'systeme',platform:'system',navigation:false,mobileBar:false}
]);
let NAV_MODULES=[...BASE_MODULES];
const SYSTEM_ROLES=Object.freeze(['admin','responsable','employe','lecture']);
function roleKeys(config=api?.siteConfig){const defs=config?.role_definitions&&typeof config.role_definitions==='object'?Object.keys(config.role_definitions):[];return [...new Set([...SYSTEM_ROLES,...defs])]}
function roleDefinition(key,config=api?.siteConfig){return config?.role_definitions?.[key]||null}
function cleanColor(v,fallback=''){const s=String(v||'').trim();return /^#[0-9a-f]{6}$/i.test(s)?s:fallback}
function rebuildModules(config={}){
 const pages=config?.pages&&typeof config.pages==='object'?config.pages:{},platformKey=isMobileViewport()?'mobile':'desktop';
 const base=BASE_MODULES.map(m=>{
  const p=pages[m.id]&&typeof pages[m.id]==='object'?pages[m.id]:{};
  const po=p.platform_overrides?.[platformKey]&&typeof p.platform_overrides[platformKey]==='object'?p.platform_overrides[platformKey]:{};
  const platformImage=String(po.image_url||'').trim(),overrideImage=platformImage||String(p.image_url||'').trim();
  const out={...m,
   baseUrl:m.url,
   label:String(po.nav_label||po.label||p.nav_label||p.label||m.label),
   homeLabel:String(po.label||p.label||m.homeLabel||m.label),
   subtitle:String(po.subtitle||p.subtitle||m.subtitle||''),
   description:String(po.description||p.description||m.description||''),
   url:String(po.url||p.url||m.url||''),
   icon:String(po.icon||p.icon||m.icon||'•'),
   asset:overrideImage||m.asset,
   platformAssetOverride:platformImage,
   home:typeof p.home==='boolean'?p.home:m.home,
   userMenu:typeof p.user_menu==='boolean'?p.user_menu:m.userMenu,
   defaultHome:typeof p.default_home==='boolean'?p.default_home:m.defaultHome,
   defaultUser:typeof p.default_user==='boolean'?p.default_user:m.defaultUser,
   kicker:String(po.kicker||p.kicker||m.kicker||'OUTIL'),
   action:String(po.action||p.action||m.action||'Ouvrir'),
   menuColor:cleanColor(po.color,cleanColor(p.color,'')),
   menuAccent:cleanColor(po.accent,cleanColor(p.accent,'')),
   configuredRoles:Array.isArray(p.roles)?p.roles.filter(r=>roleKeys(config).includes(r)):null
  };
  return out
 });
 NAV_MODULES=[...base];
 if(typeof api!=='undefined'){api.modules=NAV_MODULES;api.allRoles=roleKeys(config)}
}
function applyPortalTheme(config={}){
 const t=config?.theme||{},root=document.documentElement;
 const primary=cleanColor(t.primary,'#ff2f1f'),secondary=cleanColor(t.secondary,'#ff8500'),ink=cleanColor(t.ink,'#182235');
 root.style.setProperty('--netto-red',primary);root.style.setProperty('--netto-red-2',primary);
 root.style.setProperty('--netto-orange',secondary);root.style.setProperty('--netto-ink',ink);
 root.style.setProperty('--red',primary);root.style.setProperty('--red2',primary);root.style.setProperty('--orange',secondary);
 root.style.setProperty('--netto-gradient','linear-gradient(135deg,'+primary+' 0%,'+primary+' 44%,'+secondary+' 100%)');applyHeaderLogo(config);applySiteIcons(config);window.NettoSounds?.configure?.(config)
}
function moduleMaxRoles(module,config=api?.siteConfig){return Array.isArray(module?.roles)?module.roles.filter(r=>roleKeys(config).includes(r)):roleKeys(config)}
function configuredRoles(module,config=api?.siteConfig){
 if(!module)return[];
 if(module.id==='settings')return roleKeys(config);
 const max=moduleMaxRoles(module,config),page=config?.pages?.[module.id],raw=Array.isArray(page?.roles)?page.roles:module.configuredRoles;
 if(!Array.isArray(raw))return [...max];
 return [...new Set(raw.filter(r=>max.includes(r)))];
}
function moduleAllowed(module,profileOrRole,config=api?.siteConfig){
 const role=typeof profileOrRole==='string'?profileOrRole:profileOrRole?.role;
 if(!role)return false;
 if(module.id!=='settings'&&config?.pages?.[module.id]?.enabled===false)return false;
 /* Sécurité Nethor : l'Administrateur conserve l'accès aux pages actives,
    même pendant une synchronisation ou avec un ancien cache de permissions. */
 if(role==='admin')return true;
 const extra=api?.subrolePermissions?.[module.id];
 if(extra==='view'||extra==='operate'||extra==='manage')return true;
 const explicit=config?.role_permissions?.[module.id]?.[role];
 if(['none','view','operate','manage'].includes(explicit))return explicit!=='none';
 return configuredRoles(module,config).includes(role)
}
function permissionLevel(moduleOrId,profileOrRole,config=api?.siteConfig){
 const module=typeof moduleOrId==='string'?NAV_MODULES.find(m=>m.id===moduleOrId):moduleOrId;
 const role=typeof profileOrRole==='string'?profileOrRole:profileOrRole?.role;
 if(!module||!role)return'none';
 if(module.id==='settings')return role==='admin'?'manage':'view';
 if(module.id!=='settings'&&config?.pages?.[module.id]?.enabled===false)return'none';
 if(role==='admin')return'manage';
 const baseExplicit=config?.role_permissions?.[module.id]?.[role];
 let base=['none','view','operate','manage'].includes(baseExplicit)?baseExplicit:(configuredRoles(module,config).includes(role)?(role==='admin'?'manage':'view'):'none');
 const extra=api?.subrolePermissions?.[module.id];
 if(extra==='manage')return'manage';
 if(extra==='operate'&&base!=='manage')return'operate';
 if(extra==='view'&&base==='none')return'view';
 return base
}
function canManage(moduleOrId,profileOrRole,config=api?.siteConfig){return permissionLevel(moduleOrId,profileOrRole,config)==='manage'}
function preferenceMap(profile){const p=profile?.ui_preferences;return p&&typeof p==='object'&&!Array.isArray(p)?p:{}}
function moduleVisible(area,module,profile,config=api?.siteConfig){
 if(!moduleAllowed(module,profile,config))return false;
 if(module?.navigation===false)return false;
 if(module?.platform==='mobile'&&!isMobileViewport())return false;
 if(module?.platform==='desktop'&&isMobileViewport())return false;
 if(area==='home'&&!module.home)return false;
 if(area==='user_menu'&&!module.userMenu)return false;
 const v=preferenceMap(profile)?.[area]?.[module.id];
 if(typeof v==='boolean')return v;
 return area==='home'?module.defaultHome!==false:module.defaultUser!==false
}
function visibleModules(area,profile,config=api?.siteConfig){return NAV_MODULES.filter(m=>moduleVisible(area,m,profile,config))}
function moduleIcon(module){return module?.asset?'<img src="'+esc(module.asset)+'" alt="">':esc(module?.icon||'•')}
const DEFAULT_MOBILE_BAR_IDS=Object.freeze(['home','planning','chat']);
const MOBILE_NAV_ICONS=Object.freeze({
 home:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5"/><path d="M6.5 9.5V20h11V9.5"/></svg>',
 stock:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 8.5h15l-1.4 10H5.9l-1.4-10Z"/><path d="M7 8.5 9 5.5h6l2 3"/><path d="M8 12h8"/></svg>',
 planning:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M8 4v3M16 4v3M4 9.5h16"/><path d="M8 13h3M13 13h3M8 16h3"/></svg>',
 chat:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7.5 16.5H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3l-2.5 2v-2Z"/><path d="M15.5 15.5H19a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-1.5"/></svg>',
 scanner:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3"/><path d="M8 9v6M11 8v8M14 9v6M17 8v8"/></svg>',
 problem_report:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4 21 20H3L12 4Z"/><path d="M12 9v5"/><path d="M12 17.2v.2"/></svg>',
 notifications:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21a2.4 2.4 0 0 0 2.3-1.7H9.7A2.4 2.4 0 0 0 12 21Z"/><path d="M18.2 16.5H5.8l1.5-2V9.7a4.7 4.7 0 0 1 9.4 0v4.8l1.5 2Z"/><path d="M12 3.3V2"/></svg>',
 profile:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.25"/><path d="M5.5 18.5c1.4-3 4-4.5 6.5-4.5s5.1 1.5 6.5 4.5"/></svg>',
 articles:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 5.5h8l2 2V18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z"/><path d="M15 5.5v2h2"/><path d="M8 11h8M8 14h8M8 17h5"/></svg>',
 rewards:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5.5 14 9.5l4.5.6-3.3 3 1 4.4L12 15.5l-4.2 2 1-4.4-3.3-3L10 9.5l2-4Z"/></svg>',
 bakery:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 11.5c0-2.9 2.6-5 6-5s6 2.1 6 5c0 .7-.1 1.3-.4 2H6.4c-.3-.7-.4-1.3-.4-2Z"/><path d="M5.5 13.5h13V16a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-2.5Z"/><path d="M9 9.5c0-1 .7-2 1.8-2.7M12 9c0-1.3.8-2.5 2.2-3.3"/></svg>',
 accounts:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="2.5"/><circle cx="16.5" cy="10" r="2"/><path d="M4.5 18c1.1-2.3 3-3.5 4.5-3.5s3.4 1.2 4.5 3.5"/><path d="M14 18c.7-1.5 2-2.4 3.2-2.4 1.1 0 2.4.9 3.1 2.4"/></svg>',
 portal_admin:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4.5" y="4.5" width="15" height="15" rx="3"/><path d="M8 8h8M8 12h5M8 16h8"/></svg>',
 settings:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="2.75"/><path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3H9.6l-.3 3a7 7 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .7.1 1.1l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.3 3h4.8l.3-3a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.4.1-.7.1-1.1Z"/></svg>',
 notification_settings:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 9a5 5 0 0 1 10 0v3.2l1.7 2.8H5.3L7 12.2V9Z"/><path d="M9.5 18h5M12 3v1"/></svg>',
 fl_assistant:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5h14v14H5z"/><path d="M8 9h8M8 12h5M8 15h7"/></svg>',
 default:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="5" width="5" height="5" rx="1.2"/><rect x="14" y="5" width="5" height="5" rx="1.2"/><rect x="5" y="14" width="5" height="5" rx="1.2"/><rect x="14" y="14" width="5" height="5" rx="1.2"/></svg>'
});
function mobileNavIcon(id){
 const module=NAV_MODULES.find(m=>m.id===id),custom=String(module?.platformAssetOverride||'').trim();
 if(custom)return '<img src="'+esc(custom)+'" alt="" style="display:block;width:100%;height:100%;object-fit:contain">';
 return MOBILE_NAV_ICONS[id]||MOBILE_NAV_ICONS.default
}
function mobileModuleForId(id){return NAV_MODULES.find(m=>m.id===id)}
function mobileBarEligible(module){
 if(!module||module.custom)return false;
 if(module.navigation===false||module.mobileBar===false)return false;
 if(module.platform==='desktop'||module.platform==='system')return false;
 return true
}

function mobileBarItems(config=api?.siteConfig){
 const raw=Array.isArray(config?.mobile_bar?.items)?config.mobile_bar.items:[];
 const source=raw.length?raw:DEFAULT_MOBILE_BAR_IDS.map(id=>({id,enabled:true,label:''}));
 const allowed=new Set(DEFAULT_MOBILE_BAR_IDS),seen=new Set(),out=[];
 for(const item of source){
  const id=String(item?.id||'').trim();
  if(!id||!allowed.has(id)||seen.has(id))continue;
  const module=NAV_MODULES.find(m=>m.id===id);
  if(!mobileBarEligible(module))continue;
  seen.add(id);out.push({id,enabled:item?.enabled!==false,label:String(item?.label||'').trim().slice(0,18)});
  if(out.length>=3)break
 }
 for(const id of DEFAULT_MOBILE_BAR_IDS){
  if(out.length>=3||seen.has(id))continue;
  const module=NAV_MODULES.find(m=>m.id===id);if(module&&mobileBarEligible(module)){seen.add(id);out.push({id,enabled:true,label:''})}
 }
 return out.slice(0,3)
}
function samePageDestination(url){
 try{
  const current=(location.pathname.split('/').pop()||'home.html').toLowerCase();
  const u=new window.URL(url||'home.html',location.href);
  const target=(u.pathname.split('/').pop()||'home.html').toLowerCase();
  return current===target
 }catch(_){return false}
}
function rememberUserMenuParent(){
 return window.NethorNavigation?.rememberUserMenuParent?.()||'home.html'
}
function userMenuChildUrl(raw){
 return window.NethorNavigation?.userMenuChildUrl?.(raw)||raw||'home.html'
}
function userMenuReturnUrl(){
 return window.NethorNavigation?.userMenuReturnUrl?.()||'user-menu.html'
}
function tryOpenRequestedUserMenu(){
 return false
}
function backToUserMenu(){
 sounds.play('navigate');
 if(window.NethorNavigation?.navigateBack)return window.NethorNavigation.navigateBack();
 location.href=mobileDropMode()?userMenuReturnUrl():'home.html'
}
function mobileBarActive(module){
 try{
  const current=(location.pathname.split('/').pop()||'home.html').toLowerCase();
  if(current==='user-menu.html'&&module?.id==='profile')return true;
  if(current==='notification-settings.html'&&module?.id==='profile')return true;
  return samePageDestination(module?.url||'home.html')
 }catch(_){return false}
}
function syncMobileQuickBarActive(preferredId=''){
 const nav=document.getElementById('nettoMobileQuickBar');if(!nav)return;
 const items=[...nav.querySelectorAll('.nettoMobileQuickItem')];if(!items.length)return;
 let active=null;
 if(preferredId)active=items.find(x=>x.dataset.mobileId===preferredId)||null;
 if(!active&&document.documentElement.classList.contains('nettoMobileUserMenuOpen'))active=items.find(x=>x.dataset.mobileId==='profile')||null;
 if(!active){
  const current=(location.pathname.split('/').pop()||'home.html').toLowerCase();
  active=items.find(x=>{
   if(current==='user-menu.html'&&x.dataset.mobileId==='profile')return true;
   if(current==='notification-settings.html'&&x.dataset.mobileId==='profile')return true;
   return samePageDestination(x.getAttribute('href')||'home.html')
  })||null
 }
 items.forEach(item=>{
  const on=item===active;
  item.classList.toggle('active',on);
  if(on)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current')
 })
}
function updateMobileNotificationBadge(forced){
 const count=Number.isFinite(Number(forced))?Number(forced):api.notifications.filter(n=>!n.read_at).length;
 document.querySelectorAll('.nettoMobileNotifBadge').forEach(b=>{b.textContent=count>99?'99+':String(count);b.classList.toggle('hidden',count<1)})
}
function renderMobileQuickBar(){
 const old=document.getElementById('nettoMobileQuickBar');
 if(!isMobileViewport()||!api.profile||api.siteConfig?.mobile_bar?.enabled===false){
  old?.remove();document.body?.classList.remove('nettoHasMobileBar');return
 }
 const items=mobileBarItems(api.siteConfig)
  .filter(x=>x.enabled!==false)
  .map(x=>({item:x,module:mobileModuleForId(x.id)}))
  .filter(x=>x.module&&moduleAllowed(x.module,api.profile,api.siteConfig));
 if(!items.length){old?.remove();document.body?.classList.remove('nettoHasMobileBar');return}
 let nav=old;
 if(!nav){nav=document.createElement('nav');nav.id='nettoMobileQuickBar';nav.className='nettoMobileQuickBar';nav.setAttribute('aria-label','Navigation rapide');document.body.appendChild(nav)}
 nav.style.setProperty('--netto-mobile-count',String(items.length));
 nav.innerHTML=window.NethorMobileShell?.buildQuickBar?.(items,mobileNavIcon)||items.map(({item,module})=>{const isUserMenu=module.id==='profile',label=isUserMenu?'Menu utilisateur':(item.label||module.label||'Menu'),badge=module.id==='notifications'?'<b class="nettoMobileNotifBadge hidden" aria-label="Notifications non lues">0</b>':'';if(isUserMenu)return '<a class="nettoMobileQuickItem" data-mobile-id="profile" href="user-menu.html" aria-label="Menu utilisateur" title="Menu utilisateur"><span class="nettoMobileQuickIcon" aria-hidden="true">'+mobileNavIcon(module.id)+'</span></a>';return '<a class="nettoMobileQuickItem" data-mobile-id="'+esc(module.id)+'" href="'+esc(module.url||'home.html')+'" aria-label="'+esc(label)+'" title="'+esc(label)+'"><span class="nettoMobileQuickIcon" aria-hidden="true">'+mobileNavIcon(module.id)+'</span>'+badge+'</a>'}).join('');
 warmMobileRoutes(items.map(({module})=>module?.id==='profile'?'user-menu.html':module?.url||'').filter(Boolean));
 syncMobileQuickBarActive();
 const clearQuickNavVisual=()=>{
  nav.querySelectorAll('.nettoMobileQuickItem').forEach(x=>x.classList.remove('pressed','navigating'))
 };
 let quickNavBusy=false,lastPointerNavigationAt=0;
 const navigateQuickItem=(a,e)=>{
  if(!a?.matches?.('a[href]'))return;
  const target=a.getAttribute('href')||'',id=a.dataset.mobileId||'';
  e?.preventDefault?.();e?.stopPropagation?.();
  if(!target)return;
  if(mobileDropMode())closeDrops();
  if(samePageDestination(target)){
   clearQuickNavVisual();
   syncMobileQuickBarActive(id);
   try{window.scrollTo({top:0,left:0,behavior:'smooth'})}catch(_){try{window.scrollTo(0,0)}catch(__){}}
   try{window.dispatchEvent(new CustomEvent('nethor:mobile-tab-reselect',{detail:{id,target}}))}catch(_){}
   return
  }
  if(quickNavBusy)return;
  quickNavBusy=true;clearQuickNavVisual();
  a.classList.add('navigating');syncMobileQuickBarActive(id);
  document.documentElement.classList.add('nettoMobileNavigating');
  try{sessionStorage.setItem('nethorMobilePendingTabV1',JSON.stringify({id,target,at:Date.now()}))}catch(_){}
  try{sounds.play('navigate')}catch(_){}
  let attempted=false;
  const go=()=>{
   if(attempted)return;attempted=true;
   try{
    if(window.NethorNavigation?.navigate){window.NethorNavigation.navigate(target);return}
   }catch(_){}
   try{location.assign(target)}catch(_){location.href=target}
  };
  requestAnimationFrame(go);
  setTimeout(()=>{
   if(document.visibilityState==='visible'&&!samePageDestination(target)){
    try{location.assign(target)}catch(_){location.href=target}
   }
  },320)
 };
 nav.querySelectorAll('.nettoMobileQuickItem').forEach(a=>{
  a.addEventListener('pointerdown',()=>{
   clearQuickNavVisual();a.classList.add('pressed')
  },{passive:true});
  a.addEventListener('pointercancel',()=>a.classList.remove('pressed'),{passive:true});
  a.addEventListener('pointerup',e=>{
   a.classList.remove('pressed');
   if(e.pointerType==='touch'||e.pointerType==='pen'){
    lastPointerNavigationAt=Date.now();
    navigateQuickItem(a,e)
   }
  });
  a.addEventListener('click',e=>{
   if(Date.now()-lastPointerNavigationAt<700){e.preventDefault();e.stopPropagation();return}
   navigateQuickItem(a,e)
  })
 });
 updateMobileNotificationBadge();
 document.body.classList.add('nettoHasMobileBar');
 if(!window.__nettoOpenUserMenuHandled)setTimeout(tryOpenRequestedUserMenu,0)
}
const api={profile:null,siteConfig:{},subrolePermissions:{},avatarUrl:null,onlineIds:new Set(),channel:null,profileChannel:null,accessChannel:null,chatPresenceTimer:null,client:null,session:null,notifications:[],notificationPreferences:null,notifChannel:null,loginHistory:[],modules:NAV_MODULES,allRoles:[...SYSTEM_ROLES],avatarFrames:AVATAR_FRAMES,validAvatarFrame,avatarFrameAsset,setAvatarFrame,paintAvatar:paint,maxRoles:moduleMaxRoles,configuredRoles,roleLabel,canAccess:moduleAllowed,permissionLevel,canManage,isVisible:moduleVisible,visibleModules,rebuildModules,renderMobileQuickBar,mobileBarItems,mobileBarEligible,mobileNavIcon,refresh,loadNotifications,markNotificationRead:markRead,markAllNotificationsRead:markAllRead,deleteNotification,deleteAllNotifications,notificationIcon,notificationCategory,notificationDate,notificationDayGroup,backToUserMenu,goBack,userMenuReturnUrl,logout:logoutFromNethor,loadNotificationPreferences,notificationPreferenceEnabled,notificationPushEnabled,notificationPortalEnabled,notificationRuleKey,preferredTheme,applyProfileTheme,setThemePreference:saveThemePreference,applyHeaderLogo,toggleMobilePreview:()=>toggleMobilePreview(),closeDrops,checkForUpdates:()=>manualCheckForUpdates(),rebuildGlobalHeader:()=>{buildGlobalHeader();renderMobileQuickBar();applyHeaderLogo(api.siteConfig||{})},maintenanceActive:()=>maintenanceActive(),enforceMaintenance:()=>enforceMaintenanceAccess(),openUserCard,closeUserCard,userPresenceLabel,userCardVersion:1};
window.NettoProfileUI=api;

const SOUND_DEFS={
 tap:[[520,0,.055,.15,'sine',610]],
 menuOpen:[[330,0,.10,.16,'sine',430],[520,.045,.12,.09,'sine',620]],
 menuClose:[[520,0,.08,.13,'sine',420],[340,.045,.11,.10,'sine',290]],
 navigate:[[420,0,.065,.11,'sine',540],[680,.035,.075,.075,'sine',780]],
 switch:[[390,0,.08,.12,'triangle',650]],
 confirm:[[523.25,0,.13,.14,'sine'],[659.25,.075,.19,.13,'sine']],
 success:[[392,0,.20,.12,'sine'],[493.88,.085,.25,.14,'sine'],[659.25,.19,.34,.13,'sine']],
 update:[[392,0,.20,.12,'sine'],[493.88,.085,.25,.14,'sine'],[659.25,.19,.34,.13,'sine']],
 loginSuccess:[[329.63,0,.29,.11,'sine'],[415.3,.085,.33,.13,'sine'],[493.88,.18,.39,.14,'sine'],[659.25,.30,.50,.11,'sine']],
 welcome:[[293.66,0,.19,.095,'sine'],[392,.105,.24,.11,'sine'],[493.88,.22,.34,.10,'sine']],
 error:[[245,0,.11,.105,'square',218],[196,.115,.18,.095,'square',174]],
 warning:[[392,0,.10,.11,'triangle'],[392,.15,.12,.10,'triangle']],
 notification:[[783.99,0,.13,.105,'sine'],[1046.5,.105,.27,.09,'sine']],
 message:[[659.25,0,.11,.10,'sine'],[880,.085,.20,.09,'sine']],
 delete:[[370,0,.11,.11,'triangle',300],[246.94,.09,.21,.10,'sine',220]],
 logout:[[587.33,0,.19,.11,'sine'],[493.88,.085,.23,.12,'sine'],[392,.18,.31,.11,'sine'],[293.66,.29,.40,.08,'sine']]
};
const SOUND_DEFAULT_ENABLED=Object.freeze({loginSuccess:true,logout:true,update:true,welcome:false});
const SOUND_EQ_BANDS=Object.freeze([
 {key:'bass',type:'lowshelf',frequency:80,q:.7},
 {key:'warmth',type:'peaking',frequency:250,q:.8},
 {key:'mid',type:'peaking',frequency:1000,q:.9},
 {key:'presence',type:'peaking',frequency:4000,q:.9},
 {key:'treble',type:'highshelf',frequency:10000,q:.7}
]);
function normalizeSoundEq(raw){
 raw=raw&&typeof raw==='object'?raw:{};
 const out={};
 for(const band of SOUND_EQ_BANDS){
  const n=Number(raw[band.key]);
  out[band.key]=Number.isFinite(n)?Math.max(-12,Math.min(12,n)):0
 }
 return out
}
function soundEqActive(eq){
 const node=normalizeSoundEq(eq);
 return SOUND_EQ_BANDS.some(b=>Math.abs(node[b.key])>=.05)
}
function connectSoundEq(ctx,input,output,eq,at=ctx.currentTime){
 const values=normalizeSoundEq(eq);
 if(!soundEqActive(values)){input.connect(output);return[]}
 let previous=input;const filters=[];
 for(const band of SOUND_EQ_BANDS){
  const filter=ctx.createBiquadFilter();filter.type=band.type;filter.frequency.setValueAtTime(band.frequency,at);
  if(band.type==='peaking')filter.Q.setValueAtTime(band.q,at);
  filter.gain.setValueAtTime(values[band.key]||0,at);
  previous.connect(filter);previous=filter;filters.push(filter)
 }
 previous.connect(output);return filters
}
let soundCtx=null,soundSiteConfig={};
function soundEnabled(){try{return localStorage.getItem('nettoSoundEnabled')!=='0'}catch(_){return true}}
function soundVolume(){try{const raw=localStorage.getItem('nettoSoundVolume');if(raw===null)return .72;const v=Number(raw);return Number.isFinite(v)&&v>=0&&v<=1?v:.72}catch(_){return .72}}
function unlockSound(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;soundCtx=soundCtx||new A();if(soundCtx.state==='suspended')soundCtx.resume().catch(()=>{});return soundCtx}catch(_){return null}}
function soundConfigNode(name,source=soundSiteConfig){
 const raw=source?.sounds?.items?.[name]&&typeof source.sounds.items[name]==='object'?source.sounds.items[name]:{};
 const volume=Number(raw.volume),trimStart=Number(raw.trim_start),trimEnd=Number(raw.trim_end);
 return{
  enabled:typeof raw.enabled==='boolean'?raw.enabled:!!SOUND_DEFAULT_ENABLED[name],
  volume:Number.isFinite(volume)?Math.max(0,Math.min(1,volume)):1,
  url:String(raw.url||'').trim(),
  name:String(raw.name||''),
  trim_start:Number.isFinite(trimStart)&&trimStart>0?trimStart:0,
  trim_end:Number.isFinite(trimEnd)&&trimEnd>0?trimEnd:null,
  eq:normalizeSoundEq(raw.eq)
 }
}
function synthSoundDuration(name){
 const def=SOUND_DEFS[name];if(!def||!def.length)return 0;
 return Math.max(...def.map(t=>(t[1]||0)+(t[2]||.1)))+.08
}
function soundTrimBounds(node,duration){
 const total=Number(duration),max=Number.isFinite(total)&&total>0?total:Infinity;
 const start=Math.max(0,Number(node?.trim_start)||0);
 const rawEnd=Number(node?.trim_end);
 const end=Number.isFinite(rawEnd)&&rawEnd>start?Math.min(max,rawEnd):max;
 return{start:Math.min(start,Number.isFinite(max)?Math.max(0,max-.001):start),end}
}
function soundFilterFrequency(name){return name==='error'?1350:name==='logout'?1750:2400}
function playSynthSound(name,node,force=false){
 const def=SOUND_DEFS[name],a=unlockSound();if(!def||!a)return false;
 const run=()=>{try{
  const total=synthSoundDuration(name),bounds=soundTrimBounds(node,total),selection=Math.max(.01,bounds.end-bounds.start);
  const now=a.currentTime,master=a.createGain(),filter=a.createBiquadFilter(),level=Math.max(.0001,soundVolume()*.46*(node?.volume??1));
  filter.type='lowpass';filter.frequency.setValueAtTime(soundFilterFrequency(name),now);
  master.gain.setValueAtTime(level,now);
  master.gain.exponentialRampToValueAtTime(.0001,now+selection+.05);
  connectSoundEq(a,filter,master,node?.eq,now);master.connect(a.destination);
  def.forEach(t=>{
   const [freq,delay=0,dur=.1,gain=.1,type='sine',endFreq]=t,noteStart=delay,noteEnd=delay+dur,clipStart=Math.max(noteStart,bounds.start),clipEnd=Math.min(noteEnd,bounds.end);
   if(clipEnd<=clipStart)return;
   const segDur=Math.max(.008,clipEnd-clipStart),st=now+(clipStart-bounds.start),o=a.createOscillator(),g=a.createGain();
   o.type=type;
   let startFreq=freq,finishFreq=endFreq;
   if(endFreq&&endFreq>0&&freq>0&&dur>0){
    const ratio=endFreq/freq,a0=(clipStart-noteStart)/dur,a1=(clipEnd-noteStart)/dur;
    startFreq=freq*Math.pow(ratio,Math.max(0,Math.min(1,a0)));
    finishFreq=freq*Math.pow(ratio,Math.max(0,Math.min(1,a1)))
   }
   o.frequency.setValueAtTime(Math.max(.01,startFreq),st);
   if(finishFreq&&finishFreq>0)o.frequency.exponentialRampToValueAtTime(Math.max(.01,finishFreq),st+segDur);
   g.gain.setValueAtTime(.0001,st);
   g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),st+Math.min(.025,segDur*.28));
   g.gain.exponentialRampToValueAtTime(.0001,st+segDur);
   o.connect(g);g.connect(filter);o.start(st);o.stop(st+segDur+.02)
  })
 }catch(_){}};if(a.state==='suspended')a.resume().then(run).catch(()=>{});else run();return true
}
function playCustomSound(name,node){
 try{
  const wantsEq=soundEqActive(node?.eq),useWebAudio=wantsEq||isMobileViewport(),ctx=useWebAudio?unlockSound():null,audio=new Audio();
  audio.preload='auto';
  let master=null;
  if(useWebAudio&&ctx){
   try{
    audio.crossOrigin='anonymous';audio.src=node.url;
    const source=ctx.createMediaElementSource(audio);master=ctx.createGain();
    master.gain.setValueAtTime(Math.max(0,Math.min(1,soundVolume()*(node?.volume??1))),ctx.currentTime);
    connectSoundEq(ctx,source,master,node?.eq,ctx.currentTime);master.connect(ctx.destination);
    audio.volume=1
   }catch(_){
    master=null;audio.pause();audio.removeAttribute('crossorigin');audio.src='';audio.src=node.url;
    audio.volume=Math.max(0,Math.min(1,soundVolume()*(node?.volume??1)))
   }
  }else{
   audio.src=node.url;
   audio.volume=Math.max(0,Math.min(1,soundVolume()*(node?.volume??1)))
  }
  let started=false,stopTimer=0;
  const stop=()=>{clearTimeout(stopTimer);try{audio.pause()}catch(_){}};
  const begin=()=>{
   if(started)return;started=true;
   const total=Number(audio.duration),bounds=soundTrimBounds(node,total),selection=Number.isFinite(bounds.end)?Math.max(.01,bounds.end-bounds.start):null;
   try{audio.currentTime=bounds.start}catch(_){}
   const startPlayback=()=>{
    const p=audio.play();
    if(p?.catch)p.catch(()=>playSynthSound(name,node,true))
   };
   if(master&&ctx?.state==='suspended')ctx.resume().then(startPlayback).catch(()=>startPlayback());else startPlayback();
   if(selection)stopTimer=setTimeout(stop,selection*1000+35);
   audio.addEventListener('timeupdate',()=>{if(Number.isFinite(bounds.end)&&audio.currentTime>=bounds.end-.015)stop()})
  };
  if(audio.readyState>=1)begin();
  else{audio.addEventListener('loadedmetadata',begin,{once:true});audio.load()}
  return true
 }catch(_){return playSynthSound(name,node,true)}
}
function playSound(name='tap'){
 if(!soundEnabled()||!SOUND_DEFS[name])return false;
 const node=soundConfigNode(name);if(!node.enabled)return false;
 return node.url?playCustomSound(name,node):playSynthSound(name,node)
}
function previewSound(name,nodeOverride=null){
 if(!SOUND_DEFS[name])return false;
 const base=soundConfigNode(name),node={...base,...(nodeOverride&&typeof nodeOverride==='object'?nodeOverride:{})};
 node.volume=Number.isFinite(Number(node.volume))?Math.max(0,Math.min(1,Number(node.volume))):1;
 node.trim_start=Math.max(0,Number(node.trim_start)||0);
 {const end=Number(node.trim_end);node.trim_end=Number.isFinite(end)&&end>node.trim_start?end:null}
 node.eq=normalizeSoundEq(node.eq);
 return node.url?playCustomSound(name,node):playSynthSound(name,node,true)
}
function encodeSoundWav(buffer){
 const channels=buffer.numberOfChannels,frames=buffer.length,rate=buffer.sampleRate,bytesPerSample=2,blockAlign=channels*bytesPerSample,out=new ArrayBuffer(44+frames*blockAlign),view=new DataView(out);
 const str=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i))};
 str(0,'RIFF');view.setUint32(4,36+frames*blockAlign,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,rate,true);view.setUint32(28,rate*blockAlign,true);view.setUint16(32,blockAlign,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,frames*blockAlign,true);
 let offset=44;for(let i=0;i<frames;i++)for(let ch=0;ch<channels;ch++){const v=Math.max(-1,Math.min(1,buffer.getChannelData(ch)[i]||0));view.setInt16(offset,v<0?v*0x8000:v*0x7fff,true);offset+=2}
 return new Blob([out],{type:'audio/wav'})
}
async function renderDefaultSoundWav(name){
 const def=SOUND_DEFS[name];if(!def)throw new Error('Son Nethor inconnu');
 const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!Offline)throw new Error('Export audio non pris en charge par ce navigateur');
 const duration=Math.max(...def.map(t=>(t[1]||0)+(t[2]||.1)))+.15,rate=44100,ctx=new Offline(1,Math.ceil(duration*rate),rate),master=ctx.createGain(),filter=ctx.createBiquadFilter();
 filter.type='lowpass';filter.frequency.setValueAtTime(soundFilterFrequency(name),0);master.gain.setValueAtTime(.46,0);master.gain.exponentialRampToValueAtTime(.0001,duration-.03);filter.connect(master);master.connect(ctx.destination);
 def.forEach(t=>{const [freq,delay=0,dur=.1,gain=.1,type='sine',endFreq]=t,o=ctx.createOscillator(),g=ctx.createGain(),st=delay;o.type=type;o.frequency.setValueAtTime(freq,st);if(endFreq&&endFreq>0)o.frequency.exponentialRampToValueAtTime(endFreq,st+dur);g.gain.setValueAtTime(.0001,st);g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),st+Math.min(.035,dur*.3));g.gain.exponentialRampToValueAtTime(.0001,st+dur);o.connect(g);g.connect(filter);o.start(st);o.stop(st+dur+.025)});
 return encodeSoundWav(await ctx.startRendering())
}
async function downloadDefaultSound(name,fileName){
 const blob=await renderDefaultSoundWav(name),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=fileName||('Nethor-'+name+'.wav');document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1400)
}
const sounds={
 play:playSound,preview:previewSound,unlock:unlockSound,names:Object.freeze(Object.keys(SOUND_DEFS)),
 configure(config){soundSiteConfig=config&&typeof config==='object'?config:{};return soundSiteConfig},
 config:name=>soundConfigNode(name),
 duration:name=>synthSoundDuration(name),
 downloadDefault:downloadDefaultSound,
 isEnabled:soundEnabled,getVolume:soundVolume,
 setEnabled(v){try{localStorage.setItem('nettoSoundEnabled',v?'1':'0')}catch(_){};window.dispatchEvent(new Event('netto:sound-settings'))},
 setVolume(v){const n=Math.max(0,Math.min(1,Number(v)||0));try{localStorage.setItem('nettoSoundVolume',String(n))}catch(_){};window.dispatchEvent(new Event('netto:sound-settings'))}
};
window.NettoSounds=sounds;
document.addEventListener('pointerdown',()=>sounds.unlock(),{once:true,capture:true});

function initials(n){return String(n||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function roleLabel(r){return roleDefinition(r)?.label||ROLE[r]||r||'Compte'}
window.NethorProfileFeatures=window.NethorProfileFeatures||{};
const profileFeaturePromises=new Map();
function loadProfileFeature(name,url){
 const ready=window.NethorProfileFeatures?.[name];if(ready)return Promise.resolve(ready);
 if(profileFeaturePromises.has(name))return profileFeaturePromises.get(name);
 const promise=new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-nethor-profile-feature="'+name+'"]');
  const done=()=>{
   const feature=window.NethorProfileFeatures?.[name];
   if(feature)resolve(feature);else reject(new Error('Module Nethor non initialisé : '+name))
  };
  if(existing){existing.addEventListener('load',done,{once:true});existing.addEventListener('error',()=>reject(new Error('Chargement impossible : '+url)),{once:true});return}
  const s=document.createElement('script');s.src=url;s.async=true;s.dataset.nethorProfileFeature=name;
  s.onload=done;s.onerror=()=>reject(new Error('Chargement impossible : '+url));document.head.appendChild(s)
 });
 profileFeaturePromises.set(name,promise);
 promise.catch(()=>profileFeaturePromises.delete(name));
 return promise
}
async function openUserCard(user,opts={}){
 if(!user?.id)return;
 const feature=await loadProfileFeature('userCard','profile-user-card.js?v=1');
 return feature.open(user,opts)
}
function closeUserCard(){return window.NethorProfileFeatures?.userCard?.close?.()}
async function userPresenceLabel(userId){
 const feature=await loadProfileFeature('userCard','profile-user-card.js?v=1');
 return feature.presenceLabel(userId)
}

function addDesktopNethorMarkStyle(){
 let s=document.getElementById('nethorDesktopMarkStyle');
 if(!s){s=document.createElement('style');s.id='nethorDesktopMarkStyle';document.head?.appendChild(s)}
 s.textContent='header .mark,header .brandMark,header .nMenuBtn,header .brandMenuBtn{background-color:transparent!important;background-image:var(--nethor-header-logo,url("assets/nethor-mark.svg"))!important;background-repeat:no-repeat!important;background-position:center!important;background-size:contain!important;color:transparent!important;font-size:0!important;box-shadow:none!important;border-radius:0!important}'
}
function themedPlatformAsset(config,kind,key){
 const node=config?.platform_ui?.[kind]?.[key];if(!node||typeof node!=='object')return{};
 const theme=document.documentElement.dataset.theme==='dark'?'dark':'light',variant=node?.[theme],light=node?.light;
 if(variant&&String(variant.url||'').trim())return variant;
 if(theme==='dark'&&light&&String(light.url||'').trim())return light;
 return node
}
function themedPlatformAssetUrl(config,kind,key,fallback=''){
 const asset=themedPlatformAsset(config,kind,key);
 return String(asset?.url||fallback||'').trim()
}
function simplePlatformAssetUrl(config,kind,key,fallback=''){
 const node=config?.platform_ui?.[kind]?.[key],value=String(node?.url||fallback||'').trim();
 return /(?:^|\/)app-icon-mobile-v73\.svg(?:\?|$)/i.test(value)?'assets/app-icon-mobile-v74.svg?v=74':value
}
function headerAnimationHostUrl(asset,theme){
 const q=new URLSearchParams({src:String(asset?.url||''),theme:theme==='dark'?'dark':'light',mode:'media',name:'Nethor'});
 if(asset?.tag)q.set('tag',String(asset.tag));
 if(asset?.api)q.set('api',String(asset.api));
 return 'welcome-animation-host.html?v=4&'+q.toString()
}
function clearDesktopHeaderAnimation(button){
 if(!button)return;
 button.classList.remove('nethorHeaderAnimating');
 button.querySelector('[data-nethor-header-animation]')?.remove()
}
function bindDesktopHeaderAnimation(button,config,mediaHost=button){
 if(!button||!mediaHost)return;
 clearDesktopHeaderAnimation(button);
 button.onmouseenter=null;button.onmouseleave=null;button.onfocus=null;button.onblur=null;
 const ui=config?.platform_ui?.desktop||{},enabled=ui.header_logo_mode==='animation';
 button.dataset.nethorHeaderMode=enabled?'animation':'image';
 const asset=themedPlatformAsset(config,'desktop','header_logo_animation'),url=String(asset?.url||'').trim();
 if(!enabled||!url){button.classList.remove('nethorHeaderAnimationReady');return}
 button.classList.add('nethorHeaderAnimationReady');
 const theme=document.documentElement.dataset.theme==='dark'?'dark':'light';
 const show=()=>{
  if(button.querySelector('[data-nethor-header-animation]'))return;
  const host=document.createElement('span');host.dataset.nethorHeaderAnimation='1';host.className='nethorDesktopHeaderAnimation';
  if(/\.js(?:$|\?)/i.test(url)){
   const iframe=document.createElement('iframe');iframe.src=headerAnimationHostUrl(asset,theme);iframe.title='Animation du logo Nethor';iframe.setAttribute('sandbox','allow-scripts');iframe.setAttribute('tabindex','-1');host.appendChild(iframe)
  }else if(/\.(mp4|webm)(?:$|\?)/i.test(url)){
   const video=document.createElement('video');video.src=url;video.autoplay=true;video.muted=true;video.playsInline=true;video.preload='auto';host.appendChild(video);video.play?.().catch?.(()=>{})
  }else{
   const img=document.createElement('img'),animatedUrl=/\.gif(?:$|\?)/i.test(url)?url+(url.includes('?')?'&':'?')+'nethorHover='+Date.now():url;
   img.src=animatedUrl;img.alt='';img.draggable=false;host.appendChild(img)
  }
  mediaHost.appendChild(host);button.classList.add('nethorHeaderAnimating')
 };
 const hide=()=>clearDesktopHeaderAnimation(button);
 button.onmouseenter=show;button.onmouseleave=hide;
 button.onfocus=show;button.onblur=hide
}
function headerIdentityLayout(config,kind){
 const value=String(config?.platform_ui?.[kind]?.header_layout||'logo_only');
 return ['logo_only','logo_logo','text_logo','logo_text'].includes(value)?value:'logo_only'
}
function headerIdentityText(config,kind){
 return String(config?.platform_ui?.[kind]?.header_text||config?.brand?.name||'Nethor').trim().slice(0,80)||'Nethor'
}
function headerIdentityWordmark(kind,wordmarkSize){
 const word=document.createElement('span');
 if(kind==='desktop'){
  word.className='nethorHeaderDefaultWordmark nethorSidebarWordmark nethorDesktopWordmark';
  word.innerHTML='<span>ne</span><b>thor</b>';
  word.style.fontSize=wordmarkSize+'px'
 }else{
  word.className='nethorHeaderDefaultWordmark';
  word.innerHTML='<span class="nethorMobileWordmarkNe">ne</span><span class="nethorMobileWordmarkThor">thor</span>'
 }
 return word
}
function headerIdentityPrimary(url,kind,logoWidth,logoHeight,wordmarkSize){
 const host=document.createElement('span');host.className='nethorHeaderPrimary';
 host.style.setProperty('--nethor-primary-logo-width',logoWidth+'px');
 host.style.setProperty('--nethor-primary-logo-height',logoHeight+'px');
 if(url){
  const img=document.createElement('img');img.src=url;img.alt='';img.draggable=false;img.className='nethorHeaderLogoPrimary';host.appendChild(img)
 }else host.appendChild(headerIdentityWordmark(kind,wordmarkSize));
 return host
}
function headerIdentitySecondary(url){
 if(!url)return null;
 const img=document.createElement('img');img.src=url;img.alt='';img.draggable=false;img.className='nethorHeaderLogoSecondary';return img
}
function headerIdentityTextNode(value){
 const node=document.createElement('span');node.className='nethorHeaderText';node.textContent=value;return node
}
function renderDesktopHeaderIdentity(config,url,logoWidth,logoHeight,wordmarkSize){
 const button=document.querySelector('html[data-nethor-platform="desktop"] .nethorSidebarBrand')||document.querySelector('html[data-nethor-platform="desktop"] .nethorDesktopBrandButton');
 if(!button)return;
 clearDesktopHeaderAnimation(button);
 button.classList.remove('customLogo');
 button.style.removeProperty('background-image');button.style.removeProperty('background-repeat');button.style.removeProperty('background-position');button.style.removeProperty('background-size');
 const layout=headerIdentityLayout(config,'desktop'),secondaryUrl=themedPlatformAssetUrl(config,'desktop','header_logo_secondary','');
 const root=document.createElement('span');root.className='nethorHeaderIdentity nethorDesktopHeaderIdentity';root.dataset.headerLayout=layout;
 const primary=headerIdentityPrimary(url,'desktop',logoWidth,logoHeight,wordmarkSize),secondary=headerIdentitySecondary(secondaryUrl),textNode=headerIdentityTextNode(headerIdentityText(config,'desktop'));
 const nodes=layout==='logo_logo'?[primary,secondary]:layout==='text_logo'?[textNode,primary]:layout==='logo_text'?[primary,textNode]:[primary];
 root.append(...nodes.filter(Boolean));button.replaceChildren(root);
 bindDesktopHeaderAnimation(button,config,primary)
}
function mobileHeaderAppearance(config){
 const ui=config?.platform_ui?.mobile||{},custom=String(document.documentElement.dataset.nethorMobileTheme||'').trim().toLowerCase(),visual=['mineral','sage','plum','halloween'].includes(custom)?custom:(document.documentElement.dataset.theme==='dark'?'dark':'light'),node=ui.header_themes?.[visual]&&typeof ui.header_themes[visual]==='object'?ui.header_themes[visual]:{};
 const layout=['logo_only','logo_logo','text_logo','logo_text'].includes(node.layout)?node.layout:headerIdentityLayout(config,'mobile');
 const text=String(node.text||headerIdentityText(config,'mobile')).trim().slice(0,80)||'Nethor';
 const primary=String(node.logo1?.url||'').trim()||themedPlatformAssetUrl(config,'mobile','header_logo',String(config?.brand?.header_logo_url||'').trim());
 const secondary=String(node.logo2?.url||'').trim()||themedPlatformAssetUrl(config,'mobile','header_logo_secondary','');
 return{visual,layout,text,primary,secondary}
}
function renderLegacyMobileHeaderIdentity(config,url){
 const host=document.querySelector('.nethorMobileAppBrand .nethorMobileWordmark');if(!host)return;
 const themed=mobileHeaderAppearance(config),layout=themed.layout;
 const rootNodes=[],primary=headerIdentityPrimary(themed.primary||url,'mobile',104,30,34),secondary=headerIdentitySecondary(themed.secondary),textNode=headerIdentityTextNode(themed.text);
 if(layout==='logo_logo')rootNodes.push(primary,secondary);else if(layout==='text_logo')rootNodes.push(textNode,primary);else if(layout==='logo_text')rootNodes.push(primary,textNode);else rootNodes.push(primary);
 host.replaceChildren(...rootNodes.filter(Boolean));host.classList.add('nethorHeaderIdentity');host.dataset.headerLayout=layout;host.dataset.appearanceTheme=themed.visual
}
function applyHeaderLogo(config={}){
 const platformKey=isMobileViewport()?'mobile':'desktop';
 const globalUrl=String(config?.brand?.header_logo_url||'').trim();
 const mobileAppearance=platformKey==='mobile'?mobileHeaderAppearance(config):null;
 const platformUrl=mobileAppearance?.primary||themedPlatformAssetUrl(config,platformKey,'header_logo','');
 const secondaryUrl=mobileAppearance?.secondary||themedPlatformAssetUrl(config,platformKey,'header_logo_secondary','');
 const url=platformUrl||globalUrl||'';
 document.documentElement.style.setProperty('--nethor-header-logo','url('+JSON.stringify(url||'assets/nethor-mark.svg')+')');
 if(secondaryUrl)document.documentElement.style.setProperty('--nethor-header-logo-secondary','url('+JSON.stringify(secondaryUrl)+')');else document.documentElement.style.removeProperty('--nethor-header-logo-secondary');
 addDesktopNethorMarkStyle();
 let style=document.getElementById('nethorPlatformHeaderAssetStyle');if(!style){style=document.createElement('style');style.id='nethorPlatformHeaderAssetStyle';document.head?.appendChild(style)}
 style.textContent=
  '.nethorHeaderIdentity{display:flex!important;align-items:center!important;gap:9px!important;min-width:0!important;max-width:100%!important}'+
  '.nethorHeaderIdentity .nethorHeaderPrimary{position:relative!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;flex:0 1 auto!important;min-width:0!important;max-width:100%!important;height:var(--nethor-primary-logo-height,40px)!important}'+
  '.nethorHeaderIdentity .nethorHeaderLogoPrimary,.nethorHeaderIdentity .nethorHeaderLogoSecondary{display:block!important;width:auto!important;height:100%!important;max-width:100%!important;object-fit:contain!important}'+
  '.nethorHeaderIdentity .nethorHeaderLogoSecondary{height:32px!important;flex:0 1 auto!important;max-width:86px!important}'+
  '.nethorHeaderIdentity .nethorHeaderText{display:block!important;min-width:0!important;max-width:104px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;font-size:14px!important;line-height:1.05!important;font-weight:850!important;letter-spacing:-.2px!important;color:var(--netto-ink,#182235)!important}'+
  'html[data-theme="dark"] .nethorHeaderIdentity .nethorHeaderText{color:#f4f4f5!important}'+
  'html[data-nethor-platform="desktop"] .nethorSidebarBrand{background-image:none!important;overflow:visible!important}'+
  'html[data-nethor-platform="desktop"] .nethorSidebarBrand .nethorDesktopHeaderIdentity{width:100%!important;padding:0 12px!important;overflow:hidden!important}'+
  'html[data-nethor-platform="desktop"] .nethorDesktopHeaderIdentity[data-header-layout="logo_logo"] .nethorHeaderPrimary{max-width:112px!important}'+
  'html[data-nethor-platform="desktop"] .nethorDesktopHeaderIdentity[data-header-layout="logo_logo"] .nethorHeaderLogoSecondary{max-width:72px!important}'+
  'html[data-nethor-platform="desktop"] .nethorDesktopHeaderAnimation{position:absolute!important;inset:0!important;display:block!important;width:100%!important;height:100%!important;pointer-events:none!important;overflow:visible!important}'+
  'html[data-nethor-platform="desktop"] .nethorDesktopHeaderAnimation iframe,html[data-nethor-platform="desktop"] .nethorDesktopHeaderAnimation video,html[data-nethor-platform="desktop"] .nethorDesktopHeaderAnimation img{display:block!important;width:100%!important;height:100%!important;border:0!important;object-fit:contain!important;object-position:left center!important;background:transparent!important}'+
  'html[data-nethor-platform="desktop"] .nethorHeaderPrimary:has(.nethorDesktopHeaderAnimation)>.nethorHeaderLogoPrimary,html[data-nethor-platform="desktop"] .nethorHeaderPrimary:has(.nethorDesktopHeaderAnimation)>.nethorHeaderDefaultWordmark{visibility:hidden!important}'+
  '.nethorMobileAppBrand .nethorMobileWordmark.nethorHeaderIdentity{display:flex!important;width:auto!important;height:38px!important;font-size:0!important;letter-spacing:0!important;background:none!important}';
 if(platformKey==='mobile'){
  renderLegacyMobileHeaderIdentity(config,url);return
 }
 const rawScale=Number(config?.platform_ui?.desktop?.header_logo_scale)||100,scale=Math.max(60,Math.min(160,Math.round(rawScale))),ratio=scale/100;
 const logoWidth=Math.round(128*ratio),logoHeight=Math.round(40*ratio),wordmarkSize=Math.round(35*ratio);
 document.documentElement.style.setProperty('--nethor-desktop-header-logo-scale',String(scale));
 document.documentElement.style.setProperty('--nethor-desktop-header-logo-width',logoWidth+'px');
 document.documentElement.style.setProperty('--nethor-desktop-header-logo-height',logoHeight+'px');
 requestAnimationFrame(()=>renderDesktopHeaderIdentity(config,url,logoWidth,logoHeight,wordmarkSize));
 setTimeout(()=>renderDesktopHeaderIdentity(config,url,logoWidth,logoHeight,wordmarkSize),80)
}
function iconMime(url){
 const s=String(url||'').split('?')[0].toLowerCase();
 if(s.endsWith('.png'))return'image/png';if(s.endsWith('.webp'))return'image/webp';if(s.endsWith('.ico'))return'image/x-icon';return'image/svg+xml'
}
function setHeadAssetLink(rel,href,id){
 let link=id?document.getElementById(id):[...document.querySelectorAll('link[rel="'+rel+'"]')][0]||null;
 if(!link){link=document.createElement('link');link.rel=rel;if(id)link.id=id;document.head?.appendChild(link)}
 if(!link.dataset.nethorDefaultHref)link.dataset.nethorDefaultHref=link.getAttribute('href')||'';
 const next=String(href||link.dataset.nethorDefaultHref||'').trim();if(next)link.href=next;
 return link
}
function applyDynamicManifest(config={}){
 const kind=isMobileViewport()?'mobile':'desktop';
 const custom=kind==='mobile'?simplePlatformAssetUrl(config,'mobile','home_screen_icon',''):simplePlatformAssetUrl(config,'desktop','desktop_shortcut_icon','');
 let link=document.querySelector('link[rel="manifest"]');if(!link)return;
 if(!link.dataset.nethorDefaultHref)link.dataset.nethorDefaultHref=link.getAttribute('href')||'manifest.webmanifest';
 if(!custom){link.href=link.dataset.nethorDefaultHref;return}
 const icon=new URL(custom,location.href).href,base=new URL('./',location.href).href,start=new URL(kind==='mobile'?'mobile.html?view=home':'home.html',location.href).href,appId=new URL('home.html',location.href).href;
 const manifest={name:'Nethor',short_name:'Nethor',description:'Nethor — planning, stock et outils pratiques pour l’équipe.',start_url:start,scope:base,display:'standalone',background_color:'#f7f8fa',theme_color:'#ff5a2a',orientation:'any',icons:[{src:icon,sizes:'any',type:iconMime(icon),purpose:'any'}],id:appId};
 link.href='data:application/manifest+json;charset=utf-8,'+encodeURIComponent(JSON.stringify(manifest))
}
function applySiteIcons(config={}){
 const desktopFavicon=themedPlatformAssetUrl(config,'desktop','browser_icon','');
 if(!isMobileViewport()&&desktopFavicon){const link=setHeadAssetLink('icon',desktopFavicon,'nethorConfiguredFavicon');link.type=iconMime(desktopFavicon)}
 else if(!isMobileViewport()){const custom=document.getElementById('nethorConfiguredFavicon');if(custom)custom.remove()}
 const apple=simplePlatformAssetUrl(config,'mobile','home_screen_icon','');
 if(apple)setHeadAssetLink('apple-touch-icon',apple,'nethorConfiguredAppleTouchIcon');
 else document.getElementById('nethorConfiguredAppleTouchIcon')?.remove();
 applyDynamicManifest(config)
}
applyHeaderLogo();


function ensureProfileStylesheet(id,href,match){
 if(document.getElementById(id)||(match&&document.querySelector('link[href*="'+match+'"]')))return;
 const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;document.head?.appendChild(link)
}
function addStyle(){
 ensureProfileStylesheet('nettoProfileUIStyle','profile-ui.css?v=2','profile-ui.css')
}
function paint(el,url,name,color,frame){if(!el)return;const accent=isMobileViewport()?'var(--nethor-profile-avatar-bg,#ff5a2a)':(color||'#ff5a2a');el.style.setProperty('--profile-accent',accent);if(isMobileViewport())el.style.color='var(--nethor-profile-avatar-fg,#fff)';setAvatarFrame(el,frame);if(url){el.classList.add('hasPhoto');el.style.backgroundImage='url("'+url.replace(/"/g,'%22')+'")';el.textContent=''}else{el.classList.remove('hasPhoto');el.style.backgroundImage='';el.textContent=initials(name)}}
function makeButton(icon,title,sub,url,cls=''){return '<button class="nettoNavBtn '+cls+'" data-url="'+esc(url||'')+'"><span>'+icon+'</span><span><strong>'+esc(title)+'</strong><small>'+esc(sub||'')+'</small></span></button>'}
function mobileMenuRow(id,title,sub,url,extra=''){
 const icon=mobileNavIcon(id);
 return '<button class="nettoMobileMenuRow nettoMobileMenuLink '+extra+'" type="button" data-url="'+esc(url||'')+'"><span class="nettoMobileMenuIcon" aria-hidden="true">'+icon+'</span><span class="nettoMobileMenuCopy"><strong>'+esc(title)+'</strong>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</span><span class="nettoMobileMenuChevron" aria-hidden="true">›</span></button>'
}
function currentTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
function validTheme(value){return value==='dark'||value==='light'?value:null}
function localTheme(theme){
 theme=validTheme(theme)||'light';
 if(typeof window.applyTheme==='function')window.applyTheme(theme);
 else{document.documentElement.dataset.theme=theme;try{localStorage.setItem('nettoTheme',theme)}catch(_){}}
 updateThemeText();
 try{applyHeaderLogo(api?.siteConfig||{});applySiteIcons(api?.siteConfig||{})}catch(_){}
 return theme
}
function preferredTheme(profile=api.profile){return validTheme(preferenceMap(profile)?.theme)}
function profileThemeCacheKey(uid=api.session?.user?.id){return uid?'nettoProfileTheme:'+uid:null}
function cachedProfileTheme(uid=api.session?.user?.id){try{const k=profileThemeCacheKey(uid);return k?validTheme(localStorage.getItem(k)):null}catch(_){return null}}
function cacheProfileTheme(theme,uid=api.session?.user?.id){theme=validTheme(theme);if(!theme)return null;try{const k=profileThemeCacheKey(uid);if(k)localStorage.setItem(k,theme)}catch(_){}return theme}
async function saveThemePreference(theme){
 theme=localTheme(theme);cacheProfileTheme(theme);
 if(!api.profile)return theme;
 const prefs={...preferenceMap(api.profile),theme};
 api.profile={...api.profile,ui_preferences:prefs};
 saveGlobalCache();
 window.dispatchEvent(new CustomEvent('netto:theme-preference',{detail:{theme}}));
 if(api.client&&api.session){
  const {error}=await api.client.from('profiles').update({ui_preferences:prefs}).eq('id',api.session.user.id);
  if(error)console.warn('Préférence thème:',error)
 }
 return theme
}
function applyProfileTheme(profile=api.profile,persistMissing=false){
 const stored=preferredTheme(profile),theme=stored||cachedProfileTheme()||currentTheme();
 localTheme(theme);cacheProfileTheme(theme);
 if(!stored&&persistMissing&&api.client&&api.session)saveThemePreference(theme).catch(()=>{});
 return theme
}
function changeTheme(){
 const next=currentTheme()==='dark'?'light':'dark';
 if(typeof window.toggleTheme==='function')window.toggleTheme({stopPropagation(){}});
 else localTheme(next);
 saveThemePreference(next).catch(()=>{});
 updateThemeText()
}
function updateThemeText(){const dark=currentTheme()==='dark';document.querySelectorAll('.nettoThemeLabel').forEach(x=>{if(!x.hasAttribute('data-static-theme-label'))x.textContent=dark?'Mode clair':'Mode sombre'});document.querySelectorAll('.nettoThemeIcon').forEach(x=>{if(!x.hasAttribute('data-static-theme-icon'))x.textContent=dark?'☀':'☾'})}
function bindHomeMark(){
 document.querySelectorAll('.mark,.brandMark,.nMenuBtn,.brandMenuBtn').forEach(b=>{if((b.textContent||'').trim()!=='N')return;b.removeAttribute('onclick');b.removeAttribute('aria-expanded');b.setAttribute('aria-label','Retour à l’accueil');b.onclick=e=>{e.preventDefault();e.stopPropagation();location.href='home.html'}})
 document.querySelectorAll('#nMenu,.brandMenu').forEach(x=>x.classList.add('hidden'))
}
function findHeaderTop(){return document.querySelector('[data-nethor-global-tools-host]')||document.querySelector('#site header .top')||document.querySelector('header .top')}
async function detachPushBeforeLogout(){
 try{
  if(!api.client||!api.session||!('serviceWorker' in navigator)||!('PushManager' in window))return;
  const reg=await navigator.serviceWorker.getRegistration();const sub=await reg?.pushManager?.getSubscription();if(!sub)return;
  try{await api.client.functions.invoke('planning-push',{body:{action:'unsubscribe',endpoint:sub.endpoint}})}catch(_){}
  await sub.unsubscribe()
 }catch(e){console.warn('Désabonnement Push:',e)}
}

async function logoutFromNethor(){
 sounds.play('logout');
 await new Promise(r=>setTimeout(r,390));
 await recordChatPresence('end');
 await detachPushBeforeLogout();
 try{await api.client?.auth?.signOut?.({scope:'local'})}catch(e){console.warn('Déconnexion Nethor:',e)}
 location.href='index.html'
}


const APP_RELEASE=369;
const APP_RELEASE_LABEL='v1.46.20';
const APP_ICON='assets/app-icon-v63.svg';
const APP_MOBILE_ICON='assets/app-icon-mobile-v74.svg';
async function loadUpdateFeature(){return loadProfileFeature('update','profile-update.js?v=4')}
async function openUpdateCenter(){
 const feature=await loadUpdateFeature();return feature.openCenter()
}
async function manualCheckForUpdates(){
 const feature=await loadUpdateFeature();return feature.manualCheck()
}
async function showUpdateAvailable(reg,forcedVersion=0,force=false){
 const feature=await loadUpdateFeature();return feature.showAvailable(reg,forcedVersion,force)
}


function platformControls(config=api?.siteConfig,kind=isMobileViewport()?'mobile':'desktop'){
 const controls=config?.platform_ui?.[kind]?.controls;
 return controls&&typeof controls==='object'?controls:{}
}
function configuredControl(controls,key,defaults={}){
 const x=controls?.[key]&&typeof controls[key]==='object'?controls[key]:{};
 return{...defaults,...x,label:String(x.label||defaults.label||''),subtitle:String(x.subtitle||defaults.subtitle||''),url:String(x.url||'')}
}
function replaceControlIcon(container,url,cls='nettoConfiguredControlIcon'){
 if(!container||!url)return;
 const svg=container.querySelector(':scope > svg');
 if(svg)svg.remove();
 let img=container.querySelector(':scope > img.'+cls);
 if(!img){img=document.createElement('img');img.className=cls;img.alt='';img.draggable=false;container.insertBefore(img,container.firstChild)}
 img.src=url;img.style.width='22px';img.style.height='22px';img.style.objectFit='contain'
}
function applyDesktopChromeControls(wrap,controls){
 if(!wrap)return;
 const notifications=configuredControl(controls,'notifications',{label:'Notifications',subtitle:'Centre d’activité Nethor'});
 const update=configuredControl(controls,'update',{label:'Mise à jour',subtitle:'Rechercher une nouvelle version'});
 const loginLogs=configuredControl(controls,'login_logs',{label:'Connexions',subtitle:'Historique des connexions administrateur'});
 const mobilePreview=configuredControl(controls,'mobile_preview',{label:'Visualiser mobile',subtitle:'Ouvrir l’aperçu mobile'});
 const userMenu=configuredControl(controls,'user_menu',{label:'Menu utilisateur',subtitle:'Profil, préférences et réglages'});
 const loginBtn=wrap.querySelector('#nettoLoginBtn');
 if(loginBtn){loginBtn.setAttribute('aria-label',loginLogs.label);loginBtn.title=loginLogs.subtitle||loginLogs.label;if(loginLogs.url)replaceControlIcon(loginBtn,loginLogs.url)}
 const mobilePreviewBtn=wrap.querySelector('#nettoMobilePreviewBtn');
 if(mobilePreviewBtn){mobilePreviewBtn.setAttribute('aria-label',mobilePreview.label);mobilePreviewBtn.title=mobilePreview.subtitle||mobilePreview.label;if(mobilePreview.url)replaceControlIcon(mobilePreviewBtn,mobilePreview.url)}
 const bell=wrap.querySelector('#nettoBellBtn');
 if(bell){bell.setAttribute('aria-label',notifications.label);bell.title=notifications.subtitle||notifications.label;if(notifications.url)replaceControlIcon(bell,notifications.url)}
 const notifTitle=wrap.querySelector('.nettoNotifTitle');
 if(notifTitle){const strong=notifTitle.querySelector('strong'),small=notifTitle.querySelector('small');if(strong)strong.textContent=notifications.label;if(small)small.textContent=notifications.subtitle}
 const updateBtn=wrap.querySelector('#nettoUpdateCheckBtn');
 if(updateBtn){updateBtn.setAttribute('aria-label',update.label);updateBtn.title=update.subtitle||update.label;if(update.url)replaceControlIcon(updateBtn,update.url);const label=updateBtn.querySelector('.nettoUpdateLabel');if(label)label.textContent=update.label}
 const userBtn=wrap.querySelector('#nettoUserBtn');
 if(userBtn){userBtn.setAttribute('aria-label',userMenu.label);userBtn.title=userMenu.subtitle||userMenu.label}
 const avatar=wrap.querySelector('#nettoTopAvatar');
 if(avatar&&userMenu.url){avatar.classList.add('hasPhoto');avatar.style.backgroundImage='url("'+userMenu.url.replace(/"/g,'%22')+'")';avatar.style.backgroundSize='contain';avatar.style.backgroundPosition='center';avatar.style.backgroundRepeat='no-repeat';avatar.textContent=''}
}

function buildGlobalHeader(){
 const previous=document.getElementById('nettoGlobalTools');if(previous)previous.remove();bindHomeMark();
 const top=findHeaderTop();if(!top||!api.profile)return;
 const existing=top.querySelector('.userMenuWrap');if(existing)existing.style.display='none';
 const p=api.profile,name=p.display_name||'Utilisateur',role=roleLabel(p.role);
 const visibleUserModules=visibleModules('user_menu',p,api.siteConfig);
 const shortcuts=visibleUserModules.map(m=>makeButton(moduleIcon(m),m.label,m.subtitle,m.url)).join('');
 const mobileShell=isMobileViewport();
 const mobileModules=mobileShell?visibleUserModules.filter(m=>!['profile','settings'].includes(m.id)):[];
 const mobilePrimaryIds=new Set(['home','stock','planning','chat','scanner','articles']);
 const mobileAdminIds=new Set(['accounts','portal_admin']);
 const mobileSpecialIds=new Set(['notification_settings','problem_report']);
 const mobilePrimary=mobileModules.filter(m=>mobilePrimaryIds.has(m.id));
 const mobileAdmin=mobileModules.filter(m=>mobileAdminIds.has(m.id));
 const mobileExtra=mobileModules.filter(m=>!mobilePrimaryIds.has(m.id)&&!mobileAdminIds.has(m.id)&&!mobileSpecialIds.has(m.id));
 const mobileRows=list=>list.map(m=>mobileMenuRow(m.id,m.label,m.subtitle,m.url)).join('');
 const mobilePrimaryRows=mobileRows(mobilePrimary);
 const notificationSettings=mobileModules.find(m=>m.id==='notification_settings')||null;
 const problemReport=mobileModules.find(m=>m.id==='problem_report')||null;
 const settingsModule=NAV_MODULES.find(m=>m.id==='settings')||{label:'Personnalisation',subtitle:'Accueil, raccourcis et apparence',url:'settings.html'};
 const mobileProblemSource=(location.pathname.split('/').pop()||'home.html')+(location.search||'');
 const mobileProblemUrl=problemReport?(()=>{try{const u=new URL(problemReport.url||'report-problem.html',location.href);u.searchParams.set('from',mobileProblemSource);return u.pathname.split('/').pop()+u.search}catch(_){return 'report-problem.html?from='+encodeURIComponent(mobileProblemSource)}})():'';
 const mobileUserMenuHtml='';
 const desktopControls=platformControls(api.siteConfig,'desktop');
 const desktopUserMenuHtml=!mobileShell?(window.NethorDesktopShell?.buildUserMenu?.({
  name,role,shortcuts,settingsUrl:settingsModule.url||'settings.html',settingsModule,settingsIcon:moduleIcon(settingsModule),controls:desktopControls
 })||''):'';
 const wrap=document.createElement('div');wrap.id='nettoGlobalTools';wrap.className='nettoGlobalTools';
 const adminLoginTool=p.role==='admin'?'<div class="nettoLoginWrap"><button id="nettoLoginBtn" class="nettoBellBtn nettoLoginBtn" aria-label="Historique des connexions" aria-expanded="false" title="Connexions"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm1 10.41 3.3 1.9-1 1.73L11 13.59V7h2Z"/></svg></button><div id="nettoLoginDrop" class="nettoDrop nettoLoginDrop hidden"><div class="nettoNotifHead"><div class="nettoLoginHeadTitle"><strong>Connexions</strong><small>Qui s’est connecté et à quelle heure</small></div><div class="nettoNotifHeadActions"><button id="nettoLoginDeleteAll">Tout supprimer</button></div></div><div id="nettoLoginList" class="nettoLoginList"><div class="nettoNotifEmpty">Chargement…</div></div></div></div>':'';
 const inMobilePreview=new URLSearchParams(location.search).get('mobile_preview')==='1';
 const desktopMobileTool=!inMobilePreview&&!isMobileViewport()?'<div class="nettoMobilePreviewWrap"><button type="button" id="nettoMobilePreviewBtn" class="nettoBellBtn nettoMobilePreviewBtn" aria-label="Vision mobile" aria-pressed="false" title="Vision mobile"><svg class="nettoMobileIconNormal" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 1.5h10A2.5 2.5 0 0 1 19.5 4v16A2.5 2.5 0 0 1 17 22.5H7A2.5 2.5 0 0 1 4.5 20V4A2.5 2.5 0 0 1 7 1.5Zm0 2A.5.5 0 0 0 6.5 4v16a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V4a.5.5 0 0 0-.5-.5H7Zm3.5 14h3a1 1 0 1 1 0 2h-3a1 1 0 1 1 0-2Z"/></svg><svg class="nettoMobileIconActive" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="nettoMobileIconGradient" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#ff2f1f"/><stop offset="1" stop-color="#ff8500"/></linearGradient></defs><path fill="url(#nettoMobileIconGradient)" d="M7 1.5h10A2.5 2.5 0 0 1 19.5 4v16A2.5 2.5 0 0 1 17 22.5H7A2.5 2.5 0 0 1 4.5 20V4A2.5 2.5 0 0 1 7 1.5Zm0 2A.5.5 0 0 0 6.5 4v16a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V4a.5.5 0 0 0-.5-.5H7Zm3.5 14h3a1 1 0 1 1 0 2h-3a1 1 0 1 1 0-2Z"/></svg></button></div>':'';
 const desktopNotifMode=!mobileShell;
 const desktopNotifHead=desktopNotifMode?'<div class="nettoNotifHead nettoNotifHeadDesktop"><div class="nettoNotifTitle"><span class="nettoNotifTitleIcon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a2.55 2.55 0 0 0 2.45-1.85h-4.9A2.55 2.55 0 0 0 12 22Zm7-5.1-1.75-2.05V9.5A5.26 5.26 0 0 0 13 4.34V3a1 1 0 1 0-2 0v1.34A5.26 5.26 0 0 0 6.75 9.5v5.35L5 16.9V18h14v-1.1Z"/></svg></span><span><strong>Notifications</strong><small id="nettoNotifSummary">0 notification</small></span></div><div class="nettoNotifHeadActions"><button id="nettoMarkRead" type="button">✓ Tout marquer comme lu</button></div><div class="nettoNotifMoreWrap"><button id="nettoNotifMoreBtn" class="nettoNotifMoreBtn" type="button" aria-label="Actions des notifications" title="Actions">•••</button><div id="nettoNotifMoreMenu" class="nettoNotifMoreMenu hidden"><button id="nettoNotifMoreRead" type="button">✓ Tout marquer comme lu</button><button id="nettoNotifMoreDelete" class="danger" type="button">Supprimer toutes les notifications</button></div></div></div>':'<div class="nettoNotifHead"><div class="nettoNotifTitle"><span class="nettoNotifTitleIcon">🔔</span><span><strong>Notifications</strong><small>Centre d’activité Nethor</small></span></div><div class="nettoNotifHeadActions"><button id="nettoMarkRead">✓ Tout lire</button><button id="nettoDeleteAll" class="danger">⌫ Effacer</button></div><div class="nettoNotifMoreWrap"><button id="nettoNotifMoreBtn" class="nettoNotifMoreBtn" type="button" aria-label="Actions des notifications" title="Actions">•••</button><div id="nettoNotifMoreMenu" class="nettoNotifMoreMenu hidden"><button id="nettoNotifMoreRead" type="button">✓ Tout marquer comme lu</button><button id="nettoNotifMoreDelete" class="danger" type="button">Supprimer toutes les notifications</button></div></div></div>';
 const desktopAllIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>';
 const desktopUnreadIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/></svg>';
 const desktopMessagesIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"/><path d="M8 10h8M8 13h5"/></svg>';
 const desktopSystemIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>';
 const desktopNotifTabs=desktopNotifMode?'<div class="nettoNotifTabs nettoNotifTabsDesktop"><button id="nettoNotifTabAll" class="nettoNotifTab common active" type="button" data-notif-tab="all"><span class="nettoNotifTabIcon">'+desktopAllIcon+'</span><span><strong>Toutes</strong></span><b id="nettoNotifAllCount">0</b></button><button id="nettoNotifTabUnread" class="nettoNotifTab important" type="button" data-notif-tab="unread"><span class="nettoNotifTabIcon">'+desktopUnreadIcon+'</span><span><strong>Non lues</strong></span><b id="nettoNotifUnreadCount">0</b></button><button id="nettoNotifTabMessages" class="nettoNotifTab messages" type="button" data-notif-tab="messages"><span class="nettoNotifTabIcon">'+desktopMessagesIcon+'</span><span><strong>Messages</strong></span><b id="nettoNotifMessagesCount">0</b></button><button id="nettoNotifTabSystem" class="nettoNotifTab system" type="button" data-notif-tab="system"><span class="nettoNotifTabIcon">'+desktopSystemIcon+'</span><span><strong>Système</strong></span><b id="nettoNotifSystemCount">0</b></button></div>':'<div class="nettoNotifTabs"><button id="nettoNotifTabAll" class="nettoNotifTab common active" type="button" data-notif-tab="all"><span class="nettoNotifTabIcon">●</span><span><strong>Tout</strong><small>Toutes les notifications</small></span><b id="nettoNotifAllCount">0</b></button><button id="nettoNotifTabUnread" class="nettoNotifTab important" type="button" data-notif-tab="unread"><span class="nettoNotifTabIcon">●</span><span><strong>Non lu</strong><small>À consulter</small></span><b id="nettoNotifUnreadCount">0</b></button></div>';
 const desktopNotifFooter=desktopNotifMode?'<button id="nettoNotifOpenCenter" class="nettoNotifOpenCenter" type="button"><span class="nettoNotifOpenIcon">⚙</span><strong>Ouvrir toutes les notifications</strong><span aria-hidden="true">›</span></button>':'';
 const notifDropdownHtml='<div class="nettoBellWrap"><button id="nettoBellBtn" class="nettoBellBtn" aria-label="Notifications" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a2.55 2.55 0 0 0 2.45-1.85h-4.9A2.55 2.55 0 0 0 12 22Zm7-5.1-1.75-2.05V9.5A5.26 5.26 0 0 0 13 4.34V3a1 1 0 1 0-2 0v1.34A5.26 5.26 0 0 0 6.75 9.5v5.35L5 16.9V18h14v-1.1Z"/></svg><b id="nettoNotifBadge" class="nettoNotifBadge hidden">0</b></button><div id="nettoNotifDrop" class="nettoDrop nettoNotifDrop hidden"><span class="nettoNotifSheetHandle"></span>'+desktopNotifHead+desktopNotifTabs+'<div id="nettoNotifList" class="nettoNotifList"><div class="nettoNotifEmpty">Chargement…</div></div>'+desktopNotifFooter+'</div></div>';
 wrap.innerHTML='<button id="nettoDropBackdrop" class="nettoDropBackdrop" type="button" aria-label="Fermer le menu"></button>'+adminLoginTool+desktopMobileTool+'<div class="nettoUpdateWrap"><button id="nettoUpdateCheckBtn" class="nettoBellBtn nettoUpdateCheckBtn" aria-label="Rechercher une mise à jour" title="Mise à jour"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3a1 1 0 1 1 2 0v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V3Zm-6 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z"/></svg><span class="nettoUpdateLabel">MAJ</span></button></div>'+notifDropdownHtml+'<div class="nettoUserWrap"><button id="nettoUserBtn" class="nettoUserBtn" aria-expanded="false"><span id="nettoTopAvatar" class="nettoTopAvatar">U</span><span class="nettoUserText"><strong>'+esc(name)+'</strong><small>'+esc(role)+'</small></span><span class="nettoChevron">⌄</span></button><div id="nettoUserDrop" class="nettoDrop hidden">'+desktopUserMenuHtml+mobileUserMenuHtml+'</div></div>';
 top.appendChild(wrap);
 paint(document.getElementById('nettoTopAvatar'),api.avatarUrl,name,p.profile_color,p.avatar_frame);paint(document.getElementById('nettoMenuAvatar'),api.avatarUrl,name,p.profile_color,p.avatar_frame);paint(document.getElementById('nettoMobileMenuAvatar'),api.avatarUrl,name,p.profile_color,p.avatar_frame);
 if(!mobileShell)applyDesktopChromeControls(wrap,desktopControls);
 updateThemeText();
 wrap.querySelectorAll('.nettoNavBtn[data-url],.nettoMobileMenuLink[data-url]').forEach(b=>b.onclick=()=>{
  let targetUrl=b.dataset.url;
  if(mobileDropMode()&&b.classList.contains('nettoMobileMenuLink')){
   if(samePageDestination(targetUrl)){closeDrops();syncMobileQuickBarActive();return}
   rememberUserMenuParent();
   targetUrl=userMenuChildUrl(targetUrl);
   closeDrops()
  }
  sounds.play('navigate');location.href=targetUrl
 });
 document.getElementById('nettoThemeBtn')?.addEventListener('click',e=>{e.stopPropagation();sounds.play('switch');changeTheme();updateThemeText()});
 document.getElementById('nettoMobileThemeBtn')?.addEventListener('click',e=>{e.stopPropagation();sounds.play('switch');changeTheme();updateThemeText()});
 document.getElementById('nettoMobileUpdateBtn')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeDrops();void openUpdateCenter().catch(err=>{console.warn('Centre de mise à jour:',err);mobilePreviewNotice('Centre de mise à jour indisponible')})});
 const logoutAction=()=>logoutFromNethor();
 document.getElementById('nettoLogoutBtn')?.addEventListener('click',logoutAction);
 const mobileLogoutBtn=document.getElementById('nettoMobileLogoutBtn');if(mobileLogoutBtn)mobileLogoutBtn.onclick=logoutAction;
 document.getElementById('nettoUserBtn').onclick=e=>{e.stopPropagation();if(mobileDropMode()){openMobileUserMenu();return}toggleDrop('user')};document.querySelectorAll('[data-notif-tab]').forEach(b=>b.onclick=e=>{e.stopPropagation();setNotificationTab(b.dataset.notifTab)});
 const loginBtn=document.getElementById('nettoLoginBtn');if(loginBtn)loginBtn.onclick=e=>{e.stopPropagation();toggleDrop('logins')};
 const mobilePreviewBtn=document.getElementById('nettoMobilePreviewBtn');if(mobilePreviewBtn)mobilePreviewBtn.dataset.mobilePreviewReady='1'
 const loginDeleteAll=document.getElementById('nettoLoginDeleteAll');if(loginDeleteAll)loginDeleteAll.onclick=e=>{e.stopPropagation();sounds.play('warning');deleteAllLoginHistory()};
 const updateBtn=document.getElementById('nettoUpdateCheckBtn');if(updateBtn)updateBtn.onclick=e=>{e.preventDefault();e.stopPropagation();void openUpdateCenter().catch(err=>{console.warn('Centre de mise à jour:',err);mobilePreviewNotice('Centre de mise à jour indisponible')})};
 document.getElementById('nettoBellBtn').onclick=e=>{e.preventDefault();e.stopPropagation();toggleDrop('notifications')};
  const notifMoreBtn=document.getElementById('nettoNotifMoreBtn'),notifMoreMenu=document.getElementById('nettoNotifMoreMenu');
  if(notifMoreBtn)notifMoreBtn.onclick=e=>{e.preventDefault();e.stopPropagation();notifMoreMenu?.classList.toggle('hidden')};
  document.getElementById('nettoNotifMoreRead')?.addEventListener('click',()=>{notifMoreMenu?.classList.add('hidden');markAllRead()});
  document.getElementById('nettoNotifMoreDelete')?.addEventListener('click',()=>{notifMoreMenu?.classList.add('hidden');deleteAllNotifications()});
 const dropBackdrop=document.getElementById('nettoDropBackdrop');if(dropBackdrop)dropBackdrop.onclick=e=>{e.preventDefault();e.stopPropagation();closeDrops()};
 document.getElementById('nettoMarkRead')?.addEventListener('click',e=>{e.stopPropagation();sounds.play('confirm');markAllRead()});
 document.getElementById('nettoDeleteAll')?.addEventListener('click',e=>{e.stopPropagation();sounds.play('warning');deleteAllNotifications()});
 document.getElementById('nettoNotifOpenCenter')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();sounds.play('navigate');closeDrops();location.href='notifications.html'});
 if(!api.globalListenersBound){document.addEventListener('click',e=>{if(!e.target.closest('#nettoGlobalTools'))closeDrops()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrops()});api.globalListenersBound=true}
 if(!window.__nettoOpenUserMenuHandled)tryOpenRequestedUserMenu();
 try{applyHeaderLogo(api.siteConfig||{})}catch(_){}
}
async function bindMobilePreviewGlobal(){
 if(isMobileViewport())return;
 try{const feature=await loadProfileFeature('mobilePreview','profile-mobile-preview.js?v=1');feature.bind()}
 catch(e){console.warn('Vision mobile:',e)}
}
async function toggleMobilePreview(){
 const feature=await loadProfileFeature('mobilePreview','profile-mobile-preview.js?v=1');
 return feature.toggle()
}
let mobilePreviewNoticeTimer=null;
function mobilePreviewNotice(message){
 const feature=window.NethorProfileFeatures?.mobilePreview;
 if(feature?.notice)return feature.notice(message);
 const old=document.getElementById('nettoMobilePreviewNotice');old?.remove();clearTimeout(mobilePreviewNoticeTimer);
 const notice=document.createElement('div');notice.id='nettoMobilePreviewNotice';notice.className='nettoMobilePreviewNotice';
 const dot=document.createElement('i'),label=document.createElement('span');label.textContent=String(message||'');
 notice.append(dot,label);document.body.appendChild(notice);requestAnimationFrame(()=>notice.classList.add('show'));
 mobilePreviewNoticeTimer=setTimeout(()=>{notice.classList.remove('show');setTimeout(()=>notice.remove(),220)},2200)
}
const mobileDropPortalState=new Map();
function mobileDropMode(){return isMobileViewport()}
function portalMobileLayer(el,extraClass){
 if(!el||!document.body||mobileDropPortalState.has(el))return;
 mobileDropPortalState.set(el,{parent:el.parentNode,next:el.nextSibling});
 if(extraClass)el.classList.add(extraClass);
 document.body.appendChild(el)
}
function restoreMobileLayer(el,extraClass){
 if(!el)return;
 const state=mobileDropPortalState.get(el);if(!state)return;
 if(extraClass)el.classList.remove(extraClass);
 const {parent,next}=state;
 if(parent){
  if(next&&next.parentNode===parent)parent.insertBefore(el,next);
  else parent.appendChild(el)
 }
 mobileDropPortalState.delete(el)
}
function restoreMobileDropLayers(){
 ['nettoNotifDrop','nettoUserDrop','nettoLoginDrop'].forEach(id=>restoreMobileLayer(document.getElementById(id),'nettoMobilePortaledDrop'));
 restoreMobileLayer(document.getElementById('nettoDropBackdrop'),'nettoMobilePortaledBackdrop')
}
function mountMobileDropLayer(target){
 if(!mobileDropMode()||!target)return;
 restoreMobileDropLayers();
 const backdrop=document.getElementById('nettoDropBackdrop');
 portalMobileLayer(backdrop,'nettoMobilePortaledBackdrop');
 portalMobileLayer(target,'nettoMobilePortaledDrop');
 try{target.scrollTop=0}catch(_){}
}
function syncMobileDropState(open){
 const mobile=mobileDropMode();
 const backdrop=document.getElementById('nettoDropBackdrop');
 backdrop?.classList.toggle('open',!!open&&mobile);
 document.documentElement.classList.toggle('nettoMobileDropOpen',!!open&&mobile);
 if(!open||!mobile)restoreMobileDropLayers()
}
function openMobileUserMenu(){
 if(!mobileDropMode())return;
 sounds.play('navigate');
 const target=userMenuReturnUrl();
 if(samePageDestination(target)){syncMobileQuickBarActive('profile');return}
 if(window.NethorNavigation?.navigate)return window.NethorNavigation.navigate(target);
 location.href=target
}
function toggleDrop(which,silent=false){
 const n=document.getElementById('nettoNotifDrop'),u=document.getElementById('nettoUserDrop'),l=document.getElementById('nettoLoginDrop'),nb=document.getElementById('nettoBellBtn'),ub=document.getElementById('nettoUserBtn'),lb=document.getElementById('nettoLoginBtn');
 const drops={notifications:n,user:u,logins:l},buttons={notifications:nb,user:ub,logins:lb},target=drops[which];if(!target)return;
 const open=target.classList.contains('hidden');if(!silent)sounds.play(open?'menuOpen':'menuClose');
 if(open&&mobileDropMode())mountMobileDropLayer(target);
 Object.entries(drops).forEach(([key,el])=>{if(el)el.classList.toggle('hidden',key===which?!open:true)});
 Object.entries(buttons).forEach(([key,el])=>{if(el)el.setAttribute('aria-expanded',String(key===which&&open))});
 document.documentElement.classList.toggle('nettoMobileUserMenuOpen',!!(open&&which==='user'&&mobileDropMode()));
 syncMobileDropState(open);
 syncMobileQuickBarActive(open&&which==='user'&&mobileDropMode()?'profile':'');
 if(open&&which==='notifications')loadNotifications();
 if(open&&which==='logins')loadLoginHistory();
}
function closeDrops(){
 ['nettoNotifDrop','nettoUserDrop','nettoLoginDrop','nettoNotifMoreMenu'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));
 ['nettoBellBtn','nettoUserBtn','nettoLoginBtn'].forEach(id=>document.getElementById(id)?.setAttribute('aria-expanded','false'));
 document.documentElement.classList.remove('nettoMobileUserMenuOpen');
 syncMobileDropState(false);
 syncMobileQuickBarActive()
}
function resetMobileNavigationState(){
 /* Toujours nettoyer les verrous/classes, même si la taille/orientation a changé pendant
    que la page était en cache. Cela évite un état mobile bloqué au retour sur iOS. */
 document.documentElement.classList.remove('nettoMobileUserMenuOpen','nettoMobileDropOpen');
 document.body?.classList.remove('nettoMobileDropOpen');
 closeDrops()
}
if(!window.__nettoMobileNavLifecycleBound){
 window.__nettoMobileNavLifecycleBound=true;
 window.addEventListener('pagehide',resetMobileNavigationState,{capture:true});
 window.addEventListener('pageshow',()=>{
  document.documentElement.classList.remove('nettoMobileNavigating');
  try{sessionStorage.removeItem('nethorMobilePendingTabV1')}catch(_){}
  resetMobileNavigationState();
  requestAnimationFrame(()=>syncMobileQuickBarActive())
 },{capture:true});
 window.addEventListener('orientationchange',()=>setTimeout(()=>{if(!document.documentElement.classList.contains('nettoMobileUserMenuOpen'))resetMobileNavigationState()},80),{passive:true})
}
function loginDate(v){const d=new Date(v);return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})+' à '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
function renderLoginHistory(){
 const list=document.getElementById('nettoLoginList');if(!list)return;
 if(!api.loginHistory.length){list.innerHTML='<div class="nettoNotifEmpty">Aucune connexion enregistrée.</div>';return}
 list.innerHTML=api.loginHistory.map(x=>'<article class="nettoLoginItem" data-id="'+x.id+'"><span class="nettoLoginAvatar" style="--login-accent:'+esc(x.profile_color||'#ff5a2a')+'">'+esc(initials(x.display_name||'Utilisateur'))+'</span><div class="nettoLoginBody"><strong>'+esc(x.display_name||'Utilisateur')+'</strong><span>'+esc(roleLabel(x.role))+'</span><small>'+loginDate(x.signed_in_at)+'</small></div><button class="nettoLoginDelete" type="button" title="Supprimer" aria-label="Supprimer cette connexion">×</button></article>').join('');
 list.querySelectorAll('.nettoLoginDelete').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteLoginHistoryRow(Number(b.closest('.nettoLoginItem').dataset.id))});
}
async function loadLoginHistory(){
 if(!api.client||api.profile?.role!=='admin')return;
 const list=document.getElementById('nettoLoginList');if(list)list.innerHTML='<div class="nettoNotifEmpty">Chargement…</div>';
 const [logsRes,profilesRes]=await Promise.all([
  api.client.from('login_history').select('id,user_id,signed_in_at,user_agent,source').order('signed_in_at',{ascending:false}).limit(250),
  api.client.from('profiles').select('id,display_name,role,profile_color,avatar_frame')
 ]);
 if(logsRes.error){console.warn('Historique connexions:',logsRes.error);if(list)list.innerHTML='<div class="nettoNotifEmpty">Impossible de charger l’historique.</div>';return}
 const profiles=new Map((profilesRes.data||[]).map(p=>[p.id,p]));
 api.loginHistory=(logsRes.data||[]).map(x=>({...x,...(profiles.get(x.user_id)||{})}));renderLoginHistory();
}
async function deleteLoginHistoryRow(id){
 if(api.profile?.role!=='admin'||!Number.isFinite(Number(id)))return;
 const target=Number(id);
 const rpc=await api.client.rpc('admin_delete_login_history',{p_id:target});
 if(rpc.error||Number(rpc.data||0)<1){
  console.warn('Suppression connexion:',rpc.error||'Aucune ligne supprimée');
  sounds.play('error');mobilePreviewNotice('Suppression impossible');await loadLoginHistory();return
 }
 sounds.play('delete');api.loginHistory=api.loginHistory.filter(x=>Number(x.id)!==target);renderLoginHistory();mobilePreviewNotice('Connexion supprimée');
}
async function deleteAllLoginHistory(){
 if(api.profile?.role!=='admin'||!api.loginHistory.length)return;
 if(!confirm('Supprimer tout l’historique des connexions ?'))return;
 const rpc=await api.client.rpc('admin_delete_login_history',{p_id:null});
 if(rpc.error||Number(rpc.data||0)<1){
  console.warn('Suppression historique connexions:',rpc.error||'Aucune ligne supprimée');
  sounds.play('error');mobilePreviewNotice('Suppression impossible');await loadLoginHistory();return
 }
 sounds.play('delete');api.loginHistory=[];renderLoginHistory();mobilePreviewNotice('Historique des connexions supprimé');
}

const IMPORTANT_NOTIFICATION_KINDS=new Set(['manual_edit','import_new','import_replace','reset_day','reset_week','password_reset_request','absence_request','absence_decision']);
function notificationGroup(n){return IMPORTANT_NOTIFICATION_KINDS.has(n?.kind)?'important':'common'}
function notificationIcon(k){
 return ({
  chat_message:'💬',
  chat_direct:'💬',
  chat_group:'👥',
  chat_general:'👥',
  admin_message:'📣',
  app_update:'⬆️',
  maintenance:'🛠️',
  manual_edit:'🗓️',
  import_new:'📥',
  import_replace:'🔄',
  reset_day:'↩️',
  reset_week:'↩️',
  password_reset_request:'🔑',
  absence_request:'🏖️',
  absence_decision:'✅'
 })[k]||'🔔'
}
function notificationCategory(k){
 return ({
  chat_message:'Message équipe',
  chat_direct:'Message',
  chat_group:'Message groupe',
  chat_general:'Message groupe',
  admin_message:'Information',
  app_update:'Mise à jour',
  maintenance:'Maintenance',
  manual_edit:'Planning modifié',
  import_new:'Nouveau planning',
  import_replace:'Planning remplacé',
  reset_day:'Planning',
  reset_week:'Planning',
  password_reset_request:'Sécurité',
  absence_request:'Congés / indisponibilité',
  absence_decision:'Décision congés'
 })[k]||'Notification'
}
function notificationChannelGroup(k){
 return ['chat_message','chat_direct','chat_group','chat_general'].includes(String(k||''))?'messages':'system'
}
function desktopNotificationGlyph(k){
 const kind=String(k||'');
 if(['chat_message','chat_direct','chat_group','chat_general'].includes(kind))return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"/><path d="M8 10h8M8 13h5"/></svg>';
 if(['manual_edit','import_new','import_replace','reset_day','reset_week'].includes(kind))return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/><path d="M8 13h3M8 16h6"/></svg>';
 if(['absence_request','absence_decision'].includes(kind))return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 9.2 17 19 7"/><circle cx="12" cy="12" r="9"/></svg>';
 if(kind==='app_update')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M8.5 11.5 12 15l3.5-3.5"/><path d="M5 19h14"/></svg>';
 if(kind==='maintenance')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5 3-3a5 5 0 0 1-6.3 6.3l-6.5 6.5a2 2 0 1 0 2.8 2.8l6.5-6.5a5 5 0 0 1 6.3-6.3l-3 3"/></svg>';
 if(kind==='password_reset_request')return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="12" r="4"/><path d="M13 12h8M18 12v3M21 12v2"/></svg>';
 if(kind==='admin_message')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13V9l12-4v12L4 13Z"/><path d="M7 13v5a2 2 0 0 0 2 2h1v-6"/></svg>';
 return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v3.5L4.5 15v1.5h15V15L18 12.5V9a6 6 0 0 0-6-6Z"/><path d="M9.5 19h5"/></svg>'
}
function notificationDate(v){
 const d=new Date(v),diff=Math.max(0,Date.now()-d.getTime()),min=Math.floor(diff/60000);
 if(min<1)return'À l’instant';if(min<60)return min+' min';
 const h=Math.floor(min/60);if(h<24)return h+' h';
 const days=Math.floor(h/24);if(days<7)return days+' j';
 const weeks=Math.floor(days/7);if(weeks<5)return weeks+' sem.';
 return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})
}
function setNotificationTab(tab){
 const requested=String(tab||'all');
 const allowed=['all','unread','messages','system'];
 api.notificationTab=allowed.includes(requested)&&document.querySelector('[data-notif-tab="'+requested+'"]')?requested:'all';
 document.querySelectorAll('[data-notif-tab]').forEach(b=>b.classList.toggle('active',b.dataset.notifTab===api.notificationTab));
 renderNotifications()
}
function notificationDayGroup(v){
 const d=new Date(v),now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),day=new Date(d.getFullYear(),d.getMonth(),d.getDate()),diff=Math.round((today-day)/86400000);
 if(diff===0)return"Aujourd’hui";if(diff===1)return"Hier";if(diff<7)return"Cette semaine";return"Plus anciennes"
}
function notificationMatchesTab(n,tab){
 if(tab==='unread')return !n.read_at;
 if(tab==='messages')return notificationChannelGroup(n.kind)==='messages';
 if(tab==='system')return notificationChannelGroup(n.kind)==='system';
 return true
}
function desktopNotificationMenuActive(){
 return !isMobileViewport()&&document.documentElement.dataset.nethorPlatform==='desktop'
}
function renderNotifications(){
 const list=document.getElementById('nettoNotifList'),badge=document.getElementById('nettoNotifBadge');if(!list||!badge)return;
 const desktop=desktopNotificationMenuActive();
 const validTabs=desktop?['all','unread','messages','system']:['all','unread'];
 if(!validTabs.includes(api.notificationTab))api.notificationTab='all';
 const unread=api.notifications.filter(n=>!n.read_at).length;
 const messages=api.notifications.filter(n=>notificationChannelGroup(n.kind)==='messages').length;
 const system=api.notifications.length-messages;
 updateMobileNotificationBadge(unread);
 badge.textContent=unread>99?'99+':String(unread);badge.classList.toggle('hidden',unread===0);
 const allCount=document.getElementById('nettoNotifAllCount'),unreadCount=document.getElementById('nettoNotifUnreadCount'),messagesCount=document.getElementById('nettoNotifMessagesCount'),systemCount=document.getElementById('nettoNotifSystemCount'),summary=document.getElementById('nettoNotifSummary');
 if(allCount)allCount.textContent=String(api.notifications.length);
 if(unreadCount)unreadCount.textContent=String(unread);
 if(messagesCount)messagesCount.textContent=String(messages);
 if(systemCount)systemCount.textContent=String(system);
 if(summary&&desktop)summary.textContent=api.notifications.length+' notification'+(api.notifications.length>1?'s':'');
 document.querySelectorAll('[data-notif-tab]').forEach(b=>b.classList.toggle('active',b.dataset.notifTab===api.notificationTab));
 const rows=api.notifications.filter(n=>notificationMatchesTab(n,api.notificationTab)).sort((a,b)=>{
  if(!desktop&&api.notificationTab==='all'){const au=!a.read_at?1:0,bu=!b.read_at?1:0;if(au!==bu)return bu-au}
  return new Date(b.created_at)-new Date(a.created_at)
 });
 if(!rows.length){
  const titles={unread:'Aucune notification non lue',messages:'Aucun message',system:'Aucune notification système',all:'Aucune notification'};
  const notes={unread:'Tu as tout consulté.',messages:'Les nouveaux messages apparaîtront ici.',system:'Les activités Nethor apparaîtront ici.',all:'Les nouvelles activités apparaîtront ici.'};
  const title=titles[api.notificationTab]||titles.all,note=notes[api.notificationTab]||notes.all;
  list.innerHTML='<div class="nettoNotifEmpty"><div class="nettoNotifEmptyBox"><span class="nettoNotifEmptyIcon">'+(api.notificationTab==='unread'?'✓':'🔔')+'</span><strong>'+title+'</strong><span>'+note+'</span></div></div>';return
 }
 const unreadByGroup=new Map();
 if(desktop)rows.forEach(n=>{if(!n.read_at){const g=notificationDayGroup(n.created_at);unreadByGroup.set(g,(unreadByGroup.get(g)||0)+1)}});
 let previousGroup='',html='';
 rows.forEach(n=>{
  const group=desktop?notificationDayGroup(n.created_at):(!n.read_at?'Nouveau':notificationDayGroup(n.created_at));
  if(group!==previousGroup){
   const fresh=desktop?(unreadByGroup.get(group)||0):0;
   html+='<div class="nettoNotifSectionLabel"><span>'+esc(group)+'</span>'+(fresh?'<b class="nettoNotifSectionCount">'+fresh+' nouvelle'+(fresh>1?'s':'')+'</b>':'')+'</div>';previousGroup=group
  }
  const glyph=desktop?desktopNotificationGlyph(n.kind):notificationIcon(n.kind);
  const chevron=desktop?'<span class="nettoNotifChevron" aria-hidden="true">›</span>':'';
  html+='<article class="nettoNotifItem '+esc(n.kind)+' '+(!n.read_at?'unread':'')+'" role="button" tabindex="0" data-id="'+n.id+'" data-url="'+esc(n.target_url||'')+'"><span class="nettoNotifIcon"><span class="nettoNotifGlyph">'+glyph+'</span></span><div class="nettoNotifBody"><strong>'+esc(n.title)+'</strong><span>'+esc(n.message)+'</span><div class="nettoNotifCategory">'+esc(notificationCategory(n.kind))+'</div><small>'+notificationDate(n.created_at)+'</small></div><span class="nettoNotifSide"><i class="nettoNotifUnreadDot" aria-hidden="true"></i>'+chevron+'<button class="nettoNotifDelete" title="Supprimer" aria-label="Supprimer la notification">×</button></span></article>'
 });
 list.innerHTML=html;
 const activate=el=>{
  const id=Number(el.dataset.id),raw=el.dataset.url||'',n=api.notifications.find(x=>x.id===id);
  if(n&&!n.read_at){n.read_at=new Date().toISOString();api.client.from('planning_notifications').update({read_at:n.read_at}).eq('id',id).eq('user_id',api.session.user.id).then(({error})=>{if(error){n.read_at=null;loadNotifications()}})}
  let url='';
  if(raw){try{const u=new URL(raw,location.href);if(u.origin===location.origin){if(u.pathname.includes('/stock-fl/'))u.pathname=u.pathname.replace('/stock-fl/','/nethor/');url=u.href}}catch(_){}}
  if(url){closeDrops();location.assign(url)}else renderNotifications()
 };
 list.querySelectorAll('.nettoNotifItem').forEach(el=>{el.onclick=e=>{if(e.target.closest('.nettoNotifDelete'))return;activate(el)};el.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('.nettoNotifDelete')){e.preventDefault();activate(el)}}});
 list.querySelectorAll('.nettoNotifDelete').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();deleteNotification(Number(b.closest('.nettoNotifItem').dataset.id))})
}
function notificationRuleKey(kind){
 if(['manual_edit','import_new','import_replace','reset_day','reset_week'].includes(kind))return'planning_changes';
 if(kind==='chat_direct')return'direct_message';
 if(['chat_group','chat_general','chat_message'].includes(kind))return'group_message';
 if(['absence_request','absence_decision'].includes(kind))return'absence';
 if(kind==='admin_message')return'admin_message';
 if(kind==='app_update')return'app_update';
 if(kind==='maintenance')return'maintenance';
 if(kind==='password_reset_request')return'security';
 return''
}
async function loadNotificationPreferences(){
 if(!api.client||!api.session)return null;
 try{
  let {data,error}=await api.client.rpc('my_notification_channel_preferences');
  if(error){
   const legacy=await api.client.rpc('my_notification_preferences');
   data=legacy.data;error=legacy.error
  }
  if(error)throw error;
  api.notificationPreferences={};
  for(const row of data||[])api.notificationPreferences[row.rule_key]=row;
  window.dispatchEvent(new CustomEvent('netto:notification-preferences',{detail:{preferences:api.notificationPreferences}}));
  return api.notificationPreferences
 }catch(e){console.warn('Préférences notifications:',e);api.notificationPreferences=api.notificationPreferences||{};return api.notificationPreferences}
}
function notificationPreferenceEnabled(ruleKey,channel='push'){
 if(!ruleKey)return true;
 const row=api.notificationPreferences?.[ruleKey];
 if(!row)return true;
 if(channel==='portal')return row.effective_portal_enabled!==false;
 return (row.effective_push_enabled??row.effective_enabled)!==false
}
function notificationPushEnabled(kind){return notificationPreferenceEnabled(notificationRuleKey(kind),'push')}
function notificationPortalEnabled(kind){return notificationPreferenceEnabled(notificationRuleKey(kind),'portal')}
function notificationKindEnabled(kind){return notificationPushEnabled(kind)}
async function loadNotifications(){
 if(!api.client||!api.session)return;
 const {data,error}=await api.client.from('planning_notifications').select('id,kind,title,message,planning_date,week_start,target_url,read_at,created_at').eq('user_id',api.session.user.id).order('created_at',{ascending:false}).limit(80);
 if(error){console.warn('Notifications:',error);return}
 api.notifications=(data||[]).filter(n=>notificationPortalEnabled(n.kind));
 renderNotifications();
 window.dispatchEvent(new CustomEvent('netto:notifications',{detail:{notifications:api.notifications,unread:api.notifications.filter(n=>!n.read_at).length}}))
}
async function markRead(id){const n=api.notifications.find(x=>x.id===id);if(!n||n.read_at)return;const now=new Date().toISOString(),{error}=await api.client.from('planning_notifications').update({read_at:now}).eq('id',id).eq('user_id',api.session.user.id);if(!error){n.read_at=now;renderNotifications()}}
async function markAllRead(){if(!api.notifications.some(n=>!n.read_at))return;const {error}=await api.client.from('planning_notifications').update({read_at:new Date().toISOString()}).eq('user_id',api.session.user.id).is('read_at',null);if(!error)loadNotifications()}
async function deleteNotification(id){const {error}=await api.client.from('planning_notifications').delete().eq('id',id).eq('user_id',api.session.user.id);if(!error){sounds.play('delete');api.notifications=api.notifications.filter(n=>n.id!==id);renderNotifications();window.dispatchEvent(new CustomEvent('netto:notifications',{detail:{notifications:api.notifications,unread:api.notifications.filter(n=>!n.read_at).length}}))}}
async function deleteAllNotifications(){if(!api.notifications.length)return;if(!confirm('Supprimer toutes tes notifications ?'))return;const ids=api.notifications.map(n=>n.id);const {error}=await api.client.from('planning_notifications').delete().eq('user_id',api.session.user.id).in('id',ids);if(!error){sounds.play('delete');api.notifications=[];renderNotifications();window.dispatchEvent(new CustomEvent('netto:notifications',{detail:{notifications:[],unread:0}}))}}
function startNotificationsRealtime(){if(!api.session||api.notifChannel)return;api.notifChannel=api.client.channel('planning-notifications-'+api.session.user.id).on('postgres_changes',{event:'*',schema:'public',table:'planning_notifications',filter:'user_id=eq.'+api.session.user.id},payload=>{if(payload?.eventType==='INSERT'&&notificationPortalEnabled(payload?.new?.kind))sounds.play('notification');loadNotifications()}).subscribe()}
function syncPresence(){if(!api.channel)return;const state=api.channel.presenceState(),ids=new Set();Object.values(state).flat().forEach(x=>{if(x?.user_id)ids.add(x.user_id)});api.onlineIds=ids;window.dispatchEvent(new CustomEvent('netto:presence',{detail:{ids:[...ids],count:ids.size}}))}
function startPresence(){if(!api.session||api.channel)return;api.channel=api.client.channel('team-presence',{config:{presence:{key:api.session.user.id}}}).on('presence',{event:'sync'},syncPresence).on('presence',{event:'join'},syncPresence).on('presence',{event:'leave'},syncPresence).subscribe(async status=>{if(status==='SUBSCRIBED'){const p=api.profile||{};await api.channel.track({user_id:api.session.user.id,display_name:p.display_name||'Utilisateur',page:location.pathname,online_at:new Date().toISOString()});syncPresence()}})}
async function recordChatPresence(event='heartbeat'){
 if(!api.client||!api.session)return;
 try{await api.client.rpc('chat_presence_ping',{p_event:event})}catch(e){if(event!=='heartbeat')console.warn('Historique présence chat:',e)}
}
function startChatPresenceHistory(){
 if(!api.client||!api.session||api.chatPresenceTimer)return;
 recordChatPresence('start');
 api.chatPresenceTimer=setInterval(()=>{if(!document.hidden)recordChatPresence('heartbeat')},30000);
 document.addEventListener('visibilitychange',()=>{recordChatPresence(document.hidden?'heartbeat':'heartbeat')});
 window.addEventListener('pagehide',()=>{recordChatPresence('heartbeat')},{capture:true})
}
function startProfileRealtime(){
 if(!api.session||api.profileChannel)return;
 api.profileChannel=api.client.channel('profile-self-'+api.session.user.id)
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:'id=eq.'+api.session.user.id},async()=>{await refresh()})
  .subscribe()
}
let accessRefreshTimer=null;
function scheduleAccessRefresh(){
 clearTimeout(accessRefreshTimer);accessRefreshTimer=setTimeout(()=>refresh().catch(()=>{}),90)
}
function startAccessRealtime(){
 if(!api.session||api.accessChannel)return;
 api.accessChannel=api.client.channel('access-self-'+api.session.user.id)
  .on('postgres_changes',{event:'*',schema:'public',table:'user_subroles',filter:'user_id=eq.'+api.session.user.id},scheduleAccessRefresh)
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'app_settings',filter:'key=eq.site_config'},scheduleAccessRefresh)
  .subscribe()
}
function moduleForLegacyElement(el){
 const raw=(el?.getAttribute?.('href')||'')+' '+(el?.getAttribute?.('onclick')||'');
 for(const m of NAV_MODULES){const file=(String(m.baseUrl||m.url||'').split('?')[0].split('/').pop()||'').toLowerCase();if(file&&raw.toLowerCase().includes(file))return m}
 return null
}
function enforceLegacyAccessUI(root=document){
 if(!api.profile)return;
 root.querySelectorAll('a[href],button[onclick]').forEach(el=>{
  const m=moduleForLegacyElement(el);if(!m)return;
  const allowed=moduleAllowed(m,api.profile,api.siteConfig);
  if(!allowed){el.classList.add('hidden');el.dataset.nettoAccessHidden='1'}
  else if(el.dataset.nettoAccessHidden==='1'){el.classList.remove('hidden');delete el.dataset.nettoAccessHidden}
 });
 const current=pageFile(),m=NAV_MODULES.find(x=>(String(x.baseUrl||x.url||'').split('?')[0].split('/').pop()||'').toLowerCase()===current);
 if(m&&!moduleAllowed(m,api.profile,api.siteConfig)){document.documentElement.classList.add('nettoAccessPageVerifying');location.replace('home.html');return false}
 document.documentElement.classList.remove('nettoAccessPageVerifying');
 document.documentElement.dataset.nettoFastAccess='ready';
 document.getElementById('nettoFastAccessStyle')?.remove();
 return true
}
function updateKnownUI(){const p=api.profile;if(!p)return;const name=p.display_name||'Utilisateur',role=roleLabel(p.role);['userName','userMenuName'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=name});['userRole','userMenuRole'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=role});['userAvatar','userMenuAvatar'].forEach(id=>paint(document.getElementById(id),api.avatarUrl,name,p.profile_color,p.avatar_frame));enforceLegacyAccessUI();buildGlobalHeader();renderMobileQuickBar()}
function pageFile(){return window.NethorNavigation?.pageFile?.()||(location.pathname.split('/').pop()||'home.html').toLowerCase()}
function backFallback(){
 return window.NethorNavigation?.backTarget?.(pageFile())||'home.html'
}
function goBack(){
 sounds.play('navigate');
 if(window.NethorNavigation?.navigateBack)return window.NethorNavigation.navigateBack();
 location.href=backFallback()
}
function addBackButton(){
 const p=pageFile();if(p==='home.html'||p==='')return;
 if(document.documentElement.dataset.nethorPageLayout==='mobile')return;
 if(document.documentElement.dataset.nethorPageBackHandled==='1')return;
 document.querySelectorAll('header .backBtn').forEach(x=>x.classList.add('nettoLegacyBackHidden'));
 if(document.getElementById('nettoGlobalBack'))return;
 const b=document.createElement('button');b.id='nettoGlobalBack';b.type='button';b.className='nettoBackBtn';b.setAttribute('aria-label','Retour');b.innerHTML='<span class="nettoBackArrow">←</span><span class="nettoBackLabel">Retour</span>';b.onclick=goBack;
 const top=document.querySelector('header .top');
 if(top)top.insertBefore(b,top.firstChild);
 else{b.style.position='fixed';b.style.left='12px';b.style.top='12px';b.style.zIndex='3500';document.body.appendChild(b)}
}
async function rememberSiteBase(){
 if(!api.client||!api.session||api.profile?.role!=='admin')return;
 try{
  const u=new window.URL(location.href);
  if(!['http:','https:'].includes(u.protocol))return;
  const base=u.origin+u.pathname.replace(/[^/]*$/,'');
  const {data:existing}=await api.client.from('app_settings').select('value').eq('key','site_base_url').maybeSingle();
  if(existing?.value?.url===base)return;
  await api.client.from('app_settings').upsert({key:'site_base_url',value:{url:base},updated_at:new Date().toISOString(),updated_by:api.session.user.id},{onConflict:'key'});
 }catch(e){console.warn('Enregistrement URL portail:',e)}
}
function pageArea(){const p=(location.pathname.split('/').pop()||'home.html').toLowerCase();const map={'home.html':'Accueil','index.html':'Stock F&L','planning.html':'Planning','chat.html':'Chat','profile.html':'Mon profil','articles.html':'Fiches articles','scanner.html':'Scanner (bêta)','notifications.html':'Notifications','notification-settings.html':'Réglages des notifications','report-problem.html':'Signaler un problème','fl-assistant.html':'Assistant Précommande','bakery.html':'Boulangerie','settings.html':'Personnalisation du site','admin-portal.html':'Gestion','rewards.html':'Défis & Boutique','accounts.html':'Gestion des comptes','maintenance.html':'Maintenance','user-menu.html':'Menu utilisateur'};return map[p]||document.title||'Portail'}
async function logPageView(){if(!api.client||!api.session)return;try{await api.client.rpc('audit_page_view',{p_area:pageArea(),p_path:(location.pathname||'')+(location.search||''),p_title:document.title||pageArea()})}catch(e){console.warn('Journal consultation:',e)}}
function globalCacheKey(){return api.session?.user?.id?'nettoGlobalUI:'+api.session.user.id:null}
function globalCacheAge(){
 try{
  const k=globalCacheKey();if(!k)return Infinity;
  const x=JSON.parse(localStorage.getItem(k)||'null');
  return x?.saved_at?Math.max(0,Date.now()-Number(x.saved_at)):Infinity
 }catch(_){return Infinity}
}
function hydrateGlobalCache(){
 try{
  const k=globalCacheKey();if(!k)return false;const x=JSON.parse(localStorage.getItem(k)||'null');if(!x||Date.now()-Number(x.saved_at||0)>GLOBAL_UI_CACHE_TTL)return false;
  if(!x.profile)return false;api.profile=x.profile;api.siteConfig=x.siteConfig||{};api.subrolePermissions=x.subrolePermissions||{};api.avatarUrl=x.avatarUrl||null;applyProfileTheme(api.profile,false);rebuildModules(api.siteConfig);applyPortalTheme(api.siteConfig);if(enforceMaintenanceAccess())return true;document.documentElement.style.setProperty('--profile-accent',api.profile.profile_color||'#ff5a2a');updateKnownUI();window.dispatchEvent(new CustomEvent('netto:profile',{detail:{profile:api.profile,avatarUrl:api.avatarUrl,siteConfig:api.siteConfig,cached:true}}));return true
 }catch(_){return false}
}
function buildAccessSnapshot(){
 const permissions={},allowed=[];
 NAV_MODULES.forEach(m=>{const level=permissionLevel(m,api.profile,api.siteConfig);permissions[m.id]=level;if(level!=='none')allowed.push(m.id)});
 return {role:api.profile?.role||'',allowed,permissions}
}
function saveGlobalCache(){try{const k=globalCacheKey();if(k&&api.profile)localStorage.setItem(k,JSON.stringify({saved_at:Date.now(),profile:api.profile,siteConfig:api.siteConfig,subrolePermissions:api.subrolePermissions,avatarUrl:api.avatarUrl,accessSnapshot:buildAccessSnapshot()}))}catch(_){}}
async function refresh(){if(!api.client||!api.session)return null;const [pr,sr,xr]=await Promise.all([api.client.from('profiles').select('display_name,role,avatar_path,profile_color,avatar_frame,ui_preferences').eq('id',api.session.user.id).maybeSingle(),api.client.from('app_settings').select('value').eq('key','site_config').maybeSingle(),api.client.rpc('my_subrole_permissions')]);const p=pr.data;if(!p)return null;api.profile=p;api.siteConfig=sr.data?.value&&typeof sr.data.value==='object'?sr.data.value:{};api.subrolePermissions={};if(!xr.error)for(const row of xr.data||[])if(row?.module&&['view','operate','manage'].includes(row.permission))api.subrolePermissions[row.module]=row.permission;applyProfileTheme(p,true);rebuildModules(api.siteConfig);applyPortalTheme(api.siteConfig);if(enforceMaintenanceAccess())return p;api.avatarUrl=null;if(p.avatar_path){const {data:a}=await api.client.storage.from('profile-avatars').createSignedUrl(p.avatar_path,3600);api.avatarUrl=a?.signedUrl||null}document.documentElement.style.setProperty('--profile-accent',p.profile_color||'#ff5a2a');updateKnownUI();saveGlobalCache();window.dispatchEvent(new CustomEvent('netto:profile',{detail:{profile:p,avatarUrl:api.avatarUrl,siteConfig:api.siteConfig}}));return p}

function syncGlobalDesignAsset(){
 document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
  const href=link.getAttribute('href')||'';
  if(/design-v4\.css(?:\?v=\d+)?$/i.test(href)&&href!=='design-v4.css?v=9')link.setAttribute('href','design-v4.css?v=9')
 })
}
function syncAppIconLinks(){
 document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(x=>x.remove());
 const href=APP_ICON+'?v='+APP_RELEASE;
 const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href=href;icon.sizes='any';document.head.appendChild(icon);
 const shortcut=document.createElement('link');shortcut.rel='shortcut icon';shortcut.type='image/svg+xml';shortcut.href=href;document.head.appendChild(shortcut);
 const apple=document.createElement('link');apple.rel='apple-touch-icon';apple.href=APP_MOBILE_ICON+'?v='+APP_RELEASE;document.head.appendChild(apple);
 let manifest=document.querySelector('link[rel="manifest"]');if(!manifest){manifest=document.createElement('link');manifest.rel='manifest';document.head.appendChild(manifest)}manifest.href='manifest.webmanifest?v='+APP_RELEASE;
 let appName=document.querySelector('meta[name="application-name"]');if(!appName){appName=document.createElement('meta');appName.name='application-name';document.head.appendChild(appName)}appName.content='Nethor';
 let tile=document.querySelector('meta[name="msapplication-TileColor"]');if(!tile){tile=document.createElement('meta');tile.name='msapplication-TileColor';document.head.appendChild(tile)}tile.content='#202631';
}
async function setupAppUpdates(){
 if(!('serviceWorker' in navigator)||window.__nethorUpdateSetup)return;
 window.__nethorUpdateSetup=true;
 try{
  const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
  let lastCheck=0,checkPromise=null;
  const show=()=>{if(reg.waiting&&navigator.serviceWorker.controller)void showUpdateAvailable(reg).catch(e=>console.warn('Mise à jour Nethor:',e))};
  const check=(force=false)=>{
   const now=Date.now();
   if(!force&&now-lastCheck<120000)return checkPromise||Promise.resolve();
   if(checkPromise)return checkPromise;
   lastCheck=now;
   checkPromise=reg.update().catch(e=>console.warn('Vérification mise à jour:',e)).finally(()=>{checkPromise=null});
   return checkPromise
  };
  show();
  reg.addEventListener('updatefound',()=>{
   const worker=reg.installing;if(!worker)return;
   worker.addEventListener('statechange',()=>{if(worker.state==='installed')show()})
  });
  void check(true);
  window.addEventListener('focus',()=>void check(false),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check(false)});
  window.addEventListener('online',()=>void check(true),{passive:true})
 }catch(e){console.warn('Mise à jour application:',e);window.__nethorUpdateSetup=false}
}

function maintenanceActive(config=api?.siteConfig){return config?.maintenance?.enabled===true}
function enforceMaintenanceAccess(){
 const file=(location.pathname.split('/').pop()||'home.html').toLowerCase();
 const isMaintenance=file==='maintenance.html',isLogin=file==='index.html';
 // La connexion reste toujours accessible, même pendant une maintenance.
 // La maintenance n'est appliquée qu'après authentification.
 if(isLogin)return false;
 const isAdmin=api.profile?.role==='admin';
 if(maintenanceActive()&&!isAdmin&&!isMaintenance){location.replace('maintenance.html');return true}
 if(isMaintenance&&(isAdmin||!maintenanceActive())){location.replace('home.html');return true}
 return false
}


function ensureAccessibleNames(root=document){
 root.querySelectorAll('input,select,textarea').forEach(el=>{
  if(el.type==='hidden'||el.hasAttribute('aria-label')||el.hasAttribute('aria-labelledby')||el.labels?.length)return;
  const wrap=el.closest('.field,.userEditField,.formField,.filterField,.searchBox,.searchWrap,.composer,.uploadCard');
  const label=wrap?.querySelector('label');
  const name=String(label?.textContent||el.getAttribute('placeholder')||el.getAttribute('name')||'').trim();
  if(name)el.setAttribute('aria-label',name);
 });
}
function startAccessibleNameObserver(){
 if(!document.body||window.__nettoA11yObserver)return;
 const pending=new Set();
 let scheduled=false;
 const flush=()=>{
  scheduled=false;
  const nodes=[...pending];pending.clear();
  const run=()=>nodes.forEach(node=>{if(node?.isConnected)ensureAccessibleNames(node)});
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:350});
  else setTimeout(run,24)
 };
 const observer=new MutationObserver(mutations=>{
  mutations.forEach(m=>m.addedNodes.forEach(node=>{if(node.nodeType===1)pending.add(node)}));
  if(!scheduled&&pending.size){scheduled=true;requestAnimationFrame(flush)}
 });
 observer.observe(document.body,{childList:true,subtree:true});
 window.__nettoA11yObserver=observer;
}
function promotePlatformShellStyles(){
 const mobile=isMobileViewport();
 const selector=mobile?'link[href*="ui/mobile/mobile-shell.css"]':'link[href*="ui/desktop/desktop-shell.css"]';
 const active=document.head?.querySelector(selector);
 if(active&&active.parentNode===document.head)document.head.appendChild(active)
}
function addLayoutHardening(){
 if(document.getElementById('nethorLayoutHardeningV193'))return;
 const s=document.createElement('style');s.id='nethorLayoutHardeningV193';s.textContent=`
 html,body{max-width:100%}
 body{min-width:0}
 main,.workspace,.section,.panel,.card,.sheet,.modal,.modalCard,.planningModalCard{min-width:0}
 img,video,canvas,svg{max-width:100%}
 dialog[open]{max-width:calc(100vw - 20px);max-height:calc(100dvh - 20px)}
 @media(max-width:900px),(pointer:coarse){
   html,body{overflow-x:hidden}
   body.nettoHasMobileBar{padding-bottom:calc(var(--netto-mobile-bar-h,64px) + env(safe-area-inset-bottom))!important}
   html.nettoKeyboardOpen body.nettoHasMobileBar{padding-bottom:0!important}
   body>#nettoDropBackdrop.nettoMobilePortaledBackdrop.open{z-index:2147481000!important}
   .nettoMobileQuickBar{z-index:2147481500!important}
   body>.nettoMobilePortaledDrop.nettoDrop,
   body>.nettoMobilePortaledDrop.nettoNotifDrop,
   body>#nettoUserDrop.nettoMobilePortaledDrop,
   body>#nettoLoginDrop.nettoMobilePortaledDrop{z-index:2147482000!important}
   .nettoUserCardBackdrop{z-index:2147482750!important}
 }
 `;
 document.head.appendChild(s)
}
function runAfterFirstPaint(task){
 const run=()=>{try{task()}catch(e){console.warn('Tâche différée Nethor:',e)}};
 if(document.visibilityState==='hidden'){setTimeout(run,0);return}
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:700});
  else setTimeout(run,40)
 }))
}
function scheduleNetworkTask(delay,task){
 setTimeout(()=>{
  const run=()=>{try{task()}catch(e){console.warn('Tâche réseau différée Nethor:',e)}};
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:Math.max(500,delay+500)});
  else run()
 },Math.max(0,Number(delay)||0))
}
async function init(){addStyle();addLayoutHardening();promotePlatformShellStyles();syncGlobalDesignAsset();syncAppIconLinks();ensureAccessibleNames();startAccessibleNameObserver();if(!window.supabase?.createClient)return;api.client=window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data:{session}}=await api.client.auth.getSession();if(!session){setupAppUpdates();return}api.session=session;const rememberedTheme=cachedProfileTheme(session.user.id);if(rememberedTheme)localTheme(rememberedTheme);const cacheAge=globalCacheAge(),cached=hydrateGlobalCache(),shouldRefresh=!cached||cacheAge>GLOBAL_UI_REFRESH_TTL,fresh=shouldRefresh?refresh():Promise.resolve(api.profile);if(!cached)await fresh;else fresh.catch(()=>{});enforceLegacyAccessUI();rememberSiteBase();addBackButton();bindHomeMark();runAfterFirstPaint(()=>{
 if(!isMobileViewport())scheduleNetworkTask(450,()=>void bindMobilePreviewGlobal());
 scheduleNetworkTask(80,startPresence);
 scheduleNetworkTask(220,()=>{startProfileRealtime();startAccessRealtime()});
 scheduleNetworkTask(380,()=>{void loadNotificationPreferences().then(()=>{startNotificationsRealtime();return loadNotifications()}).catch(()=>{})});
 scheduleNetworkTask(700,startChatPresenceHistory);
 scheduleNetworkTask(950,()=>void logPageView());
 scheduleNetworkTask(1200,()=>void setupAppUpdates())
});let lastFocusReload=0;const reload=()=>{const now=Date.now();if(now-lastFocusReload<15000)return;lastFocusReload=now;loadNotificationPreferences().then(()=>loadNotifications())};window.addEventListener('focus',reload);document.addEventListener('visibilitychange',()=>{if(!document.hidden)reload()})}
runAfterFirstPaint(()=>scheduleNetworkTask(850,()=>{if(document.querySelector('script[src*="reward-profile.js"]'))return;const rewardScript=document.createElement('script');rewardScript.src='reward-profile.js?v=2';rewardScript.defer=true;document.head.appendChild(rewardScript)}));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();