(function(){
'use strict';
function isMobileViewport(){
 try{return window.matchMedia('(max-width:900px)').matches||window.matchMedia('(pointer:coarse)').matches}catch(_){return window.innerWidth<=900}
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

const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co';
const KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const ROLE={admin:'Administrateur',responsable:'Responsable',lecture:'Lecture seule',employe:'Employé'};
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
 {id:'home',label:'Accueil',subtitle:'Retour au portail',url:'home.html',icon:'⌂',asset:'assets/logo-home.svg',roles:null,home:false,userMenu:true,defaultUser:true},
 {id:'profile',label:'Mon profil',homeLabel:'Mon profil',subtitle:'Profil et notifications',url:'profile.html',icon:'☺',asset:'assets/logo-profile.svg?v=3',roles:null,home:true,userMenu:true,defaultHome:false,defaultUser:true,kicker:'MON COMPTE',description:'Gérer ta photo, ton apparence et la sécurité de ton compte.',action:'Ouvrir mon profil',cardClass:'profileCard'},
 {id:'stock',label:'Stock F&L',homeLabel:'Stock F&L',subtitle:'Gestion du stock',url:'index.html',homeUrl:'index.html?mode=stock',asset:'assets/logo-stock.svg',roles:null,home:true,userMenu:true,defaultHome:true,defaultUser:true,kicker:'OPÉRATIONS',description:'Contrôler les quantités, préparer les commandes et administrer le référentiel produits depuis un espace optimisé terrain.',action:'Ouvrir le stock',cardClass:'stock'},
 {id:'planning',label:'Planning',homeLabel:'Planning équipe',subtitle:'Horaires de l’équipe',url:'planning.html',asset:'assets/logo-planning.svg',roles:null,home:true,userMenu:true,defaultHome:true,defaultUser:true,kicker:'ORGANISATION',description:'Consulter les horaires, importer les plannings Excel et suivre précisément chaque modification.',action:'Consulter le planning',cardClass:'planning'},
 {id:'chat',label:'Équipe',homeLabel:'Équipe',subtitle:'Messagerie interne',url:'chat.html',asset:'assets/logo-equipe.svg',roles:null,home:true,userMenu:true,defaultHome:true,defaultUser:true,kicker:'COMMUNICATION',description:'Centraliser les échanges, la présence des membres et les informations utiles au fonctionnement quotidien.',action:'Ouvrir l’espace équipe',cardClass:'chatCard'},
 {id:'articles',label:'Fiches articles',homeLabel:'Fiches articles',subtitle:'Référentiel articles',url:'articles.html',asset:'assets/logo-article.svg',roles:null,home:true,userMenu:true,defaultHome:true,defaultUser:true,kicker:'RÉFÉRENTIEL',description:'Retrouver rapidement les références, codes et informations produit utilisées dans les procédures du rayon.',action:'Ouvrir le référentiel',cardClass:'articlesCard'},
 {id:'rewards',label:'Défis & Boutique',homeLabel:'Défis & Boutique',subtitle:'Missions et récompenses',url:'rewards.html',icon:'✦',asset:'assets/logo-rewards.svg?v=3',roles:['admin'],home:true,userMenu:true,defaultHome:true,defaultUser:true,kicker:'ADMINISTRATION',description:'Créer les défis, gérer les récompenses et utiliser librement le catalogue administrateur.',action:'Ouvrir Défis & Boutique',cardClass:'rewardsCard'},
 {id:'bakery',label:'Boulangerie',homeLabel:'Boulangerie',subtitle:'Stock • Consulter • Gestion',url:'bakery.html',asset:'assets/logo-boulangerie.svg?v=3',roles:['admin'],home:true,userMenu:true,defaultHome:true,defaultUser:true,kicker:'ADMINISTRATION',description:'Gérer le stock, consulter les articles et administrer les catégories propres à la famille Boulangerie.',action:'Ouvrir la Boulangerie',cardClass:'bakeryCard'},
 {id:'accounts',label:'Gestion des comptes',homeLabel:'Gestion des comptes',subtitle:'Utilisateurs, accès et journal',url:'accounts.html',icon:'♙',asset:'assets/logo-accounts.svg',roles:['admin'],home:true,userMenu:true,defaultHome:false,defaultUser:false,kicker:'ADMINISTRATION',description:'Gérer les utilisateurs, leurs rôles, les demandes de mot de passe et le journal d’activité.',action:'Gérer les comptes',cardClass:'accountsCard'},
 {id:'portal_admin',label:'Éditeur du portail',homeLabel:'Éditeur du portail',subtitle:'Menus, couleurs et contenu',url:'admin-portal.html',icon:'✦',asset:'assets/logo-admin-portal.svg',roles:['admin'],home:true,userMenu:true,defaultHome:false,defaultUser:true,kicker:'ADMINISTRATION',description:'Créer les menus, personnaliser leur apparence, leurs accès et leur contenu depuis une interface unique.',action:'Configurer le portail',cardClass:'portalAdminCard'},
 {id:'settings',label:'Personnalisation',homeLabel:'Personnalisation',subtitle:'Mon accueil et mes raccourcis',url:'settings.html',icon:'⚙',asset:'assets/logo-settings.svg',roles:null,home:true,userMenu:false,defaultHome:false,kicker:'PRÉFÉRENCES',description:'Choisir les outils visibles sur ton accueil et dans ta barre utilisateur selon tes droits.',action:'Personnaliser mon portail',cardClass:'settingsCard'}
]);
let NAV_MODULES=[...BASE_MODULES];
const SYSTEM_ROLES=Object.freeze(['admin','responsable','employe','lecture']);
function roleKeys(config=api?.siteConfig){const defs=config?.role_definitions&&typeof config.role_definitions==='object'?Object.keys(config.role_definitions):[];return [...new Set([...SYSTEM_ROLES,...defs])]}
function roleDefinition(key,config=api?.siteConfig){return config?.role_definitions?.[key]||null}
function cleanColor(v,fallback=''){const s=String(v||'').trim();return /^#[0-9a-f]{6}$/i.test(s)?s:fallback}
function rebuildModules(config={}){
 const pages=config?.pages&&typeof config.pages==='object'?config.pages:{};
 const base=BASE_MODULES.map(m=>{
  const p=pages[m.id]&&typeof pages[m.id]==='object'?pages[m.id]:{};
  const overrideImage=String(p.image_url||'').trim();
  return {...m,
   baseUrl:m.url,
   label:String(p.nav_label||p.label||m.label),
   homeLabel:String(p.label||m.homeLabel||m.label),
   subtitle:String(p.subtitle||m.subtitle||''),
   description:String(p.description||m.description||''),
   url:String(p.url||m.url||''),
   icon:String(p.icon||m.icon||'•'),
   asset:overrideImage||m.asset,
   home:typeof p.home==='boolean'?p.home:m.home,
   userMenu:typeof p.user_menu==='boolean'?p.user_menu:m.userMenu,
   defaultHome:typeof p.default_home==='boolean'?p.default_home:m.defaultHome,
   defaultUser:typeof p.default_user==='boolean'?p.default_user:m.defaultUser,
   kicker:String(p.kicker||m.kicker||'OUTIL'),
   action:String(p.action||m.action||'Ouvrir'),
   menuColor:cleanColor(p.color,''),
   menuAccent:cleanColor(p.accent,''),
   configuredRoles:Array.isArray(p.roles)?p.roles.filter(r=>roleKeys(config).includes(r)):null
  }
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
 root.style.setProperty('--netto-gradient','linear-gradient(135deg,'+primary+' 0%,'+primary+' 44%,'+secondary+' 100%)')
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
 if(module.id==='settings')return'view';
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
function moduleVisible(area,module,profile,config=api?.siteConfig){if(!moduleAllowed(module,profile,config))return false;if(area==='home'&&!module.home)return false;if(area==='user_menu'&&!module.userMenu)return false;const v=preferenceMap(profile)?.[area]?.[module.id];if(typeof v==='boolean')return v;return area==='home'?module.defaultHome!==false:module.defaultUser!==false}
function visibleModules(area,profile,config=api?.siteConfig){return NAV_MODULES.filter(m=>moduleVisible(area,m,profile,config))}
function moduleIcon(module){return module?.asset?'<img src="'+esc(module.asset)+'" alt="">':esc(module?.icon||'•')}
const DEFAULT_MOBILE_BAR_IDS=Object.freeze(['home','stock','planning','chat','profile']);
const MOBILE_NAV_ICONS=Object.freeze({
 home:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5"/><path d="M6.5 9.5V20h11V9.5"/></svg>',
 stock:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 8.5h15l-1.4 10H5.9l-1.4-10Z"/><path d="M7 8.5 9 5.5h6l2 3"/><path d="M8 12h8"/></svg>',
 planning:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M8 4v3M16 4v3M4 9.5h16"/><path d="M8 13h3M13 13h3M8 16h3"/></svg>',
 chat:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7.5 16.5H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3l-2.5 2v-2Z"/><path d="M15.5 15.5H19a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-1.5"/></svg>',
 profile:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.25"/><path d="M5.5 18.5c1.4-3 4-4.5 6.5-4.5s5.1 1.5 6.5 4.5"/></svg>',
 articles:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 5.5h8l2 2V18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z"/><path d="M15 5.5v2h2"/><path d="M8 11h8M8 14h8M8 17h5"/></svg>',
 rewards:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5.5 14 9.5l4.5.6-3.3 3 1 4.4L12 15.5l-4.2 2 1-4.4-3.3-3L10 9.5l2-4Z"/></svg>',
 bakery:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 11.5c0-2.9 2.6-5 6-5s6 2.1 6 5c0 .7-.1 1.3-.4 2H6.4c-.3-.7-.4-1.3-.4-2Z"/><path d="M5.5 13.5h13V16a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-2.5Z"/><path d="M9 9.5c0-1 .7-2 1.8-2.7M12 9c0-1.3.8-2.5 2.2-3.3"/></svg>',
 accounts:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="2.5"/><circle cx="16.5" cy="10" r="2"/><path d="M4.5 18c1.1-2.3 3-3.5 4.5-3.5s3.4 1.2 4.5 3.5"/><path d="M14 18c.7-1.5 2-2.4 3.2-2.4 1.1 0 2.4.9 3.1 2.4"/></svg>',
 portal_admin:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4.5" y="4.5" width="15" height="15" rx="3"/><path d="M8 8h8M8 12h5M8 16h8"/></svg>',
 settings:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="2.75"/><path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3H9.6l-.3 3a7 7 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .7.1 1.1l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.3 3h4.8l.3-3a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.4.1-.7.1-1.1Z"/></svg>',
 default:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="5" width="5" height="5" rx="1.2"/><rect x="14" y="5" width="5" height="5" rx="1.2"/><rect x="5" y="14" width="5" height="5" rx="1.2"/><rect x="14" y="14" width="5" height="5" rx="1.2"/></svg>'
});
function mobileNavIcon(id){return MOBILE_NAV_ICONS[id]||MOBILE_NAV_ICONS.default}

function mobileBarItems(config=api?.siteConfig){
 const raw=Array.isArray(config?.mobile_bar?.items)?config.mobile_bar.items:[];
 const source=raw.length?raw:DEFAULT_MOBILE_BAR_IDS.map(id=>({id,enabled:true,label:''}));
 const seen=new Set(),out=[];
 for(const item of source){
  const id=String(item?.id||'').trim();
  if(!id||seen.has(id))continue;
  const module=NAV_MODULES.find(m=>m.id===id);
  if(!module)continue;
  seen.add(id);
  out.push({id,enabled:item?.enabled!==false,label:String(item?.label||'').trim().slice(0,18)});
  if(out.length>=5)break;
 }
 return out
}
function mobileBarActive(module){
 try{
  const current=(location.pathname.split('/').pop()||'home.html').toLowerCase();
  const u=new window.URL(module?.url||'home.html',location.href);
  const target=(u.pathname.split('/').pop()||'home.html').toLowerCase();
  return current===target
 }catch(_){return false}
}
function renderMobileQuickBar(){
 const old=document.getElementById('nettoMobileQuickBar');
 if(!api.profile||api.siteConfig?.mobile_bar?.enabled===false){
  old?.remove();document.body?.classList.remove('nettoHasMobileBar');return
 }
 const items=mobileBarItems(api.siteConfig)
  .filter(x=>x.enabled!==false)
  .map(x=>({item:x,module:NAV_MODULES.find(m=>m.id===x.id)}))
  .filter(x=>x.module&&moduleAllowed(x.module,api.profile,api.siteConfig));
 if(!items.length){old?.remove();document.body?.classList.remove('nettoHasMobileBar');return}
 let nav=old;
 if(!nav){nav=document.createElement('nav');nav.id='nettoMobileQuickBar';nav.className='nettoMobileQuickBar';nav.setAttribute('aria-label','Navigation rapide');document.body.appendChild(nav)}
 nav.style.setProperty('--netto-mobile-count',String(items.length));
 nav.innerHTML=items.map(({item,module})=>{const label=item.label||module.label||'Menu';return '<a class="nettoMobileQuickItem '+(mobileBarActive(module)?'active':'')+'" href="'+esc(module.url||'home.html')+'" aria-label="'+esc(label)+'" title="'+esc(label)+'"><span class="nettoMobileQuickIcon" aria-hidden="true">'+mobileNavIcon(module.id)+'</span></a>'}).join('');
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>sounds.play('navigate')));
 document.body.classList.add('nettoHasMobileBar')
}
const api={profile:null,siteConfig:{},subrolePermissions:{},avatarUrl:null,onlineIds:new Set(),channel:null,profileChannel:null,chatPresenceTimer:null,client:null,session:null,notifications:[],notifChannel:null,loginHistory:[],modules:NAV_MODULES,allRoles:[...SYSTEM_ROLES],avatarFrames:AVATAR_FRAMES,validAvatarFrame,avatarFrameAsset,setAvatarFrame,paintAvatar:paint,maxRoles:moduleMaxRoles,configuredRoles,roleLabel,canAccess:moduleAllowed,permissionLevel,canManage,isVisible:moduleVisible,visibleModules,rebuildModules,renderMobileQuickBar,mobileBarItems,mobileNavIcon,refresh,loadNotifications,preferredTheme,applyProfileTheme,setThemePreference:saveThemePreference,toggleMobilePreview:()=>toggleMobilePreview(),checkForUpdates:()=>manualCheckForUpdates(),maintenanceActive:()=>maintenanceActive(),enforceMaintenance:()=>enforceMaintenanceAccess()};
window.NettoProfileUI=api;

const SOUND_DEFS={
 tap:[[520,0,.055,.15,'sine',610]],
 menuOpen:[[330,0,.10,.16,'sine',430],[520,.045,.12,.09,'sine',620]],
 menuClose:[[520,0,.08,.13,'sine',420],[340,.045,.11,.10,'sine',290]],
 navigate:[[420,0,.065,.11,'sine',540],[680,.035,.075,.075,'sine',780]],
 switch:[[390,0,.08,.12,'triangle',650]],
 confirm:[[523.25,0,.13,.14,'sine'],[659.25,.075,.19,.13,'sine']],
 success:[[392,0,.20,.12,'sine'],[493.88,.085,.25,.14,'sine'],[659.25,.19,.34,.13,'sine']],
 loginSuccess:[[329.63,0,.29,.11,'sine'],[415.3,.085,.33,.13,'sine'],[493.88,.18,.39,.14,'sine'],[659.25,.30,.50,.11,'sine']],
 error:[[245,0,.11,.105,'square',218],[196,.115,.18,.095,'square',174]],
 warning:[[392,0,.10,.11,'triangle'],[392,.15,.12,.10,'triangle']],
 notification:[[783.99,0,.13,.105,'sine'],[1046.5,.105,.27,.09,'sine']],
 message:[[659.25,0,.11,.10,'sine'],[880,.085,.20,.09,'sine']],
 delete:[[370,0,.11,.11,'triangle',300],[246.94,.09,.21,.10,'sine',220]],
 logout:[[587.33,0,.19,.11,'sine'],[493.88,.085,.23,.12,'sine'],[392,.18,.31,.11,'sine'],[293.66,.29,.40,.08,'sine']]
};
let soundCtx=null;
function soundEnabled(){try{return localStorage.getItem('nettoSoundEnabled')!=='0'}catch(_){return true}}
function soundVolume(){try{const raw=localStorage.getItem('nettoSoundVolume');if(raw===null)return .72;const v=Number(raw);return Number.isFinite(v)&&v>=0&&v<=1?v:.72}catch(_){return .72}}
function unlockSound(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;soundCtx=soundCtx||new A();if(soundCtx.state==='suspended')soundCtx.resume().catch(()=>{});return soundCtx}catch(_){return null}}
function playSound(name='tap'){if(!soundEnabled())return;const def=SOUND_DEFS[name]||SOUND_DEFS.tap,a=unlockSound();if(!a)return;const run=()=>{try{const now=a.currentTime,master=a.createGain(),filter=a.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(name==='error'?1350:name==='logout'?1750:2400,now);master.gain.setValueAtTime(Math.max(.0001,soundVolume()*.46),now);master.gain.exponentialRampToValueAtTime(.0001,now+Math.max(...def.map(t=>(t[1]||0)+(t[2]||.1)))+.08);filter.connect(master);master.connect(a.destination);def.forEach(t=>{const [freq,delay=0,dur=.1,gain=.1,type='sine',endFreq]=t,o=a.createOscillator(),g=a.createGain(),st=now+delay;o.type=type;o.frequency.setValueAtTime(freq,st);if(endFreq&&endFreq>0)o.frequency.exponentialRampToValueAtTime(endFreq,st+dur);g.gain.setValueAtTime(.0001,st);g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),st+Math.min(.035,dur*.3));g.gain.exponentialRampToValueAtTime(.0001,st+dur);o.connect(g);g.connect(filter);o.start(st);o.stop(st+dur+.025)})}catch(_){}};if(a.state==='suspended')a.resume().then(run).catch(()=>{});else run()}
const sounds={play:playSound,unlock:unlockSound,names:Object.freeze(Object.keys(SOUND_DEFS)),isEnabled:soundEnabled,getVolume:soundVolume,setEnabled(v){try{localStorage.setItem('nettoSoundEnabled',v?'1':'0')}catch(_){};window.dispatchEvent(new Event('netto:sound-settings'))},setVolume(v){const n=Math.max(0,Math.min(1,Number(v)||0));try{localStorage.setItem('nettoSoundVolume',String(n))}catch(_){};window.dispatchEvent(new Event('netto:sound-settings'))}};
window.NettoSounds=sounds;
document.addEventListener('pointerdown',()=>sounds.unlock(),{once:true,capture:true});

function initials(n){return String(n||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function roleLabel(r){return roleDefinition(r)?.label||ROLE[r]||r||'Compte'}
function addStyle(){
 if(document.getElementById('nettoGlobalUIStyle'))return;
 const s=document.createElement('style');s.id='nettoGlobalUIStyle';s.textContent=`
 #nMenu,.brandMenu,.nMenuWrap>#nMenu{display:none!important}
 .mobileNavBackdrop{display:none!important}
 .userMenuWrap{display:none!important}
 .nettoGlobalTools{display:flex;align-items:center;gap:8px;margin-left:auto;position:relative;z-index:1300;flex:none}
 .nettoBackBtn{height:42px;border:1px solid #dfe1e5;border-radius:12px;background:#fff;color:#2d3035;display:inline-flex;align-items:center;gap:7px;padding:0 12px;font-size:10px;font-weight:850;cursor:pointer;box-shadow:0 5px 15px #0000000b;flex:none;transition:transform .15s ease,background .15s ease,border-color .15s ease}.nettoBackBtn:hover{background:#f6f7f8;border-color:#cfd2d7}.nettoBackBtn:active{transform:scale(.96)}.nettoBackBtn .nettoBackArrow{font-size:18px;line-height:1}.nettoLegacyBackHidden{display:none!important}
 @media(max-width:650px){.nettoBackBtn{width:42px;padding:0;justify-content:center;border-radius:13px}.nettoBackBtn .nettoBackLabel{display:none}.nettoBackBtn .nettoBackArrow{font-size:20px}}

 .nettoLoginWrap,.nettoMobilePreviewWrap,.nettoUpdateWrap,.nettoBellWrap,.nettoUserWrap{position:relative}.nettoDropBackdrop{display:none!important;position:fixed;inset:0;border:0;padding:0;margin:0;background:transparent;appearance:none;-webkit-appearance:none}
 .nettoUpdateCheckBtn{width:auto!important;min-width:78px!important;padding:0 11px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;background:linear-gradient(135deg,#fff3ee,#fff9f4)!important;border-color:#ffc6b5!important;color:#d94726!important;box-shadow:0 6px 18px #ff5a2a16!important}.nettoUpdateCheckBtn:hover{background:linear-gradient(135deg,#ffe9e1,#fff3e8)!important;border-color:#ff9d82!important}.nettoUpdateCheckBtn svg{width:18px;height:18px;fill:currentColor}.nettoUpdateCheckBtn .nettoUpdateLabel{font-size:9px;font-weight:950;letter-spacing:.45px}.nettoUpdateCheckBtn.checking svg{animation:nettoUpdateSpin .8s linear infinite}@keyframes nettoUpdateSpin{to{transform:rotate(360deg)}}:root[data-theme="dark"] .nettoUpdateCheckBtn{background:linear-gradient(135deg,#38231f,#33271f)!important;border-color:#704234!important;color:#ff9877!important}@media(max-width:650px){.nettoUpdateCheckBtn{min-width:42px!important;width:42px!important;padding:0!important}.nettoUpdateCheckBtn .nettoUpdateLabel{display:none}}
 .nettoMobilePreviewOverlay{position:fixed;inset:0;background:#101214cc;backdrop-filter:blur(10px);z-index:10000;display:grid;place-items:center;padding:28px}.nettoMobilePreviewOverlay.hidden{display:none!important}.nettoMobilePreviewDevice{width:min(410px,calc(100vw - 28px));height:min(860px,calc(100vh - 56px));background:#0d0f11;border:7px solid #292d31;border-radius:38px;box-shadow:0 30px 100px #000b;position:relative;padding:11px;display:flex;flex-direction:column}.nettoMobilePreviewTop{height:32px;display:flex;align-items:center;justify-content:center;position:relative;flex:none}.nettoMobilePreviewState{position:absolute;left:2px;top:5px;color:#dfe3e7;font-size:8px;font-weight:850;letter-spacing:.2px}.nettoMobilePreviewNotch{width:92px;height:19px;border-radius:999px;background:#060708}.nettoMobilePreviewClose{position:absolute;right:0;top:-3px;width:28px;height:28px;border:0;border-radius:9px;background:#34393e;color:#fff;cursor:pointer;font-size:18px;line-height:1}.nettoMobilePreviewFrame{width:100%;height:100%;border:0;border-radius:25px;background:#fff;overflow:hidden}.nettoMobilePreviewBtn{touch-action:manipulation}.nettoMobilePreviewBtn .nettoMobileIconActive{display:none}.nettoMobilePreviewBtn.active{background:#fff2ee;border-color:#ff7754;box-shadow:0 0 0 2px #ff5a2a20,0 7px 20px #ff51251d}.nettoMobilePreviewBtn.active .nettoMobileIconNormal{display:none}.nettoMobilePreviewBtn.active .nettoMobileIconActive{display:block}:root[data-theme="dark"] .nettoMobilePreviewBtn.active{background:#3d2923;border-color:#8c4d38}:root[data-theme="dark"] .nettoMobilePreviewFrame{background:#1b1d20}
 .nettoMobilePreviewNotice{position:fixed;left:50%;bottom:24px;transform:translate(-50%,12px);z-index:10050;display:flex;align-items:center;gap:8px;max-width:min(92vw,360px);padding:10px 14px;border:1px solid #e3e5e8;border-radius:999px;background:#ffffffef;color:#25282c;box-shadow:0 12px 36px #0002;backdrop-filter:blur(12px);font-size:11px;font-weight:850;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}.nettoMobilePreviewNotice.show{opacity:1;transform:translate(-50%,0)}.nettoMobilePreviewNotice i{width:8px;height:8px;border-radius:50%;background:#ff5a2a;box-shadow:0 0 0 4px #ff5a2a18}:root[data-theme="dark"] .nettoMobilePreviewNotice{background:#23262aee;border-color:#3a3d42;color:#f5f1ed;box-shadow:0 14px 40px #0008}
 @media(max-width:650px){.nettoMobilePreviewWrap{display:none!important}}
 .nettoBellBtn{width:42px;height:42px;border:1px solid #e0e2e6;border-radius:13px;background:#fff;display:grid;place-items:center;cursor:pointer;position:relative;box-shadow:0 5px 15px #0000000b}
 .nettoBellBtn svg{width:21px;height:21px;fill:#3d3f44}.nettoNotifBadge{position:absolute;right:-4px;top:-5px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:#ff2438;color:#fff;border:2px solid #fff;display:grid;place-items:center;font-size:9px;font-weight:950;line-height:1}
 .nettoNotifBadge.hidden{display:none!important}
 .nettoNavBtn>span:first-child img{width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}
 .nettoUserBtn{height:42px;min-width:142px;max-width:220px;border:1px solid #e0e2e6;border-radius:13px;background:#fff;display:grid;grid-template-columns:30px minmax(0,1fr) 14px;align-items:center;gap:7px;padding:5px 8px;cursor:pointer;box-shadow:0 5px 15px #0000000b;text-align:left}
 [data-avatar-frame]{position:relative!important;overflow:visible!important;isolation:isolate;--avatar-frame-a:#ff7a1a;--avatar-frame-b:#ff391f;--avatar-frame-icon:none}
 [data-avatar-frame="admin"]{--avatar-frame-a:#ff8a1d;--avatar-frame-b:#ed211d;--avatar-frame-icon:url("assets/avatar-frame-admin.svg")}
 [data-avatar-frame="responsable"]{--avatar-frame-a:#ffd34f;--avatar-frame-b:#ff7a00;--avatar-frame-icon:url("assets/avatar-frame-responsable.svg")}
 [data-avatar-frame="point_vente"]{--avatar-frame-a:#ffb22e;--avatar-frame-b:#f25b0d;--avatar-frame-icon:url("assets/avatar-frame-point-vente.svg")}
 [data-avatar-frame="employe"]{--avatar-frame-a:#ff9c20;--avatar-frame-b:#ee6413;--avatar-frame-icon:url("assets/avatar-frame-employe.svg")}
 [data-avatar-frame="lecture"]{--avatar-frame-a:#c4c9d0;--avatar-frame-b:#5b626c;--avatar-frame-icon:url("assets/avatar-frame-lecture.svg")}
 [data-avatar-frame]::after{content:"";position:absolute;inset:0;box-sizing:border-box;padding:2px;border-radius:inherit;background:linear-gradient(135deg,var(--avatar-frame-a),var(--avatar-frame-b));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;filter:drop-shadow(0 2px 3px rgba(18,23,30,.18));z-index:6;pointer-events:none}
 [data-avatar-frame]::before{content:"";position:absolute;left:-4%;top:-4%;width:36%;aspect-ratio:1;min-width:11px;max-width:34px;border-radius:31%;box-sizing:border-box;background-image:var(--avatar-frame-icon),linear-gradient(135deg,var(--avatar-frame-a),var(--avatar-frame-b));background-repeat:no-repeat;background-position:center;background-size:58%,100%;border:1px solid rgba(255,255,255,.5);box-shadow:0 2px 7px rgba(18,23,30,.24);z-index:7;pointer-events:none}
 [data-avatar-frame]>img{border-radius:inherit!important}
 .avatar[data-avatar-frame]::after,.memberAvatar[data-avatar-frame]::after,.planningIdentityAvatar[data-avatar-frame]::after,.personalBannerAvatar[data-avatar-frame]::after,.nettoTopAvatar[data-avatar-frame]::after{border-width:2px}
 #avatar[data-avatar-frame]::after{border-width:4px}
 #avatar[data-avatar-frame]::before{left:-3%;top:-3%;width:30%;max-width:36px}
 .nettoTopAvatar{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:var(--profile-accent,#ff5a2a);color:#fff;font-size:10px;font-weight:950;background-size:cover!important;background-position:center!important;overflow:hidden}.nettoTopAvatar.hasPhoto{color:transparent}
 .nettoUserText{min-width:0}.nettoUserText strong{display:block;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nettoUserText small{display:block;font-size:8px;color:#868a91;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nettoChevron{font-size:12px;color:#8b8e94}
 .nettoDrop{position:absolute;right:0;top:49px;width:290px;background:#fffffff8;border:1px solid #dfe1e5;border-radius:16px;box-shadow:0 20px 55px #0000002b;backdrop-filter:blur(18px);padding:8px;z-index:3000}.nettoDrop.hidden{display:none!important}
 .nettoUserHead{display:grid;grid-template-columns:40px minmax(0,1fr);gap:9px;align-items:center;padding:9px 10px 10px;border-bottom:1px solid #eceef1;margin-bottom:5px}.nettoUserHead .nettoTopAvatar{width:40px;height:40px;border-radius:12px}.nettoUserHead strong{display:block;font-size:12px}.nettoUserHead small{display:block;color:#8b8e94;font-size:9px;margin-top:2px}
 .nettoNavBtn{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;align-items:center;text-align:left;border:0;background:transparent;border-radius:11px;padding:8px 9px;cursor:pointer}.nettoNavBtn:hover{background:#f4f5f7}.nettoNavBtn>span:first-child{width:32px;height:32px;border-radius:9px;background:#f0f1f3;display:grid;place-items:center;color:#e54726;font-weight:850;overflow:hidden}.nettoNavBtn>span:first-child img{width:100%;height:100%;display:block;object-fit:cover}.nettoNavBtn strong{display:block;font-size:11px}.nettoNavBtn small{display:block;font-size:8.5px;color:#8b8e94;margin-top:1px}.nettoMenuSection{padding:8px 10px 4px;color:#9a7a70;font-size:7.5px;font-weight:900;letter-spacing:.9px;text-transform:uppercase}.nettoLogout{margin-top:5px;border-top:1px solid #eceef1;border-radius:0 0 10px 10px;color:#a52218}
 .nettoNotifDrop{width:min(440px,calc(100vw - 20px));padding:0;overflow:hidden;pointer-events:auto;border-radius:22px!important;background:#fffffffa!important;border:1px solid #e7e9ed!important;box-shadow:0 24px 70px #15171a2b!important;backdrop-filter:blur(22px)!important}
 .nettoNotifSheetHandle{display:none}
 .nettoNotifHead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:17px 17px 12px;border-bottom:0;background:linear-gradient(180deg,#fff,#fbfbfc)}
 .nettoNotifTitle{display:flex;align-items:center;gap:10px;min-width:0}.nettoNotifTitleIcon{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#ff3b22,#ff8a18);color:#fff;box-shadow:0 7px 18px #ff5a2a35;font-size:16px}.nettoNotifTitle strong{display:block;font-size:14px;line-height:1.1}.nettoNotifTitle small{display:block;font-size:8px;color:#92969d;margin-top:4px}
 .nettoNotifHeadActions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.nettoNotifHead button{border:1px solid #e6e8eb;background:#f5f6f8;border-radius:10px;padding:7px 9px;font-size:8px;font-weight:850;cursor:pointer;color:#4d5157;transition:.16s ease}.nettoNotifHead button:hover{background:#eceef1;border-color:#d8dbe0}.nettoNotifHead button.danger:hover{background:#fff0ed;border-color:#ffc8bd;color:#b53623}
 .nettoNotifTabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 13px 13px;border-bottom:1px solid #eceef1;background:#fff}
 .nettoNotifTab{position:relative;display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:8px;border:1px solid #e4e7eb;background:#f8f9fa;border-radius:14px;padding:10px 10px;cursor:pointer;text-align:left;color:#3b3e43;transition:.16s ease;overflow:hidden;min-height:54px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}.nettoNotifTab:before{content:"";position:absolute;inset:auto 0 0;height:2px;background:transparent}.nettoNotifTab:hover{transform:translateY(-1px);border-color:#d9dde2;box-shadow:0 6px 18px #0000000b}
 .nettoNotifTabIcon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#fff;font-size:14px;box-shadow:0 3px 9px #0000000c}.nettoNotifTab strong{display:block;font-size:9.5px}.nettoNotifTab small{display:block;font-size:7.3px;color:#8d9299;margin-top:2px}.nettoNotifTab b{min-width:21px;height:21px;padding:0 6px;border-radius:999px;background:#e9ebee;color:#656a70;display:grid;place-items:center;font-size:7.5px}
 .nettoNotifTab.active{background:#fff5f1;border-color:#ffad92;color:#b83c20;box-shadow:0 7px 20px #ff5a2a13}.nettoNotifTab.active:before{background:linear-gradient(90deg,#ff3d24,#ff8518)}.nettoNotifTab.important.active{background:#fff2f1;border-color:#ff8d83;color:#b91f1b}.nettoNotifTab.important .nettoNotifTabIcon{background:#fff1ef}.nettoNotifTab.common .nettoNotifTabIcon{background:#eef5ff}
 .nettoNotifList{max-height:445px;overflow:auto;padding:10px 10px 12px;background:linear-gradient(180deg,#fafbfc,#f6f7f8);scrollbar-width:thin}.nettoNotifList::-webkit-scrollbar{width:6px}.nettoNotifList::-webkit-scrollbar-thumb{background:#d9dde2;border-radius:999px}
 .nettoNotifSectionLabel{display:flex;align-items:center;gap:7px;padding:7px 4px 6px;color:#92969d;font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.75px}.nettoNotifSectionLabel:after{content:"";height:1px;background:#e4e7eb;flex:1}
 .nettoNotifEmpty{min-height:215px;padding:30px 20px;display:grid;place-items:center;text-align:center;color:#91959b}.nettoNotifEmptyBox{display:grid;justify-items:center;gap:9px;max-width:250px}.nettoNotifEmptyIcon{width:52px;height:52px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(145deg,#fff,#f0f2f4);border:1px solid #e5e8ec;box-shadow:0 9px 25px #0000000c;font-size:21px}.nettoNotifEmpty strong{font-size:11px;color:#4a4e54}.nettoNotifEmpty span{font-size:8.5px;line-height:1.5;color:#969ba2}
 .nettoNotifCategory{display:inline-flex;align-items:center;gap:5px;font-size:6.8px;font-weight:900;text-transform:uppercase;letter-spacing:.45px;margin-top:7px;color:#8f837d;background:#ffffffa8;border:1px solid #ffffffcc;border-radius:999px;padding:4px 6px}
 .nettoNotifItem{position:relative;display:grid;grid-template-columns:40px minmax(0,1fr) 36px;gap:10px;align-items:start;padding:11px;border-radius:14px;border:1px solid #e4e7eb;cursor:pointer;margin-bottom:7px;background:#fff;transition:.16s ease;box-shadow:0 3px 10px #00000008;touch-action:manipulation;-webkit-tap-highlight-color:transparent;min-height:70px}.nettoNotifItem:hover{transform:translateY(-1px);box-shadow:0 8px 24px #00000010;border-color:#d8dce1}.nettoNotifItem:last-child{margin-bottom:0}.nettoNotifItem.unread:before{content:"";position:absolute;left:5px;top:50%;width:4px;height:22px;border-radius:999px;background:linear-gradient(#ff3d24,#ff8518);transform:translateY(-50%)}.nettoNotifItem.unread{box-shadow:0 7px 22px #ff5a2a0a}
 .nettoNotifIcon{width:39px;height:39px;border-radius:12px;display:grid;place-items:center;font-size:16px;font-weight:950}.nettoNotifBody{min-width:0}.nettoNotifBody strong{display:block;font-size:10.5px;line-height:1.3;color:#272a2f}.nettoNotifBody>span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:8.8px;line-height:1.45;color:#666b72;margin-top:3px}.nettoNotifBody small{display:block;font-size:7.5px;color:#9ca0a6;margin-top:6px}.nettoNotifDelete{width:36px;height:36px;border:0;border-radius:10px;background:#f3f4f6;color:#999da3;cursor:pointer;font-size:16px;line-height:1;transition:.15s ease;touch-action:manipulation;-webkit-tap-highlight-color:transparent}.nettoNotifDelete:hover{background:#fff0ee;color:#b52c20}
 .nettoNotifItem.manual_edit{background:#f7f9ff;border-color:#dce6fb}.nettoNotifItem.manual_edit .nettoNotifIcon{background:#e5edff;color:#335fba}.nettoNotifItem.import_new{background:#f5fbf7;border-color:#d5eedc}.nettoNotifItem.import_new .nettoNotifIcon{background:#e0f4e6;color:#188443}.nettoNotifItem.import_replace{background:#fff9f1;border-color:#ffe0b5}.nettoNotifItem.import_replace .nettoNotifIcon{background:#ffead0;color:#c96a00}.nettoNotifItem.reset_day,.nettoNotifItem.reset_week{background:#fff6f4;border-color:#ffd8d1}.nettoNotifItem.reset_day .nettoNotifIcon,.nettoNotifItem.reset_week .nettoNotifIcon{background:#ffe1dc;color:#bd3022}.nettoNotifItem.password_reset_request{background:#fffaf1;border-color:#f3deb6}.nettoNotifItem.password_reset_request .nettoNotifIcon{background:#ffedc8;color:#b66a00}.nettoNotifItem.chat_message{background:#f7faff;border-color:#e0e8f2}.nettoNotifItem.chat_message .nettoNotifIcon{background:#e8f0fb;color:#3f6f9e}.nettoNotifItem.admin_message{background:#faf7fc;border-color:#e7ddf3}.nettoNotifItem.admin_message .nettoNotifIcon{background:#eee5f8;color:#7852a0}.nettoNotifItem.absence_request,.nettoNotifItem.absence_decision{background:#fff7f3;border-color:#ffd9c8}.nettoNotifItem.absence_request .nettoNotifIcon,.nettoNotifItem.absence_decision .nettoNotifIcon{background:#ffe5d8;color:#bf4c24}
 :root[data-theme="dark"] .nettoNotifDrop{background:#1d2024fa!important;border-color:#373c42!important;box-shadow:0 28px 80px #0009!important}:root[data-theme="dark"] .nettoNotifHead{background:linear-gradient(180deg,#202328,#1d2024)}:root[data-theme="dark"] .nettoNotifTitle small{color:#a6a19c}:root[data-theme="dark"] .nettoNotifHead button{background:#292d32;border-color:#383d44;color:#ddd8d3}:root[data-theme="dark"] .nettoNotifTabs{background:#1d2024;border-color:#33383e}:root[data-theme="dark"] .nettoNotifTab{background:#25292e;border-color:#373c43;color:#e8e3de}:root[data-theme="dark"] .nettoNotifTabIcon{background:#2f343a}:root[data-theme="dark"] .nettoNotifTab small{color:#aaa59f}:root[data-theme="dark"] .nettoNotifTab b{background:#343940;color:#bbb6b0}:root[data-theme="dark"] .nettoNotifTab.active{background:#3b2923;border-color:#794431;color:#ffb18f}:root[data-theme="dark"] .nettoNotifTab.important.active{background:#402524;border-color:#7e3a34;color:#ffaaa1}:root[data-theme="dark"] .nettoNotifList{background:linear-gradient(180deg,#1b1e22,#191c20)}:root[data-theme="dark"] .nettoNotifSectionLabel{color:#8f8b87}:root[data-theme="dark"] .nettoNotifSectionLabel:after{background:#30353b}:root[data-theme="dark"] .nettoNotifItem{background:#24282d;border-color:#383e45;box-shadow:0 4px 12px #0003}:root[data-theme="dark"] .nettoNotifBody strong{color:#eeeae5}:root[data-theme="dark"] .nettoNotifBody>span{color:#b9b4ae}:root[data-theme="dark"] .nettoNotifBody small{color:#8f8b87}:root[data-theme="dark"] .nettoNotifCategory{background:#2f3438;border-color:#3b4147;color:#b7ada7}:root[data-theme="dark"] .nettoNotifDelete{background:#30353a;color:#aaa5a0}:root[data-theme="dark"] .nettoNotifEmptyIcon{background:linear-gradient(145deg,#2b3035,#24282d);border-color:#3a4047}:root[data-theme="dark"] .nettoNotifEmpty strong{color:#e4dfda}
 @media(max-width:700px){.nettoNotifDrop{position:fixed!important;left:max(7px,env(safe-area-inset-left))!important;right:max(7px,env(safe-area-inset-right))!important;top:auto!important;bottom:max(7px,env(safe-area-inset-bottom))!important;width:auto!important;max-width:none!important;max-height:min(84dvh,720px)!important;border-radius:24px 24px 20px 20px!important;overflow:hidden!important;box-shadow:0 -20px 60px #00000038!important;z-index:5000!important;overscroll-behavior:contain}.nettoNotifSheetHandle{display:block;width:38px;height:4px;border-radius:999px;background:#d6d8dc;margin:8px auto 0}.nettoNotifHead{padding:12px 14px 10px}.nettoNotifTitleIcon{width:34px;height:34px}.nettoNotifTabs{padding:0 10px 10px;gap:7px}.nettoNotifTab{padding:9px 8px;grid-template-columns:31px minmax(0,1fr) auto}.nettoNotifTabIcon{width:31px;height:31px}.nettoNotifList{max-height:calc(84dvh - 164px);padding:8px;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}.nettoNotifItem{grid-template-columns:38px minmax(0,1fr) 44px;padding:10px;min-height:72px;pointer-events:auto!important}.nettoNotifIcon{width:37px;height:37px}.nettoNotifHeadActions button{padding:8px 10px;min-height:44px;touch-action:manipulation}.nettoNotifDelete{width:44px;height:44px}.nettoNotifEmpty{min-height:240px}}
 @media(max-width:420px){.nettoNotifHead{display:grid;grid-template-columns:1fr auto}.nettoNotifHeadActions{grid-column:1/-1;width:100%;display:grid;grid-template-columns:1fr 1fr}.nettoNotifHeadActions button{width:100%;padding:8px}.nettoNotifTab small{display:none}.nettoNotifTab{grid-template-columns:30px minmax(0,1fr) auto}.nettoNotifList{max-height:calc(82dvh - 188px)}}
 .nettoLoginDrop{width:min(410px,calc(100vw - 20px));padding:0;overflow:hidden}.nettoLoginHeadTitle{min-width:0}.nettoLoginHeadTitle strong{display:block;font-size:12px}.nettoLoginHeadTitle small{display:block;font-size:8px;color:#92969d;margin-top:2px}.nettoLoginList{max-height:440px;overflow:auto;padding:7px}.nettoLoginItem{display:grid;grid-template-columns:34px minmax(0,1fr) 27px;gap:8px;align-items:center;padding:9px;border:1px solid #e8eaed;border-radius:11px;background:#fff;margin-bottom:6px}.nettoLoginItem:last-child{margin-bottom:0}.nettoLoginAvatar{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:var(--login-accent,#ff5a2a);color:#fff;font-size:9px;font-weight:950}.nettoLoginBody{min-width:0}.nettoLoginBody strong{display:block;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nettoLoginBody span{display:block;font-size:8.5px;color:#777c83;margin-top:1px}.nettoLoginBody small{display:block;font-size:8px;color:#999da3;margin-top:4px}.nettoLoginDelete{width:26px;height:26px;border:0;border-radius:8px;background:#f3f4f6;color:#92969c;cursor:pointer;font-size:15px;line-height:1}.nettoLoginDelete:hover{background:#fff0ee;color:#c33a2c}
 :root[data-theme="dark"] .nettoLoginHeadTitle small{color:#aaa5a0}:root[data-theme="dark"] .nettoLoginItem{background:#24282c;border-color:#393f45}:root[data-theme="dark"] .nettoLoginBody span{color:#b6b1ac}:root[data-theme="dark"] .nettoLoginBody small{color:#96918c}:root[data-theme="dark"] .nettoLoginDelete{background:#30353a;color:#aaa5a0}:root[data-theme="dark"] .nettoLoginDelete:hover{background:#442723;color:#ff9c8f}
 :root[data-theme="dark"] .nettoBackBtn{background:#24282b;border-color:#3c4247;color:#e9e4df;box-shadow:0 6px 18px #0004}:root[data-theme="dark"] .nettoBackBtn:hover{background:#2b3034;border-color:#50565b}
 :root[data-theme="dark"] .nettoBellBtn,:root[data-theme="dark"] .nettoUserBtn{background:#24282b;border-color:#3c4247;color:#e9e4df;box-shadow:0 7px 20px #0004}:root[data-theme="dark"] .nettoBellBtn:hover,:root[data-theme="dark"] .nettoUserBtn:hover{background:#2b3034;border-color:#55504b}:root[data-theme="dark"] .nettoBellBtn svg{fill:#e7e1dc}:root[data-theme="dark"] .nettoNotifBadge{border-color:#202225}:root[data-theme="dark"] .nettoDrop{background:#1d2022fa;border-color:#3b4145;color:#eeeae5;box-shadow:0 28px 78px #0008}:root[data-theme="dark"] .nettoNavBtn:hover{background:#2a2f33}:root[data-theme="dark"] .nettoNavBtn>span:first-child{background:#342720;color:#e79a78}:root[data-theme="dark"] .nettoNotifTabs{border-color:#34383d}:root[data-theme="dark"] .nettoNotifTab{background:#25292d;border-color:#373c42;color:#e8e3de}:root[data-theme="dark"] .nettoNotifTabIcon{background:#2e3338}:root[data-theme="dark"] .nettoNotifTab small{color:#aaa59f}:root[data-theme="dark"] .nettoNotifTab b{background:#343940;color:#bbb6b0}:root[data-theme="dark"] .nettoNotifTab.active{background:#3b2923;border-color:#794431;color:#ffb18f}:root[data-theme="dark"] .nettoNotifTab.important.active{background:#402524;border-color:#7e3a34;color:#ffaaa1}:root[data-theme="dark"] .nettoNotifHead,:root[data-theme="dark"] .nettoUserHead{background:linear-gradient(180deg,#1f2124,#1b1d20);border-color:#34383d}:root[data-theme="dark"] .nettoNotifBody span,:root[data-theme="dark"] .nettoUserText small,:root[data-theme="dark"] .nettoUserHead small{color:#aaa5a0}:root[data-theme="dark"] .nettoNotifItem{border-color:#33373b}:root[data-theme="dark"] .nettoNotifItem.manual_edit{background:#1c2637;border-color:#314568}:root[data-theme="dark"] .nettoNotifItem.import_new{background:#183025;border-color:#2d503b}:root[data-theme="dark"] .nettoNotifItem.import_replace{background:#342819;border-color:#574225}:root[data-theme="dark"] .nettoNotifItem.reset_day,:root[data-theme="dark"] .nettoNotifItem.reset_week{background:#38221f;border-color:#5a332d}:root[data-theme="dark"] .nettoNotifItem.password_reset_request{background:#382c1d;border-color:#5b4728}:root[data-theme="dark"] .nettoNotifItem.password_reset_request .nettoNotifIcon{background:#49371f;color:#ffc66e}
 @media(max-width:700px){
   header{overflow:visible!important}.nettoGlobalTools{gap:5px;max-width:100%}.nettoBellBtn{width:44px;height:44px;min-width:44px;min-height:44px;border-radius:13px;touch-action:manipulation}.nettoUserBtn{height:44px;min-width:108px;max-width:140px;grid-template-columns:30px minmax(0,1fr) 12px;padding:5px 6px;touch-action:manipulation}.nettoTopAvatar{width:30px;height:30px}.nettoUserText strong{font-size:9.5px}.nettoUserText small{font-size:7px}
   .nettoDrop:not(.nettoNotifDrop){position:fixed!important;right:8px!important;left:8px!important;top:max(64px,calc(env(safe-area-inset-top) + 54px))!important;width:auto!important;max-height:calc(100dvh - 78px)!important;overflow:auto!important;border-radius:18px!important;z-index:5000!important;-webkit-overflow-scrolling:touch}
   .nettoNavBtn{min-height:50px;touch-action:manipulation}.nettoNavBtn strong{font-size:11px}.nettoNavBtn small{font-size:8.5px}
   .nettoDropBackdrop.open{display:block!important;position:fixed;inset:0;z-index:4900;border:0;padding:0;margin:0;background:#11182742;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);touch-action:manipulation}
   html.nettoMobileDropOpen,html.nettoMobileDropOpen body{overflow:hidden!important;overscroll-behavior:none}html.nettoMobileDropOpen header{position:relative!important;z-index:4300!important;overflow:visible!important}html.nettoMobileDropOpen .nettoGlobalTools{z-index:5100!important}
   .backBtn,header>.top>.back,header .top>.back{display:none!important}
 }
 @media(max-width:430px){.nettoGlobalTools{gap:4px}.nettoUserBtn{width:44px;min-width:44px;max-width:44px;height:44px;grid-template-columns:32px;padding:5px}.nettoChevron,.nettoUserText{display:none}.nettoBellBtn{width:44px;height:44px}.nettoUpdateCheckBtn{width:44px!important;min-width:44px!important;height:44px!important}}

 .nettoMobileQuickBar{display:none}
 @media (max-width:900px),(pointer:coarse){
   :root{--netto-mobile-bar-h:64px}
   body.nettoHasMobileBar{padding-bottom:calc(var(--netto-mobile-bar-h) + env(safe-area-inset-bottom))!important}
   .nettoMobileQuickBar{
     display:grid;grid-template-columns:repeat(var(--netto-mobile-count,5),minmax(0,1fr));
     position:fixed;left:0;right:0;bottom:0;z-index:4200;
     min-height:calc(var(--netto-mobile-bar-h) + env(safe-area-inset-bottom));
     padding:4px max(6px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left));
     background:rgba(255,255,255,.97);border:0;border-top:1px solid #dfe3e8;border-radius:0;
     box-shadow:0 -8px 24px rgba(17,24,39,.08);backdrop-filter:blur(22px) saturate(1.15);-webkit-backdrop-filter:blur(22px) saturate(1.15);gap:0
   }
   .nettoMobileQuickItem{
     position:relative;min-width:0;min-height:56px;display:flex;align-items:center;justify-content:center;
     border-radius:0;color:#707780;text-decoration:none!important;transition:color .14s ease,transform .12s ease;
     -webkit-tap-highlight-color:transparent;touch-action:manipulation
   }
   .nettoMobileQuickItem:active{transform:scale(.94)}
   .nettoMobileQuickItem.active:before{
     content:"";position:absolute;top:-4px;left:50%;width:34px;height:3px;border-radius:0 0 6px 6px;
     transform:translateX(-50%);background:linear-gradient(90deg,#f23b27,#f47c20)
   }
   .nettoMobileQuickIcon{
     width:44px;height:44px;display:grid;place-items:center;border-radius:50%;color:currentColor;background:transparent;
     transition:transform .14s ease,color .14s ease,background .14s ease
   }
   .nettoMobileQuickIcon svg{width:24px;height:24px;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none}
   .nettoMobileQuickItem.active{color:#ef5a2f}
   .nettoMobileQuickItem.active .nettoMobileQuickIcon{background:#fff2ec;transform:translateY(-1px)}
   .nettoMobileQuickLabel{display:none!important}
   .nettoDrop:not(.nettoNotifDrop){
     position:fixed!important;left:8px!important;right:8px!important;top:auto!important;
     bottom:calc(var(--netto-mobile-bar-h) + env(safe-area-inset-bottom) + 8px)!important;
     width:auto!important;max-height:min(72dvh,620px)!important;overflow:auto!important;border-radius:24px!important;
     padding:8px!important;z-index:5000!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;
     box-shadow:0 -14px 50px rgba(0,0,0,.22)!important
   }
   .nettoNotifDrop{
     bottom:calc(var(--netto-mobile-bar-h) + env(safe-area-inset-bottom) + 8px)!important;
     max-height:min(76dvh,720px)!important;border-radius:24px!important
   }
   :root[data-theme="dark"] .nettoMobileQuickBar{background:rgba(27,29,32,.97);border-color:#363b40;box-shadow:0 -10px 28px rgba(0,0,0,.32)}
   :root[data-theme="dark"] .nettoMobileQuickItem{color:#9ca2aa}
   :root[data-theme="dark"] .nettoMobileQuickItem.active{color:#ff936d}
   :root[data-theme="dark"] .nettoMobileQuickItem.active .nettoMobileQuickIcon{background:#3b2923}
   body.nettoHasMobileBar .chatApp{height:calc(100dvh - 56px - var(--netto-mobile-bar-h) - env(safe-area-inset-bottom))!important}
   body.nettoHasMobileBar .planningToast,body.nettoHasMobileBar .toast{bottom:calc(var(--netto-mobile-bar-h) + env(safe-area-inset-bottom) + 12px)!important}
 }
 

 /* Nethor v100 — reliable mobile sheets for notifications/profile */
 @media (max-width:900px),(pointer:coarse){
   html.nettoMobileDropOpen header{
     z-index:9000!important;overflow:visible!important;
     backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
     transform:none!important;filter:none!important;contain:none!important
   }
   html.nettoMobileDropOpen .nettoGlobalTools{z-index:9300!important}
   .nettoDropBackdrop.open{
     display:block!important;position:fixed!important;inset:0!important;
     z-index:9100!important;background:rgba(15,23,42,.30)!important;
     backdrop-filter:blur(3px)!important;-webkit-backdrop-filter:blur(3px)!important
   }
   .nettoBellWrap,.nettoUserWrap,.nettoLoginWrap{position:static!important}
   .nettoNotifDrop,.nettoDrop:not(.nettoNotifDrop){
     position:fixed!important;
     left:max(8px,env(safe-area-inset-left))!important;
     right:max(8px,env(safe-area-inset-right))!important;
     top:auto!important;
     bottom:calc(var(--netto-mobile-bar-h,64px) + env(safe-area-inset-bottom) + 8px)!important;
     width:auto!important;max-width:none!important;margin:0!important;
     z-index:9400!important;overscroll-behavior:contain!important;
     box-shadow:0 -18px 54px rgba(15,23,42,.24)!important
   }
   .nettoNotifDrop{
     max-height:min(72dvh,680px)!important;overflow:hidden!important;border-radius:24px!important
   }
   #nettoUserDrop,#nettoLoginDrop{
     max-height:min(64dvh,560px)!important;overflow-y:auto!important;
     -webkit-overflow-scrolling:touch!important;border-radius:24px!important;padding:9px!important
   }
   #nettoUserDrop:before,#nettoLoginDrop:before{
     content:"";display:block;width:38px;height:4px;border-radius:999px;
     background:#d7dade;margin:0 auto 8px
   }
   .nettoNotifList{overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important}
   .nettoNavBtn{min-height:50px!important}
 }
 :root[data-theme="dark"] #nettoUserDrop:before,:root[data-theme="dark"] #nettoLoginDrop:before{background:#565c63}

   /* Notifications web • liste sociale */
  .nettoNotifMoreWrap{position:relative;display:none}
  .nettoNotifMoreBtn{width:36px!important;height:36px!important;padding:0!important;border:0!important;border-radius:50%!important;background:#f2f3f5!important;display:grid!important;place-items:center!important;font-size:18px!important;font-weight:900!important;letter-spacing:1px!important;color:#5d6269!important}
  .nettoNotifMoreBtn:hover{background:#e7e9ec!important}
  .nettoNotifMoreMenu{position:absolute;right:0;top:42px;z-index:30;width:210px;padding:6px;background:#fff;border:1px solid #e3e6e9;border-radius:13px;box-shadow:0 16px 42px #14171a24}
  .nettoNotifMoreMenu button{width:100%;border:0!important;background:transparent!important;border-radius:9px!important;padding:9px 10px!important;text-align:left!important;font-size:9.5px!important;color:#33383e!important}
  .nettoNotifMoreMenu button:hover{background:#f2f4f6!important}
  .nettoNotifMoreMenu button.danger{color:#be3427!important}
  @media(min-width:701px){
    .nettoNotifMoreWrap{display:block}
    .nettoNotifDrop{width:min(390px,calc(100vw - 20px));border-radius:17px!important}
    .nettoNotifHead{align-items:center;padding:14px 15px 8px;background:#fff!important}
    .nettoNotifTitle{gap:0}.nettoNotifTitleIcon{display:none}
    .nettoNotifTitle strong{font-size:20px!important;letter-spacing:-.35px;line-height:1.05}
    .nettoNotifTitle small{display:none}
    .nettoNotifHeadActions{display:none!important}
    .nettoNotifTabs{display:flex;gap:7px;padding:0 14px 9px;border:0;background:#fff}
    .nettoNotifTab{display:flex;align-items:center;justify-content:center;min-height:36px;width:auto;padding:0 13px;border:0;border-radius:999px;background:transparent;box-shadow:none!important;transform:none!important}
    .nettoNotifTab:before,.nettoNotifTabIcon,.nettoNotifTab small,.nettoNotifTab b{display:none!important}
    .nettoNotifTab strong{font-size:10.5px!important;font-weight:850}
    .nettoNotifTab.active{background:#e7f1ff!important;color:#0866ff!important;border:0!important}
    .nettoNotifList{max-height:520px;padding:0 7px 10px;background:#fff}
    .nettoNotifSectionLabel{padding:8px 7px 5px;font-size:11px!important;text-transform:none;letter-spacing:0;color:#25292e;font-weight:900}
    .nettoNotifSectionLabel:after{display:none}
    .nettoNotifItem{grid-template-columns:50px minmax(0,1fr) 20px;gap:9px;align-items:center;padding:7px 7px;margin:0;border:0;border-radius:10px;background:#fff!important;box-shadow:none!important;min-height:64px}
    .nettoNotifItem:hover{transform:none;background:#f4f5f6!important;border:0;box-shadow:none!important}
    .nettoNotifItem.unread:before{display:none}
    .nettoNotifIcon{width:50px;height:50px;border-radius:50%!important;font-size:18px!important;box-shadow:none!important;position:relative;overflow:hidden}
    .nettoNotifIcon:after{content:"";position:absolute;right:1px;bottom:1px;width:17px;height:17px;border-radius:50%;background:linear-gradient(135deg,#ff3b22,#ff8518);border:2px solid #fff}
    .nettoNotifBody strong{display:inline;font-size:10.5px!important;line-height:1.28;color:#1f2328;font-weight:850}
    .nettoNotifBody>span{display:inline!important;-webkit-line-clamp:unset;font-size:10.5px!important;line-height:1.3;color:#2f343a;margin:0}
    .nettoNotifBody>span:before{content:" "}
    .nettoNotifCategory{display:none}
    .nettoNotifBody small{margin-top:4px;font-size:8.5px!important;font-weight:800;color:#0866ff}
    .nettoNotifSide{width:20px;min-height:28px;display:grid;place-items:center;position:relative}
    .nettoNotifUnreadDot{width:9px;height:9px;border-radius:50%;background:#0866ff;opacity:0}
    .nettoNotifItem.unread .nettoNotifUnreadDot{opacity:1}
    .nettoNotifDelete{position:absolute;inset:-2px -5px auto auto;width:28px;height:28px;border:0;border-radius:50%;background:#eef0f2;color:#5f646b;font-size:0;padding:0;opacity:0;pointer-events:none}
    .nettoNotifDelete:after{content:"•••";font-size:11px;letter-spacing:1px}
    .nettoNotifItem:hover .nettoNotifUnreadDot{opacity:0}
    .nettoNotifItem:hover .nettoNotifDelete{opacity:1;pointer-events:auto}
    .nettoNotifDelete:hover{background:#e2e5e8;color:#272b30}
    .nettoNotifEmpty{min-height:185px}
  }
  :root[data-theme="dark"] .nettoNotifMoreBtn{background:#2b2f34!important;color:#dfe3e7!important}
  :root[data-theme="dark"] .nettoNotifMoreMenu{background:#23272c;border-color:#383e45}
  :root[data-theme="dark"] .nettoNotifMoreMenu button{color:#e7eaee!important}
  @media(min-width:701px){
    :root[data-theme="dark"] .nettoNotifHead,:root[data-theme="dark"] .nettoNotifTabs,:root[data-theme="dark"] .nettoNotifList{background:#1d2024!important}
    :root[data-theme="dark"] .nettoNotifTitle strong,:root[data-theme="dark"] .nettoNotifSectionLabel{color:#f1f3f5}
    :root[data-theme="dark"] .nettoNotifItem{background:#1d2024!important}
    :root[data-theme="dark"] .nettoNotifItem:hover{background:#292d32!important}
    :root[data-theme="dark"] .nettoNotifBody strong,:root[data-theme="dark"] .nettoNotifBody>span{color:#e7eaee!important}
    :root[data-theme="dark"] .nettoNotifTab.active{background:#263b55!important;color:#77afff!important}
    :root[data-theme="dark"] .nettoNotifIcon:after{border-color:#1d2024}
  }


`;document.head.appendChild(s)
}
function paint(el,url,name,color,frame){if(!el)return;el.style.setProperty('--profile-accent',color||'#ff5a2a');setAvatarFrame(el,frame);if(url){el.classList.add('hasPhoto');el.style.backgroundImage='url("'+url.replace(/"/g,'%22')+'")';el.textContent=''}else{el.classList.remove('hasPhoto');el.style.backgroundImage='';el.textContent=initials(name)}}
function makeButton(icon,title,sub,url,cls=''){return '<button class="nettoNavBtn '+cls+'" data-url="'+esc(url||'')+'"><span>'+icon+'</span><span><strong>'+esc(title)+'</strong><small>'+esc(sub||'')+'</small></span></button>'}
function currentTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
function validTheme(value){return value==='dark'||value==='light'?value:null}
function localTheme(theme){
 theme=validTheme(theme)||'light';
 if(typeof window.applyTheme==='function')window.applyTheme(theme);
 else{document.documentElement.dataset.theme=theme;try{localStorage.setItem('nettoTheme',theme)}catch(_){}}
 updateThemeText();
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
function updateThemeText(){const dark=currentTheme()==='dark';document.querySelectorAll('.nettoThemeLabel').forEach(x=>x.textContent=dark?'Mode clair':'Mode sombre');document.querySelectorAll('.nettoThemeIcon').forEach(x=>x.textContent=dark?'☀':'☾')}
function bindHomeMark(){
 document.querySelectorAll('.mark,.brandMark,.nMenuBtn,.brandMenuBtn').forEach(b=>{if((b.textContent||'').trim()!=='N')return;b.removeAttribute('onclick');b.removeAttribute('aria-expanded');b.setAttribute('aria-label','Retour à l’accueil');b.onclick=e=>{e.preventDefault();e.stopPropagation();location.href='home.html'}})
 document.querySelectorAll('#nMenu,.brandMenu').forEach(x=>x.classList.add('hidden'))
 document.body.classList.remove('mobileNavOpen')
}
function findHeaderTop(){return document.querySelector('#site header .top')||document.querySelector('header .top')}
async function detachPushBeforeLogout(){
 try{
  if(!api.client||!api.session||!('serviceWorker' in navigator)||!('PushManager' in window))return;
  const reg=await navigator.serviceWorker.getRegistration();const sub=await reg?.pushManager?.getSubscription();if(!sub)return;
  try{await api.client.functions.invoke('planning-push',{body:{action:'unsubscribe',endpoint:sub.endpoint}})}catch(_){}
  await sub.unsubscribe()
 }catch(e){console.warn('Désabonnement Push:',e)}
}


function askUpdateSearch(){
 ensureUpdateStyles();
 return new Promise(resolve=>{
  document.getElementById('nettoUpdateConfirmBackdrop')?.remove();
  const bg=document.createElement('div');bg.id='nettoUpdateConfirmBackdrop';bg.className='nettoUpdateConfirmBackdrop';
  bg.innerHTML='<div class="nettoUpdateConfirmCard" role="dialog" aria-modal="true" aria-labelledby="nettoUpdateConfirmTitle"><h3 id="nettoUpdateConfirmTitle">Chercher une mise à jour ?</h3><p>Nethor va consulter le journal des mises à jour puis vérifier la version installée sur cet appareil.</p><div class="nettoUpdateConfirmActions"><button type="button" class="nettoUpdateConfirmCancel">Annuler</button><button type="button" class="nettoUpdateConfirmGo">Rechercher</button></div></div>';
  document.body.appendChild(bg);
  const done=v=>{bg.remove();resolve(v)};
  bg.querySelector('.nettoUpdateConfirmCancel').onclick=()=>done(false);
  bg.querySelector('.nettoUpdateConfirmGo').onclick=()=>done(true);
  bg.onclick=e=>{if(e.target===bg)done(false)};
  const onKey=e=>{if(e.key==='Escape'){document.removeEventListener('keydown',onKey);done(false)}};
  document.addEventListener('keydown',onKey,{once:true});
  sounds.play('menuOpen')
 })
}
function displayVersion(value){
 const n=Math.max(0,Math.trunc(Number(value)||0)),major=Math.floor(n/100),minor=String(n%100).padStart(2,'0');
 return 'v'+major+'.'+minor
}
function parseVersionFromLog(row){
 const direct=Number(row?.details?.version||row?.details?.app_version||row?.details?.release_version||0);
 if(Number.isFinite(direct)&&direct>0)return direct;
 const text=[row?.title,row?.description,typeof row?.details==='string'?row.details:JSON.stringify(row?.details||{})].join(' ');
 const m=text.match(/\bv(?:ersion\s*)?(\d{1,5})\b/i)||text.match(/\bversion\s*(\d{1,5})\b/i);
 return m?Number(m[1])||0:0
}
async function latestVersionFromLogs(){
 if(!api.client)return 0;
 const {data,error}=await api.client.from('portal_change_logs').select('release_type,title,description,created_at,details').eq('release_type','maj').order('created_at',{ascending:false}).limit(50);
 if(error)throw error;
 let latest=0;
 for(const row of data||[])latest=Math.max(latest,parseVersionFromLog(row));
 return latest
}
async function manualCheckForUpdates(){
 const btn=document.getElementById('nettoUpdateCheckBtn');
 if(btn?.classList.contains('checking'))return;
 const confirmed=await askUpdateSearch();
 if(!confirmed)return;
 btn?.classList.add('checking');btn?.setAttribute('aria-busy','true');sounds.play('tap');
 try{
  if(!('serviceWorker' in navigator)){mobilePreviewNotice('Mises à jour non prises en charge');return}
  mobilePreviewNotice('Consultation du journal des MAJ…');
  const [info,logVersion]=await Promise.all([releaseInfo(),latestVersionFromLogs()]);
  const manifestVersion=Number(info.version)||APP_RELEASE;
  const latest=Math.max(logVersion||0,manifestVersion);
  const reg=await navigator.serviceWorker.register('./sw.js');updateRegistration=reg;
  await reg.update().catch(()=>{});
  if(!reg.waiting){
   await new Promise(resolve=>{
    let done=false,t=setTimeout(()=>{if(!done){done=true;resolve()}},2200);
    const finish=()=>{if(done)return;if(reg.waiting){done=true;clearTimeout(t);resolve()}};
    reg.addEventListener('updatefound',()=>{const w=reg.installing;if(w)w.addEventListener('statechange',finish);finish()},{once:true});
    finish()
   })
  }
  const active=await workerVersion(navigator.serviceWorker.controller);
  const stored=Number(localStorage.getItem('nettoAppVersion')||0)||0;
  const current=Math.max(active||0,stored||0);
  if(current>=latest){
   mobilePreviewNotice('Nethor est à jour - '+displayVersion(current));
   sounds.play('success');
   return
  }
  if(reg.waiting){
   sessionStorage.removeItem('nettoUpdateLater');
   await showUpdateAvailable(reg);
   mobilePreviewNotice('MAJ disponible : v'+latest);
   return
  }
  mobilePreviewNotice(displayVersion(latest)+' détectée dans les logs, téléchargement en attente');
 }catch(e){
  console.warn('Recherche de mise à jour:',e);
  mobilePreviewNotice('Impossible de vérifier les mises à jour');
  sounds.play('error')
 }finally{
  btn?.classList.remove('checking');btn?.removeAttribute('aria-busy')
 }
}

function buildGlobalHeader(){
 const previous=document.getElementById('nettoGlobalTools');if(previous)previous.remove();bindHomeMark();
 const top=findHeaderTop();if(!top||!api.profile)return;
 const existing=top.querySelector('.userMenuWrap');if(existing)existing.style.display='none';
 const p=api.profile,name=p.display_name||'Utilisateur',role=roleLabel(p.role);
 const shortcuts=visibleModules('user_menu',p,api.siteConfig).map(m=>makeButton(moduleIcon(m),m.label,m.subtitle,m.url)).join('');
 const wrap=document.createElement('div');wrap.id='nettoGlobalTools';wrap.className='nettoGlobalTools';
 const adminLoginTool=p.role==='admin'?'<div class="nettoLoginWrap"><button id="nettoLoginBtn" class="nettoBellBtn nettoLoginBtn" aria-label="Historique des connexions" aria-expanded="false" title="Connexions"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm1 10.41 3.3 1.9-1 1.73L11 13.59V7h2Z"/></svg></button><div id="nettoLoginDrop" class="nettoDrop nettoLoginDrop hidden"><div class="nettoNotifHead"><div class="nettoLoginHeadTitle"><strong>Connexions</strong><small>Qui s’est connecté et à quelle heure</small></div><div class="nettoNotifHeadActions"><button id="nettoLoginDeleteAll">Tout supprimer</button></div></div><div id="nettoLoginList" class="nettoLoginList"><div class="nettoNotifEmpty">Chargement…</div></div></div></div>':'';
 const inMobilePreview=new URLSearchParams(location.search).get('mobile_preview')==='1';
 const adminMobileTool=p.role==='admin'&&!inMobilePreview?'<div class="nettoMobilePreviewWrap"><button type="button" id="nettoMobilePreviewBtn" class="nettoBellBtn nettoMobilePreviewBtn" aria-label="Vision mobile" aria-pressed="false" title="Vision mobile"><svg class="nettoMobileIconNormal" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 1.5h10A2.5 2.5 0 0 1 19.5 4v16A2.5 2.5 0 0 1 17 22.5H7A2.5 2.5 0 0 1 4.5 20V4A2.5 2.5 0 0 1 7 1.5Zm0 2A.5.5 0 0 0 6.5 4v16a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V4a.5.5 0 0 0-.5-.5H7Zm3.5 14h3a1 1 0 1 1 0 2h-3a1 1 0 1 1 0-2Z"/></svg><svg class="nettoMobileIconActive" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="nettoMobileIconGradient" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#ff2f1f"/><stop offset="1" stop-color="#ff8500"/></linearGradient></defs><path fill="url(#nettoMobileIconGradient)" d="M7 1.5h10A2.5 2.5 0 0 1 19.5 4v16A2.5 2.5 0 0 1 17 22.5H7A2.5 2.5 0 0 1 4.5 20V4A2.5 2.5 0 0 1 7 1.5Zm0 2A.5.5 0 0 0 6.5 4v16a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V4a.5.5 0 0 0-.5-.5H7Zm3.5 14h3a1 1 0 1 1 0 2h-3a1 1 0 1 1 0-2Z"/></svg></button></div>':'';
 wrap.innerHTML='<button id="nettoDropBackdrop" class="nettoDropBackdrop" type="button" aria-label="Fermer le menu"></button>'+adminLoginTool+adminMobileTool+'<div class="nettoUpdateWrap"><button id="nettoUpdateCheckBtn" class="nettoBellBtn nettoUpdateCheckBtn" aria-label="Rechercher une mise à jour" title="Mise à jour"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3a1 1 0 1 1 2 0v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.42l2.3 2.3V3Zm-6 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z"/></svg><span class="nettoUpdateLabel">MAJ</span></button></div><div class="nettoBellWrap"><button id="nettoBellBtn" class="nettoBellBtn" aria-label="Notifications" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22a2.55 2.55 0 0 0 2.45-1.85h-4.9A2.55 2.55 0 0 0 12 22Zm7-5.1-1.75-2.05V9.5A5.26 5.26 0 0 0 13 4.34V3a1 1 0 1 0-2 0v1.34A5.26 5.26 0 0 0 6.75 9.5v5.35L5 16.9V18h14v-1.1Z"/></svg><b id="nettoNotifBadge" class="nettoNotifBadge hidden">0</b></button><div id="nettoNotifDrop" class="nettoDrop nettoNotifDrop hidden"><span class="nettoNotifSheetHandle"></span><div class="nettoNotifHead"><div class="nettoNotifTitle"><span class="nettoNotifTitleIcon">🔔</span><span><strong>Notifications</strong><small>Centre d’activité Nethor</small></span></div><div class="nettoNotifHeadActions"><button id="nettoMarkRead">✓ Tout lire</button><button id="nettoDeleteAll" class="danger">⌫ Effacer</button></div><div class="nettoNotifMoreWrap"><button id="nettoNotifMoreBtn" class="nettoNotifMoreBtn" type="button" aria-label="Actions des notifications" title="Actions">•••</button><div id="nettoNotifMoreMenu" class="nettoNotifMoreMenu hidden"><button id="nettoNotifMoreRead" type="button">✓ Tout marquer comme lu</button><button id="nettoNotifMoreDelete" class="danger" type="button">Supprimer toutes les notifications</button></div></div></div><div class="nettoNotifTabs"><button id="nettoNotifTabAll" class="nettoNotifTab common active" type="button" data-notif-tab="all"><span class="nettoNotifTabIcon">●</span><span><strong>Tout</strong><small>Toutes les notifications</small></span><b id="nettoNotifAllCount">0</b></button><button id="nettoNotifTabUnread" class="nettoNotifTab important" type="button" data-notif-tab="unread"><span class="nettoNotifTabIcon">●</span><span><strong>Non lu</strong><small>À consulter</small></span><b id="nettoNotifUnreadCount">0</b></button></div><div id="nettoNotifList" class="nettoNotifList"><div class="nettoNotifEmpty">Chargement…</div></div></div></div><div class="nettoUserWrap"><button id="nettoUserBtn" class="nettoUserBtn" aria-expanded="false"><span id="nettoTopAvatar" class="nettoTopAvatar">U</span><span class="nettoUserText"><strong>'+esc(name)+'</strong><small>'+esc(role)+'</small></span><span class="nettoChevron">⌄</span></button><div id="nettoUserDrop" class="nettoDrop hidden"><div class="nettoUserHead"><span id="nettoMenuAvatar" class="nettoTopAvatar">U</span><span><strong>'+esc(name)+'</strong><small>'+esc(role)+'</small></span></div>'+makeButton('⚙','Personnalisation','Mon accueil et mes raccourcis','settings.html')+(shortcuts?'<div class="nettoMenuSection">Raccourcis</div>'+shortcuts:'')+'<button id="nettoThemeBtn" class="nettoNavBtn"><span class="nettoThemeIcon">☾</span><span><strong class="nettoThemeLabel">Mode sombre</strong><small>Changer l’apparence</small></span></button><button id="nettoLogoutBtn" class="nettoNavBtn nettoLogout"><span>↪</span><span><strong>Déconnexion</strong><small>Quitter la session</small></span></button></div></div>';
 top.appendChild(wrap);
 paint(document.getElementById('nettoTopAvatar'),api.avatarUrl,name,p.profile_color,p.avatar_frame);paint(document.getElementById('nettoMenuAvatar'),api.avatarUrl,name,p.profile_color,p.avatar_frame);updateThemeText();
 wrap.querySelectorAll('.nettoNavBtn[data-url]').forEach(b=>b.onclick=()=>{sounds.play('navigate');const url=b.dataset.url;setTimeout(()=>location.href=url,55)});
 document.getElementById('nettoThemeBtn').onclick=e=>{e.stopPropagation();sounds.play('switch');changeTheme();updateThemeText()};
 document.getElementById('nettoLogoutBtn').onclick=async()=>{sounds.play('logout');await new Promise(r=>setTimeout(r,390));await recordChatPresence('end');await detachPushBeforeLogout();await api.client.auth.signOut({scope:'local'});location.href='index.html'};
 document.getElementById('nettoUserBtn').onclick=e=>{e.stopPropagation();toggleDrop('user')};document.querySelectorAll('[data-notif-tab]').forEach(b=>b.onclick=e=>{e.stopPropagation();setNotificationTab(b.dataset.notifTab)});
 const loginBtn=document.getElementById('nettoLoginBtn');if(loginBtn)loginBtn.onclick=e=>{e.stopPropagation();toggleDrop('logins')};
 const mobilePreviewBtn=document.getElementById('nettoMobilePreviewBtn');if(mobilePreviewBtn)mobilePreviewBtn.dataset.mobilePreviewReady='1'
 const loginDeleteAll=document.getElementById('nettoLoginDeleteAll');if(loginDeleteAll)loginDeleteAll.onclick=e=>{e.stopPropagation();sounds.play('warning');deleteAllLoginHistory()};
 const updateBtn=document.getElementById('nettoUpdateCheckBtn');if(updateBtn)updateBtn.onclick=e=>{e.stopPropagation();manualCheckForUpdates()};
 document.getElementById('nettoBellBtn').onclick=e=>{e.preventDefault();e.stopPropagation();toggleDrop('notifications')};
  const notifMoreBtn=document.getElementById('nettoNotifMoreBtn'),notifMoreMenu=document.getElementById('nettoNotifMoreMenu');
  if(notifMoreBtn)notifMoreBtn.onclick=e=>{e.preventDefault();e.stopPropagation();notifMoreMenu?.classList.toggle('hidden')};
  document.getElementById('nettoNotifMoreRead')?.addEventListener('click',()=>{notifMoreMenu?.classList.add('hidden');markAllRead()});
  document.getElementById('nettoNotifMoreDelete')?.addEventListener('click',()=>{notifMoreMenu?.classList.add('hidden');deleteAllNotifications()});
 const dropBackdrop=document.getElementById('nettoDropBackdrop');if(dropBackdrop)dropBackdrop.onclick=e=>{e.preventDefault();e.stopPropagation();closeDrops()};
 document.getElementById('nettoMarkRead').onclick=e=>{e.stopPropagation();sounds.play('confirm');markAllRead()};
 document.getElementById('nettoDeleteAll').onclick=e=>{e.stopPropagation();sounds.play('warning');deleteAllNotifications()};
 if(!api.globalListenersBound){document.addEventListener('click',e=>{if(!e.target.closest('#nettoGlobalTools'))closeDrops()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrops()});api.globalListenersBound=true}
}
function bindMobilePreviewGlobal(){
 if(window.__nettoMobilePreviewGlobalBound)return;
 window.__nettoMobilePreviewGlobalBound=true;
 document.addEventListener('click',e=>{
  const btn=e.target&&e.target.closest?e.target.closest('#nettoMobilePreviewBtn'):null;
  if(!btn)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  try{toggleMobilePreview()}catch(err){console.error('Vision mobile:',err);mobilePreviewNotice('Vision mobile : '+String(err&&err.message?err.message:err))}
 },true);
 document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'&&e.key!==' ')return;
  const btn=e.target&&e.target.closest?e.target.closest('#nettoMobilePreviewBtn'):null;
  if(!btn)return;
  e.preventDefault();e.stopPropagation();
  try{toggleMobilePreview()}catch(err){console.error('Vision mobile:',err);mobilePreviewNotice('Vision mobile : '+String(err&&err.message?err.message:err))}
 },true)
}
function mobilePreviewUrl(){
 var u=new window.URL(window.location.href);
 u.searchParams.set('mobile_preview','1');
 u.searchParams.set('_mobile_ts',String(Date.now()));
 return u.toString()
}
function setMobilePreviewButton(active){
 var on=!!active,btn=document.getElementById('nettoMobilePreviewBtn'),root=document.documentElement;
 if(on)root.setAttribute('data-mobile-preview-active','1');else root.removeAttribute('data-mobile-preview-active');
 if(!btn)return;
 btn.classList.toggle('active',on);
 btn.setAttribute('aria-pressed',on?'true':'false');
 btn.setAttribute('aria-label',on?'Quitter la vision mobile':'Vision mobile');
 btn.title=on?'Quitter la vision mobile':'Vision mobile'
}
let mobilePreviewNoticeTimer=null;
function mobilePreviewNotice(message){
 var old=document.getElementById('nettoMobilePreviewNotice');if(old&&old.parentNode)old.parentNode.removeChild(old);
 clearTimeout(mobilePreviewNoticeTimer);
 var notice=document.createElement('div');
 notice.id='nettoMobilePreviewNotice';notice.className='nettoMobilePreviewNotice';
 var dot=document.createElement('i'),label=document.createElement('span');
 label.textContent=String(message||'');
 notice.appendChild(dot);notice.appendChild(label);
 document.body.appendChild(notice);
 window.requestAnimationFrame(function(){notice.classList.add('show')});
 mobilePreviewNoticeTimer=setTimeout(function(){notice.classList.remove('show');setTimeout(function(){if(notice.parentNode)notice.parentNode.removeChild(notice)},220)},2200)
}
function closeMobilePreview(showNotice=true){
 var overlay=document.getElementById('nettoMobilePreviewOverlay'),hadPreview=!!overlay;
 if(overlay&&overlay.parentNode)overlay.parentNode.removeChild(overlay);
 setMobilePreviewButton(false);
 if(document.body)document.body.style.removeProperty('overflow');
 if(hadPreview&&showNotice)mobilePreviewNotice('Vision mobile désactivée')
}
function toggleMobilePreview(){
 var existing=document.getElementById('nettoMobilePreviewOverlay');
 if(existing){closeMobilePreview(true);try{sounds.play('menuClose')}catch(_){};return}
 closeDrops();
 var overlay=document.createElement('div');
 overlay.id='nettoMobilePreviewOverlay';overlay.className='nettoMobilePreviewOverlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Aperçu mobile');
 overlay.style.position='fixed';overlay.style.left='0';overlay.style.top='0';overlay.style.right='0';overlay.style.bottom='0';
 overlay.style.zIndex='2147483000';overlay.style.background='rgba(16,18,20,.84)';overlay.style.display='flex';
 overlay.style.alignItems='center';overlay.style.justifyContent='center';overlay.style.padding='24px';

 var device=document.createElement('div');
 device.className='nettoMobilePreviewDevice';
 device.style.width='min(410px, calc(100vw - 28px))';device.style.height='min(860px, calc(100vh - 48px))';
 device.style.background='#0d0f11';device.style.border='7px solid #292d31';device.style.borderRadius='38px';
 device.style.boxShadow='0 30px 100px rgba(0,0,0,.7)';device.style.padding='10px';device.style.display='flex';device.style.flexDirection='column';

 var bar=document.createElement('div');
 bar.style.height='32px';bar.style.display='flex';bar.style.alignItems='center';bar.style.justifyContent='center';bar.style.position='relative';bar.style.flex='none';bar.style.color='#e7eaed';

 var state=document.createElement('span');
 state.textContent='Aperçu mobile';state.style.position='absolute';state.style.left='3px';state.style.fontSize='8px';state.style.fontWeight='850';

 var notch=document.createElement('span');
 notch.style.width='92px';notch.style.height='19px';notch.style.borderRadius='999px';notch.style.background='#060708';

 var close=document.createElement('button');
 close.type='button';close.setAttribute('aria-label','Fermer');close.textContent='×';
 close.style.position='absolute';close.style.right='0';close.style.top='0';close.style.width='28px';close.style.height='28px';
 close.style.border='0';close.style.borderRadius='9px';close.style.background='#34393e';close.style.color='#fff';close.style.cursor='pointer';close.style.fontSize='18px';

 var frame=document.createElement('iframe');
 frame.className='nettoMobilePreviewFrame';frame.title='Vision mobile Nethor';frame.src=mobilePreviewUrl();
 frame.style.width='100%';frame.style.height='100%';frame.style.border='0';frame.style.borderRadius='25px';frame.style.background='#fff';frame.style.flex='1';

 close.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();closeMobilePreview(true)});
 overlay.addEventListener('click',function(e){if(e.target===overlay)closeMobilePreview(true)});

 bar.appendChild(state);bar.appendChild(notch);bar.appendChild(close);
 device.appendChild(bar);device.appendChild(frame);overlay.appendChild(device);
 document.body.appendChild(overlay);
 document.body.style.overflow='hidden';
 setMobilePreviewButton(true);
 mobilePreviewNotice('Vision mobile activée');
 try{sounds.play('menuOpen')}catch(_){}
}
function syncMobileDropState(open){
 const mobile=window.matchMedia?.('(max-width:900px),(pointer:coarse)')?.matches;
 const backdrop=document.getElementById('nettoDropBackdrop');
 backdrop?.classList.toggle('open',!!open&&!!mobile);
 document.documentElement.classList.toggle('nettoMobileDropOpen',!!open&&!!mobile)
}
function toggleDrop(which){
 const n=document.getElementById('nettoNotifDrop'),u=document.getElementById('nettoUserDrop'),l=document.getElementById('nettoLoginDrop'),nb=document.getElementById('nettoBellBtn'),ub=document.getElementById('nettoUserBtn'),lb=document.getElementById('nettoLoginBtn');
 const drops={notifications:n,user:u,logins:l},buttons={notifications:nb,user:ub,logins:lb},target=drops[which];if(!target)return;
 const open=target.classList.contains('hidden');sounds.play(open?'menuOpen':'menuClose');
 Object.entries(drops).forEach(([key,el])=>{if(el)el.classList.toggle('hidden',key===which?!open:true)});
 Object.entries(buttons).forEach(([key,el])=>{if(el)el.setAttribute('aria-expanded',String(key===which&&open))});
 syncMobileDropState(open);
 if(open&&which==='notifications')loadNotifications();
 if(open&&which==='logins')loadLoginHistory();
}
function closeDrops(){
 ['nettoNotifDrop','nettoUserDrop','nettoLoginDrop','nettoNotifMoreMenu'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));
 ['nettoBellBtn','nettoUserBtn','nettoLoginBtn'].forEach(id=>document.getElementById(id)?.setAttribute('aria-expanded','false'));
 syncMobileDropState(false)
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
  admin_message:'📣',
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
  admin_message:'Information',
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
function notificationDate(v){
 const d=new Date(v),diff=Math.max(0,Date.now()-d.getTime()),min=Math.floor(diff/60000);
 if(min<1)return'À l’instant';if(min<60)return min+' min';
 const h=Math.floor(min/60);if(h<24)return h+' h';
 const days=Math.floor(h/24);if(days<7)return days+' j';
 const weeks=Math.floor(days/7);if(weeks<5)return weeks+' sem.';
 return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})
}
function setNotificationTab(tab){
 api.notificationTab=tab==='unread'?'unread':'all';
 document.querySelectorAll('[data-notif-tab]').forEach(b=>b.classList.toggle('active',b.dataset.notifTab===api.notificationTab));
 renderNotifications()
}
function notificationDayGroup(v){
 const d=new Date(v),now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),day=new Date(d.getFullYear(),d.getMonth(),d.getDate()),diff=Math.round((today-day)/86400000);
 if(diff===0)return"Aujourd’hui";if(diff===1)return"Hier";if(diff<7)return"Cette semaine";return"Plus anciennes"
}
function renderNotifications(){
 const list=document.getElementById('nettoNotifList'),badge=document.getElementById('nettoNotifBadge');if(!list||!badge)return;
 if(!api.notificationTab||!['all','unread'].includes(api.notificationTab))api.notificationTab='all';
 const unread=api.notifications.filter(n=>!n.read_at).length;
 badge.textContent=unread>99?'99+':String(unread);badge.classList.toggle('hidden',unread===0);
 const allCount=document.getElementById('nettoNotifAllCount'),unreadCount=document.getElementById('nettoNotifUnreadCount');
 if(allCount)allCount.textContent=String(api.notifications.length);
 if(unreadCount)unreadCount.textContent=String(unread);
 document.querySelectorAll('[data-notif-tab]').forEach(b=>b.classList.toggle('active',b.dataset.notifTab===api.notificationTab));
 const rows=api.notificationTab==='unread'?api.notifications.filter(n=>!n.read_at):api.notifications;
 if(!rows.length){
  list.innerHTML='<div class="nettoNotifEmpty"><div class="nettoNotifEmptyBox"><span class="nettoNotifEmptyIcon">'+(api.notificationTab==='unread'?'✓':'🔔')+'</span><strong>'+(api.notificationTab==='unread'?'Aucune notification non lue':'Aucune notification')+'</strong><span>'+(api.notificationTab==='unread'?'Tu as tout consulté.':'Les nouvelles activités apparaîtront ici.')+'</span></div></div>';return
 }
 let previousGroup='',html='';
 rows.forEach(n=>{
  const group=notificationDayGroup(n.created_at);
  if(group!==previousGroup){html+='<div class="nettoNotifSectionLabel">'+esc(group)+'</div>';previousGroup=group}
  html+='<article class="nettoNotifItem '+esc(n.kind)+' '+(!n.read_at?'unread':'')+'" role="button" tabindex="0" data-id="'+n.id+'" data-url="'+esc(n.target_url||'')+'"><span class="nettoNotifIcon">'+notificationIcon(n.kind)+'</span><div class="nettoNotifBody"><strong>'+esc(n.title)+'</strong><span>'+esc(n.message)+'</span><div class="nettoNotifCategory">'+esc(notificationCategory(n.kind))+'</div><small>'+notificationDate(n.created_at)+'</small></div><span class="nettoNotifSide"><i class="nettoNotifUnreadDot" aria-hidden="true"></i><button class="nettoNotifDelete" title="Supprimer" aria-label="Supprimer la notification">×</button></span></article>'
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
async function loadNotifications(){if(!api.client||!api.session)return;const {data,error}=await api.client.from('planning_notifications').select('id,kind,title,message,planning_date,week_start,target_url,read_at,created_at').eq('user_id',api.session.user.id).order('created_at',{ascending:false}).limit(80);if(error){console.warn('Notifications:',error);return}api.notifications=data||[];renderNotifications();window.dispatchEvent(new CustomEvent('netto:notifications',{detail:{notifications:api.notifications,unread:api.notifications.filter(n=>!n.read_at).length}}))}
async function markRead(id){const n=api.notifications.find(x=>x.id===id);if(!n||n.read_at)return;const now=new Date().toISOString(),{error}=await api.client.from('planning_notifications').update({read_at:now}).eq('id',id).eq('user_id',api.session.user.id);if(!error){n.read_at=now;renderNotifications()}}
async function markAllRead(){if(!api.notifications.some(n=>!n.read_at))return;const {error}=await api.client.from('planning_notifications').update({read_at:new Date().toISOString()}).eq('user_id',api.session.user.id).is('read_at',null);if(!error)loadNotifications()}
async function deleteNotification(id){const {error}=await api.client.from('planning_notifications').delete().eq('id',id).eq('user_id',api.session.user.id);if(!error){sounds.play('delete');api.notifications=api.notifications.filter(n=>n.id!==id);renderNotifications();window.dispatchEvent(new CustomEvent('netto:notifications',{detail:{notifications:api.notifications,unread:api.notifications.filter(n=>!n.read_at).length}}))}}
async function deleteAllNotifications(){if(!api.notifications.length)return;if(!confirm('Supprimer toutes tes notifications ?'))return;const ids=api.notifications.map(n=>n.id);const {error}=await api.client.from('planning_notifications').delete().eq('user_id',api.session.user.id).in('id',ids);if(!error){sounds.play('delete');api.notifications=[];renderNotifications();window.dispatchEvent(new CustomEvent('netto:notifications',{detail:{notifications:[],unread:0}}))}}
function startNotificationsRealtime(){if(!api.session||api.notifChannel)return;api.notifChannel=api.client.channel('planning-notifications-'+api.session.user.id).on('postgres_changes',{event:'*',schema:'public',table:'planning_notifications',filter:'user_id=eq.'+api.session.user.id},()=>{sounds.play('notification');loadNotifications()}).subscribe()}
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
function updateKnownUI(){const p=api.profile;if(!p)return;const name=p.display_name||'Utilisateur',role=roleLabel(p.role);['userName','userMenuName'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=name});['userRole','userMenuRole'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=role});['userAvatar','userMenuAvatar'].forEach(id=>paint(document.getElementById(id),api.avatarUrl,name,p.profile_color,p.avatar_frame));buildGlobalHeader();renderMobileQuickBar()}
function pageFile(){return (location.pathname.split('/').pop()||'home.html').toLowerCase()}
function backFallback(){return 'home.html'}
function goBack(){
 sounds.play('navigate');
 const fallback=backFallback();
 let sameOriginRef=false;
 try{sameOriginRef=!!document.referrer&&new window.URL(document.referrer).origin===location.origin}catch(_){}
 setTimeout(()=>{if(sameOriginRef&&history.length>1)history.back();else location.href=fallback},45)
}
function addBackButton(){
 const p=pageFile();if(p==='home.html'||p==='')return;
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
function pageArea(){const p=(location.pathname.split('/').pop()||'home.html').toLowerCase();const map={'home.html':'Accueil','index.html':'Stock F&L','planning.html':'Planning','chat.html':'Équipe','profile.html':'Mon profil','articles.html':'Fiches articles','bakery.html':'Boulangerie','settings.html':'Personnalisation du site','admin-portal.html':'Éditeur du portail','rewards.html':'Défis & Boutique','accounts.html':'Gestion des comptes'};return map[p]||document.title||'Portail'}
async function logPageView(){if(!api.client||!api.session)return;try{await api.client.rpc('audit_page_view',{p_area:pageArea(),p_path:(location.pathname||'')+(location.search||''),p_title:document.title||pageArea()})}catch(e){console.warn('Journal consultation:',e)}}
function globalCacheKey(){return api.session?.user?.id?'nettoGlobalUI:'+api.session.user.id:null}
function hydrateGlobalCache(){
 try{
  const k=globalCacheKey();if(!k)return false;const x=JSON.parse(localStorage.getItem(k)||'null');if(!x||Date.now()-Number(x.saved_at||0)>120000)return false;
  if(!x.profile)return false;api.profile=x.profile;api.siteConfig=x.siteConfig||{};api.subrolePermissions=x.subrolePermissions||{};api.avatarUrl=x.avatarUrl||null;applyProfileTheme(api.profile,false);rebuildModules(api.siteConfig);applyPortalTheme(api.siteConfig);if(enforceMaintenanceAccess())return true;document.documentElement.style.setProperty('--profile-accent',api.profile.profile_color||'#ff5a2a');updateKnownUI();window.dispatchEvent(new CustomEvent('netto:profile',{detail:{profile:api.profile,avatarUrl:api.avatarUrl,siteConfig:api.siteConfig,cached:true}}));return true
 }catch(_){return false}
}
function saveGlobalCache(){try{const k=globalCacheKey();if(k&&api.profile)localStorage.setItem(k,JSON.stringify({saved_at:Date.now(),profile:api.profile,siteConfig:api.siteConfig,subrolePermissions:api.subrolePermissions,avatarUrl:api.avatarUrl}))}catch(_){}}
async function refresh(){if(!api.client||!api.session)return null;const [pr,sr,xr]=await Promise.all([api.client.from('profiles').select('display_name,role,avatar_path,profile_color,avatar_frame,ui_preferences').eq('id',api.session.user.id).maybeSingle(),api.client.from('app_settings').select('value').eq('key','site_config').maybeSingle(),api.client.rpc('my_subrole_permissions')]);const p=pr.data;if(!p)return null;api.profile=p;api.siteConfig=sr.data?.value&&typeof sr.data.value==='object'?sr.data.value:{};api.subrolePermissions={};if(!xr.error)for(const row of xr.data||[])if(row?.module&&['view','operate','manage'].includes(row.permission))api.subrolePermissions[row.module]=row.permission;applyProfileTheme(p,true);rebuildModules(api.siteConfig);applyPortalTheme(api.siteConfig);if(enforceMaintenanceAccess())return p;api.avatarUrl=null;if(p.avatar_path){const {data:a}=await api.client.storage.from('profile-avatars').createSignedUrl(p.avatar_path,3600);api.avatarUrl=a?.signedUrl||null}document.documentElement.style.setProperty('--profile-accent',p.profile_color||'#ff5a2a');updateKnownUI();saveGlobalCache();window.dispatchEvent(new CustomEvent('netto:profile',{detail:{profile:p,avatarUrl:api.avatarUrl,siteConfig:api.siteConfig}}));return p}

const APP_RELEASE=106;
const APP_ICON='assets/app-icon-v63.svg';
const APP_MOBILE_ICON='assets/app-icon-mobile-v71.svg';
let updateRegistration=null;
function ensureUpdateStyles(){
 if(document.getElementById('nettoUpdateStyle'))return;
 const s=document.createElement('style');s.id='nettoUpdateStyle';
 s.textContent='.nettoUpdateConfirmBackdrop{position:fixed;inset:0;z-index:2147482600;background:#0e1115a8;backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px}.nettoUpdateConfirmCard{width:min(92vw,410px);background:#fff;color:#202328;border:1px solid #e0e3e7;border-radius:20px;padding:18px;box-shadow:0 28px 80px #0005}.nettoUpdateConfirmCard h3{margin:0;font-size:18px}.nettoUpdateConfirmCard p{margin:7px 0 0;color:#777c84;font-size:11px;line-height:1.5}.nettoUpdateConfirmActions{display:grid;grid-template-columns:1fr 1.25fr;gap:8px;margin-top:17px}.nettoUpdateConfirmActions button{min-height:42px;border:0;border-radius:12px;font:850 11px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}.nettoUpdateConfirmCancel{background:#eef0f2;color:#35383d}.nettoUpdateConfirmGo{background:linear-gradient(135deg,#ff4028,#ff8427);color:#fff;box-shadow:0 8px 22px #ff5a2a2b}:root[data-theme="dark"] .nettoUpdateConfirmCard{background:#202328;color:#f5f6f7;border-color:#383c43}:root[data-theme="dark"] .nettoUpdateConfirmCard p{color:#aeb2b9}:root[data-theme="dark"] .nettoUpdateConfirmCancel{background:#2c3036;color:#e9ebed}.nettoUpdateToast{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translate(-50%,18px);width:min(94vw,520px);z-index:2147482500;background:rgba(25,27,30,.96);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:15px;box-shadow:0 24px 70px rgba(0,0,0,.36);backdrop-filter:blur(18px);opacity:0;transition:opacity .2s ease,transform .2s ease}.nettoUpdateToast.show{opacity:1;transform:translate(-50%,0)}.nettoUpdateTop{display:flex;gap:12px;align-items:flex-start}.nettoUpdateIcon{width:48px;height:48px;border-radius:14px;object-fit:cover;background:#303236;flex:none}.nettoUpdateCopy{min-width:0;flex:1}.nettoUpdateCopy strong{display:block;font-size:14px;line-height:1.25}.nettoUpdateCopy span{display:block;margin-top:4px;color:#d3d6db;font-size:11px;line-height:1.45}.nettoUpdateVersion{display:inline-flex!important;width:auto!important;margin-top:8px!important;padding:4px 8px;border-radius:999px;background:#ffffff12;color:#ff9a72!important;font-size:9px!important;font-weight:900;letter-spacing:.4px}.nettoUpdateActions{display:flex;gap:8px;margin-top:13px}.nettoUpdateActions button{border:0;border-radius:12px;min-height:39px;padding:0 13px;font:800 11px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}.nettoUpdateLater{background:#ffffff12;color:#f3f4f5}.nettoUpdateNow{margin-left:auto;background:linear-gradient(135deg,#ff4b2b,#ff8126);color:#fff;box-shadow:0 8px 22px rgba(255,91,37,.28)}.nettoUpdateNow:disabled{opacity:.65;cursor:wait}@media(max-width:520px){.nettoUpdateToast{width:calc(100vw - 20px);border-radius:18px}.nettoUpdateActions{display:grid;grid-template-columns:1fr 1.25fr}.nettoUpdateNow{margin-left:0}}';
 document.head.appendChild(s)
}
function syncGlobalDesignAsset(){
 document.querySelectorAll('link[rel="stylesheet"]').forEach(link=>{
  const href=link.getAttribute('href')||'';
  if(/design-v4\.css(?:\?v=\d+)?$/i.test(href)&&href!=='design-v4.css?v=8')link.setAttribute('href','design-v4.css?v=8')
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
function workerVersion(worker){
 return new Promise(resolve=>{
  if(!worker){resolve(null);return}
  const ch=new MessageChannel(),timer=setTimeout(()=>resolve(null),1200);
  ch.port1.onmessage=e=>{clearTimeout(timer);resolve(Number(e.data&&e.data.version)||null)};
  try{worker.postMessage({type:'GET_VERSION'},[ch.port2])}catch(_){clearTimeout(timer);resolve(null)}
 })
}
function publicUpdateCopy(){
 return {
  title:'Nouvelle version de Nethor',
  message:'Cette mise à jour apporte plusieurs améliorations, correctifs et optimisations générales.'
 }
}
async function releaseInfo(){
 try{const r=await fetch('app-version.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return await r.json()}catch(_){const copy=publicUpdateCopy();return{version:APP_RELEASE,label:displayVersion(APP_RELEASE),important:true,title:copy.title,message:copy.message,icon:APP_ICON}}
}
async function notifyUpdateSystem(reg,info){
 if(!reg||typeof Notification==='undefined'||Notification.permission!=='granted')return;
 const key='nettoUpdateSystemNotified:'+String(info.version||APP_RELEASE);
 try{if(localStorage.getItem(key)==='1')return;const copy=publicUpdateCopy();await reg.showNotification(copy.title,{body:copy.message,icon:info.icon||APP_ICON,badge:info.icon||APP_ICON,tag:'nethor-update-'+String(info.version||APP_RELEASE),renotify:false,data:{url:'home.html',kind:'app_update'}});localStorage.setItem(key,'1')}catch(_){}
}
function hideUpdateToast(){
 const el=document.getElementById('nettoUpdateToast');if(!el)return;el.classList.remove('show');setTimeout(()=>el.remove(),220)
}
async function activateWaitingUpdate(info){
 const reg=updateRegistration||await navigator.serviceWorker.getRegistration();const worker=reg&&reg.waiting;if(!worker)return location.reload();
 const btn=document.getElementById('nettoUpdateNow');if(btn){btn.disabled=true;btn.textContent='Mise à jour…'}
 try{localStorage.setItem('nettoAppVersion',String(info.version||APP_RELEASE));localStorage.setItem('nettoAppUpdatedAt',new Date().toISOString())}catch(_){}
 let changed=false;
 const reload=()=>{if(changed)return;changed=true;syncAppIconLinks();location.reload()};
 navigator.serviceWorker.addEventListener('controllerchange',reload,{once:true});
 worker.postMessage({type:'SKIP_WAITING'});
 setTimeout(reload,4500)
}
async function showUpdateAvailable(reg){
 updateRegistration=reg||updateRegistration;
 const info=await releaseInfo(),version=Number(info.version)||APP_RELEASE;
 if(info.important===false){activateWaitingUpdate(info);return}
 if(sessionStorage.getItem('nettoUpdateLater')===String(version))return;
 if(document.getElementById('nettoUpdateToast'))return;
 ensureUpdateStyles();
 const el=document.createElement('aside');el.id='nettoUpdateToast';el.className='nettoUpdateToast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 const copy=publicUpdateCopy();el.innerHTML='<div class="nettoUpdateTop"><img class="nettoUpdateIcon" src="'+esc(info.icon||APP_ICON)+'" alt=""><div class="nettoUpdateCopy"><strong>'+esc(copy.title)+'</strong><span>'+esc(copy.message)+'</span><span class="nettoUpdateVersion">'+esc(displayVersion(version))+' • dernière version</span></div></div><div class="nettoUpdateActions"><button type="button" class="nettoUpdateLater" id="nettoUpdateLater">Plus tard</button><button type="button" class="nettoUpdateNow" id="nettoUpdateNow">Mettre à jour</button></div>';
 document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));sounds.play('notification');
 document.getElementById('nettoUpdateLater').onclick=()=>{sessionStorage.setItem('nettoUpdateLater',String(version));hideUpdateToast()};
 document.getElementById('nettoUpdateNow').onclick=()=>activateWaitingUpdate(info);
 notifyUpdateSystem(reg,info)
}
async function setupAppUpdates(){
 if(!('serviceWorker' in navigator))return;
 try{
  ensureUpdateStyles();
  const reg=await navigator.serviceWorker.register('./sw.js');updateRegistration=reg;
  const activeVersion=await workerVersion(navigator.serviceWorker.controller);
  if(activeVersion===APP_RELEASE){try{localStorage.setItem('nettoAppVersion',String(APP_RELEASE))}catch(_){};syncAppIconLinks()}
  if(reg.waiting&&navigator.serviceWorker.controller)showUpdateAvailable(reg);
  reg.addEventListener('updatefound',()=>{
   const worker=reg.installing;if(!worker)return;
   worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller&&reg.waiting)showUpdateAvailable(reg)})
  });
  reg.update().catch(()=>{});
  window.addEventListener('focus',()=>reg.update().catch(()=>{}));
 }catch(e){console.warn('Mise à jour application:',e)}
}


function maintenanceActive(config=api?.siteConfig){return config?.maintenance?.enabled===true}
function enforceMaintenanceAccess(){
 const file=(location.pathname.split('/').pop()||'home.html').toLowerCase();
 const isMaintenance=file==='maintenance.html';
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
 const observer=new MutationObserver(mutations=>{
  mutations.forEach(m=>m.addedNodes.forEach(node=>{
   if(node.nodeType!==1)return;
   ensureAccessibleNames(node);
  }));
 });
 observer.observe(document.body,{childList:true,subtree:true});
 window.__nettoA11yObserver=observer;
}
async function init(){addStyle();syncGlobalDesignAsset();syncAppIconLinks();bindMobilePreviewGlobal();ensureAccessibleNames();startAccessibleNameObserver();setupAppUpdates();if(!window.supabase?.createClient)return;api.client=window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data:{session}}=await api.client.auth.getSession();if(!session)return;api.session=session;const rememberedTheme=cachedProfileTheme(session.user.id);if(rememberedTheme)localTheme(rememberedTheme);const cached=hydrateGlobalCache(),fresh=refresh();if(!cached)await fresh;else fresh.catch(()=>{});rememberSiteBase();addBackButton();logPageView();bindHomeMark();loadNotifications();startNotificationsRealtime();startPresence();startChatPresenceHistory();startProfileRealtime();let lastFocusReload=0;const reload=()=>{const now=Date.now();if(now-lastFocusReload<15000)return;lastFocusReload=now;loadNotifications()};window.addEventListener('focus',reload);document.addEventListener('visibilitychange',()=>{if(!document.hidden)reload()})}
const rewardScript=document.createElement('script');rewardScript.src='reward-profile.js?v=2';rewardScript.defer=true;document.head.appendChild(rewardScript);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();