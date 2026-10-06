'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');

function fixture({bus=null}={}){
 const events=new Map(),timeouts=new Map(),intervals=new Map(),channels=[];
 let uid='employee-a',online=true,visible=true,clock=Date.now(),nextId=0,refreshes=0;
 const bannerLabel={textContent:''},retry={hidden:true,dataset:{},addEventListener:()=>{}};
 const banner={hidden:true,dataset:{},querySelector:selector=>selector.includes('retry')?retry:bannerLabel};
 const on=(name,handler)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(handler)};
 const off=(name,handler)=>events.get(name)?.delete(handler);
 const document={documentElement:{dataset:{}},get visibilityState(){return visible?'visible':'hidden'},
  querySelector:selector=>selector==='[data-mobile-sync-banner]'?banner:null,
  addEventListener:on,removeEventListener:off};
 const window={NethorMobileRouter:{current:()=> 'planning'},
  NethorMobileServices:{session:{user:{id:uid}},refresh:async()=>{refreshes++}},
  addEventListener:on,removeEventListener:off,dispatchEvent:()=>{},NethorClientHealth:{record:()=>{}}};
 const navigator={get onLine(){return online}};
 const network=bus||{subscribers:new Set()};
 const db={
  channel(name){
   const c={name,bindings:[],callback:null,
    on(kind,filter,handler){this.bindings.push({kind,filter,handler});return this},
    subscribe(cb){this.callback=cb;network.subscribers.add(this);cb('SUBSCRIBED');return this}};
   channels.push(c);return c
  },
  removeChannel(c){network.subscribers.delete(c)}
 };
 const setTimeout=fn=>{const id=++nextId;timeouts.set(id,fn);return id};
 const clearTimeout=id=>timeouts.delete(id);
 const setInterval=fn=>{const id=++nextId;intervals.set(id,fn);return id};
 const clearInterval=id=>intervals.delete(id);
 class MockDate extends Date{static now(){return clock}}
 vm.runInNewContext(source('ui/mobile/mobile-sync.js'),{
  window,document,navigator,Date:MockDate,CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail}},
  console:{warn:()=>{}},setTimeout,clearTimeout,setInterval,clearInterval
 });
 const sync=window.NethorMobileSync;
 return{sync,db,window,banner,channels,network,now:n=>{clock+=n},get refreshes(){return refreshes},
  offline(){online=false;for(const cb of events.get('offline')||[])cb({})},
  online(){online=true;for(const cb of events.get('online')||[])cb({})},
  hide(){visible=false;for(const cb of events.get('visibilitychange')||[])cb({})},
  show(){visible=true;for(const cb of events.get('visibilitychange')||[])cb({})},
  route:view=>{for(const cb of events.get('nethor:mobile-route-change')||[])cb({detail:{view}})},
  publish(table,payload={new:{}}){for(const chan of network.subscribers)for(const x of chan.bindings)if(x.filter.table===table)x.handler(payload)},
  flush(){for(let i=0;i<10&&timeouts.size;i++){const list=[...timeouts.values()];timeouts.clear();for(const cb of list)cb()}}
 }
}

test('un canal Realtime et nettoyage au changement de compte',()=>{
 const h=fixture();h.sync.start({db:h.db,uid:'employee-a'});
 h.sync.start({db:h.db,uid:'employee-a'});
 assert.equal(h.channels.length,1);
 assert.equal(h.channels[0].bindings.length,10);
 h.sync.start({db:h.db,uid:'employee-b'});
 assert.equal(h.channels.length,2);
 assert.equal(h.sync.userId,'employee-b');
 h.sync.stop();assert.equal(h.sync.active,false);
});

test('aucune vue ne devient vérifiée sur simple SUBSCRIBED',()=>{
 const h=fixture();h.sync.start({db:h.db,uid:'employee-a'});
 assert.equal(h.sync.statusOf('planning'),'unknown');
 assert.equal(h.sync.freshnessSummary().state,'stale');
 const token=h.sync.beginCheck('planning');
 assert.equal(h.sync.freshnessSummary().state,'checking');
 assert.equal(h.sync.markVerified('planning',token),true);
 assert.equal(h.sync.freshnessSummary().state,'fresh');
 h.now(180001);assert.equal(h.sync.freshnessSummary().state,'stale');
 h.sync.stop()
});

test('une requête ancienne ne valide pas des données modifiées',()=>{
 const h=fixture();h.sync.start({db:h.db,uid:'employee-a'});
 const old=h.sync.beginCheck('planning');
 const next=h.sync.beginCheck('planning');
 assert.equal(h.sync.markVerified('planning',old),false);
 assert.equal(h.sync.markVerified('planning',next),true);
 h.sync.markStale('planning');
 assert.equal(h.sync.markVerified('planning',next),false);
 assert.equal(h.sync.freshnessSummary().state,'stale');
 h.sync.stop()
});

test('deux sessions indépendantes reçoivent la modification publiée',()=>{
 const shared={subscribers:new Set()},a=fixture({bus:shared}),b=fixture({bus:shared});
 a.sync.start({db:a.db,uid:'employee-a'});b.sync.start({db:b.db,uid:'employee-b'});
 const aRead=a.sync.beginCheck('planning'),bRead=b.sync.beginCheck('planning');
 a.sync.markVerified('planning',aRead);b.sync.markVerified('planning',bRead);
 let seenA=0,seenB=0;
 a.sync.subscribe('planning',()=>seenA++);b.sync.subscribe('planning',()=>seenB++);
 a.publish('planning_weeks',{new:{week_start:'2026-10-05'}});
 a.flush();b.flush();
 assert.equal(a.sync.statusOf('planning'),'stale');
 assert.equal(b.sync.statusOf('planning'),'stale');
 assert.equal(seenA,1);assert.equal(seenB,1);
 a.sync.stop();b.sync.stop()
});

test('hors connexion, reprise et changement de compte',async()=>{
 const h=fixture();h.sync.start({db:h.db,uid:'employee-a'});
 const ticket=h.sync.beginCheck('planning');h.sync.markVerified('planning',ticket);
 h.offline();
 assert.equal(h.sync.freshnessSummary().state,'offline');
 h.online();await Promise.resolve();h.flush();
 assert.equal(h.refreshes,1);
 assert.equal(h.sync.statusOf('planning'),'stale');
 h.sync.start({db:h.db,uid:'employee-b'});
 assert.equal(h.sync.markVerified('planning',ticket),false);
 assert.equal(h.sync.statusOf('planning'),'unknown');
 h.sync.stop();assert.equal(h.banner.hidden,true)
});

test('les incidents ne transmettent jamais de messages libres',async()=>{
 const inserted=[],listeners=new Map();
 const window={addEventListener:(event,cb)=>listeners.set(event,cb)};
 const navigator={onLine:true};
 vm.runInNewContext(source('runtime/client-health.js'),{window,navigator,Date,console});
 const health=window.NethorClientHealth;
 health.bindClient({
  auth:{getSession:async()=>({data:{session:{user:{id:'example'}}},error:null})},
  from:table=>{assert.equal(table,'nethor_client_health_events');return{insert:async row=>{inserted.push(row);return{error:null}}}}
 },'mobile');
 assert.equal(await health.record('planning','SAVE_CONFLICT'),true);
 assert.equal(await health.record('planning','SAVE_CONFLICT'),false);
 assert.equal(await health.record('planning','raw error text'),false);
 assert.deepEqual(Object.keys(inserted[0]).sort(),['build','code','domain','platform']);
 assert.equal(inserted.length,1);health.clear()
});

test('mise à jour PWA et scripts exécutables cohérents',()=>{
 const page=source('mobile.html'),worker=source('sw.js');
 const version=JSON.parse(source('app-version.json'));
 assert.equal(version.version,379);
 assert.match(worker,/APP_VERSION=379/);
 assert.match(worker,/netto-tools-v379/);
 for(const filename of ['runtime/client-health.js?v=1','ui/mobile/mobile-sync.js?v=3',
  'ui/mobile/mobile-services.js?v=14','ui/mobile/views/home/home-view.js?v=15',
  'ui/mobile/views/planning/planning-view.js?v=17']){
  assert.ok(page.includes(filename),'mobile missing '+filename);
  assert.ok(worker.includes('./'+filename),'service worker missing '+filename)
 }
});

test('le contrôle CAS et le contrôle d’accès ne sont pas contournés',()=>{
 const sourceFile=source('planning-runtime.js');
 assert.match(sourceFile,/rpc\('planning_save_week_if_revision'/);
 assert.match(sourceFile,/rpc\('planning_delete_week_if_revision'/);
 assert.doesNotMatch(sourceFile,/from\('planning_weeks'\)\.upsert\(/);
 const migration=source('database/2026-10-07-client-health-phase5.sql');
 assert.match(migration,/enable row level security/);
 assert.match(migration,/for insert to authenticated/);
 assert.match(migration,/for select to authenticated/);
 assert.match(migration,/revoke update,delete,truncate/);
});

test('le panneau administrateur ne charge pas d’identifiant personnel',()=>{
 const js=source('runtime/client-health-admin.js');
 assert.match(js,/select\('domain,code,platform,build,created_at'\)/);
 assert.doesNotMatch(js,/select\('[^']*user_id/);
 assert.doesNotMatch(js,/\.select\('[^']*body/);
});

test('deux responsables ne peuvent pas publier successivement le même brouillon',async()=>{
 const js=source('planning-runtime.js');
 const start=js.indexOf('async function saveWeek(options={}){');
 const end=js.indexOf('\n}\n',start);
 assert.ok(start>=0&&end>start,'saveWeek absent');
 const actualSource=js.slice(start,end+2);
 const ledger={revision:'rev-1',data:null};
 function editor(){
  const original={version:4,weekStart:'2026-10-05',employees:[],days:{},updatedAt:'draft'};
  const env={
   canEdit:true,model:structuredClone(original),planningSaveInFlight:false,
   planningLoadedRevisionAt:'rev-1',planningLoadedWeekKey:'2026-10-05',
   planningLastSaveVerified:false,planningLastSaveOutcome:'none',planningConflictDetected:false,
   planningWeekLoadError:false,planningReadStatusWeekKey:'',currentWeekStart:new Date(2026,9,5),
   editMode:true,currentUser:{id:'test-user'},navigator:{onLine:true},window:{NethorClientHealth:{record:async()=>true}},
   isoDate:d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),
   setSaveState:()=>{},clonePlanningModel:x=>structuredClone(x),clearPlanningReadStatuses:()=>{},
   loadPlanningReadStatusWeek:async()=>{},setTimeout:()=>{},alert:()=>{},console:{warn:()=>{}},
   db:{rpc:async(name,args)=>{
    assert.equal(name,'planning_save_week_if_revision');
    if(args.p_expected_revision!==ledger.revision)return{data:{status:'conflict',current_revision:ledger.revision},error:null};
    ledger.revision='rev-2';ledger.data=structuredClone(args.p_data);
    return{data:{status:'ok',revision:ledger.revision},error:null}
   }},
   loadWeek:async()=>{
    env.planningLoadedRevisionAt=ledger.revision;
    env.model=structuredClone(ledger.data);
    return true
   }
  };
  const save=vm.runInNewContext(actualSource+'\nsaveWeek',env);
  return{env,save}
 }
 const a=editor(),b=editor();
 assert.equal(await a.save(),true);
 assert.equal(await b.save(),false);
 assert.equal(a.env.planningLastSaveVerified,true);
 assert.equal(b.env.planningConflictDetected,true);
 assert.equal(b.env.planningLastSaveOutcome,'conflict');
 assert.equal(b.env.model.weekStart,'2026-10-05');
 assert.equal(ledger.revision,'rev-2');
});
