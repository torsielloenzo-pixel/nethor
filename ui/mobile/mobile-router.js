(function(){
'use strict';

const VIEW_META=Object.freeze({
  home:{label:'Accueil'},
  planning:{label:'Planning'},
  chat:{label:'Chat'},
  notifications:{label:'Notifications'},
  'user-menu':{label:'Menu utilisateur'},
  surveys:{label:'Sondages de l’équipe'},
  profile:{label:'Mon profil'},
  settings:{label:'Personnalisation'},
  'notification-settings':{label:'Réglages des notifications'},
  'report-problem':{label:'Signaler un problème'},
  scanner:{label:'Scanner'},
  articles:{label:'Fiches articles'},
  accounts:{label:'Comptes'},
  'admin-portal':{label:'Gestion'},
  'fl-assistant':{label:'Assistant Précommande'},
  bakery:{label:'Boulangerie'},
  rewards:{label:'Défis & Boutique'}
});

const views=new Map();
let host=null;
let activeView='';
let activeDefinition=null;
let activeMountToken=0;
const navBoundTargets=new WeakSet();
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
function navigationTarget(view){
  const id=normalizeView(view);
  try{
    const target=window.NethorNavigation?.mobileViewTarget?.(id);
    if(target)return target
  }catch(_){}
  return''
}
function route(view){
  const id=normalizeView(view);
  const legacy=navigationTarget(id);
  const meta=VIEW_META[id]||{};
  return legacy||views.has(id)?{id,legacy,label:meta.label||id}:null
}
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
function legacyUrl(view=current(),extra){
  const item=route(view);
  if(!item?.legacy)return'home.html';
  const base=new URL(item.legacy,location.href);
  const source=query();
  source.forEach((value,key)=>{
    if(key==='view'||key==='mobile_preview'||key==='nethor_platform')return;
    if(!base.searchParams.has(key))base.searchParams.set(key,value)
  });
  if(extra&&typeof extra==='object'){
    Object.entries(extra).forEach(([key,value])=>{
      if(value===undefined||value===null||value==='')base.searchParams.delete(key);
      else base.searchParams.set(key,String(value))
    })
  }
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
  let target=legacyUrl(id,options.params);
  if(registered(id)){
    try{
      const legacy=new URL(target,location.href);
      legacy.searchParams.set('nethor_legacy','1');
      target=legacy.pathname.split('/').pop()+legacy.search+legacy.hash
    }catch(_){}
  }
  const parentView=current();
  emit('nethor:mobile-route-fallback',{view:id,target,reason:options.reason||'view-not-migrated'});
  if(options.navigate===false)return target;
  if(parentView!==id){
    try{window.NethorNavigation?.rememberMobileParent?.(target,shellUrl(parentView))}catch(_){}
  }
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
  if(activeDefinition&&(activeView!==id||options.remount===true))await unmountActive(id);
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
  if(!route(id)&&!registered(id))return fallback('home',{reason:'unknown-route',params:options.params});
  if(!registered(id))return fallback(id,{reason:'view-not-migrated',params:options.params});
  const target=shellUrl(id,options.params);
  const currentUrl=(location.pathname.split('/').pop()||'mobile.html')+location.search+location.hash;
  const sameView=id===current()&&activeView===id;
  const routeChanged=target!==currentUrl;
  if(sameView&&options.force!==true&&!routeChanged){
    try{host?.scrollTo?.({top:0,behavior:'smooth'})}catch(_){if(host)host.scrollTop=0}
    emit('nethor:mobile-route-repeat',{view:id});
    return true
  }
  if(options.history!=='none'){
    const method=options.replace?'replaceState':'pushState';
    history[method](stateFor(id,options.state),'',target)
  }
  return mount(id,{source:options.source||'open',remount:sameView&&routeChanged})
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
  const targets=Array.isArray(element)?element:[element||document.querySelector('[data-mobile-nav-host]')];
  for(const nav of targets){
    if(!nav||navBoundTargets.has(nav))continue;
    nav.addEventListener('click',intercept);
    navBoundTargets.add(nav)
  }
}
async function handlePopState(){
  const id=current();
  if(!registered(id)){
    fallback(id,{reason:'popstate-unmigrated'});
    return
  }
  await mount(id,{source:'popstate',remount:activeView===id})
}
async function start(options={}){
  if(booted)return true;
  if(!isMobile())return false;
  booted=true;
  setHost(options.host);
  bindNavigation(options.nav);
  window.addEventListener('popstate',handlePopState);
  const explicit=hasExplicitView();
  const id=current();
  const initialState=stateFor(id,{initial:true});
  history.replaceState(initialState,'',explicit?location.href:shellUrl(id));
  if(registered(id))await mount(id,{source:'boot'});
  else if(explicit)fallback(id,{reason:'deep-link-unmigrated'});
  else emit('nethor:mobile-route-idle',{view:id,reason:'no-migrated-default-view'});
  emit('nethor:mobile-router-ready',{view:id,registered:Array.from(views.keys()),platform:platform()});
  return true
}
function back(){history.back()}
function forward(){history.forward()}
function routeTable(){return window.NethorNavigation?.mobileViewTable?.()||{}}
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