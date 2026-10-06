(function(){
'use strict';

// Coordination commune des données mobiles : une seule écoute Realtime par table
// opérationnelle et une revalidation après toute interruption de connectivité.
// La source de vérité reste Supabase ; aucun planning/message n'est stocké ici.
const DOMAIN_BY_TABLE=Object.freeze({
  planning_weeks:'planning',
  planning_absences:'absences',
  daily_tasks:'tasks',
  daily_task_assignees:'tasks',
  daily_task_completions:'tasks',
  profiles:'team',
  chat_conversations:'chat',
  chat_messages:'chat',
  chat_participants:'chat',
  chat_reactions:'chat'
});
const REVALIDATE_DOMAINS=['planning','absences','tasks','team','chat','notifications'];
const listeners=new Set();
const pending=new Map();
const dirty=new Set();
let client=null,userId='',channel=null,started=false,generation=0;
let flushTimer=null,refreshTimer=null,heartbeat=null,refreshPromise=null;
let lastRefresh=0,lastChannelStatus='idle',hasSubscribed=false;
const IDLE_REFRESH_MS=90000;
const MIN_RESUME_REFRESH_MS=12000;

function online(){return navigator.onLine!==false}
function visible(){return document.visibilityState!=='hidden'}
function enabled(){return started&&!!client&&!!userId}
function status(value){
  if(value==='offline'||value==='degraded'||value==='ready')document.documentElement.dataset.nethorSyncState=value
}
function dispatch(domain,reason='change',metadata={}){
  if(!enabled())return;
  if(!online()){
    dirty.add(domain);status('offline');return
  }
  if(!visible()){
    dirty.add(domain);return
  }
  pending.set(domain,{domain,reason,table:metadata.table||'',weekStart:metadata.weekStart||'',at:Date.now()});
  if(!flushTimer)flushTimer=setTimeout(flush,100)
}
function flush(){
  flushTimer=null;
  if(!enabled()||!online()||!visible())return;
  const updates=[...pending.values()];
  pending.clear();
  for(const item of updates){
    for(const entry of [...listeners]){
      if(!entry.domains.has(item.domain)&&!entry.domains.has('*'))continue;
      try{Promise.resolve(entry.callback(item)).catch(error=>console.warn('[Nethor Sync] listener',error))}
      catch(error){console.warn('[Nethor Sync] listener',error)}
    }
    try{window.dispatchEvent(new CustomEvent('nethor:mobile-sync',{detail:item}))}catch(_){}
  }
}
function subscribe(domains,callback){
  if(typeof callback!=='function')return()=>{};
  const allowed=Array.isArray(domains)?domains:[domains];
  const entry={domains:new Set(allowed.map(String)),callback};
  listeners.add(entry);
  return()=>listeners.delete(entry)
}
function invalidate(domains,reason='manual',meta={}){
  for(const domain of (Array.isArray(domains)?domains:[domains]))dispatch(String(domain),reason,meta)
}
function onDatabaseChange(table,payload){
  const domain=DOMAIN_BY_TABLE[table];
  if(!domain)return;
  const weekStart=payload?.new?.week_start||payload?.old?.week_start||'';
  dispatch(domain,'realtime',{table,weekStart})
}
function onChannelStatus(value){
  if(!enabled())return;
  const previous=lastChannelStatus;
  lastChannelStatus=value;
  if(value==='SUBSCRIBED'){
    status('ready');
    if(hasSubscribed&&previous!=='SUBSCRIBED')revalidate('realtime-reconnected',{force:true});
    hasSubscribed=true
  }else if(value==='CHANNEL_ERROR'||value==='TIMED_OUT'||value==='CLOSED'){
    status(online()?'degraded':'offline')
  }
}
function routeDomains(view){
  if(view==='home')return['planning','absences','tasks','team','notifications'];
  if(view==='planning')return['planning','absences'];
  if(view==='chat')return['chat','team'];
  if(view==='notifications')return['notifications'];
  return[]
}
function onRoute(event){
  const domains=routeDomains(String(event?.detail?.view||''));
  if(domains.length)invalidate(domains,'route')
  if(domains.includes('notifications'))revalidate('notifications-route')
}
function onOnline(){status('degraded');revalidate('online',{force:true})}
function onOffline(){status('offline');dirty.add('resume')}
function onVisibility(){if(visible())revalidate('visible')}
function onPageshow(event){if(event.persisted)revalidate('page-restored',{force:true})}
function onFocus(){if(visible())revalidate('focus')}
async function performRefresh(reason,token){
  const services=window.NethorMobileServices;
  try{
    if(services?.session?.user?.id===userId)await services.refresh?.();
    if(token===generation&&enabled())status(lastChannelStatus==='SUBSCRIBED'?'ready':'degraded')
  }catch(error){
    if(token===generation&&enabled())status('degraded');
    console.warn('[Nethor Sync] revalidation '+reason,error)
  }
}
function revalidate(reason='resume',{force=false}={}){
  if(!enabled()||!online()||!visible())return Promise.resolve(false);
  if(refreshPromise)return refreshPromise;
  const now=Date.now();
  if(!force&&now-lastRefresh<MIN_RESUME_REFRESH_MS)return Promise.resolve(false);
  lastRefresh=now;
  clearTimeout(refreshTimer);
  // Les vues actives doivent recharger les données serveur même si Realtime
  // n'a pas émis d'événement durant une période en arrière-plan.
  const domains=new Set([...REVALIDATE_DOMAINS,...dirty]);
  dirty.clear();
  invalidate([...domains],reason);
  const token=generation;
  refreshPromise=performRefresh(reason,token).finally(()=>{if(token===generation)refreshPromise=null});
  return refreshPromise
}
function start({db,uid}={}){
  const nextId=String(uid||'');
  if(!db||!nextId)return false;
  if(enabled()&&userId===nextId&&client===db)return true;
  stop();
  client=db;userId=nextId;started=true;generation++;
  hasSubscribed=false;lastChannelStatus='connecting';
  status(online()?'degraded':'offline');
  channel=client.channel('nethor-mobile-sync-'+nextId);
  for(const table of Object.keys(DOMAIN_BY_TABLE)){
    channel=channel.on('postgres_changes',{event:'*',schema:'public',table},payload=>onDatabaseChange(table,payload))
  }
  channel.subscribe(onChannelStatus);
  window.addEventListener('online',onOnline);
  window.addEventListener('offline',onOffline);
  window.addEventListener('pageshow',onPageshow);
  window.addEventListener('focus',onFocus);
  window.addEventListener('nethor:mobile-route-change',onRoute);
  document.addEventListener('visibilitychange',onVisibility);
  heartbeat=setInterval(()=>{if(enabled()&&online()&&visible())revalidate('heartbeat')},IDLE_REFRESH_MS);
  return true
}
function stop(){
  generation++;
  const oldChannel=channel,oldClient=client;
  channel=null;client=null;userId='';started=false;
  clearTimeout(flushTimer);clearTimeout(refreshTimer);clearInterval(heartbeat);
  flushTimer=refreshTimer=heartbeat=null;refreshPromise=null;lastRefresh=0;hasSubscribed=false;
  pending.clear();dirty.clear();
  window.removeEventListener('online',onOnline);
  window.removeEventListener('offline',onOffline);
  window.removeEventListener('pageshow',onPageshow);
  window.removeEventListener('focus',onFocus);
  window.removeEventListener('nethor:mobile-route-change',onRoute);
  document.removeEventListener('visibilitychange',onVisibility);
  if(oldChannel&&oldClient){try{oldClient.removeChannel(oldChannel)}catch(_){}}
  delete document.documentElement.dataset.nethorSyncState
}
window.NethorMobileSync=Object.freeze({
 start,stop,subscribe,invalidate,revalidate,
 get active(){return enabled()},
 get status(){return online()?lastChannelStatus:'offline'},
 get userId(){return userId}
});
})();
