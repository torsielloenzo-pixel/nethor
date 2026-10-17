'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const src=fs.readFileSync(path.join(__dirname,'..','ui/mobile/mobile-services.js'),'utf8');
function extract(a,b){
 const i=src.indexOf(a),j=src.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i,'Expected security source range '+a);
 return src.slice(i,j);
}
const code=extract('function securityAuthFailure(','function startRealtime(');

function fixture({context={data:{session_active:true,role:'employe'},error:null},
 auth={data:{user:{id:'synthetic-1'}},error:null},connected=true,role='employe'}={}){
 const calls=[],events=new Map();
 let rpcResult=context,authResult=auth;
 const state={session:{user:{id:'synthetic-1'}},profile:{role},status:'ready'};
 const sandbox={
  state,
  client:{
   rpc:async name=>{calls.push('rpc:'+name);if(rpcResult instanceof Error)throw rpcResult;return rpcResult},
   auth:{getUser:async()=>{calls.push('auth.getUser');return authResult}}
  },
  navigator:{onLine:connected},
  console:{warn:()=>{}},
  forceDisabledAccountLogout:async()=>{calls.push('logout');state.session=null;state.status='signed-out'},
  refreshCore:async()=>{calls.push('refreshCore');state.profile.role='responsable'},
  refresh:async()=>{calls.push('refresh')},
  securityTimer:null,
  setInterval:()=>37,
  document:{hidden:false,addEventListener:(event,handler)=>events.set(event,handler)},
  window:{addEventListener:(event,handler)=>events.set(event,handler)}
 };
 vm.createContext(sandbox);
 vm.runInContext('let securityBusy=false;\n'+code,sandbox);
 return{
  sandbox,state,calls,events,
  check:()=>vm.runInContext('checkSecurityState()',sandbox),
  startWatch:()=>vm.runInContext('startSecurityWatch()',sandbox),
  setContext:v=>rpcResult=v,setAuth:v=>authResult=v
 };
}

test('mobile revalidation accepts ONLY explicit server-side active session',async()=>{
 const x=fixture();
 assert.equal(await x.check(),true);
 assert.deepEqual(x.calls,['rpc:nethor_security_context']);
 const absent=fixture({context:{data:{role:'employe'},error:null}});
 assert.equal(await absent.check(),false);
 assert.equal(absent.calls.includes('refresh'),false);
 const malformed=fixture({context:{data:{session_active:true},error:null}});
 assert.equal(await malformed.check(),false);
});

test('mobile revoked and disabled sessions force logout',async()=>{
 const x=fixture({context:{data:{session_active:false,role:'employe'},error:null}});
 assert.equal(await x.check(),false);
 assert.ok(x.calls.includes('logout'));
 assert.equal(x.state.session,null);
 const y=fixture({context:{data:null,error:{message:'not authorized'}},
  auth:{data:{user:null},error:{status:401,code:'session_not_found'}}});
 assert.equal(await y.check(),false);
 assert.ok(y.calls.includes('logout'));
});

test('mobile auth.getUser success does not override a failed authorization RPC',async()=>{
 const x=fixture({context:{data:null,error:{message:'network unavailable'}}});
 assert.equal(await x.check(),false);
 assert.ok(x.calls.includes('auth.getUser'));
 assert.equal(x.calls.includes('logout'),false,'Transient network problem must not revoke the local session');
 assert.equal(x.calls.includes('refresh'),false);
 const y=fixture({context:new Error('RPC offline')});
 assert.equal(await y.check(),false);
 assert.ok(y.calls.includes('auth.getUser'));
 assert.equal(y.state.session!==null,true);
});

test('mobile offline and overlapping validations never report authorization success',async()=>{
 const offline=fixture({connected:false});
 assert.equal(await offline.check(),false);
 assert.deepEqual(offline.calls,[]);
 const x=fixture();
 let resolveRpc;
 x.sandbox.client.rpc=()=>new Promise(resolve=>{resolveRpc=resolve});
 const first=x.check();
 assert.equal(await x.check(),false,'Second check must not bypass in-flight guard');
 resolveRpc({data:{session_active:true,role:'employe'},error:null});
 assert.equal(await first,true);
});

test('mobile server-side role change invokes fresh profile/permission load',async()=>{
 const x=fixture({context:{data:{session_active:true,role:'responsable'},error:null},role:'employe'});
 assert.equal(await x.check(),true);
 assert.ok(x.calls.includes('refreshCore'));
});

test('mobile online event only refreshes after successful security revalidation',async()=>{
 const x=fixture({context:{data:null,error:{message:'unavailable'}}});
 x.startWatch();
 assert.ok(x.events.has('online'));
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 x.events.get('online')();
 await flush();
 assert.equal(x.calls.includes('refresh'),false);
 x.setContext({data:{session_active:true,role:'employe'},error:null});
 x.events.get('online')();
 await flush();
 assert.equal(x.calls.filter(v=>v==='refresh').length,1);
});


test('stage21: PWA entrypoint and service worker precache the matching hardened asset',()=>{
 const mobile=fs.readFileSync(path.join(__dirname,'..','mobile.html'),'utf8');
 const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','app-version.json'),'utf8'));
 assert.match(mobile,/mobile-services\.js\?v=26/);
 assert.match(sw,/mobile-services\.js\?v=26/);
 assert.match(sw,new RegExp('APP_VERSION='+manifest.version+';'));
 assert.match(sw,new RegExp('netto-tools-v'+manifest.version));
 assert.ok(Number.isInteger(manifest.version)&&manifest.version>0);
});
