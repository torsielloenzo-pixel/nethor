(function(){
 'use strict';
 // Ne transmettre que des codes predefinis : jamais de message, stack, URL ou contenu metier.
 const DOMAINS=new Set(['planning','chat','notifications','tasks','sync','app']);
 const CODES=new Set(['FETCH_FAILED','SYNC_TIMEOUT','REALTIME_DISCONNECTED','STALE_DATA','SAVE_CONFLICT','SAVE_UNCONFIRMED','APP_ERROR','PROMISE_ERROR']);
 const BUILD=379,MAX_PER_SESSION=20,COOLDOWN_MS=300000;
 let client=null,platform='mobile',sent=0,activeUser='',lastSent=new Map();
 function bindClient(db,kind){
  if(!db||typeof db.from!=='function')return false;
  client=db;platform=kind==='desktop'?'desktop':'mobile';
  return true
 }
 function clear(){
  client=null;sent=0;activeUser='';lastSent.clear()
 }
 async function record(domain,code){
  if(!client||navigator.onLine===false||!DOMAINS.has(domain)||!CODES.has(code)||sent>=MAX_PER_SESSION)return false;
  try{
   const {data,error}=await client.auth.getSession();
   const uid=data?.session?.user?.id;
   if(error||!uid||navigator.onLine===false)return false;
   if(uid!==activeUser){sent=0;lastSent.clear();activeUser=uid}
   const key=domain+'|'+code,now=Date.now();
   if(now-(lastSent.get(key)||0)<COOLDOWN_MS||sent>=MAX_PER_SESSION)return false;
   lastSent.set(key,now);sent++;
   // N'envoyer aucune autre propriete, meme en cas d'exception non geree.
   const result=await client.from('nethor_client_health_events').insert({
    domain,code,platform,build:BUILD
   });
   return !result.error
  }catch(_){return false}
 }
 // Gestion des erreurs globales sans collecte d'argument ni message libre.
 window.addEventListener('error',()=>{void record('app','APP_ERROR')});
 window.addEventListener('unhandledrejection',()=>{void record('app','PROMISE_ERROR')});
 window.NethorClientHealth=Object.freeze({bindClient,clear,record,
  get build(){return BUILD}
 });
})();
