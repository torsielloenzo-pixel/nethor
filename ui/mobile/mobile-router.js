(function(){
'use strict';

const ROUTES=Object.freeze({
  home:{legacy:'home.html',label:'Accueil'},
  planning:{legacy:'planning.html',label:'Planning'},
  chat:{legacy:'chat.html',label:'Chat'},
  notifications:{legacy:'notifications.html',label:'Notifications'},
  'user-menu':{legacy:'user-menu.html',label:'Menu utilisateur'},
  profile:{legacy:'profile.html',label:'Mon profil'},
  settings:{legacy:'settings.html',label:'Personnalisation'},
  'notification-settings':{legacy:'notification-settings.html',label:'Réglages des notifications'},
  'report-problem':{legacy:'report-problem.html',label:'Signaler un problème'},
  scanner:{legacy:'scanner.html',label:'Scanner'},
  articles:{legacy:'articles.html',label:'Fiches articles'},
  accounts:{legacy:'accounts.html',label:'Comptes'},
  'admin-portal':{legacy:'admin-portal.html',label:'Gestion'},
  'fl-assistant':{legacy:'fl-assistant.html',label:'Assistant Précommande'},
  bakery:{legacy:'bakery.html',label:'Boulangerie'},
  rewards:{legacy:'rewards.html',label:'Défis & Boutique'}
});

const views=new Map();
let host=null;
let activeView='';
let activeDefinition=null;
let activeMountToken=0;
let navBound=false;
let booted=false;

function platform(){
  try{return String(window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'desktop').toLowerCase()}
  catch(_){return'desktop'}
}
function isMobile(){
  const value=platform();
  return value==='mobile'||value==='mobile-preview'
}
function normalizeView(value){
  const id=String(value||'').trim().toLowerCase().replace(/\.html$/,'');
  if(id==='user_menu'||id==='menu'||id==='profile-menu')return'user-menu';
  return id||'home'
}
function route(view){return ROUTES[normalizeView(view)]||null}
function registered(view){return views.has(normalizeView(view))}
function query(){
  try{return new URLSearchParams(location.search)}catch(_){return new URLSearchParams()}
}
function hasExplicitView(){return query().has('view')}
function current(){return normalizeView(query().get('view')||history.state?.view||'home')}
function shellUrl(view=current(),extra){
  const u=new URL('mobile.html',location.href);
  const existing=query();
  if(platform()==='mobile-preview'||existing.get('mobile_preview')==='1')u.searchParams.set('mobile_preview','1');
  const forced=existing.get('nethor_platform');
  if(forced==='mobile')u.searchParams.set('nethor_platform','mobile');
  u.searchParams.set('view',normalizeView(view));
  if(extra&&typeof extra==='object'){
    Object.entries(extra).forEach(([key,value])=>{
      if(value===undefined||value===null||value==='')u.searchParams.delete(key);
      else u.searchParams.set(key,String(value))
    })
  }
  return u.pathname.split('/').pop()+u.search+u.hash
}
function legacyUrl(view=current()){
  const item=route(view);
  if(!item)return'home.html';
  const base=new URL(item.legacy,location.href);
  const source=query();
  source.forEach((value,key)=>{
    if(key==='view'||key==='mobile_preview'||key==='nethor_platform')return;
    if(!base.searchParams.has(key))base.searchParams.set(key,value)
  });
  if(platform()==='mobile-preview'||source.get('mobile_preview')==='1')base.searchParams.set('mobile_preview','1');
  const forced=source.get('nethor_platform');
  if(forced==='mobile')base.searchParams.set('nethor_platform','mobile');
  return base.pathname.split('/').pop()+base.search+base.hash
}
function stateFor(view,extra){
  return Object.assign({},history.state||{},extra||{},{
    nethorMobileRouter:true,
    view:normalizeView(view),
    at:Date.now()
  })
}
function emit(name,detail){
  try{window.dispatchEvent(new CustomEvent(name,{detail}))}catch(_){}
}
function setHost(value){
  host=value||document.querySelector('[data-mobile-view-host]');
  return host
}
async function unmountActive(nextView){
  const previous=activeView;
  const definition=activeDefinition;
  activeView='';
  activeDefinition=null;
  if(!definition)return;
  try{
    if(typeof definition.unmount==='function')await definition.unmount(host,{from:previous,to:nextView,router:api})
  }catch(error){
    console.error('[Nethor MobileRouter] unmount',error)
  }
}
function fallback(view,options={}){
  const id=normalizeView(view);
  const target=legacyUrl(id);
  emit('nethor:mobile-route-fallback',{view:id,target,reason:options.reason||'view-not-migrated'});
  if(options.navigate===false)return target;
  try{
    if(window.NethorNavigation?.navigate)return window.NethorNavigation.navigate(target)
  }catch(_){}
  location.href=target;
  return target
}
async function mount(view,options={}){
  const id=normalizeView(view);
  const definition=views.get(id);
  if(!definition)return fallback(id,options);
  if(!host)setHost();
  if(!host)return fallback(id,{reason:'missing-view-host'});
  const token=++activeMountToken;
  if(activeView!==id)await unmountActive(id);
  if(token!==activeMountToken)return false;
  activeView=id;
  activeDefinition=definition;
  host.dataset.mobileView=id;
  host.setAttribute('aria-busy','true');
  emit('nethor:mobile-route-before',{view:id,source:options.source||'router'});
  try{
    const result=await definition.mount(host,{
      view:id,
      route:route(id),
      params:query(),
      router:api,
      source:options.source||'router'
    });
    if(token!==activeMountToken)return false;
    host.removeAttribute('aria-busy');
    emit('nethor:mobile-route-change',{view:id,route:route(id),source:options.source||'router',result});
    return true
  }catch(error){
    host.removeAttribute('aria-busy');
    console.error('[Nethor MobileRouter] mount',id,error);
    emit('nethor:mobile-route-error',{view:id,error});
    return fallback(id,{reason:'mount-error'})
  }
}
async function open(view,options={}){
  const id=normalizeView(view);
  if(!route(id)&&!registered(id))return fallback('home',{reason:'unknown-route'});
  if(!registered(id))return fallback(id,{reason:'view-not-migrated'});
  const target=shellUrl(id,options.params);
  if(options.history!=='none'){
    const method=options.replace?'replaceState':'pushState';
    history[method](stateFor(id,options.state),'',target)
  }
  return mount(id,{source:options.source||'open'})
}
async function replace(view,options={}){
  return open(view,Object.assign({},options,{replace:true}))
}
function register(view,definition){
  const id=normalizeView(view);
  if(!definition||typeof definition.mount!=='function')throw new TypeError('MobileRouter.register exige une fonction mount()');
  views.set(id,Object.freeze({
    mount:definition.mount,
    unmount:typeof definition.unmount==='function'?definition.unmount:null
  }));
  emit('nethor:mobile-view-registered',{view:id});
  return()=>unregister(id)
}
function unregister(view){
  const id=normalizeView(view);
  if(activeView===id)unmountActive('');
  return views.delete(id)
}
function intercept(event){
  const link=event.target?.closest?.('[data-mobile-destination]');
  if(!link)return;
  const id=normalizeView(link.getAttribute('data-mobile-destination'));
  if(!id)return;
  if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  open(id,{source:'navigation'})
}
function bindNavigation(element){
  if(navBound)return;
  const nav=element||document.querySelector('[data-mobile-nav-host]');
  if(!nav)return;
  nav.addEventListener('click',intercept);
  navBound=true
}
async function handlePopState(){
  const id=current();
  if(!registered(id)){
    fallback(id,{reason:'popstate-unmigrated'});
    return
  }
  await mount(id,{source:'popstate'})
}
async function start(options={}){
  if(booted)return true;
  if(!isMobile())return false;
  booted=true;
  setHost(options.host);
  bindNavigation(options.nav);
  window.addEventListener('popstate',handlePopState);
  const id=current();
  const initialState=stateFor(id,{initial:true});
  history.replaceState(initialState,'',hasExplicitView()?location.href:shellUrl(id));
  if(registered(id))await mount(id,{source:'boot'});
  else if(hasExplicitView())fallback(id,{reason:'deep-link-unmigrated'});
  else emit('nethor:mobile-route-idle',{view:id,reason:'no-migrated-default-view'});
  emit('nethor:mobile-router-ready',{view:id,registered:Array.from(views.keys()),platform:platform()});
  return true
}
function back(){history.back()}
function forward(){history.forward()}
function routeTable(){return ROUTES}
function registeredViews(){return Array.from(views.keys())}

const api=Object.freeze({
  start,
  register,
  unregister,
  open,
  replace,
  back,
  forward,
  current,
  route,
  routeTable,
  registered,
  registeredViews,
  shellUrl,
  legacyUrl,
  fallback,
  platform,
  isMobile
});

window.MobileRouter=api;
window.NethorMobileRouter=api;
})();