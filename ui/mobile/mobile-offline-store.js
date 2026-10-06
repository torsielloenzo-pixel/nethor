(function(){
'use strict';
// Cache facultatif de consultation PWA. Aucune écriture métier et aucun jeton de session.
// IndexedDB est propre à l'origine du navigateur ; les droits du serveur restent prioritaires.
const DB_NAME='nethor-offline-readonly-v1',STORE='snapshots',SCHEMA=1;
const MAX_MS=Object.freeze({shell:48*3600000,home:36*3600000,planning:7*86400000});
const memory=new Map();
let activeUser='',opening=null;
function key(uid,domain,id){return uid+'|'+domain+'|'+id}
function open(){
 if(!('indexedDB' in window))return Promise.resolve(null);
 if(opening)return opening;
 opening=new Promise(resolve=>{
  let request;
  try{request=indexedDB.open(DB_NAME,SCHEMA)}catch(_){resolve(null);return}
  request.onupgradeneeded=()=>{
   const database=request.result;
   if(!database.objectStoreNames.contains(STORE))database.createObjectStore(STORE,{keyPath:'cacheKey'});
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>resolve(null);
  request.onblocked=()=>resolve(null);
 });
 return opening
}
function bind(uid){
 const id=String(uid||'');
 if(!id)return false;
 if(activeUser&&activeUser!==id)memory.clear();
 activeUser=id;
 return true
}
function valid(uid,domain,id){
 return !!activeUser&&String(uid||'')===activeUser&&Object.prototype.hasOwnProperty.call(MAX_MS,domain)&&typeof id==='string'&&id.length>0&&id.length<=80
}
async function get(uid,domain,id){
 if(!valid(uid,domain,id))return null;
 const cacheKey=key(activeUser,domain,id);
 let record=memory.get(cacheKey)||null;
 if(!record){
  const db=await open();
  if(!db)return null;
  record=await new Promise(resolve=>{
   try{
    const request=db.transaction(STORE,'readonly').objectStore(STORE).get(cacheKey);
    request.onsuccess=()=>resolve(request.result||null);
    request.onerror=()=>resolve(null);
   }catch(_){resolve(null)}
  });
 }
 if(String(uid)!==activeUser||!record||record.userId!==activeUser||record.domain!==domain||record.id!==id)return null;
 if(!Number.isFinite(record.savedAt)||record.savedAt>Date.now()+60000||Date.now()-record.savedAt>MAX_MS[domain])return null;
 if(!record.payload||typeof record.payload!=='object')return null;
 return{data:record.payload,savedAt:record.savedAt}
}
async function put(uid,domain,id,payload){
 if(!valid(uid,domain,id)||navigator.onLine===false||!payload||typeof payload!=='object')return false;
 const record={cacheKey:key(activeUser,domain,id),userId:activeUser,domain,id,savedAt:Date.now(),payload};
 // Structured-clone du navigateur et JSON empêchent d'enregistrer un client Supabase,
 // des fonctions ou une référence mutable vers le modèle en cours d'édition.
 let safe;
 try{safe=JSON.parse(JSON.stringify(record))}catch(_){return false}
 memory.set(safe.cacheKey,safe);
 const db=await open();
 if(!db)return false;
 return new Promise(resolve=>{
  try{
   const request=db.transaction(STORE,'readwrite').objectStore(STORE).put(safe);
   request.onsuccess=()=>resolve(true);
   request.onerror=()=>resolve(false);
  }catch(_){resolve(false)}
 })
}
async function clearUser(uid){
 const target=String(uid||'');
 if(!target)return false;
 if(target===activeUser)activeUser='';
 for(const k of [...memory.keys()])if(k.startsWith(target+'|'))memory.delete(k);
 const db=await open();
 if(!db)return false;
 return new Promise(resolve=>{
  try{
   const store=db.transaction(STORE,'readwrite').objectStore(STORE),cursor=store.openCursor();
   cursor.onsuccess=()=>{
    const cur=cursor.result;
    if(cur){if(String(cur.key).startsWith(target+'|'))cur.delete();cur.continue()}
    else resolve(true)
   };
   cursor.onerror=()=>resolve(false);
  }catch(_){resolve(false)}
 })
}
async function clearAll(){
 activeUser='';memory.clear();
 const db=await open();
 if(!db)return false;
 return new Promise(resolve=>{
  try{const request=db.transaction(STORE,'readwrite').objectStore(STORE).clear();request.onsuccess=()=>resolve(true);request.onerror=()=>resolve(false)}
  catch(_){resolve(false)}
 })
}
window.NethorOfflineStore=Object.freeze({bind,get,put,clearUser,clearAll,get activeUser(){return activeUser}});
})();
