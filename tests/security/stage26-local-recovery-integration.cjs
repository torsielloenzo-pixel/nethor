'use strict';
// Release rehearsal — REAL local GoTrue signed JWT, OTP recovery and password update.
// Synthetic accounts only, no Resend, no hosted Supabase. NEVER log passwords/tokens.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {createHash,randomUUID}=require('node:crypto');

const base=process.env.API_URL||'';
const dbUrl=process.env.DB_URL||'';
const anon=process.env.ANON_KEY||process.env.PUBLISHABLE_KEY||'';
const service=process.env.SERVICE_ROLE_KEY||'';
function local(u){
  try{return ['127.0.0.1','localhost','[::1]'].includes(new URL(u).hostname);}
  catch{return false;}
}
assert.equal(process.env.STAGE22_LOCAL_AUTH,'1','Missing explicit local-only marker');
assert.ok(local(base)&&local(dbUrl),'Refusing hosted Supabase URL');
assert.ok(anon&&service,'Local Supabase-generated API keys required');
const passwordBefore='Synthetic-Before!'+randomUUID();
const passwordAfter='Synthetic-After!'+randomUUID();
function uuid(v){assert.match(String(v||''),/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);return v;}
function sql(q){return execFileSync('psql',[dbUrl,'-X','-v','ON_ERROR_STOP=1','-t','-A','-c',q],{
  encoding:'utf8',env:process.env,stdio:['ignore','pipe','pipe']}).trim();}
async function request(endpoint,{key=anon,token=key,body={},method='POST'}={}){
 const response=await fetch(base+endpoint,{
  method,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:method==='GET'?undefined:JSON.stringify(body)
 });
 const raw=await response.text();
 let data;try{data=JSON.parse(raw);}catch{data={message:raw.slice(0,100)};}
 return {status:response.status,ok:response.ok,data};
}
async function ok(endpoint,options){
 const r=await request(endpoint,options);
 assert.ok(r.ok,'Local Supabase endpoint '+endpoint+' HTTP '+r.status+' ('+
   String(r.data?.error_code||r.data?.code||r.data?.message||r.data?.error||'unknown').slice(0,100)+')');
 return r.data;
}
async function register(password){
 const email='nethor-release-recovery-'+randomUUID()+'@example.test';
 const user=await ok('/auth/v1/admin/users',{key:service,body:{email,password,email_confirm:true}});
 const id=uuid(user.id);
 sql(`INSERT INTO public.profiles(id,display_name,role,planning_name)
   VALUES ('${id}'::uuid,'Release Test Account','employe','SYNTHETIC EMPLOYEE')`);
 const logged=await ok('/auth/v1/token?grant_type=password',{body:{email,password}});
 assert.equal(logged.user?.id,id);
 assert.ok(logged.access_token);
 return {email,id,token:logged.access_token};
}
async function claim(token,id,digest){
 const r=await ok('/rest/v1/rpc/stage26_finalize_recovery',{
  token,body:{p_request_id:id,p_proof_digest:digest}});
 assert.equal(typeof r.status,'string');
 return r.status;
}
async function main(){
 const account=await register(passwordBefore);
 const outsider=await register('Synthetic-Outsider!'+randomUUID());

 // This is the same Auth Admin type used by Nethor's proposed Edge Function.
 const generated=await ok('/auth/v1/admin/generate_link',{
  key:service,body:{type:'recovery',email:account.email}});
 const hash=generated.properties?.hashed_token||generated.hashed_token||
    generated.properties?.hashedToken;
 assert.ok(typeof hash==='string'&&hash.length>=20,'Local GoTrue did not return recovery token hash');
 const digest=createHash('sha256').update(hash).digest('hex');
 const requestId=uuid(randomUUID());
 sql(`INSERT INTO public.password_reset_requests
  (id,user_id,requested_at,email_status,reset_channel,recovery_proof_digest)
  VALUES ('${requestId}'::uuid,'${account.id}'::uuid,now(),'sent','email','${digest}')`);
 assert.equal(await claim(account.token,requestId,digest),'denied',
   'Cannot resolve before a real Auth password change');
 assert.equal(await claim(outsider.token,requestId,digest),'denied',
   'Cannot resolve another account request');
 console.log('stage26-recovery-unverified-and-cross-user-denied-PASS');

 // The first-party Supabase recovery verify endpoint must mint an authentic
 // user session, as the browser's supabase-js verifyOtp does.
 const verified=await ok('/auth/v1/verify',{
   body:{type:'recovery',token_hash:hash}});
 assert.equal(verified.user?.id,account.id,'Recovery token verified for incorrect user');
 assert.ok(verified.access_token,'Recovery verification gave no access JWT');
 const recoveryJwt=verified.access_token;
 const reused=await request('/auth/v1/verify',{body:{type:'recovery',token_hash:hash}});
 assert.equal(reused.ok,false,'Recovery token was accepted twice');
 console.log('stage26-recovery-token-valid-and-single-use-PASS');

 await ok('/auth/v1/user',{method:'PUT',token:recoveryJwt,body:{password:passwordAfter}});
 const evidence=sql(`SELECT CASE WHEN password_changed_verified_at IS NOT NULL
     AND resolved_at IS NULL THEN 'auth_seen_pending' ELSE 'invalid' END
   FROM public.password_reset_requests WHERE id='${requestId}'::uuid`);
 assert.equal(evidence,'auth_seen_pending',
   'Real password update should record evidence but never auto-close request');
 console.log('stage26-recovery-auth-password-event-unresolved-PASS');

 assert.equal(await claim(recoveryJwt,requestId,'b'.repeat(64)),'denied',
   'Wrong proof digest could close a request');
 assert.equal(await claim(outsider.token,requestId,digest),'denied',
   'Outsider could close a valid recovery event');
 assert.equal(await claim(recoveryJwt,requestId,digest),'resolved',
   'Legitimate JWT, per-link digest, and Auth event should close specific request');
 assert.equal(await claim(recoveryJwt,requestId,digest),'denied',
   'Repeated close should not create another mutation');
 assert.equal(sql(`SELECT CASE WHEN resolved_at IS NOT NULL THEN 'closed' ELSE 'open' END
   FROM public.password_reset_requests WHERE id='${requestId}'::uuid`),'closed');
 console.log('stage26-recovery-proof-bound-and-unique-PASS');

 const wrongPassword=await request('/auth/v1/token?grant_type=password',{
   body:{email:account.email,password:passwordBefore}});
 assert.equal(wrongPassword.ok,false,'Old password remained usable');
 const login=await ok('/auth/v1/token?grant_type=password',{
   body:{email:account.email,password:passwordAfter}});
 assert.equal(login.user?.id,account.id);
 console.log('stage26-recovery-new-password-login-PASS');

 // Confirm that the guard still rejects a *signed* JWT when the account
 // has been disabled, rather than trusting the claims in the token.
 sql(`UPDATE public.profiles SET account_enabled=false WHERE id='${account.id}'::uuid`);
 assert.equal(await claim(login.access_token,requestId,digest),'unauthorized');
 console.log('stage26-recovery-disabled-session-denied-PASS');
 console.log('stage26-local-gotrue-recovery-complete');
}
main().catch(e=>{console.error('stage26 recovery rehearsal failed:',e.message);process.exitCode=1;});
