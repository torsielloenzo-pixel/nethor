(function(){
'use strict';

const BASE_MODULES=Object.freeze([
 {id:'home',label:'Accueil',subtitle:'Retour au portail',url:'home.html',roles:null,userMenu:true,defaultUser:true,platform:'all'},
 {id:'profile',label:'Mon profil',subtitle:'Profil et notifications',url:'profile.html',roles:null,userMenu:true,defaultUser:true,platform:'all'},
 {id:'stock',label:'Stock F&L',subtitle:'Gestion du stock',url:'index.html',roles:null,userMenu:true,defaultUser:true,platform:'all'},
 {id:'planning',label:'Planning',subtitle:'Horaires de l’équipe',url:'planning.html',roles:null,userMenu:true,defaultUser:true,platform:'all'},
 {id:'chat',label:'Chat',subtitle:'Messagerie interne',url:'chat.html',roles:null,userMenu:true,defaultUser:true,platform:'all'},
 {id:'surveys',label:'Sondages de l’équipe',subtitle:'8 semaines pour améliorer notre quotidien',url:'mobile.html?view=surveys',roles:null,userMenu:true,defaultUser:true,platform:'mobile'},
 {id:'scanner',label:'Scanner (bêta)',subtitle:'EAN13 vers fiche article',url:'scanner.html',roles:null,userMenu:true,defaultUser:true,platform:'mobile'},
 {id:'articles',label:'Fiches articles',subtitle:'Référentiel articles',url:'articles.html',roles:null,userMenu:true,defaultUser:true,platform:'all'},
 {id:'notification_settings',label:'Réglages des notifications',subtitle:'Préférences et alertes',url:'notification-settings.html',roles:null,userMenu:true,defaultUser:true,platform:'all'},
 {id:'problem_report',label:'Signaler un problème',subtitle:'Décrire et envoyer un bug',url:'report-problem.html',roles:null,userMenu:true,defaultUser:true,platform:'mobile'},
 {id:'fl_assistant',label:'Assistant Précommande',subtitle:'Analyse Fruits & Légumes',url:'fl-assistant.html',roles:['admin','responsable'],userMenu:false,defaultUser:false,platform:'all'},
 {id:'rewards',label:'Défis & Boutique',subtitle:'Missions et récompenses',url:'rewards.html',roles:['admin'],userMenu:true,defaultUser:true,platform:'all'},
 {id:'bakery',label:'Boulangerie',subtitle:'Stock • Consulter • Gestion',url:'bakery.html',roles:['admin'],userMenu:true,defaultUser:true,platform:'all'},
 {id:'accounts',label:'Gestion des comptes',subtitle:'Utilisateurs, accès et journal',url:'accounts.html',roles:['admin'],userMenu:false,defaultUser:false,platform:'all'},
 {id:'portal_admin',label:'Gestion',subtitle:'Portail, comptes et permissions',url:'admin-portal.html',roles:['admin'],userMenu:true,defaultUser:true,platform:'all'},
 {id:'settings',label:'Personnalisation',subtitle:'Accueil, raccourcis et apparence',url:'settings.html',roles:null,userMenu:false,defaultUser:true,platform:'all'}
]);
const LEVELS=Object.freeze({none:0,view:1,operate:2,manage:3});
const ICONS=Object.freeze({
 home:'<svg viewBox="0 0 24 24" fill="none"><path d="M4 10.5 12 4l8 6.5"/><path d="M6.5 9.5V20h11V9.5"/></svg>',
 stock:'<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 8.5h15l-1.4 10H5.9l-1.4-10Z"/><path d="M7 8.5 9 5.5h6l2 3"/><path d="M8 12h8"/></svg>',
 planning:'<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M8 4v3M16 4v3M4 9.5h16"/><path d="M8 13h3M13 13h3M8 16h3"/></svg>',
 chat:'<svg viewBox="0 0 24 24" fill="none"><path d="M7.5 16.5H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3l-2.5 2v-2Z"/><path d="M15.5 15.5H19a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-1.5"/></svg>',
 surveys:'<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="4" width="14" height="16" rx="3"/><path d="M9 9h6M9 13h6M9 17h3"/><path d="m15 16 1 1 2-2"/></svg>',
 scanner:'<svg viewBox="0 0 24 24" fill="none"><path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3"/><path d="M8 9v6M11 8v8M14 9v6M17 8v8"/></svg>',
 articles:'<svg viewBox="0 0 24 24" fill="none"><path d="M7 5.5h8l2 2V18a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z"/><path d="M15 5.5v2h2"/><path d="M8 11h8M8 14h8M8 17h5"/></svg>',
 notification_settings:'<svg viewBox="0 0 24 24" fill="none"><path d="M7 9a5 5 0 0 1 10 0v3.2l1.7 2.8H5.3L7 12.2V9Z"/><path d="M9.5 18h5M12 3v1"/></svg>',
 problem_report:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 4 21 20H3L12 4Z"/><path d="M12 9v5"/><path d="M12 17.2v.2"/></svg>',
 rewards:'<svg viewBox="0 0 24 24" fill="none"><path d="M12 5.5 14 9.5l4.5.6-3.3 3 1 4.4L12 15.5l-4.2 2 1-4.4-3.3-3L10 9.5l2-4Z"/></svg>',
 bakery:'<svg viewBox="0 0 24 24" fill="none"><path d="M6 11.5c0-2.9 2.6-5 6-5s6 2.1 6 5c0 .7-.1 1.3-.4 2H6.4c-.3-.7-.4-1.3-.4-2Z"/><path d="M5.5 13.5h13V16a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-2.5Z"/></svg>',
 accounts:'<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="9" r="2.5"/><circle cx="16.5" cy="10" r="2"/><path d="M4.5 18c1.1-2.3 3-3.5 4.5-3.5s3.4 1.2 4.5 3.5"/><path d="M14 18c.7-1.5 2-2.4 3.2-2.4 1.1 0 2.4.9 3.1 2.4"/></svg>',
 portal_admin:'<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="4.5" width="15" height="15" rx="3"/><path d="M8 8h8M8 12h5M8 16h8"/></svg>',
 fl_assistant:'<svg viewBox="0 0 24 24" fill="none"><path d="M5 5h14v14H5z"/><path d="M8 9h8M8 12h5M8 15h7"/></svg>',
 settings:'<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2.75"/><path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3H9.6l-.3 3a7 7 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .7.1 1.1l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.3 3h4.8l.3-3a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.4.1-.7.1-1.1Z"/></svg>',
 default:'<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="5" height="5" rx="1.2"/><rect x="14" y="5" width="5" height="5" rx="1.2"/><rect x="5" y="14" width="5" height="5" rx="1.2"/><rect x="14" y="14" width="5" height="5" rx="1.2"/></svg>'
});
const state={host:null,mounted:false,unsubscribe:null};

function services(){return window.NethorMobileServices||window.MobileServices||null}
function router(){return window.NethorMobileRouter||window.MobileRouter||null}
function iconFor(id){
 const cfg=services()?.siteConfig||{},page=cfg?.pages?.[id]||{},override=page?.platform_overrides?.mobile||{},url=String(override.image_url||'').trim();
 if(url)return '<img src="'+String(url).replace(/"/g,'&quot;')+'" alt="" style="display:block;width:100%;height:100%;object-fit:contain">';
 return ICONS[id]||ICONS.default
}
function roleLabel(role){return({admin:'Administrateur','role_point-de-vente':'Point de vente',responsable:'Responsable',employe:'Employé',lecture:'Lecture seule'})[role]||String(role||'Compte')}
function roleKeys(cfg){
 const custom=cfg?.role_definitions&&typeof cfg.role_definitions==='object'?Object.keys(cfg.role_definitions):[];
 return [...new Set(['admin','role_point-de-vente','responsable','employe','lecture',...custom])]
}
function moduleFromConfig(base,cfg){
 const page=cfg?.pages?.[base.id]&&typeof cfg.pages[base.id]==='object'?cfg.pages[base.id]:{};
 const mobile=page?.platform_overrides?.mobile&&typeof page.platform_overrides.mobile==='object'?page.platform_overrides.mobile:{};
 return{
  ...base,
  label:String(mobile.nav_label||mobile.label||page.nav_label||page.label||base.label),
  subtitle:String(mobile.subtitle||page.subtitle||base.subtitle||''),
  url:String(mobile.url||page.url||base.url),
  userMenu:typeof page.user_menu==='boolean'?page.user_menu:base.userMenu,
  defaultUser:typeof page.default_user==='boolean'?page.default_user:base.defaultUser,
  configuredRoles:Array.isArray(page.roles)?page.roles:null
 }
}
function permissionLevel(module,profile,cfg){
 const role=profile?.role||'';if(!module||!role)return'none';
 if(cfg?.pages?.[module.id]?.enabled===false)return'none';
 if(module.id==='settings')return role==='admin'?'manage':'view';
 if(role==='admin')return'manage';
 const allowedRoles=Array.isArray(module.roles)?module.roles.filter(r=>roleKeys(cfg).includes(r)):roleKeys(cfg);
 const configured=Array.isArray(module.configuredRoles)?module.configuredRoles.filter(r=>allowedRoles.includes(r)):allowedRoles;
 const explicit=cfg?.role_permissions?.[module.id]?.[role];
 let base=Object.prototype.hasOwnProperty.call(LEVELS,explicit)?explicit:(configured.includes(role)?'view':'none');
 const extra=services()?.subrolePermissions?.[module.id];
 if(extra==='manage')return'manage';
 if(extra==='operate'&&base!=='manage')return'operate';
 if(extra==='view'&&base==='none')return'view';
 return base
}
function menuSetting(profile,cfg,id,fallback=true){
 if(profile?.role==='admin')return fallback;
 const items=cfg?.mobile_user_menu?.items;
 const value=items&&typeof items==='object'?items[id]:undefined;
 return typeof value==='boolean'?value:fallback
}
function modulesForMenu(profile,cfg){
 const modules=BASE_MODULES.map(base=>moduleFromConfig(base,cfg));
 const items=cfg?.mobile_user_menu?.items&&typeof cfg.mobile_user_menu.items==='object'?cfg.mobile_user_menu.items:{};
 return modules.filter(module=>{
  if(['profile','settings'].includes(module.id)||module.platform==='desktop'||module.platform==='system')return false;
  if(permissionLevel(module,profile,cfg)==='none')return false;
  if(profile.role==='admin'){
    if(!module.userMenu)return false;
  }else{
    const explicit=items[module.id],globalAllowed=typeof explicit==='boolean'?explicit:module.userMenu===true;
    if(!globalAllowed)return false
  }
  const personal=profile?.ui_preferences?.user_menu?.[module.id];
  if(typeof personal==='boolean')return personal;
  return module.defaultUser!==false
 })
}
function routeIdForFile(file){
 const table=window.NethorNavigation?.mobileViewTable?.()||{};
 const target=String(file||'').toLowerCase();
 return Object.keys(table).find(id=>String(table[id]||'').split('?')[0].toLowerCase()===target)||''
}
function paramsObject(params){
 const out={};params.forEach((value,key)=>{if(!['view','mobile_preview','nethor_platform'].includes(key))out[key]=value});return out
}
function navigate(raw){
 try{
  const u=new URL(raw||'home.html',location.href);
  if(u.origin!==location.origin){location.href=u.href;return}
  const file=(u.pathname.split('/').pop()||'home.html').toLowerCase();
  const shellView=file==='mobile.html'?String(u.searchParams.get('view')||''):'';
  if(shellView&&router()?.registered?.(shellView)){router().open(shellView,{source:'user-menu'});return}
  const view=routeIdForFile(file);
  if(view&&router()?.open){router().open(view,{params:paramsObject(u.searchParams),source:'user-menu'});return}
  location.href=(u.pathname.split('/').pop()||'home.html')+u.search+u.hash
 }catch(_){location.href=raw}
}
function paintAvatar(el,profile,url){
 if(!el)return;
 const name=profile?.display_name||'Utilisateur';
 el.textContent=String(name).trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'U';
 el.style.backgroundColor='var(--nethor-profile-avatar-bg,#ff5a2a)';
 el.style.color='var(--nethor-profile-avatar-fg,#fff)';
 el.style.backgroundImage='';
 el.classList.toggle('hasPhoto',!!url);
 if(url){el.style.backgroundImage='url("'+String(url).replace(/"/g,'%22')+'")';el.textContent=''}
 const frame=String(profile?.avatar_frame||'').trim();
 if(frame)el.dataset.avatarFrame=frame;else delete el.dataset.avatarFrame
}
function problemUrl(module){
 const u=new URL(module?.url||'report-problem.html',location.href);
 u.searchParams.set('from','user-menu.html');
 return (u.pathname.split('/').pop()||'report-problem.html')+u.search
}
function favoriteThemeLabel(){
 const favorite=services()?.mobileFavoriteTheme?.(services()?.profile?.ui_preferences)||'';
 return({mineral:'Bleu minéral',sage:'Sauge',plum:'Prune nocturne'})[favorite]||'Mode clair'
}
function syncThemeText(){
 const shared=services(),mode=shared?.mobileMode?.(shared?.profile?.ui_preferences)||'favorite';
 const label=state.host?.querySelector('.nettoThemeLabel'),copy=label?.closest?.('.nettoMobileMenuCopy'),subtitle=copy?.querySelector('small'),icon=state.host?.querySelector('#nettoMobileThemeBtn .nettoThemeIconSvg');
 if(label)label.textContent=mode==='halloween'?'Mode favori':'Mode Halloween';
 if(subtitle)subtitle.textContent=mode==='halloween'?'Revenir à '+favoriteThemeLabel():'Activer le thème Halloween';
 if(icon){icon.textContent=mode==='halloween'?'★':'🎃';icon.style.fontSize='18px'}
}
async function toggleTheme(button){
 if(button)button.disabled=true;
 try{
  const shared=services(),current=shared?.mobileMode?.(shared?.profile?.ui_preferences)||'favorite',next=current==='halloween'?'favorite':'halloween';
  await shared?.setMobileMode?.(next);
  syncThemeText()
 }finally{if(button)button.disabled=false}
}
async function checkUpdate(button){
 if(button)button.disabled=true;
 try{await services()?.checkForUpdates?.({interactive:true})}
 finally{if(button)button.disabled=false}
}
async function logout(button){
 if(button)button.disabled=true;
 try{await services()?.signOut?.()}finally{if(button)button.disabled=false}
}
function render(){
 const shared=services(),profile=shared?.profile,cfg=shared?.siteConfig||{};
 if(!state.mounted||!state.host||!profile)return false;
 const modules=modulesForMenu(profile,cfg),primaryIds=new Set(['home','stock','planning','chat','surveys','scanner','articles']),adminIds=new Set(['accounts','portal_admin']),specialIds=new Set(['notification_settings','problem_report']);
 const primary=modules.filter(m=>primaryIds.has(m.id)),admin=modules.filter(m=>adminIds.has(m.id)),extra=modules.filter(m=>!primaryIds.has(m.id)&&!adminIds.has(m.id)&&!specialIds.has(m.id));
 const notificationSettings=modules.find(m=>m.id==='notification_settings')||null,problemReport=modules.find(m=>m.id==='problem_report')||null;
 const settingsModule=moduleFromConfig(BASE_MODULES.find(m=>m.id==='settings'),cfg);
 const builder=window.NethorMobileShell?.buildUserMenu;
 if(typeof builder!=='function'){
  state.host.innerHTML='<div class="nethorMenuError">Menu indisponible.</div>';
  return false
 }
 state.host.innerHTML='<div class="nethorUserMenuView">'+builder({
  name:profile.display_name||'Utilisateur',
  role:roleLabel(profile.role),
  settingsModule,
  primary,
  admin,
  extra,
  notificationSettings,
  problemReport,
  problemUrl:problemReport?problemUrl(problemReport):'',
  profileVisible:false,
  settingsVisible:menuSetting(profile,cfg,'settings',true),
  themeVisible:menuSetting(profile,cfg,'theme',true)&&shared?.halloweenThemeAllowed?.()===true,
  updateVisible:menuSetting(profile,cfg,'update',true),
  controls:cfg?.platform_ui?.mobile?.controls||{},
  iconFor
 })+'</div>';
 paintAvatar(state.host.querySelector('#nettoMobileMenuAvatar'),profile,shared.avatarUrl);
 syncThemeText();
 return true
}
function onClick(event){
 const link=event.target?.closest?.('.nettoMobileMenuLink[data-url]');
 if(link){
  event.preventDefault();event.stopPropagation();
  const target=link.dataset.url;if(target)navigate(target);
  return
 }
 const theme=event.target?.closest?.('#nettoMobileThemeBtn');
 if(theme){event.preventDefault();void toggleTheme(theme);return}
 const update=event.target?.closest?.('#nettoMobileUpdateBtn');
 if(update){event.preventDefault();void checkUpdate(update);return}
 const logoutButton=event.target?.closest?.('#nettoMobileLogoutBtn');
 if(logoutButton){event.preventDefault();void logout(logoutButton)}
}
function onService(detail){
 if(!state.mounted)return;
 if(['ready','core','permissions'].includes(detail?.type))render()
}
async function mount(host){
 state.host=host;state.mounted=true;
 host.innerHTML='<div class="nethorUserMenuLoading"><span></span><strong>Chargement du menu…</strong></div>';
 host.addEventListener('click',onClick);
 const shared=services();await shared?.ready?.();
 if(!state.mounted)return false;
 state.unsubscribe=shared?.subscribe?.(onService,{immediate:false})||null;
 render();
 return true
}
async function unmount(){
 state.mounted=false;
 if(typeof state.unsubscribe==='function')state.unsubscribe();
 state.unsubscribe=null;
 if(state.host){state.host.removeEventListener('click',onClick);state.host.innerHTML=''}
 state.host=null;
 return true
}

const api=Object.freeze({mount,unmount,render,navigate});
window.NethorMobileUserMenuView=api;
router()?.register?.('user-menu',api);
})();