'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const source=fs.readFileSync(path.join(__dirname,'..','docs/security/edge-functions/password-recovery-email/index.ts'),'utf8');
const start=source.indexOf('    if (action === "resolved") {');
const stop=source.indexOf('\n    if (action !== "request")',start);
assert.ok(start>=0&&stop>start,'Cannot isolate staged resolved branch');
const branch=source.slice(start,stop);
const runResolved=new AsyncFunction('req','admin','createClient','Deno','url','json','sendMail',`
 const action="resolved";
 ${branch}
 return {status:599,body:{error:"Unexpected fallthrough"}};
`);

function harness({
 authHeader='Bearer synthetic-token',user={id:'synthetic-user'},authError=null,
 securityContext={session_active:true},securityError=null,rpcThrows=false,
 latest={id:'synthetic-reset',password_changed_verified_at:'2026-10-12T20:00:00Z'},
 lookupError=null,claim=true,claimError=null,recoveryEmail='fake@example.test',mailOk=true
}={}){
 const calls=[],changes=[];
 const caller={
  auth:{getUser:async()=>{calls.push('auth.getUser');return{data:{user},error:authError}}},
  rpc:async(name)=>{
   calls.push('caller.rpc:'+name);assert.equal(name,'nethor_security_context');
   if(rpcThrows)throw new Error('synthetic offline');return{data:securityContext,error:securityError};
  }
 };
 const admin={
  from(table){
   calls.push('admin.from:'+table);
   let mode='lookup';
   const q={
    select(){return this},eq(){return this},gte(){return this},
    order(){return this},limit(){return this},not(){return this},is(){return this},
    update(patch){
     mode=patch.confirmation_notification_at?'claim':'notification-status';
     calls.push('admin.update:'+table+':'+mode);
     changes.push({table,...patch});
     return this;
    },
    insert(){calls.push('admin.insert:'+table);return Promise.resolve({data:null,error:null})},
    maybeSingle(){
     if(table==='user_recovery_emails')return Promise.resolve({data:recoveryEmail?{email:recoveryEmail}:null});
     if(mode==='claim')return Promise.resolve({data:claim?{id:'synthetic-reset'}:null,error:claimError});
     if(mode==='lookup')return Promise.resolve({data:latest,error:lookupError});
     return Promise.resolve({data:null});
    },
    then(resolve,reject){return Promise.resolve({data:null,error:null}).then(resolve,reject);}
   };
   return q;
  }
 };
 const req={headers:{get:key=>key.toLowerCase()==='authorization'?authHeader:null}};
 const Deno={env:{get:name=>name==='SUPABASE_ANON_KEY'?'synthetic-anon':null}};
 const createClient=(_url,_anon,opts)=>{
  calls.push('createClient');assert.equal(opts.global.headers.Authorization,authHeader);return caller;
 };
 const json=(body,status=200)=>({status,body});
 const sendMail=async()=>{calls.push('sendMail');return{ok:mailOk}};
 return{calls,changes,run:()=>runResolved(req,admin,createClient,Deno,'https://invalid.example',json,sendMail)}
}
test('stage20: missing auth and invalid JWT fail before privileged SQL',async()=>{
 let h=harness({authHeader:null});assert.equal((await h.run()).status,401);
 assert.ok(!h.calls.some(x=>x.startsWith('admin.')));
 h=harness({user:null,authError:{message:'bad JWT'}});
 assert.equal((await h.run()).status,401);
 assert.ok(!h.calls.some(x=>x.startsWith('admin.')));
});
test('stage20: revoked, missing and transport-error sessions fail closed',async()=>{
 for(const options of [{securityContext:{session_active:false}},{securityContext:null},
   {securityContext:{}},{securityError:{message:'rpc inaccessible'}},{rpcThrows:true}]){
  const h=harness(options),res=await h.run();
  assert.equal(res.status,401);assert.match(res.body.error,/Session inactive/i);
  assert.ok(!h.calls.some(x=>x.startsWith('admin.')));
 }
});
test('stage20: a client acknowledgement without an Auth password-change proof is rejected',async()=>{
 for(const latest of [null,{id:'synthetic-reset',password_changed_verified_at:null}]){
  const h=harness({latest}),res=await h.run();
  assert.equal(res.status,409);
  assert.ok(!h.calls.some(x=>x.startsWith('admin.update')||x.startsWith('admin.insert')||x==='sendMail'));
 }
 const h=harness({lookupError:{message:'DB unavailable'}}),res=await h.run();
 assert.equal(res.status,503);
 assert.ok(!h.calls.some(x=>x.startsWith('admin.update')));
});
test('stage20: verified password change gets one atomic confirmation and one notification',async()=>{
 const h=harness(),res=await h.run();
 assert.equal(res.status,200);assert.equal(res.body.verified,true);
 assert.equal(res.body.notification_status,'sent');
 assert.equal(h.calls.filter(x=>x==='sendMail').length,1);
 assert.equal(h.calls.filter(x=>x==='admin.insert:audit_logs').length,1);
 assert.ok(h.changes.some(x=>x.table==='password_reset_requests'&&x.confirmation_notification_status==='pending'));
 assert.ok(h.changes.some(x=>x.table==='password_reset_requests'&&x.confirmation_notification_status==='sent'));
 const rpc=h.calls.indexOf('caller.rpc:nethor_security_context'),firstAdmin=h.calls.findIndex(x=>x.startsWith('admin.'));
 assert.ok(rpc>=0&&firstAdmin>rpc);
});
test('stage20: repeated confirmation cannot resend email or audit',async()=>{
 const h=harness({claim:false}),res=await h.run();
 assert.equal(res.status,200);assert.equal(res.body.already_acknowledged,true);
 assert.equal(h.calls.filter(x=>x==='sendMail').length,0);
 assert.equal(h.calls.filter(x=>x.startsWith('admin.insert')).length,0);
});
test('stage20: failed notification is tracked without falsifying password proof',async()=>{
 const h=harness({mailOk:false}),res=await h.run();
 assert.equal(res.body.verified,true);
 assert.equal(res.body.notification_status,'failed');
 assert.ok(h.changes.some(x=>x.confirmation_notification_status==='failed'));
});
test('stage20: database claim failures abort before email',async()=>{
 const h=harness({claimError:{message:'conflict'}}),res=await h.run();
 assert.equal(res.status,503);
 assert.ok(!h.calls.includes('sendMail'));
});
test('stage20: public request remains available without authentication',()=>{
 const rest=source.slice(stop);
 assert.match(rest,/if \(action !== "request"\) return json/);
 assert.match(rest,/findProfile\(admin, rawIdentifier\)/);
 assert.match(rest,/return genericOk\(\)/);
 assert.doesNotMatch(rest,/caller\.rpc\("nethor_security_context"\)/);
});


test('stage20: client reports Auth success separately from server audit confirmation',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','reset-password.html'),'utf8');
 const authSave=html.indexOf("await db.auth.updateUser({password:next})");
 const acknowledgement=html.indexOf("await db.functions.invoke('password-recovery-email',{body:{action:'resolved'}})");
 assert.ok(authSave>=0&&acknowledgement>authSave,'Password must be saved by Auth first');
 assert.match(html,/followUpVerified=!followUpError&&confirmation\?\.verified===true/);
 assert.match(html,/Le suivi de cette modification reste à confirmer côté serveur/);
 assert.match(html,/await db\.auth\.signOut\(\{scope:'global'\}\)/);
});
test('stage20: only changed Auth password hash can provide server evidence',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'..','docs/security/etape20-confirmation-auth-verifiee-proposal.sql'),'utf8');
 assert.match(sql,/AFTER UPDATE OF encrypted_password ON auth\.users/);
 assert.match(sql,/OLD\.encrypted_password IS DISTINCT FROM NEW\.encrypted_password/);
 assert.match(sql,/SET password_changed_verified_at = v_changed_at/);
 assert.match(sql,/r\.reset_channel = 'email'/);
 assert.match(sql,/r\.email_status = 'sent'/);
 assert.match(sql,/r\.requested_at >= v_changed_at - interval '24 hours'/);
 assert.doesNotMatch(sql,/auth\.(?:tokens|audit_log_entries)\s*SET/);
});
