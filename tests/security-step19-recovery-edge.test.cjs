'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const source=fs.readFileSync(path.join(__dirname,'..','docs/security/edge-functions/password-recovery-email/index.ts'),'utf8');
const start=source.indexOf('    if (action === "resolved") {');
const stop=source.indexOf('\n    if (action !== "request")',start);
assert.ok(start>=0&&stop>start,'Live resolved branch not found in staged source');
const branch=source.slice(start,stop);

const runResolved=new AsyncFunction('req','admin','createClient','Deno','url','json','sendMail',`
  const action="resolved";
  ${branch}
  return {status:599,body:{error:"Unexpected fallthrough"}};
`);

function harness({authHeader='Bearer synthetic-token',user={id:'synthetic-user'},authError=null,securityContext={session_active:true},securityError=null,rpcThrows=false,pending=[{id:'synthetic-request'}]}={}){
 const calls=[];
 const caller={
   auth:{getUser:async()=>{calls.push('auth.getUser');return{data:{user},error:authError}}},
   rpc:async(name)=>{
     calls.push('caller.rpc:'+name);
     assert.equal(name,'nethor_security_context');
     if(rpcThrows)throw new Error('synthetic RPC failure');
     return{data:securityContext,error:securityError};
   }
 };
 const admin={
   from(table){
     calls.push('admin.from:'+table);
     const query={
       select(){return this},eq(){return this},
       is(){return Promise.resolve({data:pending})},
       update(){calls.push('admin.update:'+table);return this},
       insert(){calls.push('admin.insert:'+table);return Promise.resolve({data:null,error:null})},
       maybeSingle(){return Promise.resolve({data:null})}
     };
     return query;
   }
 };
 const req={headers:{get:key=>key.toLowerCase()==='authorization'?authHeader:null}};
 const Deno={env:{get:name=>name==='SUPABASE_ANON_KEY'?'synthetic-anon':null}};
 const createClient=(_url,_anon,opts)=>{
   calls.push('createClient');
   assert.equal(opts.global.headers.Authorization,authHeader);
   return caller;
 };
 const json=(body,status=200)=>({status,body});
 const sendMail=async()=>{calls.push('mail');return{ok:true}};
 return{calls,run:()=>runResolved(req,admin,createClient,Deno,'https://invalid.example',json,sendMail)}
}

test('stage19: missing token and failed JWT deny before privileged reads',async()=>{
 let t=harness({authHeader:null});
 assert.equal((await t.run()).status,401);
 assert.ok(!t.calls.some(x=>x.startsWith('admin.')));
 t=harness({user:null,authError:{message:'invalid'}});
 assert.equal((await t.run()).status,401);
 assert.ok(!t.calls.some(x=>x.startsWith('admin.')));
 assert.ok(!t.calls.some(x=>x.startsWith('caller.rpc')));
});

test('stage19: revoked, absent or unverifiable session rejects BEFORE service role operations',async()=>{
 for(const context of [{session_active:false},null,{}]){
  const t=harness({securityContext:context});
  const res=await t.run();
  assert.equal(res.status,401);
  assert.match(res.body.error,/Session inactive/i);
  assert.deepEqual(t.calls,['createClient','auth.getUser','caller.rpc:nethor_security_context']);
 }
 const t=harness({securityError:{message:'connection lost'}});
 assert.equal((await t.run()).status,401);
 assert.ok(!t.calls.some(x=>x.startsWith('admin.')));
 const offline=harness({rpcThrows:true});
 assert.equal((await offline.run()).status,401);
 assert.ok(!offline.calls.some(x=>x.startsWith('admin.')));
});

test('stage19: active session continues normal request reconciliation and audit',async()=>{
 const t=harness();
 const result=await t.run();
 assert.equal(result.status,200);
 assert.deepEqual(result.body,{success:true});
 const rpc=t.calls.indexOf('caller.rpc:nethor_security_context');
 const admin=t.calls.findIndex(x=>x.startsWith('admin.'));
 assert.ok(rpc>=0&&admin>rpc,'Privilege escalation before server session verification');
 assert.ok(t.calls.includes('admin.update:password_reset_requests'));
 assert.ok(t.calls.includes('admin.insert:audit_logs'));
 assert.ok(!t.calls.includes('mail'),'No recovery mail is sent without a saved recovery email');
});

test('stage19: the unauthenticated request path remains separate from resolved',()=>{
 assert.match(source,/if \(action !== "request"\) return json\(\{ error: "Action inconnue\." \}, 400\)/);
 const rest=source.slice(stop);
 assert.match(rest,/findProfile\(admin, rawIdentifier\)/);
 assert.match(rest,/return genericOk\(\)/);
 assert.match(branch,/caller\.rpc\("nethor_security_context"\)/);
 assert.ok(branch.indexOf('caller.rpc("nethor_security_context")') < branch.indexOf('admin.from("password_reset_requests")'));
 assert.doesNotMatch(rest,/caller\.rpc\("nethor_security_context"\)/);
});
