'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..'),source=name=>fs.readFileSync(path.join(root,name),'utf8');
function fakeIndexedDB(){
 const rows=new Map();
 const request=fn=>{
  const r={onsuccess:null,onerror:null};
  queueMicrotask(()=>{try{r.result=fn();r.onsuccess?.({target:r})}catch(e){r.error=e;r.onerror?.({target:r})}});
  return r
 };
 const database={
  objectStoreNames:{contains:()=>true},
  createObjectStore:()=>{},
  transaction:()=>({objectStore:()=>({
   put:value=>request(()=>{rows.set(value.cacheKey,structuredClone(value));return value.cacheKey}),
   get:key=>request(()=>structuredClone(rows.get(key))),
   delete:key=>request(()=>{rows.delete(key)}),
   clear:()=>request(()=>{rows.clear()}),
   openCursor:()=>{
    const result={onsuccess:null,onerror:null},entries=[...rows.entries()];
    let idx=0;
    const next=()=>{
     if(idx>=entries.length){result.result=null;result.onsuccess?.({target:result});return}
     const [key]=entries[idx++];
     result.result={key,delete:()=>rows.delete(key),continue:()=>queueMicrotask(next)};
     result.onsuccess?.({target:result})
    };
    queueMicrotask(next);
    return result
   }
  })})
 };
 return{rows,api:{open:()=>{const r={result:database,onsuccess:null,onupgradeneeded:null,onerror:null,onblocked:null};queueMicrotask(()=>r.onsuccess?.({target:r}));return r}}}
}
function offlineSession(fake,{online=true}={}){
 const window={indexedDB:fake.api};
 const nav={get onLine(){return online}};
 vm.runInNewContext(source('ui/mobile/mobile-offline-store.js'),{window,indexedDB:fake.api,navigator:nav,Date,JSON,Map,Promise,Number,Array,String,Object,console});
 return{store:window.NethorOfflineStore,setOnline:v=>{online=v}}
}
test('IndexedDB conserve les données entre deux démarrages et les isole par compte',async()=>{
 const db=fakeIndexedDB(),first=offlineSession(db),uid='account-a';
 assert.equal(first.store.bind(uid),true);
 assert.equal(await first.store.put(uid,'planning','2026-10-05',{revision:'r1',model:{version:4,days:{}}}),true);
 assert.equal(await first.store.put(uid,'home','2026-10-07',{weeks:[]}),true);
 const second=offlineSession(db);
 second.store.bind(uid);
 assert.equal((await second.store.get(uid,'planning','2026-10-05')).data.revision,'r1');
 assert.deepEqual((await second.store.get(uid,'home','2026-10-07')).data.weeks,[]);
 second.store.bind('account-b');
 assert.equal(await second.store.get(uid,'planning','2026-10-05'),null);
 assert.equal(await second.store.get('account-b','planning','2026-10-05'),null);
 await second.store.clearUser(uid);
 const third=offlineSession(db);third.store.bind(uid);
 assert.equal(await third.store.get(uid,'planning','2026-10-05'),null);
});
test('aucune écriture hors connexion ni de copie hors délai',async()=>{
 const db=fakeIndexedDB(),s=offlineSession(db);s.store.bind('account-a');
 assert.equal(await s.store.put('account-a','planning','2026-10-05',{model:{version:4}}),true);
 s.setOnline(false);
 assert.equal(await s.store.put('account-a','planning','2026-10-05',{model:{version:2}}),false);
 const saved=await s.store.get('account-a','planning','2026-10-05');
 assert.equal(saved.data.model.version,4);
 const old=db.rows.get('account-a|planning|2026-10-05');
 old.savedAt=Date.now()-8*86400000;
 s.store.bind('account-b');s.store.bind('account-a');
 assert.equal(await s.store.get('account-a','planning','2026-10-05'),null);
});
test('le stockage ne contient ni client Supabase, ni jeton ni session complète',()=>{
 const services=source('ui/mobile/mobile-services.js');
 const home=source('ui/mobile/views/home/home-view.js');
 assert.match(services,/profile:\{display_name:profile\.display_name,role:profile\.role/);
 assert.match(home,/\{profile:_profile,config:_config,session:_session,db:_db,\.\.\.safe\}=result/);
 assert.match(home,/!weeksRes\.error&&!tasksFailed/);
 assert.match(services,/offlineStore\(\)\?\.clearUser\?\./);
 const store=source('ui/mobile/mobile-offline-store.js');
 assert.doesNotMatch(store,/localStorage\.setItem\(/);
 assert.doesNotMatch(store,/refresh_token|access_token/);
});
test('le Planning charge uniquement la copie enregistrée de la semaine du compte',async()=>{
 const js=source('planning-runtime.js'),a=js.indexOf('async function loadWeek(start=currentWeekStart,opts={}){'),b=js.indexOf('\n}\n',a);
 assert.ok(a>=0&&b>a);
 const model={version:4,weekStart:'2026-10-05',days:{},employees:[]};
 const result={data:{model,revision:'rev-server'},savedAt:Date.now()};
 const networkCalls=[];
 const env={
  PLANNING_SPA_MODE:true,window:{NethorMobileSync:{beginCheck:()=>({}),markStale:()=>{}},NethorOfflineStore:{get:async(uid,domain,key)=>uid==='a'&&key==='2026-10-05'?result:null}},
  currentWeekStart:new Date(2026,9,5),currentUser:{id:'a'},model:null,
  planningLoadedRevisionAt:'',planningLoadedWeekKey:'',planningCacheUserId:'',planningCacheReady:false,
  planningReadStatusWeekKey:'',planningWeekLoadSeq:0,planningWeekLoadError:false,planningConflictDetected:false,
  planningAbsences:[],editMode:false,navigator:{onLine:false},
  isoDate:d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),
  startOfWeek:d=>d,changedDates:()=>[],clearPlanningReadStatuses:()=>{},
  setSaveState:()=>{},renderAll:()=>{},console:{warn:()=>{}},
  db:{from:()=>{networkCalls.push('called');throw Error('network call offline')}}
 };
 const load=vm.runInNewContext(js.slice(a,b+2)+'\nloadWeek',env);
 assert.equal(await load(new Date(2026,9,5),{render:false}),false);
 assert.equal(env.model.version,4);
 assert.equal(env.planningLoadedRevisionAt,'rev-server');
 assert.equal(env.planningWeekLoadError,true);
 assert.equal(networkCalls.length,0);
 assert.equal(await load(new Date(2026,9,12),{render:false}),false);
 assert.equal(env.model,null);
 env.currentUser={id:'b'};
 assert.equal(await load(new Date(2026,9,5),{render:false}),false);
 assert.equal(env.model,null);
});
test('le mode normal ne montre pas les confirmations techniques',()=>{
 const sync=source('ui/mobile/mobile-sync.js');
 const home=source('ui/mobile/views/home/home-view.js');
 assert.match(sync,/if\(!online\(\)\)return\{state:'offline'/);
 assert.match(sync,/return\{state:'hidden',label:''\}/);
 assert.doesNotMatch(home,/Planning récupéré du serveur/);
 assert.match(home,/if\(!offline&&\(snapshot\.offlineCopy\|\|snapshot\.planningLoadError\)\)/);
});
