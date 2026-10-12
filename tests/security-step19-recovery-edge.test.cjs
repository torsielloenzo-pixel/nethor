'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {webcrypto,createHash}=require('node:crypto');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const source=fs.readFileSync(path.join(__dirname,'..','docs/security/edge-functions/password-recovery-email/index.ts'),'utf8');
const start=source.indexOf('    if (action === "resolved") {');
const stop=source.indexOf('\n    if (action !== "request")',start);
assert.ok(start>=0&&stop>start,'Missing staged resolved branch');
const branch=source.slice(start,stop);
const runResolved=new AsyncFunction('req','admin','createClient','Deno','url','json','sendMail','body','crypto',`
 const action="resolved";
 ${branch}
 return {status:599,body:{error:"Unexpected fallthrough"}};
`);
const requestId='123e4567-e89b-42d3-a456-426614174000';
const proof='synthetic-supabase-recovery-token-hash-for-stage24-tests';
const digest=createHash('sha256').update(proof).digest('hex');
function harness({
 authHeader='Bearer synthetic-token',user={id:'synthetic-user'},authError=null,
 securityContext={session_active:true},securityError=null,rpcThrows=false,
 body={action:'resolved',request_id:requestId,token_hash:proof},
 latest={id:requestId,password_changed_verified_at:'2026-10-12T20:00:00Z',
         confirmation_notification_at:null,resolved_at:null},
 lookupError=null,claim=true,claimError=null,recoveryEmail='fake@example.test',mailOk=true
}={}){
 const calls=[],changes=[],filters=[];
 const caller={
  auth:{getUser:async()=>{calls.push('auth.getUser');return{data:{user},error:authError}}},
  rpc:async(name)=>{
   calls.push('caller.rpc:'+name);assert.equal(name,'nethor_security_context');
   if(rpcThrows)throw Error('synthetic network failure');
   return{data:securityContext,error:securityError};
  }
 };
 const admin={
  from(table){
   calls.push('admin.from:'+table);
   let mode='lookup';
   const conditions=[];
   const q={
    select(){return this},
    eq(column,value){conditions.push({column,value});return this},
    gte(){return this},order(){return this},limit(){return this},
    not(){return this},is(){return this},
    update(patch){
     mode=patch.confirmation_notification_at?'claim':'notification-status';
     calls.push('admin.update:'+table+':'+mode);
     changes.push({table,...patch});
     return this;
    },
    insert(){calls.push('admin.insert:'+table);return Promise.resolve({data:null,error:null})},
    maybeSingle(){
     if(table==='user_recovery_emails')return Promise.resolve({data:recoveryEmail?{email:recoveryEmail}:null});
     const fields=Object.fromEntries(conditions.map(x=>[x.column,x.value]));
     filters.push({mode,table,fields});
     if(table==='password_reset_requests'&&mode==='lookup'){
      if(fields.id!==requestId||fields.user_id!==user?.id||fields.recovery_proof_digest!==digest
         ||fields.reset_channel!=='email'||fields.email_status!=='sent'){
       return Promise.resolve({data:null,error:null});
      }
      return Promise.resolve({data:latest,error:lookupError});
     }
     if(table==='password_reset_requests'&&mode==='claim'){
      if(fields.id!==requestId||fields.user_id!==user?.id||fields.recovery_proof_digest!==digest)
       return Promise.resolve({data:null,error:null});
      return Promise.resolve({data:claim?{id:requestId}:null,error:claimError});
     }
     return Promise.resolve({data:null,error:null});
    },
    then(resolve,reject){return Promise.resolve({data:null,error:null}).then(resolve,reject)}
   };
   return q;
  }
 };
 const req={headers:{get:key=>key.toLowerCase()==='authorization'?authHeader:null}};
 const Deno={env:{get:name=>name==='SUPABASE_ANON_KEY'?'synthetic-anon':null}};
 const createClient=(_url,_anon,opts)=>{
  calls.push('createClient');assert.equal(opts.global.headers.Authorization,authHeader);return caller;
 };
 const json=(value,status=200)=>({status,body:value});
 const sendMail=async()=>{calls.push('sendMail');return{ok:mailOk}};
 return{calls,changes,filters,run:()=>runResolved(req,admin,createClient,Deno,'https://invalid.example',json,sendMail,body,webcrypto)}
}
test('stage24: missing JWT and invalid Auth user fail without privileged SQL',async()=>{
 for(const options of [{authHeader:null},{user:null,authError:{message:'invalid'}}]){
  const x=harness(options);assert.equal((await x.run()).status,401);
  assert.ok(!x.calls.some(c=>c.startsWith('admin.')));
 }
});
test('stage24: revoked, absent, error and offline security contexts deny by default',async()=>{
 for(const options of [{securityContext:{session_active:false}},{securityContext:null},
  {securityContext:{}},{securityError:{message:'rpc failure'}},{rpcThrows:true}]){
  const x=harness(options);assert.equal((await x.run()).status,401);
  assert.ok(!x.calls.some(c=>c.startsWith('admin.')));
 }
});
test('stage24: acknowledgement without specific link id and token hash is refused',async()=>{
 for(const body of [{action:'resolved'},{action:'resolved',request_id:requestId},
   {action:'resolved',token_hash:proof},
   {action:'resolved',request_id:'other',token_hash:proof},
   {action:'resolved',request_id:requestId,token_hash:'short'}]){
  const x=harness({body});assert.equal((await x.run()).status,400);
  assert.ok(!x.calls.some(c=>c.startsWith('admin.')));
 }
});
test('stage24: wrong link token or unknown request cannot complete recovery',async()=>{
 for(const body of [
  {action:'resolved',request_id:requestId,token_hash:proof+'-altered'},
  {action:'resolved',request_id:'223e4567-e89b-42d3-a456-426614174000',token_hash:proof}
 ]){
  const x=harness({body}),res=await x.run();
  assert.equal(res.status,409);
  assert.ok(!x.calls.some(c=>c.startsWith('admin.update')||c.startsWith('admin.insert')||c==='sendMail'));
 }
});
test('stage24: link proof without observed Auth password change is insufficient',async()=>{
 for(const latest of [null,{id:requestId,password_changed_verified_at:null}]){
  const x=harness({latest});assert.equal((await x.run()).status,409);
  assert.ok(!x.calls.some(c=>c.startsWith('admin.update')||c==='sendMail'));
 }
 const x=harness({lookupError:{message:'database unavailable'}});assert.equal((await x.run()).status,503);
 assert.ok(!x.calls.some(c=>c.startsWith('admin.update')));
});
test('stage24: correct link proof and Auth evidence resolve once and send confirmation',async()=>{
 const x=harness(),res=await x.run();
 assert.equal(res.status,200);assert.equal(res.body.verified,true);
 assert.equal(res.body.notification_status,'sent');
 assert.equal(x.calls.filter(c=>c==='sendMail').length,1);
 assert.equal(x.calls.filter(c=>c==='admin.insert:audit_logs').length,1);
 assert.ok(x.changes.some(v=>v.table==='password_reset_requests'&&v.confirmation_notification_status==='pending'&&!!v.resolved_at));
 assert.ok(x.changes.some(v=>v.confirmation_notification_status==='sent'));
 const claim=x.filters.find(f=>f.mode==='claim');
 assert.equal(claim.fields.recovery_proof_digest,digest);
 assert.equal(claim.fields.id,requestId);
 const guard=x.calls.indexOf('caller.rpc:nethor_security_context');
 assert.ok(guard>=0&&x.calls.findIndex(c=>c.startsWith('admin.'))>guard);
});
test('stage24: replay with matching link is idempotent and sends no second email',async()=>{
 const x=harness({claim:false,latest:{id:requestId,password_changed_verified_at:'2026-10-12T20:00:00Z',
    resolved_at:'2026-10-12T20:01:00Z',confirmation_notification_at:'2026-10-12T20:01:00Z'}});
 const res=await x.run();assert.equal(res.status,200);
 assert.equal(res.body.already_acknowledged,true);
 assert.equal(x.calls.filter(c=>c==='sendMail').length,0);
 assert.equal(x.calls.filter(c=>c.startsWith('admin.insert')).length,0);
});
test('stage24: races and DB failures are conservative; no mail on failed claim',async()=>{
 const x=harness({claim:false});assert.equal((await x.run()).status,409);
 assert.ok(!x.calls.includes('sendMail'));
 const y=harness({claimError:{message:'conflict'}});assert.equal((await y.run()).status,503);
 assert.ok(!y.calls.includes('sendMail'));
});
test('stage24: failed notification is tracked without revoking verified Auth state',async()=>{
 const x=harness({mailOk:false}),res=await x.run();
 assert.equal(res.body.verified,true);assert.equal(res.body.notification_status,'failed');
 assert.ok(x.changes.some(v=>v.confirmation_notification_status==='failed'));
});
test('stage24: request still anonymous but email contains specific request identifier and secret hash binding',()=>{
 const rest=source.slice(stop);
 assert.match(rest,/if \(action !== "request"\) return json/);
 assert.match(rest,/recovery_proof_digest: digest/);
 assert.match(rest,/secureLink\.searchParams\.set\("request_id", resetRowId\)/);
 assert.match(rest,/email_status: "pending"/);
 assert.match(rest,/email_status: "sent"/);
 assert.match(rest,/findProfile\(admin, rawIdentifier\)/);
 assert.doesNotMatch(rest,/caller\.rpc\("nethor_security_context"\)/);
});
test('stage24: client carries link evidence only after a successful Auth password update',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','reset-password.html'),'utf8');
 const saved=html.indexOf("await db.auth.updateUser({password:next})");
 const follow=html.indexOf("await db.functions.invoke('password-recovery-email',{body:{action:'resolved',request_id:recoveryRequestId,token_hash:recoveryTokenHash}})");
 assert.ok(saved>=0&&follow>saved);
 assert.match(html,/history\.replaceState\(null,'',location\.pathname\)/);
 assert.match(html,/followUpVerified=!followUpError&&confirmation\?\.verified===true/);
 assert.match(html,/await db\.auth\.signOut\(\{scope:'global'\}\)/);
});
test('stage24: Auth hook records evidence but never resolves a request without link proof',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'..','docs/security/etape20-confirmation-auth-verifiee-proposal.sql'),'utf8');
 assert.match(sql,/AFTER UPDATE OF encrypted_password ON auth\.users/);
 assert.match(sql,/OLD\.encrypted_password IS DISTINCT FROM NEW\.encrypted_password/);
 assert.match(sql,/SET password_changed_verified_at = v_changed_at/);
 assert.match(sql,/r\.recovery_proof_digest IS NOT NULL/);
 assert.match(sql,/r\.reset_channel = 'email'/);
 const body=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION'),sql.indexOf('COMMIT;'));
 assert.doesNotMatch(body,/SET[\s\S]*resolved_at\s*=/i);
});
